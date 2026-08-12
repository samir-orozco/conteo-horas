"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = sedeRoutes;
const index_1 = require("../index");
const capacidades_1 = require("../utils/capacidades");
// Coordenada válida o null. Una sede sin coordenadas no exige ubicación, que es
// una configuración legítima (oficina sin GPS, o sede recién creada).
function coordenada(v, min, max) {
    const n = Number(v);
    if (v === null || v === '' || v === undefined || !Number.isFinite(n))
        return null;
    return n >= min && n <= max ? n : null;
}
function camposSede(body) {
    const lat = coordenada(body.lat, -90, 90);
    const lng = coordenada(body.lng, -180, 180);
    const radio = Math.min(5000, Math.max(20, Number(body.radio) || 150));
    return {
        direccion: body.direccion?.trim() || null,
        // Las dos coordenadas van juntas o no va ninguna: media coordenada no ubica
        // nada y dejaría una geocerca imposible de cumplir.
        lat: lat !== null && lng !== null ? lat : null,
        lng: lat !== null && lng !== null ? lng : null,
        radio,
    };
}
async function sedeRoutes(app) {
    const auth = { preHandler: [app.requireEmpresa] };
    app.get('/', auth, async (request) => {
        return index_1.prisma.sede.findMany({
            where: { empresaId: request.empresaId, activa: true },
            include: { _count: { select: { colaboradores: true } } },
            orderBy: { nombre: 'asc' },
        });
    });
    app.post('/', auth, async (request, reply) => {
        const body = (request.body ?? {});
        const nombre = body.nombre?.trim();
        if (!nombre)
            return reply.status(400).send({ error: 'El nombre de la sede es obligatorio' });
        const existentes = await index_1.prisma.sede.count({ where: { empresaId: request.empresaId, activa: true } });
        if (existentes >= 1) {
            const cap = await (0, capacidades_1.capacidadesEmpresa)(request.empresaId);
            if (!cap.features.multiSede) {
                return reply.status(403).send({
                    error: 'Tu plan permite una sola sede. Sube a Empresarial para manejar varias.',
                    codigo: 'FUNCION_PLAN', funcion: 'multiSede',
                });
            }
        }
        const sede = await index_1.prisma.sede.create({
            data: { empresaId: request.empresaId, nombre, ...camposSede(body) },
        });
        return reply.status(201).send(sede);
    });
    app.put('/:id', auth, async (request, reply) => {
        const { id } = request.params;
        const existente = await index_1.prisma.sede.findFirst({ where: { id, empresaId: request.empresaId } });
        if (!existente)
            return reply.status(404).send({ error: 'Sede no encontrada' });
        const body = (request.body ?? {});
        const nombre = body.nombre?.trim();
        if (!nombre)
            return reply.status(400).send({ error: 'El nombre de la sede es obligatorio' });
        return index_1.prisma.sede.update({ where: { id }, data: { nombre, ...camposSede(body) } });
    });
    // Se desactiva en vez de borrarse: los registros ya marcados apuntan a ella y
    // el reporte histórico tiene que poder seguir diciendo dónde ocurrió cada
    // marcación. Sí se sueltan los colaboradores, o quedarían asignados a una sede
    // donde ya no pueden marcar.
    app.delete('/:id', auth, async (request, reply) => {
        const { id } = request.params;
        const existente = await index_1.prisma.sede.findFirst({ where: { id, empresaId: request.empresaId } });
        if (!existente)
            return reply.status(404).send({ error: 'Sede no encontrada' });
        await index_1.prisma.$transaction([
            index_1.prisma.colaboradorSede.deleteMany({ where: { sedeId: id } }),
            index_1.prisma.sede.update({ where: { id }, data: { activa: false } }),
        ]);
        return { ok: true };
    });
}
