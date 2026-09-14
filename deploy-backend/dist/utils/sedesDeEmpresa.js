"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NOMBRE_SEDE_PRINCIPAL = void 0;
exports.crearSedePrincipal = crearSedePrincipal;
exports.sedesPorDefecto = sedesPorDefecto;
const sedePrincipal_1 = require("./sedePrincipal");
const CAMPOS_SEDE = { id: true, activa: true, creadoEn: true };
exports.NOMBRE_SEDE_PRINCIPAL = 'Sede principal';
// Toda empresa nace con su Sede principal. Nace sin ubicación, así que no exige
// GPS a nadie hasta que alguien la configure: no cambia cómo marca la gente.
function crearSedePrincipal(tx, empresaId) {
    return tx.sede.create({ data: { empresaId, nombre: exports.NOMBRE_SEDE_PRINCIPAL }, select: { id: true } });
}
// La sede por defecto de cada persona de la empresa (`sedePorDefecto`), para
// mostrarla y contarla, nunca para guardarla. Son dos consultas para todo el grupo y
// no una por persona, porque los reportes la piden para la empresa entera. Con
// `colaboradorId` se leen solo las asignaciones de esa persona.
async function sedesPorDefecto(db, empresaId, colaboradorId) {
    const [asignaciones, deLaEmpresa] = await Promise.all([
        db.colaboradorSede.findMany({
            where: { sede: { empresaId, activa: true }, ...(colaboradorId ? { colaboradorId } : {}) },
            select: { colaboradorId: true, sede: { select: CAMPOS_SEDE } },
        }),
        db.sede.findMany({ where: { empresaId, activa: true }, select: CAMPOS_SEDE }),
    ]);
    const suyas = new Map();
    for (const a of asignaciones) {
        if (!suyas.has(a.colaboradorId))
            suyas.set(a.colaboradorId, []);
        suyas.get(a.colaboradorId).push(a.sede);
    }
    return id => (0, sedePrincipal_1.sedePorDefecto)(suyas.get(id) ?? [], deLaEmpresa);
}
