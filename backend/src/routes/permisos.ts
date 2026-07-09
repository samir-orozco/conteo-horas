import { FastifyInstance } from 'fastify';
import { prisma } from '../index';

export default async function permisoRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.requireEmpresa] };

  app.get('/', auth, async (request) => {
    const { colaboradorId } = request.query as any;
    const where: any = { colaborador: { empresaId: request.empresaId } };
    if (colaboradorId) where.colaboradorId = colaboradorId;
    return prisma.permiso.findMany({
      where,
      include: { colaborador: true },
      orderBy: { fechaInicio: 'desc' },
    });
  });

  app.post('/', auth, async (request, reply) => {
    const data = request.body as any;
    const col = await prisma.colaborador.findFirst({
      where: { id: data.colaboradorId, empresaId: request.empresaId },
    });
    if (!col) return reply.status(404).send({ error: 'Colaborador no encontrado' });
    const permiso = await prisma.permiso.create({ data });
    return reply.status(201).send(permiso);
  });

  app.put('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const existente = await prisma.permiso.findFirst({
      where: { id, colaborador: { empresaId: request.empresaId } },
    });
    if (!existente) return reply.status(404).send({ error: 'Permiso no encontrado' });
    const data = request.body as any;
    return prisma.permiso.update({ where: { id }, data });
  });

  app.delete('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const existente = await prisma.permiso.findFirst({
      where: { id, colaborador: { empresaId: request.empresaId } },
    });
    if (!existente) return reply.status(404).send({ error: 'Permiso no encontrado' });
    return prisma.permiso.delete({ where: { id } });
  });
}
