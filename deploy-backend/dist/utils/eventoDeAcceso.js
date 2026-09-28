"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventoDeAcceso = eventoDeAcceso;
exports.motivoDeRespuesta = motivoDeRespuesta;
const crypto_1 = require("crypto");
const huellaDeEvento_1 = require("./huellaDeEvento");
const MENSAJES = {
    CREDENCIALES: 'Contraseña incorrecta',
    DEMASIADOS_INTENTOS: 'Demasiados intentos seguidos',
    TOKEN_INVALIDO: 'Sesión inválida o vencida',
    SIN_PERMISO: 'Intentó entrar donde no tiene permiso',
};
function eventoDeAcceso(intento) {
    const ip = intento.ip?.trim() || 'desconocida';
    // Un motivo que nadie tradujo sale nombrado y no vacío: el `default` explícito de §9.4. Una
    // pantalla con filas en blanco es peor que una con una etiqueta fea.
    const base = MENSAJES[intento.motivo] ?? `Acceso rechazado (${intento.motivo})`;
    // La regla de agrupación, que es lo único no obvio de este archivo:
    //
    // - Contra una cuenta que EXISTE, se cuenta por cuenta. Son pocas y se quiere ver a quién están
    //   atacando: "18 intentos contra admin@horapro.co".
    // - Contra correos que no existen, se cuenta solo por IP. Un bot que prueba diez mil correos
    //   inventados en una noche tiene que dejar UNA fila que diga diez mil, no diez mil filas. El
    //   correo concreto que probó igual queda en el detalle.
    const cuenta = intento.correoConocido && intento.email ? intento.email.toLowerCase() : '';
    const huella = (0, crypto_1.createHash)('sha1')
        .update(`ACCESO ${intento.motivo} ${ip} ${cuenta}`)
        .digest('hex')
        .slice(0, 32);
    const mensaje = cuenta ? `${base}: ${cuenta}` : base;
    const detalle = [
        `Motivo: ${intento.motivo}`,
        `IP: ${ip}`,
        intento.ruta ? `Ruta: ${intento.ruta}` : null,
        intento.email ? `Correo probado: ${intento.email}` : null,
        intento.email && !intento.correoConocido ? 'Ese correo no corresponde a ninguna cuenta.' : null,
        intento.navegador ? `Navegador: ${intento.navegador}` : null,
    ].filter(Boolean).join('\n');
    return {
        huella,
        ip,
        mensaje: (0, huellaDeEvento_1.recortar)(mensaje, 500),
        detalle,
        ruta: intento.ruta,
        navegador: intento.navegador,
    };
}
// Qué respuesta del servidor cuenta como un intento de entrar donde no se debía.
//
// Existe para que el enganche global pueda registrar esto sin que haya que acordarse en cada ruta:
// el día que alguien escriba una ruta nueva que rechaza con 403, queda registrada sola. Un mapa
// por código y un `default` explícito, no una cadena de condiciones (CLAUDE.md §9.4).
const MOTIVO_POR_ESTADO = {
    429: 'DEMASIADOS_INTENTOS',
    403: 'SIN_PERMISO',
    401: 'TOKEN_INVALIDO',
};
// `yaRegistrado` evita la fila doble: las rutas de login registran el intento por su cuenta,
// porque son las únicas que saben qué correo se probó y si esa cuenta existe.
//
// La primera versión de esto excluía las RUTAS de login enteras, y era un defecto: un ataque de
// fuerza bruta cortado por el límite de intentos devuelve 429 sin llegar nunca a la ruta, así que
// no lo registraba nadie. Es decir, lo único que no quedaba registrado era precisamente el ataque
// masivo que el módulo existe para mostrar. Se cazó verificando contra la base y no con la suite,
// que es de lo que avisa CLAUDE.md §8.6.
function motivoDeRespuesta(estado, _url, yaRegistrado = false) {
    if (yaRegistrado)
        return null;
    return MOTIVO_POR_ESTADO[estado] ?? null;
}
