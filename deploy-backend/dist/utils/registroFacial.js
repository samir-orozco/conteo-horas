"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TEXTO_MAYOR_DE_EDAD = exports.TEXTO_AUTORIZACION_ADMINISTRADOR = exports.MAX_INTENTOS_CEDULA = exports.DURACION_ENLACE_MS = void 0;
exports.hashDeToken = hashDeToken;
exports.crearTokenDeEnlace = crearTokenDeEnlace;
exports.estadoDelEnlace = estadoDelEnlace;
exports.cedulaCoincide = cedulaCoincide;
exports.textoAutorizacionEnlace = textoAutorizacionEnlace;
exports.respuestaDelEstado = respuestaDelEstado;
exports.mensajeCedulaEquivocada = mensajeCedulaEquivocada;
const crypto_1 = __importDefault(require("crypto"));
// EL REGISTRO FACIAL QUE HACE LA PROPIA PERSONA, DESDE UN ENLACE (14 de septiembre de 2026).
//
// El administrador crea el enlace desde la ficha y se lo manda a la persona. Con él, la persona
// confirma su cédula, lee la autorización y decide: registra su rostro o dice que no autoriza. Lo que
// decida queda como constancia, con la fecha, el texto exacto que leyó y que lo hizo ella. Las tomas
// del escaneo NO se guardan: del rostro sigue quedando solo el cálculo, como en el registro de la ficha.
// Decisión del dueño: una hora. Sirve una sola vez, y crear uno nuevo anula el anterior.
exports.DURACION_ENLACE_MS = 60 * 60 * 1000;
// La cédula es un dato que otros pueden conocer, así que no protege mucho; pero sin tope se podría
// probar una tras otra hasta dar con ella. Al quinto error el enlace queda bloqueado.
exports.MAX_INTENTOS_CEDULA = 5;
// El token viaja solo en el enlace. En la base queda su huella: quien lea la base no puede armar un
// enlace que funcione.
function hashDeToken(token) {
    return crypto_1.default.createHash('sha256').update(token).digest('hex');
}
function crearTokenDeEnlace() {
    const token = crypto_1.default.randomBytes(32).toString('base64url');
    return { token, hash: hashDeToken(token) };
}
// El orden decide qué se le dice a la persona cuando pasa más de una cosa: a quien ya lo usó se le
// dice eso, y no que venció, porque lo que tiene que hacer es distinto.
function estadoDelEnlace(enlace, ahora) {
    if (!enlace)
        return 'NO_EXISTE';
    if (enlace.usadoEn)
        return 'USADO';
    if (enlace.anuladoEn)
        return 'ANULADO';
    if (enlace.intentosCedula >= exports.MAX_INTENTOS_CEDULA)
        return 'BLOQUEADO';
    if (ahora.getTime() >= enlace.venceEn.getTime())
        return 'VENCIDO';
    return 'VIGENTE';
}
// Como la escribe la gente: con puntos, espacios o guiones, y las de extranjería con letras.
const normalizarCedula = (v) => v.replace(/[\s.-]/g, '').toUpperCase();
function cedulaCoincide(ingresada, guardada) {
    if (typeof ingresada !== 'string')
        return false;
    const escrita = normalizarCedula(ingresada);
    return escrita !== '' && escrita === normalizarCedula(guardada);
}
// El texto que se guarda en la constancia es exactamente el que se mostró. Si cambia, cambia lo que
// se autorizó: por eso vive aquí, en el servidor, y la pantalla lo pinta tal cual lo recibe.
exports.TEXTO_AUTORIZACION_ADMINISTRADOR = 'El colaborador autoriza el tratamiento de su rostro como dato biométrico, conforme a la Ley 1581 de 2012 (Habeas Data).';
exports.TEXTO_MAYOR_DE_EDAD = 'Soy mayor de edad.';
// Si la empresa apagó la cédula en el kiosco, el texto no promete esa salida: sería una constancia
// de algo que no es cierto.
function textoAutorizacionEnlace(empresa, permiteCedula) {
    const inicio = `Autorizo a ${empresa} a tratar mi rostro como dato biométrico para identificarme cuando marco mi asistencia.`;
    return permiteCedula
        ? `${inicio} Sé que es voluntario, que puedo marcar con mi cédula y que puedo retirar esta autorización cuando quiera.`
        : `${inicio} Sé que es voluntario y que puedo retirar esta autorización cuando quiera.`;
}
// Lo que ve quien abre un enlace que ya no sirve. Cada caso dice qué hacer: la persona está sola con
// su teléfono y no tiene a quién preguntarle en ese momento.
function respuestaDelEstado(estado) {
    switch (estado) {
        case 'VIGENTE':
            return null;
        case 'NO_EXISTE':
            return { status: 404, codigo: 'ENLACE_NO_EXISTE', error: 'Este enlace no existe. Revisa que esté completo o pide uno nuevo a tu empresa.' };
        case 'VENCIDO':
            return { status: 410, codigo: 'ENLACE_VENCIDO', error: 'Este enlace venció: duraba una hora. Pide uno nuevo a tu empresa.' };
        case 'USADO':
            return { status: 410, codigo: 'ENLACE_USADO', error: 'Este enlace ya se usó. Si necesitas cambiar algo, pide uno nuevo a tu empresa.' };
        case 'ANULADO':
            return { status: 410, codigo: 'ENLACE_ANULADO', error: 'Este enlace ya no sirve porque tu empresa creó uno más nuevo. Usa el último que te enviaron.' };
        case 'BLOQUEADO':
            return { status: 410, codigo: 'ENLACE_BLOQUEADO', error: 'Este enlace se bloqueó porque la cédula se escribió mal varias veces. Pide uno nuevo a tu empresa.' };
        default: {
            const sinRespuesta = estado;
            throw new Error(`Estado de enlace sin respuesta: ${String(sinRespuesta)}`);
        }
    }
}
// `intentosGastados` cuenta el que se acaba de equivocar.
function mensajeCedulaEquivocada(intentosGastados) {
    const quedan = exports.MAX_INTENTOS_CEDULA - intentosGastados;
    return quedan === 1
        ? 'La cédula no coincide. Te queda 1 intento.'
        : `La cédula no coincide. Te quedan ${quedan} intentos.`;
}
