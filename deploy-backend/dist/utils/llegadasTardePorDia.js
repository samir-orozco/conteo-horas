"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.llegadasTardePorDia = llegadasTardePorDia;
function llegadasTardePorDia(claves, filas) {
    const porDia = new Map(claves.map(c => [c, []]));
    for (const f of filas) {
        for (const t of f.detalle) {
            porDia.get(t.fecha)?.push({ id: f.colaboradorId, horaEsperada: t.horaEsperada, horaLlegada: t.horaLlegada, minutosTarde: t.minutosTarde });
        }
    }
    return claves.map(clave => {
        const personas = (porDia.get(clave) ?? []).sort((a, b) => b.minutosTarde - a.minutosTarde);
        return { clave, totalMinutos: personas.reduce((s, p) => s + p.minutosTarde, 0), personas };
    });
}
