"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cambiaLaGeocerca = cambiaLaGeocerca;
function cambiaLaGeocerca(antes, despues) {
    if (despues.lat === null || despues.lng === null)
        return false;
    if (!antes || antes.lat === null || antes.lng === null)
        return true;
    return antes.lat !== despues.lat || antes.lng !== despues.lng || antes.radio !== despues.radio;
}
