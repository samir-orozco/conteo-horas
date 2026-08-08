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

// Rango de un reporte a partir de dos fechas "YYYY-MM-DD".
//
// El campo `Registro.fecha` guarda la MEDIANOCHE de Bogotá, que en UTC son las
// 05:00 de ese mismo día. Por eso un filtro `lte: new Date(hasta)` —que es
// hasta a las 00:00 UTC— deja fuera todos los registros del último día del
// rango. La forma correcta es un tope EXCLUSIVO en el día siguiente, igual que
// ya lo hace /registros. Devuelve ese tope como `finExclusivo` para usar con
// `lt`, nunca con `lte`.
export function rangoReporte(desde: string, hasta: string): { desdeF: Date; finExclusivo: Date } {
  const desdeF = new Date(desde);
  const finExclusivo = new Date(new Date(hasta).getTime() + 24 * 60 * 60 * 1000);
  return { desdeF, finExclusivo };
}
