"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.distanciaMetros = distanciaMetros;
// Distancia en metros entre dos coordenadas (fórmula de Haversine).
// La usa el geocerco del kiosco para validar que la marca venga del sitio.
function distanciaMetros(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const rad = (d) => (d * Math.PI) / 180;
    const dLat = rad(lat2 - lat1);
    const dLng = rad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
}
