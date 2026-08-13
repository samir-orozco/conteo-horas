import { format, differenceInCalendarDays } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

export const TZ = 'America/Bogota';
export const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export const fmtMin = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}min` : `${m} min`);

export const fmtHora = (s: string | null) => (s ? format(toZonedTime(new Date(s), TZ), 'HH:mm') : '-');

export function haceCuanto(desde: string): string {
  const min = Math.floor((Date.now() - new Date(desde).getTime()) / 60000);
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  return `hace ${h}h ${min % 60}min`;
}

// Días calendario en zona Bogotá (evita el "hoy/mañana" corrido por la tarde que
// producía redondear la diferencia en milisegundos).
export function diasHasta(fecha: string): string {
  const dias = differenceInCalendarDays(toZonedTime(new Date(fecha), TZ), toZonedTime(new Date(), TZ));
  if (dias <= 0) return 'hoy';
  if (dias === 1) return 'mañana';
  return `en ${dias} días`;
}
