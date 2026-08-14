import { Registro, Horario, FranjaHorario, DiaFestivo } from '@prisma/client';
import { toZonedTime } from 'date-fns-tz';
import type { ExtraConfig } from './horasColombiana';

const TZ = 'America/Bogota';
export const DIAS_SEMANA = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];

export type HorarioConFranjas = Horario & { franjas: FranjaHorario[] };

export type Tardanza = {
  fecha: string; // YYYY-MM-DD (día calendario Bogotá)
  horaEsperada: string; // "08:00" — la que exigía el horario ESE día
  horaLlegada: string; // "08:25"
  minutosTarde: number; // ya descontada la tolerancia
  toleranciaMin: number; // la que aplicaba ESE día, no la de hoy
};

// Lo que el horario exigía UN día, congelado: la forma mínima de una fila de
// `DiaEsperado` que necesitan las tardanzas.
export type DiaEsperadoParaTardanza = {
  fecha: Date; // medianoche de Bogotá
  programado: boolean;
  horaEntrada: string | null;
  toleranciaMin: number;
};

export function minutosDe(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

// Franja del horario que aplica a un día de la semana (ej. "SABADO"), o null
// si ese día no se trabaja. Con esto un horario cubre variaciones como
// L-V 08:00-17:00 + Sáb 08:00-12:00.
// Genérico en la franja: acepta el Horario completo o un `select` acotado (solo
// necesita `franjas` con su `dias`), y devuelve la misma forma de franja recibida.
export function franjaDelDia<F extends { dias: unknown }>(horario: { franjas: F[] }, diaSemana: string): F | null {
  return horario.franjas.find(f => (((f.dias as string[]) ?? []).includes(diaSemana))) ?? null;
}

function claveDia(d: Date): string {
  const z = toZonedTime(d, TZ);
  return `${z.getFullYear()}-${String(z.getMonth() + 1).padStart(2, '0')}-${String(z.getDate()).padStart(2, '0')}`;
}

// Arma el ExtraConfig del motor de horas. En modo HORARIO construye la ventana de
// cada día de semana desde las franjas; sin horario activo cae a SEMANAL (fallback).
type HorarioParaExtra = { activo: boolean; toleranciaMin: number; franjas: { dias: unknown; horaEntrada: string; horaSalida: string }[] };
export function construirExtraConfig(modo: 'SEMANAL' | 'HORARIO', horario: HorarioParaExtra | null | undefined): ExtraConfig {
  if (modo !== 'HORARIO' || !horario || !horario.activo) return { modo: 'SEMANAL' };
  const franjaPorDia: Record<number, { ini: number; fin: number }> = {};
  for (const fr of horario.franjas) {
    for (const d of ((fr.dias as string[]) ?? [])) {
      const idx = DIAS_SEMANA.indexOf(d);
      if (idx >= 0) franjaPorDia[idx] = { ini: minutosDe(fr.horaEntrada), fin: minutosDe(fr.horaSalida) };
    }
  }
  return { modo: 'HORARIO', franjaPorDia, toleranciaMin: horario.toleranciaMin ?? 0 };
}

// Llegadas tarde: primera entrada de cada día contra lo que el horario exigía
// ESE día (`DiaEsperado`) más su tolerancia. No cuenta festivos, días fuera del
// horario ni días cubiertos por novedades.
//
// Lee los días materializados y no el horario vigente por la misma razón que el
// saldo: adelantar la entrada de 08:00 a 07:00 llenaba de tardanzas los meses ya
// cerrados. La hora exigida y la tolerancia salen de la fila del día, así que
// también quedan congeladas.
//
// Un día sin fila no se evalúa. Quien llama completa el rango con
// `combinarDiasEsperados` para que eso no esconda tardanzas reales.
export function calcularTardanzas(
  registros: Registro[],
  dias: DiaEsperadoParaTardanza[],
  festivos: DiaFestivo[],
  permisos: { fechaInicio: Date; fechaFin: Date }[]
): { detalle: Tardanza[]; totalMinutos: number; diasTarde: number; toleranciaMin: number } {
  const festSet = new Set(festivos.map(f => claveDia(f.fecha)));
  const porDia = new Map(dias.map(d => [claveDia(d.fecha), d]));

  // Primera entrada por día calendario
  const primeraEntrada = new Map<string, Date>();
  for (const r of registros) {
    if (!r.entrada) continue;
    const clave = claveDia(r.entrada);
    const actual = primeraEntrada.get(clave);
    if (!actual || r.entrada < actual) primeraEntrada.set(clave, r.entrada);
  }

  const detalle: Tardanza[] = [];
  for (const [clave, entrada] of [...primeraEntrada.entries()].sort()) {
    const dia = porDia.get(clave);
    if (!dia || !dia.programado || !dia.horaEntrada) continue;
    if (festSet.has(clave)) continue;
    const cubiertoPorNovedad = permisos.some(p => claveDia(p.fechaInicio) <= clave && clave <= claveDia(p.fechaFin));
    if (cubiertoPorNovedad) continue;

    const z = toZonedTime(entrada, TZ);
    const llegadaMin = z.getHours() * 60 + z.getMinutes();
    const tarde = llegadaMin - (minutosDe(dia.horaEntrada) + dia.toleranciaMin);
    if (tarde > 0) {
      detalle.push({
        fecha: clave,
        horaEsperada: dia.horaEntrada,
        horaLlegada: `${String(z.getHours()).padStart(2, '0')}:${String(z.getMinutes()).padStart(2, '0')}`,
        minutosTarde: tarde,
        toleranciaMin: dia.toleranciaMin,
      });
    }
  }

  // Tolerancia del período, para mostrarla junto al reporte. Se toma la del
  // último día del rango: es la que regía al cierre, el mismo criterio con el
  // que ya se elige la jornada vigente para el valor hora. La tolerancia vive en
  // el Horario y no en la franja, así que dentro de un mismo período casi
  // siempre es una sola; solo cambia si la editaron.
  //
  // No se exige que el día sea programado: los días de descanso también guardan
  // la tolerancia vigente, y pedirlo dejaría en 0 un rango que cae entero en
  // fin de semana, que es peor que informar la que regía.
  const toleranciaMin = dias.length
    ? dias.reduce((ult, d) => (d.fecha > ult.fecha ? d : ult)).toleranciaMin
    : 0;

  return {
    detalle,
    totalMinutos: detalle.reduce((s, t) => s + t.minutosTarde, 0),
    diasTarde: detalle.length,
    toleranciaMin,
  };
}

// ¿Marcar la salida a esta hora sería ANTES de que termine su franja?
//
// Se pregunta antes de escribir nada: salir temprano sin decir por qué era
// gratis —se guardaba la salida y después se ofrecía "Omitir"—, y con la salida
// ya registrada no había forma de volver atrás si alguien se equivocaba de botón.
//
// Normaliza la franja que cruza medianoche sumándole 24 h, y hace lo mismo con la
// hora de la marca cuando cae ya pasada la medianoche. Sin eso, quien sale a las
// 04:00 de un turno 21:00-05:00 parecía irse diecisiete horas antes de tiempo.
export function salidaAntesDeHora(
  ahoraBog: Date,
  franja: { horaEntrada: string; horaSalida: string },
  toleranciaMin: number,
): boolean {
  const iniMin = minutosDe(franja.horaEntrada);
  let finMin = minutosDe(franja.horaSalida);
  const cruzaMedianoche = finMin <= iniMin;
  if (cruzaMedianoche) finMin += 1440;

  let salidaMin = ahoraBog.getHours() * 60 + ahoraBog.getMinutes();
  if (cruzaMedianoche && salidaMin < iniMin) salidaMin += 1440;

  return salidaMin < finMin - (toleranciaMin ?? 0);
}
