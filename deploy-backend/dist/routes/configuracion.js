"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = configuracionRoutes;
const index_1 = require("../index");
const vigencias_1 = require("../utils/vigencias");
const telegram_1 = require("../utils/telegram");
const capacidades_1 = require("../utils/capacidades");
const saldoTiempo_1 = require("../utils/saldoTiempo");
async function configuracionRoutes(app) {
    const auth = { preHandler: [app.requireEmpresa] };
    // Envía un mensaje de prueba al chat de Telegram para verificar la conexión.
    app.post('/telegram/prueba', auth, async (request, reply) => {
        if (!telegram_1.telegramConfigurado) {
            return reply.status(400).send({ error: 'El bot de Telegram aún no está configurado en el servidor. Contacta a HoraPro.' });
        }
        const { chatId } = (request.body ?? {});
        let destino = (chatId || '').trim();
        if (!destino) {
            const cfg = await index_1.prisma.configuracion.findUnique({
                where: { empresaId_clave: { empresaId: request.empresaId, clave: 'TELEGRAM_CHAT_ID' } },
            });
            destino = cfg?.valor || '';
        }
        if (!destino)
            return reply.status(400).send({ error: 'Falta el chat de Telegram.' });
        const r = await (0, telegram_1.enviarTelegram)(destino, '✅ <b>HoraPro</b> quedó conectado. Aquí llegarán las alertas de llegadas tarde.');
        if (!r.ok)
            return reply.status(400).send({ error: r.error });
        return { ok: true };
    });
    app.get('/', auth, async (request) => {
        const items = await index_1.prisma.configuracion.findMany({ where: { empresaId: request.empresaId } });
        return items.reduce((acc, item) => { acc[item.clave] = item.valor; return acc; }, {});
    });
    // Política de permisos remunerados, ya resuelta. El frontend NO debe repetir
    // la clasificación ni el default: los recibe de aquí, que es la misma fuente
    // que usa el cálculo del saldo.
    app.get('/permisos-remunerados', auth, async (request) => {
        const cfg = await index_1.prisma.configuracion.findUnique({
            where: { empresaId_clave: { empresaId: request.empresaId, clave: saldoTiempo_1.CLAVE_PERMISOS_REMUNERADOS } },
        });
        const politica = (0, saldoTiempo_1.parsearPoliticaPermisos)(cfg?.valor);
        return {
            // Fijos por ley: se muestran bloqueados, no se pueden cambiar.
            remuneradosPorLey: saldoTiempo_1.PERMISOS_REMUNERADOS_LEY,
            nuncaRemunerados: saldoTiempo_1.PERMISOS_NUNCA_REMUNERADOS,
            // Los que cada empresa decide, y cuáles están marcados hoy.
            configurables: saldoTiempo_1.PERMISOS_CONFIGURABLES,
            remunerados: [...politica],
            // Distingue "nunca lo configuró" (se aplicó el default) de una elección real.
            configurado: cfg != null,
        };
    });
    app.put('/', auth, async (request, reply) => {
        const data = request.body;
        const empresaId = request.empresaId;
        // Gating: activar GPS o Telegram requiere que el plan lo incluya
        const cap = await (0, capacidades_1.capacidadesEmpresa)(empresaId);
        const tocaGeo = Object.keys(data).some(k => k.startsWith('GEO_'));
        const tocaTelegram = Object.keys(data).some(k => k.startsWith('TELEGRAM_'));
        if (tocaGeo && !cap.features.gps) {
            return reply.status(403).send({ error: 'La marcación por GPS está disponible en el plan Profesional.', codigo: 'FUNCION_PLAN', funcion: 'gps' });
        }
        if (tocaTelegram && !cap.features.telegram) {
            return reply.status(403).send({ error: 'Las alertas por Telegram están disponibles en el plan Profesional.', codigo: 'FUNCION_PLAN', funcion: 'telegram' });
        }
        // La política de permisos remunerados decide descuentos de nómina: solo el
        // ADMIN la toca, y solo sobre los tipos que la ley deja a criterio de la
        // empresa. Se valida en el servidor, no basta con ocultarlo en la UI.
        if (saldoTiempo_1.CLAVE_PERMISOS_REMUNERADOS in data) {
            if (request.user?.rol !== 'ADMIN') {
                return reply.status(403).send({ error: 'Solo el administrador cambia qué permisos son remunerados' });
            }
            const pedidos = String(data[saldoTiempo_1.CLAVE_PERMISOS_REMUNERADOS] ?? '').split(',').map(s => s.trim()).filter(Boolean);
            const invalidos = pedidos.filter(t => !saldoTiempo_1.PERMISOS_CONFIGURABLES.includes(t));
            if (invalidos.length > 0) {
                return reply.status(400).send({
                    error: `Estos tipos no se pueden configurar: ${invalidos.join(', ')}. Los definidos por ley no son editables.`,
                });
            }
            data[saldoTiempo_1.CLAVE_PERMISOS_REMUNERADOS] = (0, saldoTiempo_1.normalizarPoliticaPermisos)(pedidos).join(',');
        }
        await Promise.all(Object.entries(data).map(([clave, valor]) => index_1.prisma.configuracion.upsert({
            where: { empresaId_clave: { empresaId, clave } },
            update: { valor },
            create: { empresaId, clave, valor },
        })));
        return { ok: true };
    });
    // Datos de la empresa (los ve cualquiera de la empresa, solo ADMIN los edita)
    app.get('/empresa', auth, async (request) => {
        return index_1.prisma.empresa.findUnique({
            where: { id: request.empresaId },
            select: { nombre: true, nit: true, email: true, telefono: true },
        });
    });
    app.put('/empresa', auth, async (request, reply) => {
        const payload = request.user;
        if (payload.rol !== 'ADMIN')
            return reply.status(403).send({ error: 'Solo el administrador edita los datos de la empresa' });
        const { nombre, nit, telefono } = request.body;
        if (!nombre || !nit)
            return reply.status(400).send({ error: 'Nombre y NIT son obligatorios' });
        const conflicto = await index_1.prisma.empresa.findFirst({ where: { nit, NOT: { id: request.empresaId } } });
        if (conflicto)
            return reply.status(409).send({ error: 'Ya hay otra empresa registrada con ese NIT' });
        return index_1.prisma.empresa.update({
            where: { id: request.empresaId },
            data: { nombre, nit, telefono },
            select: { nombre: true, nit: true, email: true, telefono: true },
        });
    });
    // Reglas legales vigentes (solo lectura para la empresa; las administra la plataforma)
    app.get('/legales', auth, async (request) => {
        const { fecha } = request.query;
        const ref = fecha ? new Date(fecha) : new Date();
        const [jornadas, tipos] = await Promise.all([
            index_1.prisma.jornadaVigencia.findMany({ orderBy: { vigenteDesde: 'asc' } }),
            index_1.prisma.tipoHora.findMany({ orderBy: [{ codigo: 'asc' }, { vigenteDesde: 'asc' }] }),
        ]);
        const jornada = (0, vigencias_1.jornadaVigente)(ref, jornadas);
        return {
            fechaReferencia: ref,
            jornadaSemanal: jornada,
            horasMes: (0, vigencias_1.horasMesDeJornada)(jornada),
            tiposHoraVigentes: (0, vigencias_1.tiposVigentes)(ref, tipos),
            calendarioJornadas: jornadas,
        };
    });
    // Compat: lista de tipos de hora vigentes hoy
    app.get('/tipos-hora', auth, async () => {
        const tipos = await index_1.prisma.tipoHora.findMany({ orderBy: { codigo: 'asc' } });
        return (0, vigencias_1.tiposVigentes)(new Date(), tipos);
    });
    // Token del link único del kiosco de marcación de la empresa
    app.get('/marcador-link', auth, async (request) => {
        const empresa = await index_1.prisma.empresa.findUnique({
            where: { id: request.empresaId },
            select: { marcadorToken: true, nombre: true },
        });
        const soloDispositivos = await index_1.prisma.configuracion.findUnique({
            where: { empresaId_clave: { empresaId: request.empresaId, clave: 'KIOSCO_SOLO_DISPOSITIVOS' } },
        });
        return { ...empresa, soloDispositivos: soloDispositivos?.valor === '1' };
    });
    // ===== Dispositivos autorizados del kiosco =====
    app.get('/dispositivos', auth, async (request) => {
        return index_1.prisma.dispositivoKiosco.findMany({
            where: { empresaId: request.empresaId },
            orderBy: { creadoEn: 'asc' },
        });
    });
    // Genera un código de vinculación de 6 dígitos (un solo uso, 10 minutos)
    app.post('/dispositivos/codigo', auth, async (request, reply) => {
        const cap = await (0, capacidades_1.capacidadesEmpresa)(request.empresaId);
        if (!cap.features.multiDispositivo) {
            const yaVinculados = await index_1.prisma.dispositivoKiosco.count({ where: { empresaId: request.empresaId } });
            if (yaVinculados >= 1) {
                return reply.status(403).send({ error: 'Tu plan permite un solo dispositivo de kiosco. Elimina el actual o sube de plan para vincular más.', codigo: 'FUNCION_PLAN', funcion: 'multiDispositivo' });
            }
        }
        const codigo = String(Math.floor(100000 + Math.random() * 900000));
        const valor = JSON.stringify({ codigo, expira: Date.now() + 10 * 60 * 1000 });
        await index_1.prisma.configuracion.upsert({
            where: { empresaId_clave: { empresaId: request.empresaId, clave: 'CODIGO_KIOSCO' } },
            update: { valor },
            create: { empresaId: request.empresaId, clave: 'CODIGO_KIOSCO', valor },
        });
        return { codigo, expiraEnMinutos: 10 };
    });
    // Renombrar un dispositivo autorizado
    app.put('/dispositivos/:id', auth, async (request, reply) => {
        const { id } = request.params;
        const { nombre } = (request.body ?? {});
        const limpio = (nombre || '').trim();
        if (!limpio)
            return reply.status(400).send({ error: 'El nombre no puede estar vacío' });
        const disp = await index_1.prisma.dispositivoKiosco.findFirst({ where: { id, empresaId: request.empresaId } });
        if (!disp)
            return reply.status(404).send({ error: 'Dispositivo no encontrado' });
        return index_1.prisma.dispositivoKiosco.update({ where: { id }, data: { nombre: limpio.slice(0, 60) } });
    });
    app.delete('/dispositivos/:id', auth, async (request, reply) => {
        const { id } = request.params;
        const disp = await index_1.prisma.dispositivoKiosco.findFirst({ where: { id, empresaId: request.empresaId } });
        if (!disp)
            return reply.status(404).send({ error: 'Dispositivo no encontrado' });
        await index_1.prisma.dispositivoKiosco.delete({ where: { id } });
        return { ok: true };
    });
}
