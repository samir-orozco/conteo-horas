"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLAVES_ESTADO_CONTRATO = void 0;
exports.resumenDeContrato = resumenDeContrato;
const contratos_1 = require("./contratos");
// Todas las claves que este módulo puede devolver. La pantalla las traduce a
// etiqueta y color; aquí solo viven las que existen, para poder comprobar que
// la traducción no se quede corta.
exports.CLAVES_ESTADO_CONTRATO = [
    'PREAVISO_VENCIDO', 'VENCIDO', 'POR_VENCER', 'VIGENTE', 'INDEFINIDO', 'SIN_CONTRATO',
];
// El estado del contrato de alguien, en una sola palabra que se pueda filtrar.
//
// No repite la aritmética de fechas: se apoya en estadoDelContrato, que es el
// único sitio donde vive el preaviso de 30 días, el tope de cuatro años y el
// efecto de las prórrogas. Aquí solo se decide cuál de esos hechos es el que
// hay que mostrar en una columna angosta.
//
// El orden importa: lo primero que se pregunta es lo más urgente. Un preaviso
// vencido gana sobre "por vencer" porque ya no es una decisión pendiente, es
// una prórroga que ocurrió sola y que cuesta plata.
function resumenDeContrato(c, hoy) {
    if (!c)
        return 'SIN_CONTRATO';
    const e = (0, contratos_1.estadoDelContrato)({ tipo: c.tipo, fechaInicio: c.fechaInicio, fechaFin: c.fechaFin, fechaInicioPractica: c.fechaInicioPractica }, c.prorrogas, hoy);
    // Sin fecha de fin no hay nada que vencer.
    if (!e.finVigente)
        return 'INDEFINIDO';
    if (e.diasParaVencer !== null && e.diasParaVencer < 0)
        return 'VENCIDO';
    if (e.preavisoVencido)
        return 'PREAVISO_VENCIDO';
    if (e.diasParaPreaviso !== null && e.diasParaPreaviso <= 30)
        return 'POR_VENCER';
    return 'VIGENTE';
}
