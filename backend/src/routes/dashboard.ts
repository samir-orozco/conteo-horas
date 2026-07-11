import { FastifyInstance } from 'fastify';
import { toZonedTime } from 'date-fns-tz';
import { getISOWeek, getISOWeekYear } from 'date-fns';
import { prisma } from '../index';
import { calcularHorasTrabajadas, descontarAlmuerzo } from '../utils/horasColombiana';
import { jornadaVigente, tiposVigentes } from '../utils/vigencias';
import { franjaDelDia, HorarioConFranjas } from '../utils/tardanzas';

const TZ = 'America/Bogota';
const DIAS = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
const CODIGOS_EXTRA = new Set(['HED', 'HEN', 'HEDD', 'HEND']);

// Minutos de almuerzo del registro: solo si la franja de ese día lo aplica.
function almuerzoDelRegistro(horario: HorarioConFranjas | null | undefined, fecha: Date): number {
  if (!horario || !horario.almuerzoMin) return 0;
  const z = toZonedTime(fecha, TZ);
  const franja = franjaDelDia(horario, DIAS[z.getDay()]);
  return franja && franja.tieneAlmuerzo ? horario.almuerzoMin : 0;
}

function claveDia(d: Date): string {
  const z = toZonedTime(d, TZ);
  return `${z.getFullYear()}-${String(z.getMonth() + 1).padStart(2, '0')}-${String(z.getDate()).padStart(2, '0')}`;
}
function semanaKey(fecha: Date): string {
  const z = toZonedTime(fecha, TZ);
  return `${getISOWeekYear(z)}-W${String(getISOWeek(z)).padStart(2, '0')}`;
}
function minutosDe(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

// Panel de inicio de la empresa: foto del día + del mes.
export default async function dashboardRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.requireEmpresa] };

  app.get('/empresa', auth, async (request) => {
    const empresaId = request.empresaId!;
    const ahora = new Date();
    const ahoraBog = toZonedTime(ahora, TZ);
    const inicioDia = new Date(Date.UTC(ahoraBog.getFullYear(), ahoraBog.getMonth(), ahoraBog.getDate(), 5, 0, 0));
    const finDia = new Date(inicioDia.getTime() + 24 * 60 * 60 * 1000);
    const inicioMes = new Date(Date.UTC(ahoraBog.getFullYear(), ahoraBog.getMonth(), 1, 5, 0, 0));
    const claveHoy = claveDia(ahora);
    const diaHoy = DIAS[ahoraBog.getDay()];

    const [colaboradores, festivos, jornadas, tiposHoraTodos, permisos] = await Promise.all([
      prisma.colaborador.findMany({
        where: { empresaId, activo: true },
        include: { horario: { include: { franjas: true } } },
        orderBy: { nombre: 'asc' },
      }),
      prisma.diaFestivo.findMany({ where: { OR: [{ empresaId: null }, { empresaId }] } }),
      prisma.jornadaVigencia.findMany(),
      prisma.tipoHora.findMany(),
      prisma.permiso.findMany({
        where: { aprobado: true, colaborador: { empresaId }, fechaInicio: { lte: finDia }, fechaFin: { gte: inicioDia } },
        include: { colaborador: true },
      }),
    ]);

    const colIds = colaboradores.map(c => c.id);
    const festSet = new Set(festivos.map(f => claveDia(f.fecha)));
    const hoyEsFestivo = festSet.has(claveHoy);

    // Registros de hoy + turnos abiertos de días anteriores
    const [registrosHoy, turnosAbiertos, registrosMes] = await Promise.all([
      prisma.registro.findMany({
        where: { colaboradorId: { in: colIds }, fecha: { gte: inicioDia, lt: finDia } },
        include: { colaborador: true },
        orderBy: { entrada: 'asc' },
      }),
      prisma.registro.findMany({
        where: { colaboradorId: { in: colIds }, fecha: { lt: inicioDia }, entrada: { not: null }, salida: null },
        include: { colaborador: true },
        orderBy: { fecha: 'desc' },
      }),
      prisma.registro.findMany({
        where: { colaboradorId: { in: colIds }, fecha: { gte: inicioMes, lte: finDia }, salida: { not: null } },
        orderBy: { fecha: 'asc' },
      }),
    ]);

    // ===== En planta ahora (entrada abierta hoy) =====
    const enPlanta = registrosHoy
      .filter(r => r.entrada && !r.salida)
      .map(r => ({
        id: r.colaborador.id,
        nombre: `${r.colaborador.nombre} ${r.colaborador.apellido}`,
        cargo: r.colaborador.cargo,
        desde: r.entrada,
      }));
    const enPlantaIds = new Set(enPlanta.map(e => e.id));

    // ===== Salidas de hoy (colaboradores que marcaron salida) =====
    const salidasRecientes = registrosHoy
      .filter(r => r.salida)
      .sort((a, b) => b.salida!.getTime() - a.salida!.getTime())
      .map(r => ({
        registroId: r.id,
        id: r.colaborador.id,
        nombre: `${r.colaborador.nombre} ${r.colaborador.apellido}`,
        cargo: r.colaborador.cargo,
        entrada: r.entrada,
        salida: r.salida,
        tieneFotoEntrada: !!r.fotoEntrada,
        tieneFotoSalida: !!r.fotoSalida,
      }));

    // Colaboradores con al menos una entrada hoy
    const marcaronHoy = new Set(registrosHoy.filter(r => r.entrada).map(r => r.colaboradorId));
    const novedadHoyIds = new Set(
      permisos.filter(p => claveDia(p.fechaInicio) <= claveHoy && claveHoy <= claveDia(p.fechaFin)).map(p => p.colaboradorId)
    );

    // ===== Llegadas tarde hoy (según horario) =====
    const llegadasTardeHoy: { id: string; nombre: string; horaLlegada: string; minutosTarde: number }[] = [];
    // Primera entrada de hoy por colaborador
    const primeraEntradaHoy = new Map<string, Date>();
    for (const r of registrosHoy) {
      if (!r.entrada) continue;
      const prev = primeraEntradaHoy.get(r.colaboradorId);
      if (!prev || r.entrada < prev) primeraEntradaHoy.set(r.colaboradorId, r.entrada);
    }

    // ===== Sin marcar hoy (deberían haber entrado y no lo han hecho) =====
    const sinMarcarHoy: { id: string; nombre: string; cargo: string | null; horario: string; horaEntrada: string }[] = [];

    for (const c of colaboradores) {
      if (!c.horario || !c.horario.activo) continue;
      // La franja que aplica hoy (un horario puede variar por día, ej. sábados más corto)
      const franjaHoy = franjaDelDia(c.horario, diaHoy);
      const aplicaHoy = !!franjaHoy && !hoyEsFestivo && !novedadHoyIds.has(c.id);
      if (!aplicaHoy || !franjaHoy) continue;

      const entrada = primeraEntradaHoy.get(c.id);
      if (entrada) {
        const z = toZonedTime(entrada, TZ);
        const llegadaMin = z.getHours() * 60 + z.getMinutes();
        const tarde = llegadaMin - (minutosDe(franjaHoy.horaEntrada) + c.horario.toleranciaMin);
        if (tarde > 0) {
          llegadasTardeHoy.push({
            id: c.id,
            nombre: `${c.nombre} ${c.apellido}`,
            horaLlegada: `${String(z.getHours()).padStart(2, '0')}:${String(z.getMinutes()).padStart(2, '0')}`,
            minutosTarde: tarde,
          });
        }
      } else {
        // Solo lo marcamos "sin marcar" si ya pasó su hora de entrada + tolerancia
        const ahoraMin = ahoraBog.getHours() * 60 + ahoraBog.getMinutes();
        if (ahoraMin > minutosDe(franjaHoy.horaEntrada) + c.horario.toleranciaMin) {
          sinMarcarHoy.push({
            id: c.id,
            nombre: `${c.nombre} ${c.apellido}`,
            cargo: c.cargo,
            horario: c.horario.nombre,
            horaEntrada: franjaHoy.horaEntrada,
          });
        }
      }
    }

    // ===== Horas extra y horas de la semana (toda la empresa) =====
    const festivosDates = festivos.map(f => new Date(f.fecha));
    const porColSemana = new Map<string, typeof registrosMes>();
    for (const r of registrosMes) {
      const k = `${r.colaboradorId}|${semanaKey(r.fecha)}`;
      if (!porColSemana.has(k)) porColSemana.set(k, []);
      porColSemana.get(k)!.push(r);
    }

    let minutosExtraMes = 0;
    let minutosTrabajadosSemana = 0;
    const claveSemanaActual = semanaKey(ahora);
    // Horario de cada colaborador (para descontar almuerzo) + control 1 vez/día
    const horarioPorCol = new Map<string, HorarioConFranjas | null>(
      colaboradores.map(c => [c.id, (c as any).horario as HorarioConFranjas | null])
    );
    const diasConAlmuerzo = new Set<string>();

    for (const [clave, regs] of porColSemana) {
      const jornadaSemanal = jornadaVigente(regs[0].fecha, jornadas);
      let minutosOrdSemana = 0;
      const esSemanaActual = clave.endsWith(claveSemanaActual);
      for (const r of regs) {
        if (!r.entrada || !r.salida) continue;
        const tiposDelDia = tiposVigentes(r.fecha, tiposHoraTodos);
        const { resultado, minutosOrdinariosTrabajados } = calcularHorasTrabajadas(
          r.entrada, r.salida, festivosDates, tiposDelDia as any, jornadaSemanal, minutosOrdSemana
        );
        let ordDelRegistro = minutosOrdinariosTrabajados;
        const claveColDia = `${r.colaboradorId}|${claveDia(r.entrada)}`;
        const almuerzo = almuerzoDelRegistro(horarioPorCol.get(r.colaboradorId), r.entrada);
        if (almuerzo > 0 && !diasConAlmuerzo.has(claveColDia)) {
          const { descontado } = descontarAlmuerzo(resultado, almuerzo);
          if (descontado > 0) {
            diasConAlmuerzo.add(claveColDia);
            ordDelRegistro = Math.max(0, ordDelRegistro - descontado);
          }
        }
        minutosOrdSemana += ordDelRegistro;
        for (const p of resultado) {
          if (CODIGOS_EXTRA.has(p.codigo)) minutosExtraMes += p.minutos;
          if (esSemanaActual) minutosTrabajadosSemana += p.minutos;
        }
      }
    }

    // ===== Turnos abiertos de días anteriores (olvidaron marcar salida) =====
    const turnosOlvidados = turnosAbiertos.map(r => ({
      id: r.id,
      colaborador: `${r.colaborador.nombre} ${r.colaborador.apellido}`,
      fecha: r.fecha,
      entrada: r.entrada,
    }));

    // ===== Novedades activas hoy =====
    const novedadesHoy = permisos
      .filter(p => claveDia(p.fechaInicio) <= claveHoy && claveHoy <= claveDia(p.fechaFin))
      .map(p => ({
        colaborador: `${p.colaborador.nombre} ${p.colaborador.apellido}`,
        tipo: p.tipo,
        fechaFin: p.fechaFin,
      }));

    // ===== Próximos festivos (siguientes 45 días) =====
    const en45 = new Date(inicioDia.getTime() + 45 * 24 * 60 * 60 * 1000);
    const proximosFestivos = festivos
      .filter(f => new Date(f.fecha) >= inicioDia && new Date(f.fecha) <= en45)
      .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
      .map(f => ({ nombre: f.nombre, fecha: f.fecha, propio: f.empresaId !== null }));

    // ===== Cumpleaños del mes =====
    const mesHoy = ahoraBog.getMonth();
    const diaHoyNum = ahoraBog.getDate();
    const cumpleanos = colaboradores
      .filter(c => c.fechaNacimiento)
      .map(c => {
        const n = new Date(c.fechaNacimiento!);
        return {
          id: c.id,
          nombre: `${c.nombre} ${c.apellido}`,
          cargo: c.cargo,
          dia: n.getUTCDate(),
          mes: n.getUTCMonth(),
          esHoy: n.getUTCMonth() === mesHoy && n.getUTCDate() === diaHoyNum,
        };
      })
      .filter(c => c.mes === mesHoy)
      .sort((a, b) => a.dia - b.dia);

    return {
      fecha: ahora,
      hoyEsFestivo,
      totales: {
        colaboradoresActivos: colaboradores.length,
        enPlanta: enPlanta.length,
        horasSemana: Math.round((minutosTrabajadosSemana / 60) * 10) / 10,
        horasExtraMes: Math.round((minutosExtraMes / 60) * 10) / 10,
      },
      enPlanta,
      salidasRecientes,
      llegadasTardeHoy: llegadasTardeHoy.sort((a, b) => b.minutosTarde - a.minutosTarde),
      sinMarcarHoy,
      turnosOlvidados,
      novedadesHoy,
      proximosFestivos,
      cumpleanos,
    };
  });
}
