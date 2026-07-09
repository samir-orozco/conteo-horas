import { FastifyInstance } from 'fastify';
import { prisma } from '../index';

// Horarios de trabajo de la empresa (los asigna a cada colaborador)
export default async function horarioRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.requireEmpresa] };

  app.get('/', auth, async (request) => {
    return prisma.horario.findMany({
      where: { empresaId: request.empresaId, activo: true },
      include: { _count: { select: { colaboradores: { where: { activo: true } } } } },
      orderBy: { nombre: 'asc' },
    });
  });

  app.post('/', auth, async (request, reply) => {
    const { nombre, horaEntrada, horaSalida, dias, toleranciaMin } = request.body as any;
    if (!/^\d{2}:\d{2}$/.test(horaEntrada) || !/^\d{2}:\d{2}$/.test(horaSalida)) {
      return reply.status(400).send({ error: 'Horas inválidas (formato HH:MM)' });
    }
    const horario = await prisma.horario.create({
      data: { empresaId: request.empresaId!, nombre, horaEntrada, horaSalida, dias, toleranciaMin: toleranciaMin ?? 10 },
    });
    return reply.status(201).send(horario);
  });

  app.put('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const existente = await prisma.horario.findFirst({ where: { id, empresaId: request.empresaId } });
    if (!existente) return reply.status(404).send({ error: 'Horario no encontrado' });
    const { nombre, horaEntrada, horaSalida, dias, toleranciaMin } = request.body as any;
    return prisma.horario.update({ where: { id }, data: { nombre, horaEntrada, horaSalida, dias, toleranciaMin } });
  });

  // Desactiva el horario y lo desasigna de los colaboradores
  app.delete('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const existente = await prisma.horario.findFirst({ where: { id, empresaId: request.empresaId } });
    if (!existente) return reply.status(404).send({ error: 'Horario no encontrado' });
    await prisma.$transaction([
      prisma.colaborador.updateMany({ where: { horarioId: id }, data: { horarioId: null } }),
      prisma.horario.update({ where: { id }, data: { activo: false } }),
    ]);
    return { ok: true };
  });
}
