"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.diferenciasDeRegistro = diferenciasDeRegistro;
const date_fns_tz_1 = require("date-fns-tz");
// Qué cambió al editar una marcación.
//
// `Registro` ya guardaba `editadoPor` y `editadoEn`, así que se sabía QUE
// alguien la tocó, pero no qué hizo. Eso es justo lo que hace falta el día que
// un trabajador reclama: "me marcaron llegada tarde" se responde con "la
// entrada se cambió de 8:15 a 8:00", no con "alguien editó esto".
//
// Las horas se escriben en la hora de Bogotá. Guardarlas en UTC haría que el
// historial dijera que alguien salió a las 10 de la noche cuando salió a las 5.
const TZ = 'America/Bogota';
const dos = (n) => String(n).padStart(2, '0');
const hora = (d) => {
    if (!d)
        return 'sin marcar';
    const b = (0, date_fns_tz_1.toZonedTime)(d, TZ);
    return `${dos(b.getHours())}:${dos(b.getMinutes())}`;
};
const dia = (d) => {
    if (!d)
        return 'sin fecha';
    const b = (0, date_fns_tz_1.toZonedTime)(d, TZ);
    return `${b.getFullYear()}-${dos(b.getMonth() + 1)}-${dos(b.getDate())}`;
};
// El orden es fijo y no el del objeto que llegue: así dos ediciones iguales
// producen el mismo historial, y se lee en el orden en que ocurre una jornada.
const CAMPOS = [
    { clave: 'fecha', formato: dia },
    { clave: 'entrada', formato: hora },
    { clave: 'salida', formato: hora },
    { clave: 'tipo', formato: (v) => v ?? 'sin tipo' },
    { clave: 'observacion', formato: (v) => v || 'sin observación' },
    { clave: 'salidaAlmuerzo', formato: (v) => (v ? 'sí' : 'no') },
];
// Compara el estado guardado contra los campos que trae la edición.
// Solo mira lo que viene: el PUT admite cambios parciales, y lo que no llega no
// cambió. Un campo que llega con el mismo valor tampoco cuenta: guardar sin
// tocar nada no puede ensuciar el historial.
function diferenciasDeRegistro(antes, cambios) {
    const out = [];
    for (const { clave, formato } of CAMPOS) {
        if (!(clave in cambios))
            continue;
        const a = formato(antes[clave]);
        const b = formato(cambios[clave]);
        if (a !== b)
            out.push({ campo: clave, antes: a, despues: b });
    }
    return out;
}
