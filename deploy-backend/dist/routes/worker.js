"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = workerRoutes;
const client_1 = require("@prisma/client");
const crypto_1 = __importDefault(require("crypto"));
const index_1 = require("../index");
const rostro_1 = require("../utils/rostro");
const telegram_1 = require("../utils/telegram");
const notificaciones_1 = require("../utils/notificaciones");
const fechas_1 = require("../utils/fechas");
const geo_1 = require("../utils/geo");
const kioscoConfig_1 = require("../utils/kioscoConfig");
const DIAS_SEMANA = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
const minutosDe = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
// Motivos de novedad válidos (mismos de la vista interna del colaborador)
const TIPOS_NOVEDAD = new Set([
    'VACACIONES', 'INCAPACIDAD_EPS', 'INCAPACIDAD_ARL', 'LICENCIA_MATERNIDAD', 'LICENCIA_PATERNIDAD',
    'LICENCIA_LUTO', 'CALAMIDAD', 'MEDICO', 'PERSONAL', 'NO_REMUNERADO', 'OTRO',
]);
// Ventana máxima para considerar que una entrada abierta es el turno en curso al
// marcar salida. Cubre turnos que cruzan medianoche (ej. 22:00→06:00) sin atar por
// error una salida a un turno olvidado de días atrás (que el auto-cierre ya maneja).
const VENTANA_TURNO_MS = 18 * 60 * 60 * 1000;
// Candado en memoria contra marcas dobles concurrentes del mismo colaborador
// (reintento de red, doble pestaña). El kiosco corre en un único proceso Node.
const marcandoAhora = new Set();
// Límite de rate para los endpoints públicos del kiosco (anti fuerza bruta / enumeración)
const rlPublico = { config: { rateLimit: { max: 12, timeWindow: '1 minute' } } };
// Cachea los descriptores faciales enrolados por empresa unos segundos: los
// reintentos de login-rostro (lo normal es 2-3 seguidos) no vuelven a golpear la BD.
// TTL corto para que un enrolamiento nuevo entre en efecto casi de inmediato.
const CACHE_ROSTROS_MS = 30000;
const cacheRostros = new Map();
async function enroladosDeEmpresa(empresaId) {
    const hit = cacheRostros.get(empresaId);
    if (hit && Date.now() - hit.ts < CACHE_ROSTROS_MS)
        return hit.enrolados;
    const enrolados = await index_1.prisma.colaborador.findMany({
        where: { empresaId, activo: true, rostroDescriptor: { not: client_1.Prisma.DbNull } },
        select: { id: true, nombre: true, apellido: true, cargo: true, cedula: true, empresaId: true, rostroDescriptor: true },
    });
    cacheRostros.set(empresaId, { ts: Date.now(), enrolados });
    return enrolados;
}
// Foto de verificación facial: data URI JPEG pequeño tomado en el navegador al
// marcar. Valida el prefijo, el tamaño y que los bytes empiecen con la firma JPEG
// (FF D8 FF), para no almacenar datos arbitrarios en la columna.
function fotoValida(foto) {
    const PREFIJO = 'data:image/jpeg;base64,';
    if (typeof foto !== 'string' || !foto.startsWith(PREFIJO) || foto.length > 300000)
        return false;
    try {
        const cabecera = Buffer.from(foto.slice(PREFIJO.length, PREFIJO.length + 24), 'base64');
        return cabecera.length >= 3 && cabecera[0] === 0xff && cabecera[1] === 0xd8 && cabecera[2] === 0xff;
    }
    catch {
        return false;
    }
}
// Alerta de llegada tarde por Telegram (si la empresa lo activó). No bloquea la marca.
async function alertarTardanzaTelegram(empresaId, nombre, ahoraBog, minutosTarde) {
    const cfgs = await index_1.prisma.configuracion.findMany({
        where: { empresaId, clave: { in: ['TELEGRAM_ALERTAS_TARDE', 'TELEGRAM_CHAT_ID'] } },
    });
    const map = Object.fromEntries(cfgs.map(c => [c.clave, c.valor]));
    if (map.TELEGRAM_ALERTAS_TARDE !== '1' || !map.TELEGRAM_CHAT_ID)
        return;
    const h = ahoraBog.getHours();
    const hora = `${h % 12 || 12}:${String(ahoraBog.getMinutes()).padStart(2, '0')} ${h >= 12 ? 'p.m.' : 'a.m.'}`;
    const tardeTxt = minutosTarde >= 60 ? `${Math.floor(minutosTarde / 60)}h ${minutosTarde % 60}min` : `${minutosTarde} min`;
    await (0, telegram_1.enviarTelegram)(map.TELEGRAM_CHAT_ID, `⚠️ <b>${nombre}</b> llegó tarde\n🕐 ${hora} · ${tardeTxt} tarde`);
}
// Esquemas de body: rechazan tipos inesperados (p. ej. `cedula` como objeto de
// filtro Prisma) ANTES del handler → cierran la inyección de operadores.
const loginSchema = {
    body: {
        type: 'object', additionalProperties: false,
        required: ['cedula', 'marcadorToken'],
        properties: {
            cedula: { type: 'string', minLength: 1, maxLength: 30 },
            marcadorToken: { type: 'string', minLength: 1, maxLength: 100 },
            deviceToken: { type: 'string', maxLength: 100 },
        },
    },
};
const loginRostroSchema = {
    body: {
        type: 'object', additionalProperties: false,
        required: ['descriptor', 'marcadorToken'],
        properties: {
            descriptor: { type: 'array', items: { type: 'number' }, maxItems: 256 },
            marcadorToken: { type: 'string', minLength: 1, maxLength: 100 },
            deviceToken: { type: 'string', maxLength: 100 },
        },
    },
};
const vincularSchema = {
    body: {
        type: 'object', additionalProperties: false,
        required: ['marcadorToken', 'codigo'],
        properties: {
            marcadorToken: { type: 'string', minLength: 1, maxLength: 100 },
            codigo: { type: 'string', minLength: 1, maxLength: 12 },
        },
    },
};
// Nota: el kiosco NUNCA se bloquea por mora o suspensión — los colaboradores
// siguen marcando sus horas; el cobro se gestiona en el panel del admin.
async function workerRoutes(app) {
    // Info del kiosco a partir del token del link único de la empresa
    app.get('/kiosco/:token', async (request, reply) => {
        const { token } = request.params;
        const empresa = await index_1.prisma.empresa.findUnique({ where: { marcadorToken: token } });
        if (!empresa || !empresa.activa)
            return reply.code(404).send({ error: 'Link de marcación inválido' });
        return {
            empresa: empresa.nombre,
            requiereDispositivo: await (0, kioscoConfig_1.exigeDispositivo)(empresa.id),
            permiteCedula: await (0, kioscoConfig_1.permiteCedula)(empresa.id),
            exigeUbicacion: (await (0, kioscoConfig_1.geocercoConfig)(empresa.id)) !== null,
        };
    });
    // Vincula este dispositivo al kiosco con el código de 6 dígitos que genera el admin
    app.post('/vincular', { ...rlPublico, schema: vincularSchema }, async (request, reply) => {
        const { marcadorToken, codigo } = request.body;
        const empresa = await index_1.prisma.empresa.findUnique({ where: { marcadorToken } });
        if (!empresa || !empresa.activa)
            return reply.code(404).send({ error: 'Link de marcación inválido' });
        const cfg = await index_1.prisma.configuracion.findUnique({
            where: { empresaId_clave: { empresaId: empresa.id, clave: 'CODIGO_KIOSCO' } },
        });
        const guardado = cfg ? JSON.parse(cfg.valor) : null;
        if (!guardado || guardado.codigo !== codigo || Date.now() > guardado.expira) {
            return reply.code(401).send({ error: 'Código inválido o vencido. Genera uno nuevo en el panel.' });
        }
        const cantidad = await index_1.prisma.dispositivoKiosco.count({ where: { empresaId: empresa.id } });
        const dispositivo = await index_1.prisma.dispositivoKiosco.create({
            data: {
                empresaId: empresa.id,
                nombre: `Dispositivo ${cantidad + 1}`,
                token: crypto_1.default.randomBytes(24).toString('hex'),
            },
        });
        // El código es de un solo uso
        await index_1.prisma.configuracion.delete({ where: { id: cfg.id } });
        return { deviceToken: dispositivo.token, nombre: dispositivo.nombre };
    });
    // Login del kiosco con cédula, amarrado al link único de la empresa
    app.post('/login', { ...rlPublico, schema: loginSchema }, async (request, reply) => {
        const { cedula, marcadorToken, deviceToken } = request.body;
        const empresa = await index_1.prisma.empresa.findUnique({ where: { marcadorToken } });
        if (!empresa || !empresa.activa)
            return reply.code(404).send({ error: 'Link de marcación inválido' });
        if (!(await (0, kioscoConfig_1.permiteCedula)(empresa.id))) {
            return reply.code(403).send({ error: 'Esta empresa desactivó la marcación con cédula. Usa el reconocimiento facial.' });
        }
        // Con la protección activa, solo dispositivos vinculados pueden marcar
        if (await (0, kioscoConfig_1.exigeDispositivo)(empresa.id)) {
            if (!(await (0, kioscoConfig_1.dispositivoValido)(empresa.id, deviceToken))) {
                return reply.code(401).send({ error: 'Este dispositivo no está autorizado para marcar', codigo: 'DISPOSITIVO_REQUERIDO' });
            }
        }
        const col = await index_1.prisma.colaborador.findFirst({
            where: { cedula, activo: true, empresaId: empresa.id },
        });
        if (!col)
            return reply.code(401).send({ error: 'Cédula no registrada en esta empresa' });
        const token = app.jwt.sign({ id: col.id, cedula: col.cedula, nombre: col.nombre, apellido: col.apellido, rol: 'WORKER', empresaId: col.empresaId }, { expiresIn: '12h' });
        return { token, colaborador: { id: col.id, nombre: col.nombre, apellido: col.apellido, cargo: col.cargo } };
    });
    // Login del kiosco con reconocimiento facial: el navegador ya calculó el
    // descriptor (128 floats) con face-api.js tras una captura estable. El servidor
    // compara contra los enrolados de esa empresa.
    // OJO: el descriptor lo calcula el cliente; hoy no hay liveness ni anti-replay en
    // el servidor, así que la foto adjunta debe tomarse como evidencia, no como
    // prueba fuerte de identidad (pendiente: liveness real / reto firmado).
    app.post('/login-rostro', { ...rlPublico, schema: loginRostroSchema }, async (request, reply) => {
        const { descriptor, marcadorToken, deviceToken } = request.body;
        if (!(0, rostro_1.esDescriptorValido)(descriptor))
            return reply.code(400).send({ error: 'Rostro no capturado correctamente' });
        const empresa = await index_1.prisma.empresa.findUnique({ where: { marcadorToken } });
        if (!empresa || !empresa.activa)
            return reply.code(404).send({ error: 'Link de marcación inválido' });
        if (await (0, kioscoConfig_1.exigeDispositivo)(empresa.id)) {
            if (!(await (0, kioscoConfig_1.dispositivoValido)(empresa.id, deviceToken))) {
                return reply.code(401).send({ error: 'Este dispositivo no está autorizado para marcar', codigo: 'DISPOSITIVO_REQUERIDO' });
            }
        }
        const match = (0, rostro_1.mejorCoincidencia)(descriptor, await enroladosDeEmpresa(empresa.id));
        if (!match)
            return reply.code(401).send({ error: 'Rostro no reconocido. Intenta de nuevo o marca con tu cédula.' });
        const col = match.colaborador;
        const token = app.jwt.sign({ id: col.id, cedula: col.cedula, nombre: col.nombre, apellido: col.apellido, rol: 'WORKER', empresaId: col.empresaId }, { expiresIn: '12h' });
        return { token, colaborador: { id: col.id, nombre: col.nombre, apellido: col.apellido, cargo: col.cargo } };
    });
    // Estado del día: retorna si hay entrada abierta (sin salida). Select mínimo: no
    // trae las fotos (LongText) ni el resto de columnas que el kiosco no usa.
    app.get('/estado', { preHandler: [app.authenticate] }, async (request) => {
        const payload = request.user;
        if (payload.rol !== 'WORKER')
            return { error: 'No autorizado' };
        const abierto = await index_1.prisma.registro.findFirst({
            where: {
                colaboradorId: payload.id,
                entrada: { gte: new Date(Date.now() - VENTANA_TURNO_MS) },
                salida: null,
            },
            orderBy: { creadoEn: 'desc' },
            select: { entrada: true },
        });
        return {
            entradaAbierta: abierto ? { entrada: abierto.entrada } : null,
            dentroAhora: !!abierto,
        };
    });
    // Registrar entrada o salida. Si el login fue con rostro, llega la foto de
    // verificación (se conserva 2 meses y luego se borra automáticamente).
    app.post('/marcar', { preHandler: [app.authenticate] }, async (request, reply) => {
        const payload = request.user;
        if (payload.rol !== 'WORKER')
            return reply.code(403).send({ error: 'No autorizado' });
        // Evita marcas dobles concurrentes del mismo colaborador (reintento/doble tap).
        if (marcandoAhora.has(payload.id)) {
            return reply.code(409).send({ error: 'Tu marca se está procesando, espera un momento.' });
        }
        marcandoAhora.add(payload.id);
        try {
            const { foto, lat, lng } = (request.body ?? {});
            const fotoGuardar = fotoValida(foto) ? foto : null;
            // Geocerco: si la empresa lo exige, la marca debe venir dentro del radio.
            const geo = await (0, kioscoConfig_1.geocercoConfig)(payload.empresaId);
            if (geo) {
                const latN = Number(lat), lngN = Number(lng);
                if (!Number.isFinite(latN) || !Number.isFinite(lngN)) {
                    return reply.code(400).send({ error: 'Necesitamos tu ubicación para marcar. Activa el GPS y permite el acceso.', codigo: 'UBICACION_REQUERIDA' });
                }
                const dist = Math.round((0, geo_1.distanciaMetros)(latN, lngN, geo.lat, geo.lng));
                if (dist > geo.radio) {
                    return reply.code(403).send({
                        error: `Estás fuera de la ubicación de la empresa (a ${dist} m). Debes marcar desde el sitio de trabajo.`,
                        codigo: 'FUERA_DE_UBICACION', distancia: dist, radio: geo.radio,
                    });
                }
            }
            const ahora = new Date();
            const { ahoraBog, inicioDia, finDia } = (0, fechas_1.rangoDiaBogota)(ahora);
            // Turno abierto en curso: se busca por ventana (no por día calendario), para
            // que un turno que cruzó medianoche encuentre su entrada y registre salida en
            // vez de crear una entrada nueva.
            const abierto = await index_1.prisma.registro.findFirst({
                where: {
                    colaboradorId: payload.id,
                    entrada: { gte: new Date(ahora.getTime() - VENTANA_TURNO_MS) },
                    salida: null,
                },
                orderBy: { creadoEn: 'desc' },
            });
            // Festivo legal (global) o propio de la empresa del colaborador
            const col = await index_1.prisma.colaborador.findUnique({
                where: { id: payload.id },
                include: { horario: { include: { franjas: true } } },
            });
            const festHoy = await index_1.prisma.diaFestivo.findFirst({
                where: {
                    fecha: { gte: inicioDia, lt: finDia },
                    OR: [{ empresaId: null }, { empresaId: col?.empresaId }],
                },
            });
            const tipo = festHoy ? 'FESTIVO' : 'NORMAL';
            if (abierto) {
                const updated = await index_1.prisma.registro.update({
                    where: { id: abierto.id },
                    data: { salida: ahora, ...(fotoGuardar ? { fotoSalida: fotoGuardar } : {}) },
                });
                // ¿Salió antes de la hora de fin de su franja? (para pedir motivo).
                // Normaliza franjas que cruzan medianoche (fin < inicio) sumando 24h.
                let salidaTemprana = false;
                const horario = col?.horario;
                if (horario && horario.activo && !festHoy) {
                    const franja = horario.franjas.find(f => (f.dias ?? []).includes(DIAS_SEMANA[ahoraBog.getDay()]));
                    if (franja) {
                        const iniMin = minutosDe(franja.horaEntrada);
                        let finMin = minutosDe(franja.horaSalida);
                        const cruzaMedianoche = finMin <= iniMin;
                        if (cruzaMedianoche)
                            finMin += 1440;
                        let salidaMin = ahoraBog.getHours() * 60 + ahoraBog.getMinutes();
                        if (cruzaMedianoche && salidaMin < iniMin)
                            salidaMin += 1440; // salió pasada la medianoche
                        if (salidaMin < finMin - (horario.toleranciaMin ?? 0))
                            salidaTemprana = true;
                    }
                }
                return { accion: 'SALIDA', registro: updated, hora: ahora, salidaTemprana };
            }
            else {
                // ¿Ya había marcado entrada hoy? (para alertar tardanza solo en la 1a entrada)
                const entradasPrevias = await index_1.prisma.registro.count({
                    where: { colaboradorId: payload.id, fecha: { gte: inicioDia, lt: finDia }, entrada: { not: null } },
                });
                const nuevo = await index_1.prisma.registro.create({
                    data: {
                        colaboradorId: payload.id,
                        fecha: inicioDia,
                        entrada: ahora,
                        tipo: tipo,
                        ...(fotoGuardar ? { fotoEntrada: fotoGuardar } : {}),
                    },
                });
                // Alerta de llegada tarde por Telegram (primera entrada del día, día laboral)
                const horarioE = col?.horario;
                if (entradasPrevias === 0 && col && !festHoy && horarioE?.activo) {
                    const franja = horarioE.franjas.find(f => (f.dias ?? []).includes(DIAS_SEMANA[ahoraBog.getDay()]));
                    if (franja) {
                        const entradaMin = ahoraBog.getHours() * 60 + ahoraBog.getMinutes();
                        const tarde = entradaMin - (minutosDe(franja.horaEntrada) + (horarioE.toleranciaMin ?? 0));
                        if (tarde > 0) {
                            alertarTardanzaTelegram(col.empresaId, `${col.nombre} ${col.apellido}`, ahoraBog, tarde).catch(() => { });
                            const tardeTxt = tarde >= 60 ? `${Math.floor(tarde / 60)}h ${tarde % 60}min` : `${tarde} min`;
                            (0, notificaciones_1.notificar)(col.empresaId, {
                                tipo: 'LLEGADA_TARDE',
                                titulo: `${col.nombre} ${col.apellido} llegó tarde`,
                                cuerpo: `Marcó entrada con ${tardeTxt} de retraso.`,
                                entidad: 'colaborador', entidadId: col.id,
                            });
                        }
                    }
                }
                return { accion: 'ENTRADA', registro: nuevo, hora: ahora };
            }
        }
        finally {
            marcandoAhora.delete(payload.id);
        }
    });
    // El colaborador reporta el motivo de una salida temprana desde el kiosco.
    // Crea una novedad del día, pendiente de aprobación por el administrador.
    app.post('/novedad', { preHandler: [app.authenticate] }, async (request, reply) => {
        const payload = request.user;
        if (payload.rol !== 'WORKER')
            return reply.code(403).send({ error: 'No autorizado' });
        const { tipo, descripcion } = (request.body ?? {});
        if (!tipo || !TIPOS_NOVEDAD.has(tipo))
            return reply.code(400).send({ error: 'Motivo inválido' });
        const { inicioDia } = (0, fechas_1.rangoDiaBogota)();
        const permiso = await index_1.prisma.permiso.create({
            data: {
                colaboradorId: payload.id,
                tipo: tipo,
                descripcion: (descripcion || '').trim() || null,
                fechaInicio: inicioDia,
                fechaFin: inicioDia,
                aprobado: false,
            },
        });
        // Avisa al admin que hay una novedad por aprobar (campana del menú)
        const quien = await index_1.prisma.colaborador.findUnique({
            where: { id: payload.id },
            select: { nombre: true, apellido: true, empresaId: true },
        });
        if (quien) {
            (0, notificaciones_1.notificar)(quien.empresaId, {
                tipo: 'NOVEDAD_PENDIENTE',
                titulo: `Novedad por aprobar: ${quien.nombre} ${quien.apellido}`,
                cuerpo: `Reportó una novedad (${tipo}) pendiente de tu aprobación.`,
                entidad: 'colaborador', entidadId: payload.id,
            });
        }
        return reply.code(201).send({ ok: true, id: permiso.id });
    });
}
