"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contratosPorRevisar = contratosPorRevisar;
const contratos_1 = require("./contratos");
const estadoContratoResumen_1 = require("./estadoContratoResumen");
const POR_REVISAR = ['VENCIDO', 'PREAVISO_VENCIDO', 'POR_VENCER'];
const esPorRevisar = (clave) => POR_REVISAR.includes(clave);
function contratosPorRevisar(personas, hoy) {
    const lista = [];
    for (const p of personas) {
        if (!p.contrato)
            continue;
        const estado = (0, estadoContratoResumen_1.resumenDeContrato)(p.contrato, hoy);
        if (!esPorRevisar(estado))
            continue;
        const { tipo, fechaInicio, fechaFin, fechaInicioPractica, prorrogas } = p.contrato;
        const e = (0, contratos_1.estadoDelContrato)({ tipo: tipo, fechaInicio, fechaFin, fechaInicioPractica }, prorrogas, hoy);
        // Los tres estados de arriba solo salen de un contrato con fecha de fin, así que las dos fechas
        // existen. La guarda es para el compilador, no un caso que se espere.
        if (!e.finVigente || !e.fechaLimitePreaviso)
            continue;
        lista.push({ colaboradorId: p.id, colaborador: p.nombre, estado, vence: e.finVigente, limitePreaviso: e.fechaLimitePreaviso });
    }
    // Por fecha de vencimiento, que ya deja lo más urgente primero: un vencido venció antes de hoy, uno que
    // se prorroga solo vence en menos de 30 días y uno por vencer, después. Ordenar además por estado
    // daría siempre el mismo orden.
    return lista.sort((a, b) => a.vence.getTime() - b.vence.getTime());
}
