"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.camposDeAutenticacion = camposDeAutenticacion;
const rostro_1 = require("./rostro");
// SOLO DOS, aunque el enum del esquema tenga tres. El tercero, MANUAL, significa
// «lo escribió un administrador desde el panel» y lo pone `routes/registros.ts`
// directamente. Una sesión del kiosco que se declarara MANUAL estaría
// disfrazando una marcación real de carga a mano, que es la categoría que un
// supervisor revisa menos.
const METODOS = ['ROSTRO', 'CEDULA'];
function metodoValido(v) {
    return typeof v === 'string' && METODOS.includes(v);
}
// Una distancia solo tiene sentido si pudo salir de una comparación real. El
// servidor no acepta coincidencias por encima de `UMBRAL_COINCIDENCIA`, así que
// cualquier cosa por fuera de [0, umbral] no vino de un match y contaminaría la
// estadística que estas columnas existen para alimentar.
//
// El cero se acepta a propósito, y es el caso más interesante: una distancia
// exactamente 0 significa que el descriptor entrante es idéntico a uno enrolado,
// cosa que no ocurre en una captura viva. Es la huella de un descriptor copiado
// del inspector y reenviado. Un `if (distancia)` la trataría como ausente y
// perderíamos justo la evidencia que buscamos.
function distanciaValida(v) {
    return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= rostro_1.UMBRAL_COINCIDENCIA;
}
// Los campos que hay que escribir en el `Registro` para una entrada o una salida.
// Devuelve un objeto vacío cuando no hay nada que decir, y eso es deliberado:
// esas columnas se quedan en null, y ese null significa «no se sabe», no
// «cédula». Rellenar por descarte falsearía el número que se vino a medir.
//
// Pasa con los tokens de antes de este cambio, que duran 12 horas: durante ese
// rato después de desplegar habrá marcaciones sin método, y así es como debe ser.
function camposDeAutenticacion(sesion, momento) {
    if (!metodoValido(sesion.metodo))
        return {};
    const sufijo = momento === 'entrada' ? 'Entrada' : 'Salida';
    const campos = { [`metodo${sufijo}`]: sesion.metodo };
    // La distancia solo existe si hubo rostro que comparar. Junto a una marcación
    // por cédula sería un dato corrupto.
    if (sesion.metodo === 'ROSTRO' && distanciaValida(sesion.distancia)) {
        campos[`distancia${sufijo}`] = sesion.distancia;
    }
    return campos;
}
