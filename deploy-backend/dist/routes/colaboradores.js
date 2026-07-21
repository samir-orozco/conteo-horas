"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = colaboradorRoutes;
const client_1 = require("@prisma/client");
const index_1 = require("../index");
const horasColombiana_1 = require("../utils/horasColombiana");
const vigencias_1 = require("../utils/vigencias");
const suscripcion_1 = require("../utils/suscripcion");
const capacidades_1 = require("../utils/capacidades");
const rostro_1 = require("../utils/rostro");
async function colaboradorRoutes(app) {
    const auth = { preHandler: [app.requireEmpresa] };
    // Aplica los retiros programados que ya vencieron (barrido perezoso)
    async function aplicarRetiros(empresaId) {
        await index_1.prisma.colaborador.updateMany({
            where: { empresaId, activo: true, retiroProgramado: { lte: new Date() } },
            data: { activo: false, retiroProgramado: null },
        });
    }
    app.get('/', auth, async (request) => {
        await aplicarRetiros(request.empresaId);
        return index_1.prisma.colaborador.findMany({
            where: { empresaId: request.empresaId, activo: true },
            orderBy: { nombre: 'asc' },
        });
    });
    app.get('/:id', auth, async (request, reply) => {
        const { id } = request.params;
        const col = await index_1.prisma.colaborador.findFirst({
            where: { id, empresaId: request.empresaId },
            include: { horario: { include: { franjas: true } } },
        });
        if (!col)
            return reply.status(404).send({ error: 'No encontrado' });
        return col;
    });
    // Valida que el horario asignado sea de la misma empresa
    async function horarioValido(horarioId, empresaId) {
        if (!horarioId)
            return true;
        const h = await index_1.prisma.horario.findFirst({ where: { id: horarioId, empresaId, activo: true } });
        return Boolean(h);
    }
    // La fecha de nacimiento llega como "YYYY-MM-DD"; la normalizamos a Date (o null)
    function normalizar(data) {
        if ('fechaNacimiento' in data) {
            data.fechaNacimiento = data.fechaNacimiento ? new Date(`${data.fechaNacimiento}T12:00:00Z`) : null;
        }
        return data;
    }
    app.post('/', auth, async (request, reply) => {
        const data = normalizar(request.body);
        if (!(await horarioValido(data.horarioId, request.empresaId))) {
            return reply.status(400).send({ error: 'Horario inválido' });
        }
        // La cédula es única por empresa. Si ya existe desactivado (lo "borraron"),
        // se reactiva con los datos nuevos y conserva todo su historial de horas.
        const existente = await index_1.prisma.colaborador.findUnique({
            where: { empresaId_cedula: { empresaId: request.empresaId, cedula: data.cedula } },
        });
        if (existente?.activo) {
            return reply.status(409).send({ error: `La cédula ${data.cedula} ya está registrada para ${existente.nombre} ${existente.apellido}` });
        }
        // Límite de colaboradores según el plan (crear o reactivar suma un activo)
        const cap = await (0, capacidades_1.capacidadesEmpresa)(request.empresaId);
        if (cap.limite !== Infinity) {
            const activos = await index_1.prisma.colaborador.count({ where: { empresaId: request.empresaId, activo: true } });
            if (activos >= cap.limite) {
                return reply.status(403).send({
                    error: `Tu plan ${cap.nombrePlan} permite hasta ${cap.limite} colaboradores.`,
                    codigo: 'LIMITE_PLAN', limite: cap.limite, plan: cap.plan,
                });
            }
        }
        if (existente) {
            const reactivado = await index_1.prisma.colaborador.update({
                where: { id: existente.id },
                data: { ...data, activo: true, retiroProgramado: null },
            });
            return reply.status(200).send({ ...reactivado, reactivado: true });
        }
        const colaborador = await index_1.prisma.colaborador.create({
            data: { ...data, empresaId: request.empresaId },
        });
        return reply.status(201).send(colaborador);
    });
    app.put('/:id', auth, async (request, reply) => {
        const { id } = request.params;
        const existente = await index_1.prisma.colaborador.findFirst({ where: { id, empresaId: request.empresaId } });
        if (!existente)
            return reply.status(404).send({ error: 'No encontrado' });
        const { empresaId: _ignorar, horario: _rel, ...rest } = request.body;
        const data = normalizar(rest);
        if (!(await horarioValido(data.horarioId, request.empresaId))) {
            return reply.status(400).send({ error: 'Horario inválido' });
        }
        return index_1.prisma.colaborador.update({ where: { id }, data });
    });
    // Estilo Notion: si el mes ya está pagado, el colaborador queda cubierto y
    // sigue activo hasta fin de mes; el retiro se aplica al iniciar el siguiente.
    // Si no hay mes pagado, se desactiva de inmediato.
    app.delete('/:id', auth, async (request, reply) => {
        const { id } = request.params;
        const existente = await index_1.prisma.colaborador.findFirst({ where: { id, empresaId: request.empresaId } });
        if (!existente)
            return reply.status(404).send({ error: 'No encontrado' });
        const susc = await index_1.prisma.suscripcion.findUnique({ where: { empresaId: request.empresaId } });
        const mesPagado = Boolean(susc?.pagadoHasta && susc.pagadoHasta > new Date());
        if (mesPagado) {
            const colaborador = await index_1.prisma.colaborador.update({
                where: { id },
                data: { retiroProgramado: (0, suscripcion_1.finDeMes)() },
            });
            return { ...colaborador, retiroInmediato: false };
        }
        const colaborador = await index_1.prisma.colaborador.update({
            where: { id },
            data: { activo: false, retiroProgramado: null },
        });
        return { ...colaborador, retiroInmediato: true };
    });
    // Enrolamiento facial guiado: guarda VARIAS muestras (frente, perfiles,
    // con/sin gafas — 128 floats cada una) capturadas en el navegador. La imagen
    // nunca llega al servidor. rostroEnroladoEn queda como evidencia de que hubo
    // consentimiento explícito (dato biométrico, Ley 1581).
    app.post('/:id/rostro', auth, async (request, reply) => {
        const { id } = request.params;
        const { descriptores } = request.body;
        const existente = await index_1.prisma.colaborador.findFirst({ where: { id, empresaId: request.empresaId } });
        if (!existente)
            return reply.status(404).send({ error: 'No encontrado' });
        if (!(0, rostro_1.esListaDescriptoresValida)(descriptores)) {
            return reply.status(400).send({ error: 'Muestras faciales inválidas' });
        }
        const colaborador = await index_1.prisma.colaborador.update({
            where: { id },
            data: { rostroDescriptor: descriptores, rostroEnroladoEn: new Date() },
        });
        return { ok: true, rostroEnroladoEn: colaborador.rostroEnroladoEn };
    });
    app.delete('/:id/rostro', auth, async (request, reply) => {
        const { id } = request.params;
        const existente = await index_1.prisma.colaborador.findFirst({ where: { id, empresaId: request.empresaId } });
        if (!existente)
            return reply.status(404).send({ error: 'No encontrado' });
        await index_1.prisma.colaborador.update({
            where: { id },
            data: { rostroDescriptor: client_1.Prisma.DbNull, rostroEnroladoEn: null },
        });
        return { ok: true };
    });
    app.get('/:id/valor-hora', auth, async (request, reply) => {
        const { id } = request.params;
        const colaborador = await index_1.prisma.colaborador.findFirst({ where: { id, empresaId: request.empresaId } });
        if (!colaborador)
            return reply.status(404).send({ error: 'No encontrado' });
        const jornadas = await index_1.prisma.jornadaVigencia.findMany();
        const jornada = (0, vigencias_1.jornadaVigente)(new Date(), jornadas);
        const horasMes = (0, vigencias_1.horasMesDeJornada)(jornada);
        return {
            salarioMensual: colaborador.salarioMensual,
            jornadaSemanal: jornada,
            horasMes,
            valorHora: (0, horasColombiana_1.calcularValorHora)(colaborador.salarioMensual, horasMes),
        };
    });
}
