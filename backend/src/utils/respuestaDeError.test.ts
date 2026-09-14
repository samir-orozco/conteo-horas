import { describe, it, expect, vi } from 'vitest';
import { esErrorInesperado, manejarError, RESPUESTA_ERROR_INESPERADO } from './respuestaDeError';

// Qué responde el backend ante un error que ninguna ruta atajó (13 de septiembre de 2026). Sin
// manejador propio, Fastify mandaba el mensaje crudo del error: con Prisma trae la consulta y la
// ruta del archivo en el servidor. Los 4xx (token vencido, demasiados intentos, cuerpo inválido)
// siguen saliendo como los arma Fastify, porque su mensaje le sirve a quien los recibe. Lo
// inesperado sale con un texto fijo y queda completo en el registro del servidor.
describe('esErrorInesperado', () => {
  it('un error sin código es inesperado', () => {
    expect(esErrorInesperado(new Error('Invalid `prisma.permiso.create()` invocation in /srv/app/dist/routes/permisos.js:91'))).toBe(true);
  });

  it('un 500 o más también', () => {
    expect(esErrorInesperado({ statusCode: 500 })).toBe(true);
    expect(esErrorInesperado({ statusCode: 503 })).toBe(true);
  });

  it('un 4xx no', () => {
    expect(esErrorInesperado({ statusCode: 400 })).toBe(false);
    expect(esErrorInesperado({ statusCode: 401 })).toBe(false);
    expect(esErrorInesperado({ statusCode: 429 })).toBe(false);
  });
});

describe('manejarError', () => {
  const armar = () => {
    const reply = { status: vi.fn(), send: vi.fn() };
    reply.status.mockReturnValue(reply);
    const request = { log: { error: vi.fn() } };
    return { reply, request };
  };

  it('lo inesperado responde 500 con el texto fijo, sin el mensaje interno, y lo deja en el registro', () => {
    const { reply, request } = armar();
    const error = new Error('Invalid `prisma.permiso.create()` invocation in /srv/app/dist/routes/permisos.js:91');
    manejarError(error, request as never, reply as never);
    expect(reply.status).toHaveBeenCalledWith(500);
    expect(reply.send).toHaveBeenCalledWith(RESPUESTA_ERROR_INESPERADO);
    expect(JSON.stringify(RESPUESTA_ERROR_INESPERADO)).not.toContain('permisos');
    expect(request.log.error).toHaveBeenCalledWith(error);
  });

  it('un 4xx lo devuelve tal cual, para que lo arme Fastify', () => {
    const { reply, request } = armar();
    const error = Object.assign(new Error('Rate limit exceeded, retry in 1 minute'), { statusCode: 429 });
    manejarError(error, request as never, reply as never);
    expect(reply.send).toHaveBeenCalledWith(error);
    expect(reply.status).not.toHaveBeenCalled();
  });
});
