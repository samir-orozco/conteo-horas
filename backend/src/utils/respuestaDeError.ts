import type { FastifyReply, FastifyRequest } from 'fastify';

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
export const RESPUESTA_ERROR_INESPERADO = { error: 'Ocurrió un error inesperado. Intenta de nuevo en un momento.' };

export function esErrorInesperado(error: { statusCode?: number }): boolean {
  return !error.statusCode || error.statusCode >= 500;
}

export function manejarError(error: Error & { statusCode?: number }, request: FastifyRequest, reply: FastifyReply) {
  // Un 4xx vuelve a Fastify tal cual: enviado desde aquí lo arma su manejador de siempre.
  if (!esErrorInesperado(error)) return reply.send(error);
  request.log.error(error);
  return reply.status(500).send(RESPUESTA_ERROR_INESPERADO);
}
