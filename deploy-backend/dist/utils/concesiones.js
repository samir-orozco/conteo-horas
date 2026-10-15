"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ORIGENES_DE_CONCESION = void 0;
exports.concesionVigente = concesionVigente;
exports.funcionesConcedidas = funcionesConcedidas;
exports.finDelDiaBogota = finDelDiaBogota;
exports.leerConcesion = leerConcesion;
exports.leerNuevoFin = leerNuevoFin;
const planes_1 = require("./planes");
const fechas_1 = require("./fechas");
// FUNCIONES CON FECHA (14 de octubre de 2026, PENDIENTES nº 39, fase 2).
//
// Una concesión le da a una empresa una función por un tiempo, por encima de su plan: el super admin
// («pruébalo 2 meses») o la prueba gratis del clima (fase 3). Solo ENCIENDE: nunca apaga lo que el plan ya
// trae. Y se calcula al leer: una concesión vencida deja de contar sola, sin un barrido diario que tenga que
// acordarse de apagarla (CLAUDE.md §8.3, los trabajos periódicos que fallan en silencio).
//
// Las fechas: `desde` es el instante en que se dio y `hasta` es EXCLUSIVO, la medianoche de Bogotá siguiente
// al último día. «Hasta el 14 de diciembre» incluye ese día entero.
exports.ORIGENES_DE_CONCESION = ['PRUEBA', 'SUPER_ADMIN'];
function concesionVigente(c, ahora) {
    return c.revocadaEn === null && c.desde <= ahora && ahora < c.hasta;
}
const CLAVES = new Set(planes_1.FEATURES.map(f => f.key));
/** Las funciones que encienden las concesiones vigentes. Una clave que no está en el catálogo no enciende nada. */
function funcionesConcedidas(concesiones, ahora) {
    const encendidas = {};
    for (const c of concesiones) {
        if (CLAVES.has(c.funcion) && concesionVigente(c, ahora))
            encendidas[c.funcion] = true;
    }
    return encendidas;
}
/** El fin exclusivo de «hasta el día X»: la medianoche de Bogotá del día siguiente. */
function finDelDiaBogota(dia) {
    return new Date((0, fechas_1.medianocheBogota)(dia).getTime() + 24 * 60 * 60 * 1000);
}
const FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;
// Más de dos años ya no es una prueba ni un favor: es cambiarle el plan, y eso se hace en el plan.
const ANIOS_MAXIMOS = 2;
function leerFin(hasta, hoy) {
    const texto = typeof hasta === 'string' ? hasta : '';
    const m = FECHA.exec(texto);
    if (!m)
        return { ok: false, error: 'La fecha de fin no es válida.' };
    // Que el día exista: «2026-02-30» pasa la expresión pero no es una fecha.
    const [a, mes, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    const real = new Date(Date.UTC(a, mes - 1, d));
    if (real.getUTCFullYear() !== a || real.getUTCMonth() !== mes - 1 || real.getUTCDate() !== d) {
        return { ok: false, error: 'La fecha de fin no es válida.' };
    }
    if (texto < hoy)
        return { ok: false, error: 'La fecha de fin ya pasó.' };
    const tope = `${Number(hoy.slice(0, 4)) + ANIOS_MAXIMOS}${hoy.slice(4)}`;
    if (texto > tope)
        return { ok: false, error: `La fecha de fin puede ser hasta dentro de ${ANIOS_MAXIMOS} años.` };
    return { ok: true, hasta: finDelDiaBogota(texto) };
}
/** Lo que llega al dar una función: cuál y su último día («YYYY-MM-DD»), contra el día de hoy en Bogotá. */
function leerConcesion(cuerpo, hoy) {
    const { funcion, hasta } = (typeof cuerpo === 'object' && cuerpo !== null ? cuerpo : {});
    const f = planes_1.FEATURES.find(x => x.key === funcion);
    if (!f)
        return { ok: false, error: 'Esa función no existe.' };
    if (f.proximamente)
        return { ok: false, error: 'Esa función todavía no está disponible.' };
    const fin = leerFin(hasta, hoy);
    return fin.ok ? { ok: true, funcion: f.key, hasta: fin.hasta } : fin;
}
/** Lo que llega al cambiar la fecha de una concesión que ya existe. */
function leerNuevoFin(cuerpo, hoy) {
    const { hasta } = (typeof cuerpo === 'object' && cuerpo !== null ? cuerpo : {});
    return leerFin(hasta, hoy);
}
