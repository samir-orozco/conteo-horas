"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
require("dotenv/config");
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const jwt_1 = __importDefault(require("@fastify/jwt"));
const rate_limit_1 = __importDefault(require("@fastify/rate-limit"));
const prisma_1 = require("./prisma");
Object.defineProperty(exports, "prisma", { enumerable: true, get: function () { return prisma_1.prisma; } });
const auth_1 = __importDefault(require("./routes/auth"));
const colaboradores_1 = __importDefault(require("./routes/colaboradores"));
const registros_1 = __importDefault(require("./routes/registros"));
const permisos_1 = __importDefault(require("./routes/permisos"));
const contratos_1 = __importDefault(require("./routes/contratos"));
const festivos_1 = __importDefault(require("./routes/festivos"));
const configuracion_1 = __importDefault(require("./routes/configuracion"));
const reportes_1 = __importDefault(require("./routes/reportes"));
const worker_1 = __importDefault(require("./routes/worker"));
const admin_1 = __importDefault(require("./routes/admin"));
const afiliados_1 = __importDefault(require("./routes/afiliados"));
const afiliado_panel_1 = __importDefault(require("./routes/afiliado-panel"));
const wompi_1 = __importDefault(require("./routes/wompi"));
const suscripcion_1 = __importDefault(require("./routes/suscripcion"));
const horarios_1 = __importDefault(require("./routes/horarios"));
const sedes_1 = __importDefault(require("./routes/sedes"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
const telegram_1 = __importDefault(require("./routes/telegram"));
const notificaciones_1 = __importDefault(require("./routes/notificaciones"));
const telegram_2 = require("./utils/telegram");
const cierreTurnos_1 = require("./utils/cierreTurnos");
const contratos_2 = require("./routes/contratos");
const cierreAlmuerzo_1 = require("./utils/cierreAlmuerzo");
const materializarDias_1 = require("./utils/materializarDias");
const suscripcion_2 = require("./utils/suscripcion");
const esProduccion = process.env.NODE_ENV === 'production';
// En producción los secretos NO pueden venir de valores por defecto del código
if (esProduccion && !process.env.JWT_SECRET) {
    console.error('FALTA JWT_SECRET: define un secreto largo y aleatorio en las variables de entorno.');
    process.exit(1);
}
// bodyLimit amplio: los comprobantes de pago viajan como imagen base64
// rewriteUrl: compatibilidad con hosting compartido (cPanel/Passenger) — si la
// app se monta en <dominio>/api, algunas configuraciones entregan la URL sin el
// prefijo. Todas nuestras rutas viven bajo /api, así que lo reponemos si falta.
const app = (0, fastify_1.default)({
    logger: true,
    bodyLimit: 10 * 1024 * 1024,
    rewriteUrl(req) {
        const url = req.url ?? '/';
        return url.startsWith('/api') ? url : '/api' + url;
    },
});
// CORS: en producción se restringe al dominio del frontend (FRONTEND_ORIGIN,
// ej. https://horapro.co). Sin la variable, queda abierto (solo desarrollo).
// @fastify/cors v9+ solo permite GET/HEAD/POST por defecto: hay que declarar el resto
app.register(cors_1.default, {
    origin: process.env.FRONTEND_ORIGIN ? process.env.FRONTEND_ORIGIN.split(',') : true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],
});
app.register(jwt_1.default, { secret: process.env.JWT_SECRET || 'conteo_horas_secret_2024' });
// Límite de intentos contra fuerza bruta. Global generoso; los endpoints
// sensibles (login, registro, recuperar contraseña) declaran su propio límite.
app.register(rate_limit_1.default, { global: false });
app.decorate('authenticate', async (request, reply) => {
    try {
        await request.jwtVerify();
    }
    catch {
        reply.status(401).send({ error: 'No autorizado' });
    }
});
// Usuario de empresa (ADMIN/SUPERVISOR): exige tenant y suscripción con acceso
app.decorate('requireEmpresa', async (request, reply) => {
    try {
        await request.jwtVerify();
    }
    catch {
        return reply.status(401).send({ error: 'No autorizado' });
    }
    const payload = request.user;
    if (!payload.empresaId || (payload.rol !== 'ADMIN' && payload.rol !== 'SUPERVISOR')) {
        return reply.status(403).send({ error: 'Requiere usuario de empresa' });
    }
    const [empresa, suscripcion] = await Promise.all([
        prisma_1.prisma.empresa.findUnique({ where: { id: payload.empresaId } }),
        prisma_1.prisma.suscripcion.findUnique({ where: { empresaId: payload.empresaId } }),
    ]);
    if (!empresa?.activa) {
        return reply.status(403).send({ error: 'Empresa inactiva' });
    }
    if (!empresa.exentaPago && suscripcion && !(0, suscripcion_2.accesoPermitido)((0, suscripcion_2.estadoEfectivo)(suscripcion))) {
        return reply.status(402).send({
            error: 'Suscripción suspendida por falta de pago. Contacta a HoraPro.',
            codigo: 'SUSCRIPCION_SUSPENDIDA',
        });
    }
    request.empresaId = payload.empresaId;
    request.usuarioId = payload.id;
    request.usuarioNombre = payload.nombre;
});
app.decorate('requireSuperAdmin', async (request, reply) => {
    try {
        await request.jwtVerify();
    }
    catch {
        return reply.status(401).send({ error: 'No autorizado' });
    }
    const payload = request.user;
    if (payload.rol !== 'SUPER_ADMIN') {
        return reply.status(403).send({ error: 'Requiere super administrador' });
    }
});
// Afiliado (programa de referidos): exige rol AFILIADO con su afiliadoId
app.decorate('requireAfiliado', async (request, reply) => {
    try {
        await request.jwtVerify();
    }
    catch {
        return reply.status(401).send({ error: 'No autorizado' });
    }
    const payload = request.user;
    if (payload.rol !== 'AFILIADO' || !payload.afiliadoId) {
        return reply.status(403).send({ error: 'Requiere cuenta de afiliado' });
    }
    request.afiliadoId = payload.afiliadoId;
});
app.register(auth_1.default, { prefix: '/api/auth' });
app.register(colaboradores_1.default, { prefix: '/api/colaboradores' });
app.register(registros_1.default, { prefix: '/api/registros' });
app.register(permisos_1.default, { prefix: '/api/permisos' });
app.register(contratos_1.default, { prefix: '/api/contratos' });
app.register(festivos_1.default, { prefix: '/api/festivos' });
app.register(configuracion_1.default, { prefix: '/api/configuracion' });
app.register(reportes_1.default, { prefix: '/api/reportes' });
app.register(sedes_1.default, { prefix: '/api/sedes' });
app.register(worker_1.default, { prefix: '/api/worker' });
app.register(admin_1.default, { prefix: '/api/admin' });
app.register(afiliados_1.default, { prefix: '/api/admin/afiliados' });
app.register(afiliado_panel_1.default, { prefix: '/api/afiliado' });
app.register(wompi_1.default, { prefix: '/api/wompi' });
app.register(suscripcion_1.default, { prefix: '/api/suscripcion' });
app.register(horarios_1.default, { prefix: '/api/horarios' });
app.register(dashboard_1.default, { prefix: '/api/dashboard' });
app.register(telegram_1.default, { prefix: '/api/telegram' });
app.register(notificaciones_1.default, { prefix: '/api/notificaciones' });
app.get('/api/health', async () => ({ status: 'ok' }));
// Retención de fotos de verificación facial: 2 meses. Corre al arrancar y cada 24h
// para que las imágenes base64 no crezcan sin límite en la base de datos.
const DOS_MESES_MS = 60 * 24 * 60 * 60 * 1000;
async function limpiarFotosAntiguas() {
    try {
        const corte = new Date(Date.now() - DOS_MESES_MS);
        const { count } = await prisma_1.prisma.registro.updateMany({
            where: {
                creadoEn: { lt: corte },
                OR: [{ fotoEntrada: { not: null } }, { fotoSalida: { not: null } }],
            },
            data: { fotoEntrada: null, fotoSalida: null },
        });
        if (count > 0)
            app.log.info(`Fotos de verificación eliminadas (retención 2 meses): ${count} registros`);
    }
    catch (err) {
        app.log.error(err, 'Error limpiando fotos antiguas');
    }
}
const start = async () => {
    try {
        // '::' escucha IPv6 e IPv4 (dual-stack); localhost puede resolver a ::1
        await app.listen({ port: Number(process.env.PORT) || 3001, host: '::' });
        console.log('HoraPro API corriendo en puerto 3001');
        limpiarFotosAntiguas();
        setInterval(limpiarFotosAntiguas, 24 * 60 * 60 * 1000);
        // Cierra turnos que quedaron sin salida (marca "No marcó salida" para revisar).
        //
        // Cada HORA, no cada 24: un turno olvidado solo se vuelve elegible a la
        // medianoche del día siguiente (el barrido solo toca días ya pasados), así
        // que con una pasada diaria la hora a la que se cierra es la hora a la que
        // arrancó el proceso. El despliegue del 31/08 reinició la app a las 22:12 y
        // dejó el barrido corriendo a las 22:12: los turnos olvidados del lunes se
        // vieron abiertos toda la jornada del martes y solo se habrían cerrado esa
        // noche. Con una pasada por hora se cierran poco después de medianoche, sin
        // importar cuándo arrancó la app.
        //
        // Cada hora y no una vez de madrugada porque un turno nocturno (21:00→05:00)
        // no es elegible hasta las 07:00 del día siguiente, cuando vence su gracia:
        // una única pasada a medianoche lo dejaría abierto un día entero más.
        //
        // Que corra 24 veces al día sale gratis solo por el índice
        // `(salidaEstimada, salida, entrada)`: sin él la consulta es un `Table scan`
        // sobre todo el historial de marcaciones. Ver `sql/indice-turnos-abiertos.sql`.
        (0, cierreTurnos_1.cerrarTurnosOlvidados)(app.log);
        setInterval(() => (0, cierreTurnos_1.cerrarTurnosOlvidados)(app.log), 60 * 60 * 1000);
        // Almuerzos que quedaron sin regreso. No se cierran solos: la evidencia de
        // quien volvió y no marcó es idéntica a la de quien se fue para la casa, así
        // que darle la tarde por buena sería fabricar horas pagadas. Se avisa.
        (0, cierreAlmuerzo_1.avisarAlmuerzosSinRegreso)(app.log);
        setInterval(() => (0, cierreAlmuerzo_1.avisarAlmuerzosSinRegreso)(app.log), 24 * 60 * 60 * 1000);
        // Vencimientos de contratos. Antes esto solo corría cuando alguien abría el
        // tablero, así que la empresa que no entraba no se enteraba. Al arrancar y
        // cada 24h, como los demás: en un hosting que duerme la app, el arranque es
        // lo que de verdad garantiza el barrido, porque cualquier petición la
        // despierta (incluida una marcación del kiosco).
        (0, contratos_2.avisarContratosDeTodas)(app.log);
        setInterval(() => (0, contratos_2.avisarContratosDeTodas)(app.log), 24 * 60 * 60 * 1000);
        // Materializa el día esperado de cada colaborador para hoy y las próximas
        // semanas. Sin esto la tabla se queda vacía y todo se resuelve con el
        // horario VIGENTE, que es justo lo que reescribía el pasado.
        // Es idempotente y solo escribe donde falta, así que correr de más no daña.
        (0, materializarDias_1.mantenerVentana)(app.log);
        setInterval(() => (0, materializarDias_1.mantenerVentana)(app.log), 24 * 60 * 60 * 1000);
        // Registra el webhook del bot de Telegram (si hay URL configurada)
        if (process.env.TELEGRAM_WEBHOOK_URL)
            (0, telegram_2.configurarWebhook)(process.env.TELEGRAM_WEBHOOK_URL);
    }
    catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};
start();
