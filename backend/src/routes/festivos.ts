import { FastifyInstance } from 'fastify';
import { prisma } from '../index';

export default async function festivoRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  app.get('/', auth, async (request) => {
    const { anio } = request.query as any;
    const festivos = await prisma.diaFestivo.findMany({ orderBy: { fecha: 'asc' } });
    if (!anio) return festivos;
    return festivos.filter(f => {
      const año = new Date(f.fecha).getFullYear();
      return año === Number(anio) || f.repetirAnual;
    });
  });

  app.post('/', auth, async (request, reply) => {
    const data = request.body as any;
    const festivo = await prisma.diaFestivo.create({ data: { ...data, fecha: new Date(data.fecha) } });
    return reply.status(201).send(festivo);
  });

  app.delete('/:id', auth, async (request) => {
    const { id } = request.params as { id: string };
    return prisma.diaFestivo.delete({ where: { id } });
  });
}
