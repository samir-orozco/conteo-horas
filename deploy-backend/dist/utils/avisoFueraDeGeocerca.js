"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.avisoFueraDeGeocerca = avisoFueraDeGeocerca;
exports.jornadaFueraDeGeocerca = jornadaFueraDeGeocerca;
const MARCA = { ENTRADA: 'la entrada', SALIDA: 'la salida' };
function avisoFueraDeGeocerca(persona, momento, sede) {
    return {
        tipo: 'MARCO_FUERA_DE_GEOCERCA',
        titulo: `${persona.nombre} ${persona.apellido} marcó fuera de la geocerca`,
        cuerpo: `Marcó ${MARCA[momento]} fuera de la geocerca de ${sede}, dentro del margen que permite la sede.`,
    };
}
// Si la jornada lleva la alerta en Registros: basta UNA de sus marcas hecha fuera, sea la
// entrada, la salida o el regreso de una pausa.
function jornadaFueraDeGeocerca(marcaciones) {
    return marcaciones.some(m => m.fueraGeocercaEntrada || m.fueraGeocercaSalida);
}
