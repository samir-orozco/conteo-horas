import { FastifyInstance } from 'fastify';
import { prisma } from '../index';

export default async function permisoRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  app.get('/', auth, async (request) => {
    const { colaboradorId } = request.query as any;
    return prisma.permiso.findMany({
      where: colaboradorId ? { colaboradorId } : {},
      include: { colaborador: true },
      orderBy: { fechaInicio: 'desc' },
    });
  });

  app.post('/', auth, async (request, reply) => {
    const data = request.body as any;
    const permiso = await prisma.permiso.create({ data });
    return reply.status(201).send(permiso);
  });

  app.put('/:id', auth, async (request) => {
    const { id } = request.params as { id: string };
    const data = request.body as any;
    return prisma.permiso.update({ where: { id }, data });
  });

  app.delete('/:id', auth, async (request) => {
    const { id } = request.params as { id: string };
    return prisma.permiso.delete({ where: { id } });
  });
}
