import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';

// Cuando se elimina una empresa, el kiosco puede tener abierta la sesión de uno
// de sus trabajadores: el token dura 12 horas y sigue siendo válido aunque la
// persona ya no exista. Antes, al marcar, la ruta seguía de largo hasta el
// INSERT y reventaba con 500 contra la llave foránea. Ahora tiene que decir que
// la sesión ya no vale ANTES de intentar escribir nada.
//
// `worker.ts` importa `prisma` de './prisma' (CLAUDE.md 8.5), así que se monta
// sin levantar el servidor. El Prisma de mentira solo sabe responder que el
// colaborador no existe: cualquier otra consulta revienta y queda anotada, que
// es como se demuestra que la ruta no siguió de largo.

const { prisma, llamadas } = vi.hoisted(() => {
  const llamadas: string[] = [];
  const modelo = (nombre: string) =>
    new Proxy({}, {
      get: (_t, metodo) => {
        if (typeof metodo !== 'string' || metodo === 'then') return undefined;
        return () => {
          llamadas.push(`${nombre}.${metodo}`);
          if (nombre === 'colaborador' && metodo.startsWith('find')) return Promise.resolve(null);
          return Promise.reject(new Error(`la ruta siguió de largo hasta ${nombre}.${metodo}`));
        };
      },
    });
  const prisma = new Proxy({}, {
    get: (_t, nombre) => (typeof nombre !== 'string' || nombre === 'then' ? undefined : modelo(nombre)),
  });
  return { prisma, llamadas };
});
vi.mock('../prisma', () => ({ prisma }));

import workerRoutes from './worker';

type Quien = { id: string; rol: string; empresaId: string };
let quien: Quien;

async function montar() {
  const app = Fastify();
  app.decorate('authenticate', async (request: { user?: unknown }) => { request.user = quien; });
  await app.register(workerRoutes, { prefix: '/api/worker' });
  await app.ready();
  return app;
}

beforeEach(() => {
  llamadas.length = 0;
  quien = { id: 'col-borrado', rol: 'WORKER', empresaId: 'emp-borrada' };
});

describe('la sesión de kiosco de alguien que ya no existe', () => {
  it('al marcar responde 401 con un mensaje para la persona, sin intentar escribir', async () => {
    const app = await montar();
    const r = await app.inject({ method: 'POST', url: '/api/worker/marcar', payload: {} });
    expect(r.statusCode).toBe(401);
    expect(r.json().error).toMatch(/sesión/i);
    expect(llamadas).toEqual(['colaborador.findUnique']);
    await app.close();
  });

  it('al enviar una novedad responde 401 y no la crea', async () => {
    const app = await montar();
    const r = await app.inject({ method: 'POST', url: '/api/worker/novedad', payload: { tipo: 'VACACIONES', descripcion: 'Cita médica' } });
    expect(r.statusCode).toBe(401);
    expect(r.json().error).toMatch(/sesión/i);
    expect(llamadas.every(l => l.startsWith('colaborador.find'))).toBe(true);
    await app.close();
  });

  it('control: un token que no es de trabajador sigue respondiendo 403 sin consultar nada', async () => {
    quien = { id: 'u1', rol: 'ADMIN', empresaId: 'e1' };
    const app = await montar();
    const r = await app.inject({ method: 'POST', url: '/api/worker/marcar', payload: {} });
    expect(r.statusCode).toBe(403);
    expect(llamadas).toEqual([]);
    await app.close();
  });
});
