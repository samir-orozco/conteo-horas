import { FastifyInstance } from 'fastify';
import { toZonedTime } from 'date-fns-tz';
import { getISOWeek, getISOWeekYear } from 'date-fns';
import { prisma } from '../index';
import { calcularHorasTrabajadas, calcularLiquidacion, descontarAlmuerzo } from '../utils/horasColombiana';
import { jornadaVigente, tiposVigentes, horasMesDeJornada } from '../utils/vigencias';
import { calcularTardanzas, franjaDelDia, DIAS_SEMANA, HorarioConFranjas } from '../utils/tardanzas';

const TZ = 'America/Bogota';

function semanaKey(fecha: Date): string {
  const z = toZonedTime(fecha, TZ);
  return `${getISOWeekYear(z)}-W${String(getISOWeek(z)).padStart(2,'0')}`;
}

function claveDiaBogota(d: Date): string {
  const z = toZonedTime(d, TZ);
  return `${z.getFullYear()}-${z.getMonth()}-${z.getDate()}`;
}

// Minutos de almuerzo a descontar de un registro: solo si el horario tiene
// almuerzo y la franja de ESE día lo aplica (ej. el sábado corto no).
function almuerzoDelRegistro(horario: HorarioConFranjas | null | undefined, fecha: Date): number {
  if (!horario || !horario.almuerzoMin) return 0;
  const z = toZonedTime(fecha, TZ);
  const franja = franjaDelDia(horario, DIAS_SEMANA[z.getDay()]);
  return franja && franja.tieneAlmuerzo ? horario.almuerzoMin : 0;
}

export default async function reporteRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.requireEmpresa] };

  app.get('/liquidacion', auth, async (request, reply) => {
    const { colaboradorId, desde, hasta } = request.query as any;

    const [colaborador, registros, festivos, tiposHoraTodos, jornadas] = await Promise.all([
      prisma.colaborador.findFirst({
        where: { id: colaboradorId, empresaId: request.empresaId },
        include: { horario: { include: { franjas: true } } },
      }),
      prisma.registro.findMany({
        where: { colaboradorId, fecha: { gte: new Date(desde), lte: new Date(hasta) }, salida: { not: null } },
        orderBy: { fecha: 'asc' },
      }),
      prisma.diaFestivo.findMany({
        where: { OR: [{ empresaId: null }, { empresaId: request.empresaId }] },
      }),
      prisma.tipoHora.findMany(),
      prisma.jornadaVigencia.findMany(),
    ]);

    if (!colaborador) return reply.status(404).send({ error: 'Colaborador no encontrado' });

    const festivosDates = festivos.map(f => new Date(f.fecha));

    // Agrupar registros por semana ISO para resetear el contador de ordinarias cada semana
    const porSemana = new Map<string, typeof registros>();
    for (const reg of registros) {
      const key = semanaKey(reg.fecha);
      if (!porSemana.has(key)) porSemana.set(key, []);
      porSemana.get(key)!.push(reg);
    }

    const acumulado: Record<string, TipoHoraAcum> = {};
    const horario = (colaborador as any).horario as HorarioConFranjas | null;
    const diasConAlmuerzo = new Set<string>(); // almuerzo se descuenta 1 vez por día

    for (const [, regsDeUnaSemana] of porSemana) {
      // Jornada y recargos vigentes se evalúan con la fecha de cada semana/registro,
      // así el cambio a 42h (15 jul 2026) y el dominical 90%→100% aplican solos.
      const jornadaSemanal = jornadaVigente(regsDeUnaSemana[0].fecha, jornadas);
      let minutosOrdSemana = 0; // se resetea cada semana
      for (const registro of regsDeUnaSemana) {
        if (!registro.entrada || !registro.salida) continue;
        const tiposDelDia = tiposVigentes(registro.fecha, tiposHoraTodos);
        const { resultado, minutosOrdinariosTrabajados } = calcularHorasTrabajadas(
          registro.entrada, registro.salida, festivosDates, tiposDelDia as any, jornadaSemanal, minutosOrdSemana
        );
        let ordDelRegistro = minutosOrdinariosTrabajados;
        // Descontar almuerzo una sola vez por día (si la franja de ese día lo aplica)
        const claveDia = claveDiaBogota(registro.entrada);
        const almuerzo = almuerzoDelRegistro(horario, registro.entrada);
        if (almuerzo > 0 && !diasConAlmuerzo.has(claveDia)) {
          const { descontado } = descontarAlmuerzo(resultado, almuerzo);
          if (descontado > 0) {
            diasConAlmuerzo.add(claveDia);
            ordDelRegistro = Math.max(0, ordDelRegistro - descontado);
          }
        }
        minutosOrdSemana += ordDelRegistro;
        for (const p of resultado) {
          if (!acumulado[p.codigo]) acumulado[p.codigo] = { ...p };
          else acumulado[p.codigo].minutos += p.minutos;
        }
      }
    }

    // Valor hora con el divisor de la jornada vigente al final del período
    const jornadaCierre = jornadaVigente(new Date(hasta), jornadas);
    const horasMes = horasMesDeJornada(jornadaCierre);

    const horasPorTipo = Object.values(acumulado);
    const liquidacion = calcularLiquidacion(colaborador.salarioMensual, horasMes, horasPorTipo);
    // totalAdicional = recargos + horas extra que se suman al salario base
    const totalAdicional = liquidacion.reduce((s, l) => s + l.subtotal, 0);
    const totalRecargos = liquidacion.filter(l => !l.esExtra).reduce((s, l) => s + l.subtotal, 0);
    const totalExtra = liquidacion.filter(l => l.esExtra).reduce((s, l) => s + l.subtotal, 0);

    return {
      colaborador, desde, hasta, liquidacion,
      salarioBase: colaborador.salarioMensual,
      totalRecargos, totalExtra, totalAdicional,
      totalPagar: totalAdicional, // compat: ahora es lo adicional al salario
      registrosCont: registros.length,
      jornadaSemanal: jornadaCierre, horasMes,
    };
  });

  // Llegadas tarde de un colaborador según su horario asignado
  app.get('/tardanzas', auth, async (request, reply) => {
    const { colaboradorId, desde, hasta } = request.query as any;
    const colaborador = await prisma.colaborador.findFirst({
      where: { id: colaboradorId, empresaId: request.empresaId },
      include: { horario: { include: { franjas: true } } },
    });
    if (!colaborador) return reply.status(404).send({ error: 'Colaborador no encontrado' });
    if (!colaborador.horario || !colaborador.horario.activo) {
      return { sinHorario: true, detalle: [], totalMinutos: 0, diasTarde: 0 };
    }

    const [registros, festivos, permisos] = await Promise.all([
      prisma.registro.findMany({
        where: { colaboradorId, fecha: { gte: new Date(desde), lte: new Date(hasta) } },
      }),
      prisma.diaFestivo.findMany({ where: { OR: [{ empresaId: null }, { empresaId: request.empresaId }] } }),
      prisma.permiso.findMany({ where: { colaboradorId, aprobado: true }, select: { fechaInicio: true, fechaFin: true, tipo: true, aprobado: true, colaboradorId: true } }),
    ]);

    const resultado = calcularTardanzas(registros, colaborador.horario, festivos, permisos);
    return { sinHorario: false, horario: colaborador.horario, ...resultado };
  });

  app.get('/asistencia', auth, async (request) => {
    const { desde, hasta } = request.query as any;
    return prisma.registro.findMany({
      where: {
        colaborador: { empresaId: request.empresaId },
        fecha: { gte: new Date(desde), lte: new Date(hasta) },
      },
      include: { colaborador: true },
      orderBy: { fecha: 'desc' },
    });
  });
}

type TipoHoraAcum = { codigo: string; nombre: string; recargo: number; minutos: number };
