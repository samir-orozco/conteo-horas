import { FastifyInstance } from 'fastify';
import { prisma } from '../index';
import { jornadaVigente } from '../utils/vigencias';
import { capacidadesEmpresa } from '../utils/capacidades';

type FranjaInput = { dias: string[]; horaEntrada: string; horaSalida: string; tieneAlmuerzo?: boolean };

// Cada franja: días válidos, horas HH:MM y al menos un día
function validarFranjas(franjas: unknown): franjas is FranjaInput[] {
  if (!Array.isArray(franjas) || franjas.length === 0) return false;
  return franjas.every(f =>
    Array.isArray(f?.dias) && f.dias.length > 0 &&
    /^\d{2}:\d{2}$/.test(f?.horaEntrada) && /^\d{2}:\d{2}$/.test(f?.horaSalida)
  );
}

const mapFranja = (f: FranjaInput) => ({
  dias: f.dias,
  horaEntrada: f.horaEntrada,
  horaSalida: f.horaSalida,
  tieneAlmuerzo: f.tieneAlmuerzo !== false, // por defecto sí descuenta almuerzo
});

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

  // Norma de jornada máxima semanal vigente hoy (Ley 2101), para la etiqueta de cumplimiento
  app.get('/norma', auth, async () => {
    const jornadas = await prisma.jornadaVigencia.findMany();
    return { horasSemanales: jornadaVigente(new Date(), jornadas) };
  });

  app.post('/', auth, async (request, reply) => {
    const { nombre, toleranciaMin, almuerzoMin, franjas } = request.body as any;
    if (!nombre) return reply.status(400).send({ error: 'El nombre es obligatorio' });
    if (!validarFranjas(franjas)) {
      return reply.status(400).send({ error: 'Agrega al menos una franja con días y horas válidas (HH:MM)' });
    }
    // Gating: varios horarios requieren plan Profesional o superior
    const cap = await capacidadesEmpresa(request.empresaId!);
    if (!cap.features.multiHorario) {
      const existentes = await prisma.horario.count({ where: { empresaId: request.empresaId } });
      if (existentes >= 1) {
        return reply.status(403).send({ error: 'Tu plan permite un solo horario. Sube de plan para crear más.', codigo: 'FUNCION_PLAN', funcion: 'multiHorario' });
      }
    }
    const horario = await prisma.horario.create({
      data: {
        empresaId: request.empresaId!,
        nombre,
        toleranciaMin: toleranciaMin ?? 10,
        almuerzoMin: Math.max(0, Number(almuerzoMin) || 0),
        franjas: { create: franjas.map(mapFranja) },
      },
      include: { franjas: true },
    });
    return reply.status(201).send(horario);
  });

  app.put('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const existente = await prisma.horario.findFirst({ where: { id, empresaId: request.empresaId } });
    if (!existente) return reply.status(404).send({ error: 'Horario no encontrado' });
    const { nombre, toleranciaMin, almuerzoMin, franjas } = request.body as any;
    if (!validarFranjas(franjas)) {
      return reply.status(400).send({ error: 'Agrega al menos una franja con días y horas válidas (HH:MM)' });
    }
    // Las franjas se reemplazan completas: es la forma simple y sin ambigüedad
    return prisma.horario.update({
      where: { id },
      data: {
        nombre,
        toleranciaMin,
        almuerzoMin: Math.max(0, Number(almuerzoMin) || 0),
        franjas: {
          deleteMany: {},
          create: franjas.map(mapFranja),
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
