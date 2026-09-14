"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.partirEnLotes = partirEnLotes;
// Parte una lista en lotes de a lo sumo `tamano` elementos, en orden.
//
// La usa la cascada que borra una empresa. Un solo DELETE ... WHERE id IN (...)
// con decenas de miles de ids revienta el límite de 65.535 marcadores de MySQL
// y MariaDB, y además un IN enorme hace que el motor abandone el índice y
// recorra la tabla de TODAS las empresas, dejándola bloqueada hasta el commit.
function partirEnLotes(items, tamano) {
    // Con 0 el ciclo no avanzaría nunca: la transacción quedaría colgada hasta el
    // timeout con las filas ya borradas bloqueadas para las demás empresas.
    if (!Number.isInteger(tamano) || tamano < 1) {
        throw new RangeError(`El tamaño del lote tiene que ser un entero positivo; llegó ${tamano}`);
    }
    const lotes = [];
    for (let i = 0; i < items.length; i += tamano)
        lotes.push(items.slice(i, i + tamano));
    return lotes;
}
