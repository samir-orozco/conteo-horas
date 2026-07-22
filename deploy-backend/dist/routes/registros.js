"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = registroRoutes;
const date_fns_tz_1 = require("date-fns-tz");
const index_1 = require("../index");
const tardanzas_1 = require("../utils/tardanzas");
const TZ = 'America/Bogota';
const TIPOS_REGISTRO = new Set(['NORMAL', 'PERMISO', 'FESTIVO']);
// Lista blanca de campos que la empresa puede escribir en un registro. Evita
// mass-assignment (inyectar fotos base64, editadoPor, creadoEn, etc. desde el body).
function camposRegistro(body, esNuevo) {
    const out = {};
    if (esNuevo || body.colaboradorId !== undefined)
        out.colaboradorId = body.colaboradorId;
    if (body.fecha !== undefined)
        out.fecha = body.fecha ? new Date(body.fecha) : undefined;
    if (body.entrada !== undefined)
        out.entrada = body.entrada ? new Date(body.entrada) : null;
    if (body.salida !== undefined)
        out.salida = body.salida ? new Date(body.salida) : null;
    if (body.tipo !== undefined && TIPOS_REGISTRO.has(body.tipo))
        out.tipo = body.tipo;
    if (body.observacion !== undefined)
        out.observacion = body.observacion || null;
    return out;
}
async function registroRoutes(app) {
    const auth = { preHandler: [app.requireEmpresa] };
    // Verifica que el colaborador pertenezca a la empresa del token
    async function colaboradorDeEmpresa(colaboradorId, empresaId) {
        return index_1.prisma.colaborador.findFirst({ where: { id: colaboradorId, empresaId } });
    }
    app.get('/', auth, async (request) => {
        const { colaboradorId, desde, hasta } = request.query;
        const where = { colaborador: { empresaId: request.empresaId } };
        if (colaboradorId)
            where.colaboradorId = colaboradorId;
        if (desde || hasta) {
            where.fecha = {};
            if (desde)
                where.fecha.gte = new Date(desde);
            // "hasta" es inclusivo: los registros se guardan a las 05:00 UTC (medianoche
            // de Bogotá), así que cubrimos todo el día tomando hasta el inicio del día siguiente.
            if (hasta)
                where.fecha.lt = new Date(new Date(hasta).getTime() + 24 * 60 * 60 * 1000);
        }
        const registros = await index_1.prisma.registro.findMany({
            where,
            include: { colaborador: { include: { horario: { include: { franjas: true } } } } },
            orderBy: { fecha: 'desc' },
        });
        // La tardanza solo se evalúa en la PRIMERA entrada del día de cada colaborador
        // (un reingreso después del almuerzo no es una llegada tarde).
        const primeraEntradaDia = new Map(); // colaboradorId|día -> registro.id
        for (const r of registros) {
            if (!r.entrada)
                continue;
            const clave = `${r.colaboradorId}|${(0, date_fns_tz_1.toZonedTime)(r.fecha, TZ).toDateString()}`;
            const actual = registros.find(x => x.id === primeraEntradaDia.get(clave));
            if (!actual || r.entrada < actual.entrada)
                primeraEntradaDia.set(clave, r.id);
        }
        // Las fotos (base64) no viajan en la lista: solo un indicador; se piden con /:id/fotos.
        // La llegada se evalúa contra el horario asignado (null si no aplica ese día).
        return registros.map(r => {
            const { fotoEntrada, fotoSalida, colaborador, ...resto } = r;
            const h = colaborador.horario;
            let minutosTarde = null;
            const clave = `${r.colaboradorId}|${(0, date_fns_tz_1.toZonedTime)(r.fecha, TZ).toDateString()}`;
            const esPrimeraDelDia = primeraEntradaDia.get(clave) === r.id;
            if (r.entrada && esPrimeraDelDia && r.tipo !== 'FESTIVO' && h && h.activo) {
                const diaSemana = tardanzas_1.DIAS_SEMANA[(0, date_fns_tz_1.toZonedTime)(r.fecha, TZ).getDay()];
                const franja = (0, tardanzas_1.franjaDelDia)(h, diaSemana);
                if (franja) {
                    const z = (0, date_fns_tz_1.toZonedTime)(r.entrada, TZ);
                    const tarde = z.getHours() * 60 + z.getMinutes() - ((0, tardanzas_1.minutosDe)(franja.horaEntrada) + h.toleranciaMin);
                    minutosTarde = Math.max(0, tarde);
                }
            }
            return {
                ...resto,
                colaborador: { id: colaborador.id, nombre: colaborador.nombre, apellido: colaborador.apellido },
                minutosTarde,
                tieneFotoEntrada: !!fotoEntrada,
                tieneFotoSalida: !!fotoSalida,
            };
        });
    });
    // Fotos de verificación facial de un registro (se conservan 2 meses)
    app.get('/:id/fotos', auth, async (request, reply) => {
        const { id } = request.params;
        const registro = await index_1.prisma.registro.findFirst({
            where: { id, colaborador: { empresaId: request.empresaId } },
            select: { fotoEntrada: true, fotoSalida: true },
        });
        if (!registro)
            return reply.status(404).send({ error: 'Registro no encontrado' });
        return registro;
    });
    // Registrar entrada (reloj - usa hora actual de Bogotá)
    app.post('/entrada', auth, async (request, reply) => {
        const { colaboradorId } = request.body;
        if (!(await colaboradorDeEmpresa(colaboradorId, request.empresaId))) {
            return reply.status(404).send({ error: 'Colaborador no encontrado' });
        }
        const ahora = new Date();
        const fechaBogota = (0, date_fns_tz_1.toZonedTime)(ahora, TZ);
        fechaBogota.setHours(0, 0, 0, 0);
        const existente = await index_1.prisma.registro.findFirst({
            where: { colaboradorId, fecha: { gte: fechaBogota, lt: new Date(fechaBogota.getTime() + 86400000) }, salida: null },
        });
        if (existente)
            return reply.status(400).send({ error: 'Ya tiene una entrada activa hoy' });
        const registro = await index_1.prisma.registro.create({
            data: { colaboradorId, fecha: ahora, entrada: ahora, tipo: 'NORMAL' },
        });
        return reply.status(201).send(registro);
    });
    // Registrar salida
    app.post('/salida', auth, async (request, reply) => {
        const { colaboradorId } = request.body;
        if (!(await colaboradorDeEmpresa(colaboradorId, request.empresaId))) {
            return reply.status(404).send({ error: 'Colaborador no encontrado' });
        }
        const ahora = new Date();
        const fechaBogota = (0, date_fns_tz_1.toZonedTime)(ahora, TZ);
        fechaBogota.setHours(0, 0, 0, 0);
        const registro = await index_1.prisma.registro.findFirst({
            where: { colaboradorId, fecha: { gte: fechaBogota, lt: new Date(fechaBogota.getTime() + 86400000) }, salida: null },
            orderBy: { entrada: 'desc' },
        });
        if (!registro)
            return reply.status(400).send({ error: 'No hay entrada activa hoy' });
        return index_1.prisma.registro.update({ where: { id: registro.id }, data: { salida: ahora } });
    });
    // Registro manual (admin)
    app.post('/', auth, async (request, reply) => {
        const body = request.body;
        if (!(await colaboradorDeEmpresa(body.colaboradorId, request.empresaId))) {
            return reply.status(404).send({ error: 'Colaborador no encontrado' });
        }
        const registro = await index_1.prisma.registro.create({ data: camposRegistro(body, true) });
        return reply.status(201).send(registro);
    });
    // Corrección manual — deja rastro de auditoría
    app.put('/:id', auth, async (request, reply) => {
        const { id } = request.params;
        const payload = request.user;
        const existente = await index_1.prisma.registro.findFirst({
            where: { id, colaborador: { empresaId: request.empresaId } },
        });
        if (!existente)
            return reply.status(404).send({ error: 'Registro no encontrado' });
        const body = request.body;
        // Si se reasigna el colaborador, debe pertenecer a la MISMA empresa (evita
        // reasignar el registro a otra empresa vía body manipulado).
        if (body.colaboradorId !== undefined && !(await colaboradorDeEmpresa(body.colaboradorId, request.empresaId))) {
            return reply.status(404).send({ error: 'Colaborador no encontrado' });
        }
        return index_1.prisma.registro.update({
            where: { id },
            data: { ...camposRegistro(body, false), editadoPor: payload.email ?? payload.id, editadoEn: new Date() },
        });
    });
    app.delete('/:id', auth, async (request, reply) => {
        const { id } = request.params;
        const existente = await index_1.prisma.registro.findFirst({
            where: { id, colaborador: { empresaId: request.empresaId } },
        });
        if (!existente)
            return reply.status(404).send({ error: 'Registro no encontrado' });
        return index_1.prisma.registro.delete({ where: { id } });
    });
}
