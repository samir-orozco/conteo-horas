"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rangoDiaBogota = rangoDiaBogota;
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
