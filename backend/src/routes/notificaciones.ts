import { FastifyInstance } from 'fastify';
import { prisma } from '../index';

// Campana del menú del admin: lista de avisos internos + estado leído/no leído.
export default async function notificacionRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.requireEmpresa] };

  // Últimas notificaciones + cuántas sin leer (para el contador de la campana)
  app.get('/', auth, async (request) => {
    const empresaId = request.empresaId!;
    const [items, noLeidas] = await Promise.all([
      prisma.notificacion.findMany({
        where: { empresaId },
        orderBy: { creadoEn: 'desc' },
        take: 40,
      }),
      prisma.notificacion.count({ where: { empresaId, leida: false } }),
    ]);
    return { items, noLeidas };
  });

  // Marcar una como leída
  app.post('/:id/leer', auth, async (request) => {
    const empresaId = request.empresaId!;
    const { id } = request.params as { id: string };
    await prisma.notificacion.updateMany({
      where: { id, empresaId },
      data: { leida: true, leidaEn: new Date() },
    });
    return { ok: true };
  });

  // Marcar todas como leídas
  app.post('/leer-todas', auth, async (request) => {
    const empresaId = request.empresaId!;
    const { count } = await prisma.notificacion.updateMany({
      where: { empresaId, leida: false },
      data: { leida: true, leidaEn: new Date() },
    });
    return { ok: true, marcadas: count };
  });
}
