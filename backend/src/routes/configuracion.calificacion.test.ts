import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';

// EL INTERRUPTOR «CALIFICACIÓN DEL DÍA» (14 de octubre de 2026, PENDIENTES nº 39). Decide si a TODOS los
// trabajadores de la empresa se les pregunta cómo les fue al salir: lo cambia un administrador, en cualquier
// plan, y solo a encendido o apagado.

const { prisma, features } = vi.hoisted(() => ({
  prisma: { configuracion: { upsert: vi.fn() } },
  features: { gps: true, telegram: true, clima: false } as Record<string, boolean>,
}));
vi.mock('../prisma', () => ({ prisma }));
// SIN el módulo de clima: la calificación del día no depende del plan.
vi.mock('../utils/capacidades', () => ({ capacidadesEmpresa: async () => ({ features }) }));
import configuracionRoutes from './configuracion';

const CLAVE = 'CLIMA_CALIFICACION_DIA';

async function pedir(rol: string, payload: Record<string, unknown>) {
  const app = Fastify();
  app.decorate('requireEmpresa', async (request: { user?: unknown; empresaId?: string }) => {
    request.user = { rol, empresaId: 'emp-1' };
    request.empresaId = 'emp-1';
  });
  await app.register(configuracionRoutes, { prefix: '/api/configuracion' });
  await app.ready();
  const r = await app.inject({ method: 'PUT', url: '/api/configuracion', payload });
  await app.close();
  return r;
}

beforeEach(() => { vi.clearAllMocks(); prisma.configuracion.upsert.mockResolvedValue({}); });

describe('PUT /api/configuracion y la calificación del día', () => {
  it('un supervisor no la puede apagar', async () => {
    const r = await pedir('SUPERVISOR', { [CLAVE]: '0' });
    expect(r.statusCode).toBe(403);
    expect(prisma.configuracion.upsert).not.toHaveBeenCalled();
  });

  it('el administrador la apaga y la prende, aunque su plan no tenga el clima', async () => {
    expect((await pedir('ADMIN', { [CLAVE]: '0' })).statusCode).toBe(200);
    expect((await pedir('ADMIN', { [CLAVE]: '1' })).statusCode).toBe(200);
    expect(prisma.configuracion.upsert).toHaveBeenCalledTimes(2);
  });

  it('un valor que no es encendido ni apagado se rechaza', async () => {
    const r = await pedir('ADMIN', { [CLAVE]: 'si' });
    expect(r.statusCode).toBe(400);
    expect(prisma.configuracion.upsert).not.toHaveBeenCalled();
  });
});
