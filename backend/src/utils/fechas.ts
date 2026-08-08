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

// Medianoche de Bogotá de una fecha "YYYY-MM-DD", como instante UTC.
// Colombia es UTC-5 fijo (no tiene horario de verano), así que son las 05:00.
// Es la misma convención con la que el kiosco guarda `Registro.fecha`.
function medianocheBogota(fecha: string): Date {
  const [a, m, d] = fecha.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d, 5, 0, 0));
}

// Rango de un reporte a partir de dos fechas "YYYY-MM-DD".
//
// Ojo con la zona horaria: `new Date("2026-07-01")` es medianoche UTC, que en
// Bogotá son las 7 p.m. del 30 de junio. Usarlo directamente hacía dos daños:
// el filtro con `lte` dejaba fuera el último día del rango, y al recorrer los
// días para calcular las horas esperadas el cálculo arrancaba un día antes
// (un rango que empieza el miércoles 1 se contaba como si empezara el martes).
//
// Por eso ambos extremos se anclan a la medianoche de BOGOTÁ, y el final es el
// arranque del día siguiente: `finExclusivo` va siempre con `lt`, nunca `lte`.
export function rangoReporte(desde: string, hasta: string): { desdeF: Date; finExclusivo: Date } {
  return {
    desdeF: medianocheBogota(desde),
    finExclusivo: new Date(medianocheBogota(hasta).getTime() + 24 * 60 * 60 * 1000),
  };
}
