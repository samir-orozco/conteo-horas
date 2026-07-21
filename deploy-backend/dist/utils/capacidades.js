"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.capacidadesEmpresa = capacidadesEmpresa;
exports.tieneFuncion = tieneFuncion;
const index_1 = require("../index");
const planes_1 = require("./planes");
// Capacidades efectivas de una empresa (plan + overrides + acceso ilimitado).
async function capacidadesEmpresa(empresaId) {
    const [empresa, planes] = await Promise.all([
        index_1.prisma.empresa.findUnique({ where: { id: empresaId }, include: { suscripcion: true } }),
        (0, planes_1.obtenerPlanes)(index_1.prisma),
    ]);
    return (0, planes_1.capacidadesDe)(empresa?.suscripcion, empresa?.exentaPago ?? false, planes);
}
// ¿La empresa tiene activa cierta función según su plan?
async function tieneFuncion(empresaId, feature) {
    const cap = await capacidadesEmpresa(empresaId);
    return !!cap.features[feature];
}
