// Del módulo del cliente, no de `../index`: importar el entrypoint arrancaría el
// servidor, y esto también corre desde los scripts de `prisma/`.
import { prisma } from '../prisma';
import { calcularDiasEsperados } from './diasEsperados';
import { HorarioConFranjas } from './tardanzas';
import { rangoDiaBogota } from './fechas';

// Escribe en la tabla `DiaEsperado` lo que el horario de cada colaborador exige
// cada día. Es la memoria del sistema: sin ella, editar un horario reescribe el
// pasado y las liquidaciones ya entregadas cambian solas.
//
// Regla que gobierna todo esto: los días PASADOS no se tocan nunca. Solo se
// generan los que faltan y se regeneran los futuros cuando cambia el horario.

// Cuántos días hacia adelante se mantienen materializados. Con esto el kiosco y
// el dashboard siempre tienen el día de hoy y las próximas semanas listos.
const DIAS_ADELANTE = 60;

type Log = { info: (msg: string) => void; error: (obj: unknown, msg?: string) => void };

function medianocheBogotaDe(d: Date): Date {
  const { inicioDia } = rangoDiaBogota(d);
  return inicioDia;
}

// Genera los días de UN colaborador en un rango. `respetarPasado` evita pisar lo
// ya congelado: solo escribe donde no había fila.
export async function materializarColaborador(
  colaboradorId: string,
  desde: Date,
  finExclusivo: Date,
  opciones: { pisarExistentes?: boolean } = {},
): Promise<number> {
  const colaborador = await prisma.colaborador.findUnique({
    where: { id: colaboradorId },
    include: { horario: { include: { franjas: true } } },
  });
  if (!colaborador) return 0;

  const horario = (colaborador as any).horario as HorarioConFranjas | null;
  const calculados = calcularDiasEsperados(desde, finExclusivo, horario);
  if (calculados.length === 0) return 0;

  // Lo que ya existe en ese rango, para no pisarlo si no toca.
  const existentes = await prisma.diaEsperado.findMany({
    where: { colaboradorId, fecha: { gte: desde, lt: finExclusivo } },
    select: { fecha: true, origen: true },
  });
  const yaHay = new Map(existentes.map(e => [e.fecha.getTime(), e.origen]));

  let escritos = 0;
  for (const d of calculados) {
    const origenPrevio = yaHay.get(d.fecha.getTime());
    if (origenPrevio !== undefined) {
      // Nunca se pisa un día que el admin ajustó a mano (turno rotativo).
      if (origenPrevio === 'MANUAL') continue;
      if (!opciones.pisarExistentes) continue;
    }
    await prisma.diaEsperado.upsert({
      where: { colaboradorId_fecha: { colaboradorId, fecha: d.fecha } },
      update: {
        programado: d.programado, horaEntrada: d.horaEntrada, horaSalida: d.horaSalida,
        toleranciaMin: d.toleranciaMin, almuerzoMin: d.almuerzoMin,
        minutosEsperados: d.minutosEsperados, horarioId: colaborador.horarioId, origen: 'AUTO',
      },
      create: {
        colaboradorId, fecha: d.fecha,
        programado: d.programado, horaEntrada: d.horaEntrada, horaSalida: d.horaSalida,
        toleranciaMin: d.toleranciaMin, almuerzoMin: d.almuerzoMin,
        minutosEsperados: d.minutosEsperados, horarioId: colaborador.horarioId, origen: 'AUTO',
      },
    });
    escritos++;
  }
  return escritos;
}

// Regenera los días FUTUROS de todos los colaboradores de un horario. Se llama
// cuando el admin edita el horario: aplica de mañana en adelante y deja intacto
// lo ya liquidado.
export async function regenerarFuturoDeHorario(horarioId: string, log?: Log): Promise<number> {
  const colaboradores = await prisma.colaborador.findMany({
    where: { horarioId, activo: true },
    select: { id: true },
  });
  const { finDia } = rangoDiaBogota(); // desde mañana
  const hasta = new Date(finDia.getTime() + DIAS_ADELANTE * 24 * 60 * 60 * 1000);

  let total = 0;
  for (const c of colaboradores) {
    total += await materializarColaborador(c.id, finDia, hasta, { pisarExistentes: true });
  }
  log?.info(`Días esperados regenerados por cambio de horario: ${total} en ${colaboradores.length} colaborador(es)`);
  return total;
}

// Mantiene la ventana hacia adelante de toda la plataforma. Corre al arrancar y
// cada 24h; es idempotente, así que correr de más no daña nada.
export async function mantenerVentana(log?: Log): Promise<number> {
  try {
    const { inicioDia } = rangoDiaBogota();
    const hasta = new Date(inicioDia.getTime() + DIAS_ADELANTE * 24 * 60 * 60 * 1000);
    const colaboradores = await prisma.colaborador.findMany({
      where: { activo: true },
      select: { id: true },
    });
    let total = 0;
    for (const c of colaboradores) {
      total += await materializarColaborador(c.id, inicioDia, hasta);
    }
    if (total > 0) log?.info(`Días esperados generados: ${total}`);
    return total;
  } catch (err) {
    log?.error(err, 'Error manteniendo la ventana de días esperados');
    return 0;
  }
}

// Rellena hacia atrás desde la primera marcación de cada colaborador. Se usa una
// sola vez, al desplegar la función. Usa el horario ACTUAL de cada quien: es el
// único dato que existe, porque el sistema nunca guardó cuál era antes.
export async function backfillColaborador(colaboradorId: string): Promise<number> {
  const primero = await prisma.registro.findFirst({
    where: { colaboradorId },
    orderBy: { fecha: 'asc' },
    select: { fecha: true },
  });
  if (!primero) return 0;
  const desde = medianocheBogotaDe(primero.fecha);
  const { finDia } = rangoDiaBogota();
  return materializarColaborador(colaboradorId, desde, finDia);
}
