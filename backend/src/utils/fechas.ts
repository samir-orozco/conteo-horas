import { toZonedTime } from 'date-fns-tz';

const TZ = 'America/Bogota';

// Límites del día en zona Bogotá como instantes UTC (00:00 Bogotá = 05:00 UTC),
// más la hora ya zonificada. Centraliza el cálculo que se repetía en varias rutas.
export function rangoDiaBogota(ahora: Date = new Date()): { ahoraBog: Date; inicioDia: Date; finDia: Date } {
  const ahoraBog = toZonedTime(ahora, TZ);
  const inicioDia = new Date(Date.UTC(ahoraBog.getFullYear(), ahoraBog.getMonth(), ahoraBog.getDate(), 5, 0, 0));
  const finDia = new Date(inicioDia.getTime() + 24 * 60 * 60 * 1000);
  return { ahoraBog, inicioDia, finDia };
}
