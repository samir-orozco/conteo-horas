"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = permisoRoutes;
const index_1 = require("../index");
async function permisoRoutes(app) {
    const auth = { preHandler: [app.requireEmpresa] };
    app.get('/', auth, async (request) => {
        const { colaboradorId } = request.query;
        const where = { colaborador: { empresaId: request.empresaId } };
        if (colaboradorId)
            where.colaboradorId = colaboradorId;
        return index_1.prisma.permiso.findMany({
            where,
            include: { colaborador: true },
            orderBy: { fechaInicio: 'desc' },
        });
    });
    app.post('/', auth, async (request, reply) => {
        const data = request.body;
        const col = await index_1.prisma.colaborador.findFirst({
            where: { id: data.colaboradorId, empresaId: request.empresaId },
        });
        if (!col)
            return reply.status(404).send({ error: 'Colaborador no encontrado' });
        const permiso = await index_1.prisma.permiso.create({ data });
        return reply.status(201).send(permiso);
    });
    app.put('/:id', auth, async (request, reply) => {
        const { id } = request.params;
        const existente = await index_1.prisma.permiso.findFirst({
            where: { id, colaborador: { empresaId: request.empresaId } },
        });
        if (!existente)
            return reply.status(404).send({ error: 'Permiso no encontrado' });
        const data = request.body;
        return index_1.prisma.permiso.update({ where: { id }, data });
    });
    app.delete('/:id', auth, async (request, reply) => {
        const { id } = request.params;
        const existente = await index_1.prisma.permiso.findFirst({
            where: { id, colaborador: { empresaId: request.empresaId } },
        });
        if (!existente)
            return reply.status(404).send({ error: 'Permiso no encontrado' });
        return index_1.prisma.permiso.delete({ where: { id } });
    });
}
