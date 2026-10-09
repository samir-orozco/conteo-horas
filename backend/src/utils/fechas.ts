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
export function medianocheBogota(fecha: string): Date {
  const [a, m, d] = fecha.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d, 5, 0, 0));
}

// El día calendario de Bogotá de un instante, como "YYYY-MM-DD".
//
// Se empareja por DÍA y no por instante a propósito: MySQL puede devolver una fecha con
// milisegundos, y una fila que no empareje por unos milisegundos quedaría huérfana — en el caso de
// `DiaEsperado`, el día caería al horario actual y nadie se enteraría.
//
// Estaba escrita tres veces (`diasEsperados.ts`, `routes/dashboard.ts` y `hoyEnBogota` aquí mismo)
// antes de que el calendario de turnos necesitara la cuarta. CLAUDE.md §9.3.
export function claveDiaBogota(d: Date): string {
  const z = toZonedTime(d, TZ);
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${z.getFullYear()}-${dos(z.getMonth() + 1)}-${dos(z.getDate())}`;
}

// Hoy en Bogotá como "YYYY-MM-DD". Existe porque `new Date().toISOString()` da
// la fecha UTC, y entre las 7 p.m. y la medianoche de Bogotá esa fecha ya es la
// de mañana: un retiro registrado a las 8 p.m. quedaría fechado al día
// siguiente.
export function hoyEnBogota(ahora: Date = new Date()): string {
  return claveDiaBogota(ahora);
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

// La semana a la que pertenece un día, de LUNES a domingo, en fechas de Bogotá.
//
// Hace falta para los turnos rotativos: «cuál de estos siete días lleva el descanso» es una
// pregunta de la SEMANA, y hasta hoy el backend no tenía ninguna noción de semana. La única que
// existía era de presentación, en `frontend/src/pages/turnos/semana.ts`.
//
// LUNES PRIMERO, igual que esa pantalla: el domingo tiene que quedar al FINAL de la semana que lo
// generó. Con semanas de domingo a sábado, el descanso dominical quedaría separado de los seis días
// que lo produjeron y el tope de 42 horas se mediría partido en dos.
//
// La entrada es una fecha YA anclada a medianoche de Bogotá (`DiaEsperado.fecha`, `Registro.fecha`,
// o la salida de `medianocheBogota`). Se lee con `getUTCDay()` y NO con `getDay()` por lo mismo que
// `diaSemanaDeFechaBogota`: `getDay()` usa el reloj de la máquina, y al occidente de Colombia —o en
// la suite, que corre fijada en América/Los Ángeles a propósito— devolvería el día anterior
// (CLAUDE.md §8.1).
//
// La aritmética de días fijos vale porque Colombia es UTC-5 todo el año, sin horario de verano: es
// la misma razón por la que `medianocheBogota` puede escribir las 05:00 a secas.
export function rangoSemanaBogota(fecha: Date): { lunes: Date; finExclusivo: Date } {
  const UN_DIA = 24 * 60 * 60 * 1000;
  const diaSemana = fecha.getUTCDay(); // 0 = domingo
  const haciaAtras = diaSemana === 0 ? 6 : diaSemana - 1;
  const lunes = new Date(fecha.getTime() - haciaAtras * UN_DIA);
  return { lunes, finExclusivo: new Date(lunes.getTime() + 7 * UN_DIA) };
}

// Suma `n` meses calendario a la fecha de BOGOTÁ de un instante y devuelve la medianoche de Bogotá
// del día de llegada (7 de octubre de 2026, para la elegibilidad de las reseñas: docs/RESENAS.md, R1).
//
// Si el día no existe en el mes de llegada, se recorta al último: del 31 de enero, el 28 (o el 29)
// de febrero. `setMonth` hace lo contrario —se desborda al 3 de marzo— y además opera con el reloj
// de la máquina.
//
// Se parte de la fecha de Bogotá y no de la UTC: un pago de las 11:30 p. m. del 31 de octubre en
// Bogotá ya es 1 de noviembre en UTC, y un mes después daría el 1 de diciembre en vez del 30 de
// noviembre. Restar las cinco horas a mano vale por lo mismo que en `medianocheBogota`: Colombia es
// UTC-5 todo el año.
export function sumarMesesBogota(instante: Date, n: number): Date {
  const enBogota = new Date(instante.getTime() - 5 * 60 * 60 * 1000);
  const anio = enBogota.getUTCFullYear();
  const mes = enBogota.getUTCMonth() + n;
  // El día 0 del mes siguiente es el último del mes de llegada. `Date.UTC` reparte solo los meses
  // que pasan de 11 en años.
  const ultimoDia = new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate();
  return new Date(Date.UTC(anio, mes, Math.min(enBogota.getUTCDate(), ultimoDia), 5, 0, 0));
}
