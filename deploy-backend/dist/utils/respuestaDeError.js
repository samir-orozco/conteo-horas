"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RESPUESTA_ERROR_INESPERADO = void 0;
exports.esErrorInesperado = esErrorInesperado;
exports.manejarError = manejarError;
// Qué responde el backend ante un error que ninguna ruta atajó (13 de septiembre de 2026).
//
// Sin manejador propio, Fastify mandaba el mensaje crudo del error. Con Prisma ese mensaje trae la
// consulta y la ruta del archivo en el servidor, y llegaba al navegador. Lo inesperado sale ahora con
// un texto fijo y queda completo en el registro del servidor.
//
// Los 4xx no se tocan: token vencido, demasiados intentos, cuerpo que no cumple el esquema. Su mensaje
// le sirve a quien lo recibe, y la forma en que los arma Fastify es la que el frontend ya conoce. Un
// mensaje de negocio que tenga que llegar a la pantalla va con su 4xx explícito en la ruta, no como
// excepción.
exports.RESPUESTA_ERROR_INESPERADO = { error: 'Ocurrió un error inesperado. Intenta de nuevo en un momento.' };
function esErrorInesperado(error) {
    return !error.statusCode || error.statusCode >= 500;
}
function manejarError(error, request, reply) {
    // Un 4xx vuelve a Fastify tal cual: enviado desde aquí lo arma su manejador de siempre.
    if (!esErrorInesperado(error))
        return reply.send(error);
    request.log.error(error);
    return reply.status(500).send(exports.RESPUESTA_ERROR_INESPERADO);
}
