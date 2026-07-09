import { FastifyInstance } from 'fastify';
import { prisma } from '../index';
import { calcularValorHora } from '../utils/horasColombiana';
import { jornadaVigente, horasMesDeJornada } from '../utils/vigencias';
import { finDeMes } from '../utils/suscripcion';

export default async function colaboradorRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.requireEmpresa] };

  // Aplica los retiros programados que ya vencieron (barrido perezoso)
  async function aplicarRetiros(empresaId: string) {
    await prisma.colaborador.updateMany({
      where: { empresaId, activo: true, retiroProgramado: { lte: new Date() } },
      data: { activo: false, retiroProgramado: null },
    });
  }

  app.get('/', auth, async (request) => {
    await aplicarRetiros(request.empresaId!);
    return prisma.colaborador.findMany({
      where: { empresaId: request.empresaId, activo: true },
      orderBy: { nombre: 'asc' },
    });
  });

  app.get('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const col = await prisma.colaborador.findFirst({
      where: { id, empresaId: request.empresaId },
      include: { horario: true },
    });
    if (!col) return reply.status(404).send({ error: 'No encontrado' });
    return col;
  });

  // Valida que el horario asignado sea de la misma empresa
  async function horarioValido(horarioId: string | null | undefined, empresaId: string): Promise<boolean> {
    if (!horarioId) return true;
    const h = await prisma.horario.findFirst({ where: { id: horarioId, empresaId, activo: true } });
    return Boolean(h);
  }

  // La fecha de nacimiento llega como "YYYY-MM-DD"; la normalizamos a Date (o null)
  function normalizar(data: any) {
    if ('fechaNacimiento' in data) {
      data.fechaNacimiento = data.fechaNacimiento ? new Date(`${data.fechaNacimiento}T12:00:00Z`) : null;
    }
    return data;
  }

  app.post('/', auth, async (request, reply) => {
    const data = normalizar(request.body as any);
    if (!(await horarioValido(data.horarioId, request.empresaId!))) {
      return reply.status(400).send({ error: 'Horario inválido' });
    }

    // La cédula es única por empresa. Si ya existe desactivado (lo "borraron"),
    // se reactiva con los datos nuevos y conserva todo su historial de horas.
    const existente = await prisma.colaborador.findUnique({
      where: { empresaId_cedula: { empresaId: request.empresaId!, cedula: data.cedula } },
    });
    if (existente) {
      if (existente.activo) {
        return reply.status(409).send({ error: `La cédula ${data.cedula} ya está registrada para ${existente.nombre} ${existente.apellido}` });
      }
      const reactivado = await prisma.colaborador.update({
        where: { id: existente.id },
        data: { ...data, activo: true, retiroProgramado: null },
      });
      return reply.status(200).send({ ...reactivado, reactivado: true });
    }

    const colaborador = await prisma.colaborador.create({
      data: { ...data, empresaId: request.empresaId! },
    });
    return reply.status(201).send(colaborador);
  });

  app.put('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const existente = await prisma.colaborador.findFirst({ where: { id, empresaId: request.empresaId } });
    if (!existente) return reply.status(404).send({ error: 'No encontrado' });
    const { empresaId: _ignorar, horario: _rel, ...rest } = request.body as any;
    const data = normalizar(rest);
    if (!(await horarioValido(data.horarioId, request.empresaId!))) {
      return reply.status(400).send({ error: 'Horario inválido' });
    }
    return prisma.colaborador.update({ where: { id }, data });
  });

  // Estilo Notion: si el mes ya está pagado, el colaborador queda cubierto y
  // sigue activo hasta fin de mes; el retiro se aplica al iniciar el siguiente.
  // Si no hay mes pagado, se desactiva de inmediato.
  app.delete('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const existente = await prisma.colaborador.findFirst({ where: { id, empresaId: request.empresaId } });
    if (!existente) return reply.status(404).send({ error: 'No encontrado' });

    const susc = await prisma.suscripcion.findUnique({ where: { empresaId: request.empresaId! } });
    const mesPagado = Boolean(susc?.pagadoHasta && susc.pagadoHasta > new Date());

    if (mesPagado) {
      const colaborador = await prisma.colaborador.update({
        where: { id },
        data: { retiroProgramado: finDeMes() },
      });
      return { ...colaborador, retiroInmediato: false };
    }
    const colaborador = await prisma.colaborador.update({
      where: { id },
      data: { activo: false, retiroProgramado: null },
    });
    return { ...colaborador, retiroInmediato: true };
  });

  app.get('/:id/valor-hora', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const colaborador = await prisma.colaborador.findFirst({ where: { id, empresaId: request.empresaId } });
    if (!colaborador) return reply.status(404).send({ error: 'No encontrado' });

    const jornadas = await prisma.jornadaVigencia.findMany();
    const jornada = jornadaVigente(new Date(), jornadas);
    const horasMes = horasMesDeJornada(jornada);
    return {
      salarioMensual: colaborador.salarioMensual,
      jornadaSemanal: jornada,
      horasMes,
      valorHora: calcularValorHora(colaborador.salarioMensual, horasMes),
    };
  });
}
