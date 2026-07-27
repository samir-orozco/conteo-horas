import { Registro, Horario, FranjaHorario, DiaFestivo } from '@prisma/client';
import { toZonedTime } from 'date-fns-tz';
import type { ExtraConfig } from './horasColombiana';

const TZ = 'America/Bogota';
export const DIAS_SEMANA = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];

export type HorarioConFranjas = Horario & { franjas: FranjaHorario[] };

export type Tardanza = {
  fecha: string; // YYYY-MM-DD (día calendario Bogotá)
  horaEsperada: string; // "08:00" + tolerancia informada aparte
  horaLlegada: string; // "08:25"
  minutosTarde: number; // ya descontada la tolerancia
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

// Llegadas tarde: primera entrada de cada día vs la franja del horario que
// aplica ese día + tolerancia. No cuenta festivos, días fuera del horario ni
// días cubiertos por novedades.
export function calcularTardanzas(
  registros: Registro[],
  horario: HorarioConFranjas,
  festivos: DiaFestivo[],
  permisos: { fechaInicio: Date; fechaFin: Date }[]
): { detalle: Tardanza[]; totalMinutos: number; diasTarde: number; toleranciaMin: number } {
  const festSet = new Set(festivos.map(f => claveDia(f.fecha)));

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
    const z = toZonedTime(entrada, TZ);
    const franja = franjaDelDia(horario, DIAS_SEMANA[z.getDay()]);
    if (!franja) continue;
    if (festSet.has(clave)) continue;
    const cubiertoPorNovedad = permisos.some(p => claveDia(p.fechaInicio) <= clave && clave <= claveDia(p.fechaFin));
    if (cubiertoPorNovedad) continue;

    const llegadaMin = z.getHours() * 60 + z.getMinutes();
    const tarde = llegadaMin - (minutosDe(franja.horaEntrada) + horario.toleranciaMin);
    if (tarde > 0) {
      detalle.push({
        fecha: clave,
        horaEsperada: franja.horaEntrada,
        horaLlegada: `${String(z.getHours()).padStart(2, '0')}:${String(z.getMinutes()).padStart(2, '0')}`,
        minutosTarde: tarde,
      });
    }
  }

  return {
    detalle,
    totalMinutos: detalle.reduce((s, t) => s + t.minutosTarde, 0),
    diasTarde: detalle.length,
    toleranciaMin: horario.toleranciaMin,
  };
}
