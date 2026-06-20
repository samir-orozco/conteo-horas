import { FastifyInstance } from 'fastify';
import { prisma } from '../index';
import { calcularHorasTrabajadas, calcularLiquidacion } from '../utils/horasColombiana';

export default async function reporteRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  app.get('/liquidacion', auth, async (request) => {
    const { colaboradorId, desde, hasta } = request.query as any;

    const [colaborador, registros, festivos, tiposHora, config] = await Promise.all([
      prisma.colaborador.findUnique({ where: { id: colaboradorId } }),
      prisma.registro.findMany({
        where: { colaboradorId, fecha: { gte: new Date(desde), lte: new Date(hasta) }, salida: { not: null } },
      }),
      prisma.diaFestivo.findMany(),
      prisma.tipoHora.findMany({ where: { activo: true } }),
      prisma.configuracion.findMany(),
    ]);

    if (!colaborador) return { error: 'Colaborador no encontrado' };

    const cfg: Record<string, string> = config.reduce((a: any, c) => { a[c.clave] = c.valor; return a; }, {});
    const horasMes = Number(cfg.HORAS_MES || 200);
    const jornadaSemanal = Number(cfg.JORNADA_SEMANAL || 46);

    const festivosDates = festivos.map(f => new Date(f.fecha));
    let horasPorTipo: ReturnType<typeof calcularHorasTrabajadas> = [];

    for (const registro of registros) {
      if (!registro.entrada || !registro.salida) continue;
      const parcial = calcularHorasTrabajadas(registro.entrada, registro.salida, festivosDates, tiposHora as any, jornadaSemanal);
      for (const p of parcial) {
        const existing = horasPorTipo.find(h => h.codigo === p.codigo);
        if (existing) existing.minutos += p.minutos;
        else horasPorTipo.push({ ...p });
      }
    }

    const liquidacion = calcularLiquidacion(colaborador.salarioMensual, horasMes, horasPorTipo);
    const totalPagar = liquidacion.reduce((s, l) => s + l.subtotal, 0);

    return { colaborador, desde, hasta, liquidacion, totalPagar, registrosCont: registros.length };
  });

  app.get('/asistencia', auth, async (request) => {
    const { desde, hasta } = request.query as any;
    return prisma.registro.findMany({
      where: { fecha: { gte: new Date(desde), lte: new Date(hasta) } },
      include: { colaborador: true },
      orderBy: { fecha: 'desc' },
    });
  });
}
