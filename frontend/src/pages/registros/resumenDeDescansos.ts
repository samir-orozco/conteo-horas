import { formatInTimeZone } from 'date-fns-tz';
import { TZ } from '../../lib/fechas';
import { aMin, minutosEntre } from '../../lib/descansos';
import type { ResumenDePausa } from './ModalJornada';

// Los descansos no remunerados de una jornada, dichos en UNA celda de la tabla y en un
// dato del detalle (12 de septiembre de 2026).
//
// Desde que un día puede tener hasta tres descansos, la jornada trae una lista con un
// resumen por ventana, en su orden. La tabla sigue con una sola etiqueta por celda (en
// una tabla de cuarenta personas, dos renglones por celda es ruido que nadie lee), así
// que hay que elegir qué se dice. Se elige aquí, con sus pruebas, y no en el JSX.

export type EtiquetaDeDescansos =
  | { tipo: 'NINGUNO' }
  // Con uno solo se pinta igual que se pintaba el descanso único.
  | { tipo: 'UNO'; pausa: ResumenDePausa }
  // Está en un descanso ahora mismo: es lo primero que se quiere saber.
  | { tipo: 'EN_CURSO'; pausa: ResumenDePausa }
  // Salió a uno y nunca volvió a marcar: el resto del día no se está contando.
  | { tipo: 'NO_VOLVIO'; pausa: ResumenDePausa }
  | { tipo: 'SIN_MARCAR'; faltan: number; de: number }
  // Todos marcados: cuántos, lo que se tomó entre todos y si alguno se pasó.
  | { tipo: 'MARCADOS'; cuantos: number; minutos: number; seExcedio: boolean };

export function etiquetaDeDescansos(descansos: readonly ResumenDePausa[] | null | undefined): EtiquetaDeDescansos {
  const lista = descansos ?? [];
  if (lista.length === 0) return { tipo: 'NINGUNO' };
  if (lista.length === 1) return { tipo: 'UNO', pausa: lista[0] };
  const enCurso = lista.find(p => p.estado === 'EN_CURSO');
  if (enCurso) return { tipo: 'EN_CURSO', pausa: enCurso };
  const abierto = lista.find(p => p.estado === 'ABIERTO');
  if (abierto) return { tipo: 'NO_VOLVIO', pausa: abierto };
  const faltan = lista.filter(p => p.estado === 'NO_MARCADO').length;
  if (faltan > 0) return { tipo: 'SIN_MARCAR', faltan, de: lista.length };
  return {
    tipo: 'MARCADOS',
    cuantos: lista.length,
    minutos: lista.reduce((s, p) => s + (p.minutos ?? 0), 0),
    seExcedio: lista.some(p => p.seExcedio),
  };
}

const hhmm = (s: string) => formatInTimeZone(new Date(s), TZ, 'HH:mm');

// El detalle para el `title` de la celda: cada descanso con su salida y su regreso, o su
// horario si no lo marcó, en el orden de la jornada.
export function detalleDeDescansos(descansos: readonly ResumenDePausa[] | null | undefined): string {
  return (descansos ?? []).map(p => {
    if (p.salida) return `${hhmm(p.salida)} → ${p.regreso ? hhmm(p.regreso) : '···'}`;
    return p.ventana ? `${p.ventana.inicio}-${p.ventana.fin}: no lo marcó` : 'no lo marcó';
  }).join(' · ');
}

// Para el detalle de la jornada, que con varios descansos los resume en un solo dato:
// a cuántos de los descansos del día salió (haya vuelto o no), y lo que se descontó entre
// todos. El servidor reparte el descuento del día entre los resúmenes de modo que sumen el
// descuento del día, así que esta suma es lo que de verdad se descontó.
//
// Los descansos del día son los que tienen ventana. El servidor manda además un resumen
// por cada salida que no tuvo ventana donde anotarse, y contarlo decía «3 de 3» en un día
// de dos descansos (12 de septiembre de 2026).
export function totalesDeDescansos(descansos: readonly ResumenDePausa[] | null | undefined) {
  const lista = descansos ?? [];
  const delDia = lista.filter(p => p.ventana !== null);
  return {
    marcados: delDia.filter(p => p.salida !== null).length,
    de: delDia.length,
    minutosDescontados: lista.reduce((s, p) => s + p.minutosDescontados, 0),
  };
}

// ¿La salida cayó dentro de la ventana en la que quedó anotada? (12 de septiembre de 2026)
//
// El kiosco anota cada salida en un descanso por la hora, y si no hay uno en curso la
// anota en el próximo o en el último pendiente: la de Carla a las 15:00 quedó en el de
// 09:00 a 09:15. Que durara menos que esa ventana no quiere decir que se lo tomó en su
// hora, y el detalle lo decía así, en verde.
//
// Es la cuenta del servidor (`estaDentroDe`, backend/src/utils/almuerzo.ts): desde la hora
// de inicio y hasta ANTES de la de fin, en hora de Bogotá, y una ventana cuyo fin no avanza
// cruza la medianoche. El servidor la prueba en el día de la fila y en el siguiente; aquí
// se mira la hora del reloj, que da lo mismo en una jornada de menos de 24 horas.
export function salioDentroDeSuVentana(p: Pick<ResumenDePausa, 'salida' | 'ventana'>): boolean {
  if (!p.salida || !p.ventana) return false;
  const desdeElInicio = (aMin(hhmm(p.salida)) - aMin(p.ventana.inicio) + 1440) % 1440;
  return desdeElInicio < minutosEntre(p.ventana.inicio, p.ventana.fin);
}
