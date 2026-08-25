import { addMonths, lastDayOfMonth, format } from 'date-fns';
import type { TipoContrato } from './tipos';

// Duraciones de un contrato a término fijo.
//
// Ojo: la ley NO define una lista de períodos. Solo fija un tope (cuatro años, o
// tres en aprendizaje) y un umbral que sí tiene consecuencias: por debajo de un
// año se aplica la regla de la cuarta prórroga. Lo que hay aquí son las
// duraciones que se usan en la práctica, con ese umbral marcado, y siempre queda
// la opción de poner la fecha a mano.

export type Duracion = { meses: number; etiqueta: string };

export const DURACIONES: Duracion[] = [
  { meses: 1, etiqueta: '1 mes' },
  { meses: 2, etiqueta: '2 meses' },
  { meses: 3, etiqueta: '3 meses' },
  { meses: 6, etiqueta: '6 meses' },
  { meses: 12, etiqueta: '1 año' },
  { meses: 24, etiqueta: '2 años' },
  { meses: 36, etiqueta: '3 años' },
  { meses: 48, etiqueta: '4 años' },
];

// El tope legal recorta la lista por arriba: un aprendiz no puede pasar de tres
// años. Y `minimoMeses` la recorta por abajo, que es lo que hace falta cuando ya
// van cuatro prórrogas de un contrato corto: ahí ofrecer "3 meses" es ofrecer
// algo que la ley no permite. Si la duración no está, no se elige por descuido.
export function duracionesDe(tipo: TipoContrato, minimoMeses = 0): Duracion[] {
  const tope = tipo === 'APRENDIZAJE' ? 36 : 48;
  return DURACIONES.filter(d => d.meses <= tope && d.meses >= minimoMeses);
}

export const caeEnRegla4taProrroga = (meses: number) => meses < 12;

// Fecha de terminación a partir del inicio y los meses pactados.
//
// Un contrato que empieza el 1 de enero por tres meses termina el 31 de marzo:
// el día ANTES de cumplirse el plazo, no el mismo. Por eso se resta un día.
//
// El caso raro es empezar en fin de mes. Del 31 de enero por un mes, `addMonths`
// devuelve el 28 de febrero porque febrero no tiene 31; restarle un día daría el
// 27, que deja el contrato corto sin razón. Cuando el día se desborda así, se
// toma el último día del mes destino.
export function finDeDuracion(inicioISO: string, meses: number): string {
  if (!inicioISO) return '';
  const [a, m, d] = inicioISO.slice(0, 10).split('-').map(Number);
  const inicio = new Date(a, m - 1, d);
  const sumado = addMonths(inicio, meses);
  const seDesbordo = sumado.getDate() !== inicio.getDate();
  const fin = seDesbordo ? lastDayOfMonth(sumado) : new Date(sumado.getTime() - 86400000);
  return format(fin, 'yyyy-MM-dd');
}

// El día siguiente a una fecha "YYYY-MM-DD". Se usa para encadenar prórrogas:
// una que empiece el mismo día en que termina el período anterior solapa ese
// día y lo cuenta dos veces, tanto en la duración que se muestra como en lo que
// se lleva consumido del tope de cuatro años.
export function diaSiguiente(iso: string): string {
  if (!iso) return '';
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number);
  if (!a || !m || !d) return '';
  return format(new Date(a, m - 1, d + 1), 'yyyy-MM-dd');
}

// Días entre dos fechas "YYYY-MM-DD", ambas incluidas. Sirve para medir lo que
// el usuario acaba de elegir y poder avisarle sobre ESA prórroga, no en general.
export function diasEntre(desdeISO: string, hastaISO: string): number | null {
  if (!desdeISO || !hastaISO) return null;
  const d = new Date(desdeISO.slice(0, 10) + 'T00:00:00');
  const h = new Date(hastaISO.slice(0, 10) + 'T00:00:00');
  if (isNaN(d.getTime()) || isNaN(h.getTime())) return null;
  return Math.round((h.getTime() - d.getTime()) / 86400000) + 1;
}

// Un año, para efectos de la regla de la cuarta prórroga. Se usan 365 días y no
// "12 meses" porque lo que hay que comparar es una duración ya concreta.
export const DIAS_UN_ANIO = 365;
