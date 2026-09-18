"use strict";
// Lo que el super admin puede guardar como vigencia del auxilio de transporte (17 de septiembre
// de 2026).
//
// Cada enero el gobierno fija por decreto el salario mínimo y el auxilio. Hasta hoy esos números
// vivían en el `seed`, así que actualizarlos exigía un despliegue completo. Pasan a una pantalla, y
// esto valida lo que llega de ella antes de que toque la base.
//
// Cada fila NUEVA se agrega; las anteriores no se tocan. Editar la vieja reescribiría la historia:
// un reporte de diciembre pasaría a liquidarse con el decreto de enero.
Object.defineProperty(exports, "__esModule", { value: true });
exports.VIGENCIA_INVALIDA = void 0;
exports.normalizarVigencia = normalizarVigencia;
exports.VIGENCIA_INVALIDA = 'INVALIDA';
// Solo `YYYY-MM-DD`, analizado a mano. Con `new Date(texto)` hay dos problemas: acepta cosas como
// «el año que viene» devolviendo un Invalid Date que se guardaría igual, y para «2027-01-01» da
// medianoche UTC, que en Bogotá son las 7 de la tarde del 31 de diciembre. Guardado así, el decreto
// de 2027 empezaría a regir un día antes.
const SOLO_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;
function medianocheBogota(texto) {
    if (typeof texto !== 'string')
        return null;
    const partes = SOLO_FECHA.exec(texto.trim());
    if (!partes)
        return null;
    const [, anio, mes, dia] = partes;
    // Bogotá es UTC-5 todo el año, sin horario de verano: su medianoche son las 05:00 UTC.
    const fecha = new Date(Date.UTC(Number(anio), Number(mes) - 1, Number(dia), 5));
    if (Number.isNaN(fecha.getTime()))
        return null;
    // Un 31 de febrero se desborda al mes siguiente en vez de fallar: se comprueba que la fecha
    // construida sea la misma que se pidió.
    if (fecha.getUTCMonth() !== Number(mes) - 1 || fecha.getUTCDate() !== Number(dia))
        return null;
    return fecha;
}
// Los números llegan del formulario, así que pueden venir como texto.
function numero(valor) {
    const n = typeof valor === 'number' ? valor : Number(valor);
    return Number.isFinite(n) ? n : null;
}
function normalizarVigencia(cuerpo) {
    const vigenteDesde = medianocheBogota(cuerpo.vigenteDesde);
    if (!vigenteDesde)
        return exports.VIGENCIA_INVALIDA;
    const valor = numero(cuerpo.valor);
    const tope = numero(cuerpo.tope);
    if (valor === null || tope === null)
        return exports.VIGENCIA_INVALIDA;
    // Un auxilio en cero sí es válido: un gobierno podría no decretarlo. Negativo no.
    if (valor < 0)
        return exports.VIGENCIA_INVALIDA;
    // Un tope en cero dejaría a todo el mundo sin derecho.
    if (tope <= 0)
        return exports.VIGENCIA_INVALIDA;
    // El tope son dos salarios mínimos y el auxilio es una fracción de uno. Al revés es una
    // digitación cambiada, y guardarla quitaría el auxilio a toda la plataforma.
    if (tope < valor)
        return exports.VIGENCIA_INVALIDA;
    return { vigenteDesde, valor, tope };
}
