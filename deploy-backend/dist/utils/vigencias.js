"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jornadaVigente = jornadaVigente;
exports.tiposVigentes = tiposVigentes;
exports.horasMesDeJornada = horasMesDeJornada;
// Jornada legal vigente en una fecha (Ley 2101 de 2021: 48→42h gradual)
function jornadaVigente(fecha, jornadas) {
    const aplicables = jornadas
        .filter(j => j.vigenteDesde <= fecha)
        .sort((a, b) => b.vigenteDesde.getTime() - a.vigenteDesde.getTime());
    // fallback conservador si no hay vigencias sembradas
    return aplicables[0]?.horasSemanales ?? 42;
}
// Tipos de hora vigentes en una fecha (recargos con vigencias, Ley 2466 de 2025)
function tiposVigentes(fecha, tipos) {
    return tipos.filter(t => t.activo && t.vigenteDesde <= fecha && (!t.vigenteHasta || fecha < t.vigenteHasta));
}
// Divisor de horas mensuales para valor hora: jornada semanal × 30 / 6
// (44h → 220, 42h → 210; convención Mintrabajo)
function horasMesDeJornada(jornadaSemanal) {
    return jornadaSemanal * 5;
}
