"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.motivoSinSede = motivoSinSede;
function motivoSinSede(p) {
    if (p.modalidad === 'REMOTO')
        return 'REMOTO';
    if (p.sedesConUbicacion === 0)
        return 'SIN_UBICACION_DE_SEDE';
    switch (p.modalidad) {
        case 'HIBRIDO': return 'FUERA_DE_SEDE';
        // PRESENCIAL, y lo que no se reconozca, que se trata como presencial (MODALIDAD_POR_DEFECTO).
        default: return 'NO_REGISTRADA';
    }
}
