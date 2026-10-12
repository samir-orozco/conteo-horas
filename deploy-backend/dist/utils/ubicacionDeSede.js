"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MARGEN_FUERA_MAXIMO = void 0;
exports.cambiaLaGeocerca = cambiaLaGeocerca;
exports.leerMargenFuera = leerMargenFuera;
function cambiaLaGeocerca(antes, despues) {
    if (despues.lat === null || despues.lng === null)
        return false;
    if (!antes || antes.lat === null || antes.lng === null)
        return true;
    return antes.lat !== despues.lat || antes.lng !== despues.lng || antes.radio !== despues.radio
        || antes.margenFuera !== despues.margenFuera;
}
// Metros más allá del radio en los que un presencial todavía puede marcar, con alerta (11 de octubre
// de 2026). Lo que llega del cuerpo, sin validar:
//   - ausente: undefined, «no tocar». Un formulario anterior a este campo no lo manda, y leerlo como 0
//     apagaría en silencio el margen que otra persona ya había puesto.
//   - vacío o null: 0, apagado.
//   - lo que no es un número de metros entre 0 y el tope: null, y la ruta responde 400. No se adivina.
exports.MARGEN_FUERA_MAXIMO = 1000;
function leerMargenFuera(v) {
    if (v === undefined)
        return undefined;
    if (v === null || v === '')
        return 0;
    if (typeof v !== 'number' && typeof v !== 'string')
        return null;
    const n = Math.round(Number(v));
    return Number.isFinite(n) && n >= 0 && n <= exports.MARGEN_FUERA_MAXIMO ? n : null;
}
