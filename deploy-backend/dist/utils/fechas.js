"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rangoDiaBogota = rangoDiaBogota;
exports.rangoReporte = rangoReporte;
const date_fns_tz_1 = require("date-fns-tz");
const TZ = 'America/Bogota';
// Límites del día en zona Bogotá como instantes UTC (00:00 Bogotá = 05:00 UTC),
// más la hora ya zonificada. Centraliza el cálculo que se repetía en varias rutas.
function rangoDiaBogota(ahora = new Date()) {
    const ahoraBog = (0, date_fns_tz_1.toZonedTime)(ahora, TZ);
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
function rangoReporte(desde, hasta) {
    const desdeF = new Date(desde);
    const finExclusivo = new Date(new Date(hasta).getTime() + 24 * 60 * 60 * 1000);
    return { desdeF, finExclusivo };
}
