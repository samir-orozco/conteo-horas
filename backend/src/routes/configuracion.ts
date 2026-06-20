import { FastifyInstance } from 'fastify';
import { prisma } from '../index';

export default async function configuracionRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  app.get('/', auth, async () => {
    const items = await prisma.configuracion.findMany();
    return items.reduce((acc: any, item) => { acc[item.clave] = item.valor; return acc; }, {});
  });

  app.put('/', auth, async (request) => {
    const data = request.body as Record<string, string>;
    await Promise.all(
      Object.entries(data).map(([clave, valor]) =>
        prisma.configuracion.upsert({ where: { clave }, update: { valor }, create: { clave, valor } })
      )
    );
    return { ok: true };
  });

  // Tipos de hora
  app.get('/tipos-hora', auth, async () => {
    return prisma.tipoHora.findMany({ where: { activo: true }, orderBy: { codigo: 'asc' } });
  });

  app.put('/tipos-hora/:id', auth, async (request) => {
    const { id } = request.params as { id: string };
    const data = request.body as any;
    return prisma.tipoHora.update({ where: { id }, data });
  });
}
