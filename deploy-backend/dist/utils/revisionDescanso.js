"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.diasQueTrabaja = diasQueTrabaja;
exports.preguntasDeDescanso = preguntasDeDescanso;
exports.revisionDescansoPendiente = revisionDescansoPendiente;
const descansoObligatorio_1 = require("./descansoObligatorio");
const diasDeLaSemana_1 = require("./diasDeLaSemana");
// Los días que cubre un horario, juntando todas sus franjas y sin repetir.
//
// La validación de cada nombre es `diaValido`, en `diasDeLaSemana`. Estaba ESCRITA A MANO aquí
// dentro, con su propio comentario repitiendo la misma justificación palabra por palabra, y por eso
// no apareció al buscar `diaValido`: era una copia sin nombre. La cazó el grep del PATRÓN, que es
// justo lo que pide CLAUDE.md §9.3 antes de dar una regla por extraída.
function diasQueTrabaja(franjas) {
    const vistos = new Set();
    for (const f of franjas) {
        if (!Array.isArray(f.dias))
            continue;
        for (const d of f.dias) {
            const nombre = (0, diasDeLaSemana_1.diaValido)(d);
            if (nombre !== null)
                vistos.add(nombre);
        }
    }
    return [...vistos];
}
// Los horarios por los que hay que preguntar, en el orden en que llegan.
function preguntasDeDescanso(horarios) {
    const salida = [];
    for (const h of horarios) {
        // Un horario que nadie cumple no está liquidando mal el domingo de nadie, así que preguntarlo
        // es pedir que respondan por un conjunto vacío. Misma doctrina que `revisionPendiente`.
        //
        // OJO al llenar este número desde la ruta: `_count.colaboradores` de Prisma cuenta TAMBIÉN a
        // los retirados. Medido el 21 de septiembre de 2026, el horario «Turno diurno» daba _count=1
        // con 0 activos. Tiene que venir filtrado por `activo`.
        if (h.personas <= 0)
            continue;
        const deduccion = (0, descansoObligatorio_1.deducirDiaDescanso)(diasQueTrabaja(h.franjas));
        // El domingo está libre: la ley lo responde sola y no hay nada que preguntar.
        if (deduccion.origen === 'PRESUNCION')
            continue;
        salida.push({
            id: h.id,
            nombre: h.nombre,
            personas: h.personas,
            origen: deduccion.origen,
            sugerido: deduccion.dia,
        });
    }
    return salida;
}
// Si a esta empresa se le bloquea el panel. La marca manda por encima del conteo: quien ya
// respondió no vuelve a ver el aviso, y un horario ambiguo que aparezca después se declara en su
// sitio, no con un bloqueo a toda la empresa.
function revisionDescansoPendiente(revisadoEn, horariosPorResolver) {
    if (revisadoEn)
        return false;
    return horariosPorResolver > 0;
}
