import { FastifyInstance } from 'fastify';
import { toZonedTime } from 'date-fns-tz';
import { prisma } from '../index';

const TZ = 'America/Bogota';

export default async function registroRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  app.get('/', auth, async (request) => {
    const { colaboradorId, desde, hasta } = request.query as any;
    const where: any = {};
    if (colaboradorId) where.colaboradorId = colaboradorId;
    if (desde || hasta) {
      where.fecha = {};
      if (desde) where.fecha.gte = new Date(desde);
      if (hasta) where.fecha.lte = new Date(hasta);
    }
    return prisma.registro.findMany({ where, include: { colaborador: true }, orderBy: { fecha: 'desc' } });
  });

  // Registrar entrada (reloj - usa hora actual de Bogotá)
  app.post('/entrada', auth, async (request, reply) => {
    const { colaboradorId } = request.body as { colaboradorId: string };
    const ahora = new Date();
    const fechaBogota = toZonedTime(ahora, TZ);
    fechaBogota.setHours(0, 0, 0, 0);

    const existente = await prisma.registro.findFirst({
      where: { colaboradorId, fecha: { gte: fechaBogota, lt: new Date(fechaBogota.getTime() + 86400000) }, salida: null },
    });
    if (existente) return reply.status(400).send({ error: 'Ya tiene una entrada activa hoy' });

    const registro = await prisma.registro.create({
      data: { colaboradorId, fecha: ahora, entrada: ahora, tipo: 'NORMAL' },
    });
    return reply.status(201).send(registro);
  });

  // Registrar salida
  app.post('/salida', auth, async (request, reply) => {
    const { colaboradorId } = request.body as { colaboradorId: string };
    const ahora = new Date();
    const fechaBogota = toZonedTime(ahora, TZ);
    fechaBogota.setHours(0, 0, 0, 0);

    const registro = await prisma.registro.findFirst({
      where: { colaboradorId, fecha: { gte: fechaBogota, lt: new Date(fechaBogota.getTime() + 86400000) }, salida: null },
      orderBy: { entrada: 'desc' },
    });
    if (!registro) return reply.status(400).send({ error: 'No hay entrada activa hoy' });

    return prisma.registro.update({ where: { id: registro.id }, data: { salida: ahora } });
  });

  // Registro manual (admin)
  app.post('/', auth, async (request, reply) => {
    const data = request.body as any;
    const registro = await prisma.registro.create({ data });
    return reply.status(201).send(registro);
  });

  app.put('/:id', auth, async (request) => {
    const { id } = request.params as { id: string };
    const data = request.body as any;
    return prisma.registro.update({ where: { id }, data });
  });

  app.delete('/:id', auth, async (request) => {
    const { id } = request.params as { id: string };
    return prisma.registro.delete({ where: { id } });
  });
}
