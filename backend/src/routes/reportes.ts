import { FastifyInstance } from 'fastify';
import { toZonedTime } from 'date-fns-tz';
import { getISOWeek, getISOWeekYear } from 'date-fns';
import { prisma } from '../index';
import { calcularHorasTrabajadas, calcularLiquidacion, descontarAlmuerzo } from '../utils/horasColombiana';
import { jornadaVigente, tiposVigentes, horasMesDeJornada } from '../utils/vigencias';
import { calcularTardanzas, franjaDelDia, DIAS_SEMANA, HorarioConFranjas, construirExtraConfig } from '../utils/tardanzas';

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

function agrupar<T extends { colaboradorId: string }>(filas: T[]): Map<string, T[]> {
  const mapa = new Map<string, T[]>();
  for (const f of filas) {
    if (!mapa.has(f.colaboradorId)) mapa.set(f.colaboradorId, []);
    mapa.get(f.colaboradorId)!.push(f);
  }
  return mapa;
}

type DetalleRegistro = {
  fecha: Date; entrada: Date; salida: Date;
  filas: { codigo: string; nombre: string; horas: number; subtotal: number }[];
};

// Núcleo del cálculo de liquidación de UN colaborador en un período: recorre sus
// registros agrupados por semana ISO (el tope de 42h/sem se resetea cada semana),
// aplica el motor de horas colombianas registro por registro, y opcionalmente
// arma el desglose día a día (para el drill-down de "Extras y recargos").
function liquidarRegistros(
  registros: { fecha: Date; entrada: Date | null; salida: Date | null }[],
  horario: HorarioConFranjas | null,
  extraConfig: ReturnType<typeof construirExtraConfig>,
  festivosDates: Date[],
  tiposHoraTodos: any[],
  jornadas: any[],
  salarioMensual: number,
  horasMes: number,
  incluirDetalle: boolean
) {
  const porSemana = new Map<string, typeof registros>();
  for (const reg of registros) {
    const key = semanaKey(reg.fecha);
    if (!porSemana.has(key)) porSemana.set(key, []);
    porSemana.get(key)!.push(reg);
  }

  const acumulado: Record<string, { codigo: string; nombre: string; recargo: number; minutos: number }> = {};
  const diasConAlmuerzo = new Set<string>();
  const detalleRegistros: DetalleRegistro[] = [];

  for (const [, regsDeUnaSemana] of porSemana) {
    const jornadaSemanal = jornadaVigente(regsDeUnaSemana[0].fecha, jornadas);
    let minutosOrdSemana = 0;
    for (const registro of regsDeUnaSemana) {
      if (!registro.entrada || !registro.salida) continue;
      const tiposDelDia = tiposVigentes(registro.fecha, tiposHoraTodos);
      const { resultado, minutosOrdinariosTrabajados } = calcularHorasTrabajadas(
        registro.entrada, registro.salida, festivosDates, tiposDelDia as any, jornadaSemanal, minutosOrdSemana, extraConfig
      );
      let ordDelRegistro = minutosOrdinariosTrabajados;
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

      if (incluirDetalle) {
        // Solo lo que genera pago adicional (excluye HOD, que ya está en el salario)
        const filas = calcularLiquidacion(salarioMensual, horasMes, resultado)
          .filter(l => l.codigo !== 'HOD' && l.horas > 0)
          .map(l => ({ codigo: l.codigo, nombre: l.nombre, horas: l.horas, subtotal: l.subtotal }));
        if (filas.length > 0) {
          detalleRegistros.push({ fecha: registro.fecha, entrada: registro.entrada, salida: registro.salida, filas });
        }
      }

      for (const p of resultado) {
        if (!acumulado[p.codigo]) acumulado[p.codigo] = { ...p };
        else acumulado[p.codigo].minutos += p.minutos;
      }
    }
  }

  const horasPorTipo = Object.values(acumulado);
  const liquidacion = calcularLiquidacion(salarioMensual, horasMes, horasPorTipo);
  const totalAdicional = liquidacion.reduce((s, l) => s + l.subtotal, 0);
  const totalRecargos = liquidacion.filter(l => !l.esExtra).reduce((s, l) => s + l.subtotal, 0);
  const totalExtra = liquidacion.filter(l => l.esExtra).reduce((s, l) => s + l.subtotal, 0);

  return { liquidacion, totalRecargos, totalExtra, totalAdicional, registrosCont: registros.length, detalleRegistros };
}

export default async function reporteRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.requireEmpresa] };

  app.get('/liquidacion', auth, async (request, reply) => {
    const { colaboradorId, desde, hasta } = request.query as any;

    const [colaborador, registros, festivos, tiposHoraTodos, jornadas, cfgModo] = await Promise.all([
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
      prisma.configuracion.findUnique({ where: { empresaId_clave: { empresaId: request.empresaId!, clave: 'HORAS_EXTRA_MODO' } } }),
    ]);

    if (!colaborador) return reply.status(404).send({ error: 'Colaborador no encontrado' });

    // Modo de horas extra (SEMANAL por defecto). En HORARIO, extra = fuera de la
    // franja asignada; sin horario activo el helper cae a SEMANAL solo.
    const modoExtra = cfgModo?.valor === 'HORARIO' ? 'HORARIO' : 'SEMANAL';
    const festivosDates = festivos.map(f => new Date(f.fecha));
    const horario = (colaborador as any).horario as HorarioConFranjas | null;
    const extraConfig = construirExtraConfig(modoExtra, horario);

    // Valor hora con el divisor de la jornada vigente al final del período
    const jornadaCierre = jornadaVigente(new Date(hasta), jornadas);
    const horasMes = horasMesDeJornada(jornadaCierre);

    const r = liquidarRegistros(registros, horario, extraConfig, festivosDates, tiposHoraTodos, jornadas, colaborador.salarioMensual, horasMes, true);

    return {
      colaborador, desde, hasta, liquidacion: r.liquidacion,
      salarioBase: colaborador.salarioMensual,
      totalRecargos: r.totalRecargos, totalExtra: r.totalExtra, totalAdicional: r.totalAdicional,
      totalPagar: r.totalAdicional, // compat: ahora es lo adicional al salario
      registrosCont: r.registrosCont,
      detalleRegistros: r.detalleRegistros,
      jornadaSemanal: jornadaCierre, horasMes,
    };
  });

  // Resumen de extras y recargos de TODOS los colaboradores activos en un período
  // (para la vista "Todos" del reporte de Extras; el drill-down de cada uno usa /liquidacion).
  app.get('/extras-resumen', auth, async (request) => {
    const { desde, hasta } = request.query as any;
    const empresaId = request.empresaId!;
    const desdeF = new Date(desde), hastaF = new Date(hasta);

    const [colaboradores, registrosTodos, festivos, tiposHoraTodos, jornadas, cfgModo] = await Promise.all([
      prisma.colaborador.findMany({
        where: { empresaId, activo: true },
        include: { horario: { include: { franjas: true } } },
        orderBy: { nombre: 'asc' },
      }),
      prisma.registro.findMany({
        where: { colaborador: { empresaId }, fecha: { gte: desdeF, lte: hastaF }, salida: { not: null } },
        orderBy: { fecha: 'asc' },
      }),
      prisma.diaFestivo.findMany({ where: { OR: [{ empresaId: null }, { empresaId }] } }),
      prisma.tipoHora.findMany(),
      prisma.jornadaVigencia.findMany(),
      prisma.configuracion.findUnique({ where: { empresaId_clave: { empresaId, clave: 'HORAS_EXTRA_MODO' } } }),
    ]);

    const modoExtra = cfgModo?.valor === 'HORARIO' ? 'HORARIO' : 'SEMANAL';
    const festivosDates = festivos.map(f => new Date(f.fecha));
    const jornadaCierre = jornadaVigente(hastaF, jornadas);
    const horasMes = horasMesDeJornada(jornadaCierre);
    const porColaborador = agrupar(registrosTodos as any);

    const resultado = colaboradores.map(col => {
      const horario = (col as any).horario as HorarioConFranjas | null;
      const extraConfig = construirExtraConfig(modoExtra, horario);
      const registros = porColaborador.get(col.id) ?? [];
      const r = liquidarRegistros(registros as any, horario, extraConfig, festivosDates, tiposHoraTodos, jornadas, col.salarioMensual, horasMes, false);
      return {
        colaboradorId: col.id, nombre: col.nombre, apellido: col.apellido,
        totalRecargos: r.totalRecargos, totalExtra: r.totalExtra, totalAdicional: r.totalAdicional,
      };
    });

    return { desde, hasta, colaboradores: resultado };
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

  // Resumen de llegadas tarde de TODOS los colaboradores activos en un período
  // (para la vista "Todos"; el drill-down de cada uno usa /tardanzas).
  app.get('/tardanzas-resumen', auth, async (request) => {
    const { desde, hasta } = request.query as any;
    const empresaId = request.empresaId!;
    const desdeF = new Date(desde), hastaF = new Date(hasta);

    const [colaboradores, registrosTodos, festivos, permisosTodos] = await Promise.all([
      prisma.colaborador.findMany({
        where: { empresaId, activo: true },
        include: { horario: { include: { franjas: true } } },
        orderBy: { nombre: 'asc' },
      }),
      prisma.registro.findMany({ where: { colaborador: { empresaId }, fecha: { gte: desdeF, lte: hastaF } } }),
      prisma.diaFestivo.findMany({ where: { OR: [{ empresaId: null }, { empresaId }] } }),
      prisma.permiso.findMany({
        where: { colaborador: { empresaId }, aprobado: true },
        select: { fechaInicio: true, fechaFin: true, tipo: true, aprobado: true, colaboradorId: true },
      }),
    ]);

    const porColRegistros = agrupar(registrosTodos as any);
    const porColPermisos = agrupar(permisosTodos as any);

    const resultado = colaboradores.map(col => {
      if (!col.horario || !col.horario.activo) {
        return { colaboradorId: col.id, nombre: col.nombre, apellido: col.apellido, sinHorario: true, diasTarde: 0, totalMinutos: 0 };
      }
      const r = calcularTardanzas(
        (porColRegistros.get(col.id) ?? []) as any,
        col.horario as any,
        festivos,
        (porColPermisos.get(col.id) ?? []) as any
      );
      return { colaboradorId: col.id, nombre: col.nombre, apellido: col.apellido, sinHorario: false, diasTarde: r.diasTarde, totalMinutos: r.totalMinutos };
    });

    return { desde, hasta, colaboradores: resultado };
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
