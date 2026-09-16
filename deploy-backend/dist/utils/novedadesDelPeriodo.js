"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.novedadesDelPeriodo = novedadesDelPeriodo;
const saldoTiempo_1 = require("./saldoTiempo");
const DIA_MS = 24 * 60 * 60 * 1000;
function novedadesDelPeriodo(permisos, desdeF, finExclusivo, politica) {
    // Los días del período, una sola vez. Recorrerlos por fuera acota solo, sin cuentas de fechas.
    const diasDelPeriodo = [];
    for (let t = desdeF.getTime(); t < finExclusivo.getTime(); t += DIA_MS)
        diasDelPeriodo.push((0, saldoTiempo_1.claveDia)(new Date(t)));
    const diasPorTipo = new Map();
    const parcialesPorTipo = new Map();
    for (const permiso of permisos) {
        const ini = (0, saldoTiempo_1.claveDia)(permiso.fechaInicio);
        const fin = (0, saldoTiempo_1.claveDia)(permiso.fechaFin);
        const esParcial = !!(permiso.horaInicio && permiso.horaFin);
        for (const clave of diasDelPeriodo) {
            if (clave < ini)
                continue;
            if (clave > fin)
                continue;
            if (esParcial) {
                parcialesPorTipo.set(permiso.tipo, (parcialesPorTipo.get(permiso.tipo) ?? 0) + 1);
                break; // una novedad de parte del día es una sola, aunque su rango tocara varios
            }
            if (!diasPorTipo.has(permiso.tipo))
                diasPorTipo.set(permiso.tipo, new Set());
            diasPorTipo.get(permiso.tipo).add(clave);
        }
    }
    const tipos = new Set([...diasPorTipo.keys(), ...parcialesPorTipo.keys()]);
    return [...tipos]
        .map(tipo => ({
        tipo,
        remunerado: (0, saldoTiempo_1.esPermisoRemunerado)(tipo, politica),
        dias: diasPorTipo.get(tipo)?.size ?? 0,
        parciales: parcialesPorTipo.get(tipo) ?? 0,
    }))
        .sort((a, b) => a.tipo.localeCompare(b.tipo));
}
