"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = horarioRoutes;
const index_1 = require("../index");
const vigencias_1 = require("../utils/vigencias");
const capacidades_1 = require("../utils/capacidades");
const materializarDias_1 = require("../utils/materializarDias");
// Cada franja: días válidos, horas HH:MM y al menos un día
function validarFranjas(franjas) {
    if (!Array.isArray(franjas) || franjas.length === 0)
        return false;
    return franjas.every(f => Array.isArray(f?.dias) && f.dias.length > 0 &&
        /^\d{2}:\d{2}$/.test(f?.horaEntrada) && /^\d{2}:\d{2}$/.test(f?.horaSalida));
}
const mapFranja = (f) => ({
    dias: f.dias,
    horaEntrada: f.horaEntrada,
    horaSalida: f.horaSalida,
    tieneAlmuerzo: f.tieneAlmuerzo !== false, // por defecto sí descuenta almuerzo
});
// Horarios de trabajo de la empresa (se asignan a cada colaborador). Un horario
// agrupa varias franjas: ej. "Oficina" = L-V 08:00-17:00 + Sáb 08:00-12:00.
async function horarioRoutes(app) {
    const auth = { preHandler: [app.requireEmpresa] };
    app.get('/', auth, async (request) => {
        return index_1.prisma.horario.findMany({
            where: { empresaId: request.empresaId, activo: true },
            include: {
                franjas: true,
                _count: { select: { colaboradores: { where: { activo: true } } } },
            },
            orderBy: { nombre: 'asc' },
        });
    });
    // Norma de jornada máxima semanal vigente hoy (Ley 2101), para la etiqueta de cumplimiento
    app.get('/norma', auth, async () => {
        const jornadas = await index_1.prisma.jornadaVigencia.findMany();
        return { horasSemanales: (0, vigencias_1.jornadaVigente)(new Date(), jornadas) };
    });
    app.post('/', auth, async (request, reply) => {
        const { nombre, toleranciaMin, almuerzoMin, toleranciaSalidaMin, ajustaEntrada, franjas } = request.body;
        if (!nombre)
            return reply.status(400).send({ error: 'El nombre es obligatorio' });
        if (!validarFranjas(franjas)) {
            return reply.status(400).send({ error: 'Agrega al menos una franja con días y horas válidas (HH:MM)' });
        }
        // Gating: varios horarios requieren plan Profesional o superior
        const cap = await (0, capacidades_1.capacidadesEmpresa)(request.empresaId);
        if (!cap.features.multiHorario) {
            const existentes = await index_1.prisma.horario.count({ where: { empresaId: request.empresaId } });
            if (existentes >= 1) {
                return reply.status(403).send({ error: 'Tu plan permite un solo horario. Sube de plan para crear más.', codigo: 'FUNCION_PLAN', funcion: 'multiHorario' });
            }
        }
        const horario = await index_1.prisma.horario.create({
            data: {
                empresaId: request.empresaId,
                nombre,
                toleranciaMin: toleranciaMin ?? 10,
                almuerzoMin: Math.max(0, Number(almuerzoMin) || 0),
                toleranciaSalidaMin: Math.max(0, Number(toleranciaSalidaMin) || 0),
                ajustaEntrada: ajustaEntrada === true,
                franjas: { create: franjas.map(mapFranja) },
            },
            include: { franjas: true },
        });
        return reply.status(201).send(horario);
    });
    app.put('/:id', auth, async (request, reply) => {
        const { id } = request.params;
        const existente = await index_1.prisma.horario.findFirst({ where: { id, empresaId: request.empresaId } });
        if (!existente)
            return reply.status(404).send({ error: 'Horario no encontrado' });
        const { nombre, toleranciaMin, almuerzoMin, toleranciaSalidaMin, ajustaEntrada, franjas } = request.body;
        if (!validarFranjas(franjas)) {
            return reply.status(400).send({ error: 'Agrega al menos una franja con días y horas válidas (HH:MM)' });
        }
        // Las franjas se reemplazan completas: es la forma simple y sin ambigüedad
        const actualizado = await index_1.prisma.horario.update({
            where: { id },
            data: {
                nombre,
                toleranciaMin,
                almuerzoMin: Math.max(0, Number(almuerzoMin) || 0),
                toleranciaSalidaMin: Math.max(0, Number(toleranciaSalidaMin) || 0),
                ajustaEntrada: ajustaEntrada === true,
                franjas: {
                    deleteMany: {},
                    create: franjas.map(mapFranja),
                },
            },
            include: { franjas: true },
        });
        // El cambio aplica de MAÑANA en adelante. Los días ya materializados no se
        // tocan: son los que sostienen los reportes de nómina ya entregados.
        // Si esto falla, el horario igual quedó guardado; se reintenta solo en la
        // pasada diaria de `mantenerVentana`.
        try {
            await (0, materializarDias_1.regenerarFuturoDeHorario)(id, app.log);
        }
        catch (err) {
            app.log.error(err, 'No se pudieron regenerar los días futuros del horario');
        }
        return actualizado;
    });
    // Desactiva el horario y lo desasigna de los colaboradores
    app.delete('/:id', auth, async (request, reply) => {
        const { id } = request.params;
        const existente = await index_1.prisma.horario.findFirst({ where: { id, empresaId: request.empresaId } });
        if (!existente)
            return reply.status(404).send({ error: 'Horario no encontrado' });
        await index_1.prisma.$transaction([
            index_1.prisma.colaborador.updateMany({ where: { horarioId: id }, data: { horarioId: null } }),
            index_1.prisma.horario.update({ where: { id }, data: { activo: false } }),
        ]);
        return { ok: true };
    });
}
