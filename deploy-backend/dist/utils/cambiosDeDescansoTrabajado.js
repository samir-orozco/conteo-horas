"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.diferenciasDeDecision = diferenciasDeDecision;
const fechas_1 = require("./fechas");
// Se guarda en TEXTO y no en claves crudas: esto se lee dentro de dos años, posiblemente por alguien
// que ya no trabaja aquí. Una fecha en milisegundos no se entiende; «2026-10-07» sí.
const comoDia = (v) => (v instanceof Date ? (0, fechas_1.claveDiaBogota)(v) : 'sin día');
const comoTexto = (v, siFalta) => (typeof v === 'string' && v !== '' ? v : siFalta);
const CAMPOS = [
    { clave: 'decision', formato: v => comoTexto(v, 'sin decisión') },
    { clave: 'fechaCompensatorio', formato: comoDia },
    { clave: 'claseAlDecidir', formato: v => comoTexto(v, 'sin clase') },
    { clave: 'nota', formato: v => comoTexto(v, 'sin nota') },
];
// Compara lo guardado contra los campos que trae la edición.
//
// Solo mira lo que VIENE: el PUT admite cambios parciales, y lo que no llega no cambió. Si se
// miraran todos, un cuerpo que solo trae la nota anotaría además que la decisión «cambió» a nada.
function diferenciasDeDecision(antes, cambios) {
    const salida = [];
    for (const { clave, formato } of CAMPOS) {
        if (!(clave in cambios))
            continue;
        const a = formato(antes[clave]);
        const b = formato(cambios[clave] ?? null);
        if (a !== b)
            salida.push({ campo: clave, antes: a, despues: b });
    }
    return salida;
}
