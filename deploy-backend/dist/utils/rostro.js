"use strict";
// Reconocimiento facial: solo comparamos descriptores matemáticos (128 floats
// que produce face-api.js en el navegador). La imagen nunca llega al servidor.
Object.defineProperty(exports, "__esModule", { value: true });
exports.UMBRAL_COINCIDENCIA = void 0;
exports.esDescriptorValido = esDescriptorValido;
exports.esListaDescriptoresValida = esListaDescriptoresValida;
exports.mejorCoincidencia = mejorCoincidencia;
// Distancia recomendada por face-api.js para considerar "misma persona".
// Por debajo de este umbral se acepta la coincidencia.
exports.UMBRAL_COINCIDENCIA = 0.5;
// Cada colaborador guarda varias muestras (frente, perfiles, con/sin gafas)
const MAX_MUESTRAS = 6;
function distanciaEuclidiana(a, b) {
    let suma = 0;
    for (let i = 0; i < a.length; i++) {
        const diff = a[i] - b[i];
        suma += diff * diff;
    }
    return Math.sqrt(suma);
}
function esDescriptorValido(d) {
    return Array.isArray(d) && d.length === 128 && d.every(n => typeof n === 'number' && Number.isFinite(n));
}
// Lista de muestras del enrolamiento guiado (1 a MAX_MUESTRAS descriptores)
function esListaDescriptoresValida(l) {
    return Array.isArray(l) && l.length >= 1 && l.length <= MAX_MUESTRAS && l.every(esDescriptorValido);
}
// Lo guardado puede ser un descriptor suelto (enrolamientos viejos) o una lista
// de muestras (enrolamiento guiado multi-ángulo). Siempre devolvemos lista.
function muestrasDe(guardado) {
    if (esDescriptorValido(guardado))
        return [guardado];
    if (esListaDescriptoresValida(guardado))
        return guardado;
    return [];
}
// Busca la mejor coincidencia entre un descriptor entrante y los colaboradores
// enrolados de la empresa. Compara contra TODAS las muestras de cada uno y se
// queda con la distancia mínima. Devuelve null si nadie cae dentro del umbral.
function mejorCoincidencia(entrante, candidatos) {
    let mejor = null;
    for (const c of candidatos) {
        for (const muestra of muestrasDe(c.rostroDescriptor)) {
            const distancia = distanciaEuclidiana(entrante, muestra);
            if (distancia <= exports.UMBRAL_COINCIDENCIA && (!mejor || distancia < mejor.distancia)) {
                mejor = { colaborador: c, distancia };
            }
        }
    }
    return mejor;
}
