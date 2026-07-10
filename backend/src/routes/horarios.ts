import { FastifyInstance } from 'fastify';
import { prisma } from '../index';

type FranjaInput = { dias: string[]; horaEntrada: string; horaSalida: string };

// Cada franja: días válidos, horas HH:MM y al menos un día
function validarFranjas(franjas: unknown): franjas is FranjaInput[] {
  if (!Array.isArray(franjas) || franjas.length === 0) return false;
  return franjas.every(f =>
    Array.isArray(f?.dias) && f.dias.length > 0 &&
    /^\d{2}:\d{2}$/.test(f?.horaEntrada) && /^\d{2}:\d{2}$/.test(f?.horaSalida)
  );
}

// Horarios de trabajo de la empresa (se asignan a cada colaborador). Un horario
// agrupa varias franjas: ej. "Oficina" = L-V 08:00-17:00 + Sáb 08:00-12:00.
export default async function horarioRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.requireEmpresa] };

  app.get('/', auth, async (request) => {
    return prisma.horario.findMany({
      where: { empresaId: request.empresaId, activo: true },
      include: {
        franjas: true,
        _count: { select: { colaboradores: { where: { activo: true } } } },
      },
      orderBy: { nombre: 'asc' },
    });
  });

  app.post('/', auth, async (request, reply) => {
    const { nombre, toleranciaMin, franjas } = request.body as any;
    if (!nombre) return reply.status(400).send({ error: 'El nombre es obligatorio' });
    if (!validarFranjas(franjas)) {
      return reply.status(400).send({ error: 'Agrega al menos una franja con días y horas válidas (HH:MM)' });
    }
    const horario = await prisma.horario.create({
      data: {
        empresaId: request.empresaId!,
        nombre,
        toleranciaMin: toleranciaMin ?? 10,
        franjas: { create: franjas.map(f => ({ dias: f.dias, horaEntrada: f.horaEntrada, horaSalida: f.horaSalida })) },
      },
      include: { franjas: true },
    });
    return reply.status(201).send(horario);
  });

  app.put('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const existente = await prisma.horario.findFirst({ where: { id, empresaId: request.empresaId } });
    if (!existente) return reply.status(404).send({ error: 'Horario no encontrado' });
    const { nombre, toleranciaMin, franjas } = request.body as any;
    if (!validarFranjas(franjas)) {
      return reply.status(400).send({ error: 'Agrega al menos una franja con días y horas válidas (HH:MM)' });
    }
    // Las franjas se reemplazan completas: es la forma simple y sin ambigüedad
    return prisma.horario.update({
      where: { id },
      data: {
        nombre,
        toleranciaMin,
        franjas: {
          deleteMany: {},
          create: franjas.map(f => ({ dias: f.dias, horaEntrada: f.horaEntrada, horaSalida: f.horaSalida })),
        },
      },
      include: { franjas: true },
    });
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
