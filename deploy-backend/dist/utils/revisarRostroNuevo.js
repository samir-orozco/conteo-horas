"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.revisarRostroNuevo = revisarRostroNuevo;
const client_1 = require("@prisma/client");
const prisma_1 = require("../prisma");
const revisionEnrolamiento_1 = require("./revisionEnrolamiento");
async function revisarRostroNuevo(empresaId, colaboradorId, tomas) {
    const coherencia = (0, revisionEnrolamiento_1.tomasCoherentes)(tomas);
    // Con tomas de dos personas no tiene sentido buscar parecidos: no se va a guardar.
    if (!coherencia.coherentes)
        return { ...coherencia, parecidos: [] };
    // `colaboradores` es pequeña y entra por empresaId; aquí no se toca `registros`.
    const otras = await prisma_1.prisma.colaborador.findMany({
        where: { empresaId, activo: true, rostroDescriptor: { not: client_1.Prisma.DbNull }, id: { not: colaboradorId } },
        select: { id: true, nombre: true, apellido: true, rostroDescriptor: true },
    });
    const parecidos = (0, revisionEnrolamiento_1.parecidosAlRegistrar)(tomas, otras, colaboradorId)
        .map(p => ({ id: p.id, nombre: `${p.nombre} ${p.apellido}`, distancia: p.distancia }));
    return { ...coherencia, parecidos };
}
