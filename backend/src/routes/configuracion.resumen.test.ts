import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';

// EL INTERRUPTOR DEL RESUMEN SEMANAL (11 de octubre de 2026). Es de toda la empresa y decide qué les
// llega a los administradores, así que lo cambia un administrador, no un supervisor. Y solo acepta
// encendido o apagado: cualquier otra cosa se leería como encendido sin que nadie lo hubiera elegido.

const { prisma } = vi.hoisted(() => ({ prisma: { configuracion: { upsert: vi.fn() } } }));
vi.mock('../prisma', () => ({ prisma }));
vi.mock('../utils/capacidades', () => ({
  capacidadesEmpresa: async () => ({ features: { gps: true, telegram: true, clima: true } }),
}));
import configuracionRoutes from './configuracion';

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

describe('PUT /api/configuracion y el resumen semanal', () => {
  it('un supervisor no lo puede apagar', async () => {
    const r = await pedir('SUPERVISOR', { RESUMEN_SEMANAL_CORREO: '0' });
    expect(r.statusCode).toBe(403);
    expect(prisma.configuracion.upsert).not.toHaveBeenCalled();
  });

  it('el administrador lo apaga y lo prende', async () => {
    expect((await pedir('ADMIN', { RESUMEN_SEMANAL_CORREO: '0' })).statusCode).toBe(200);
    expect((await pedir('ADMIN', { RESUMEN_SEMANAL_CORREO: '1' })).statusCode).toBe(200);
    expect(prisma.configuracion.upsert).toHaveBeenCalledTimes(2);
  });

  it('un valor que no es encendido ni apagado se rechaza', async () => {
    const r = await pedir('ADMIN', { RESUMEN_SEMANAL_CORREO: 'no' });
    expect(r.statusCode).toBe(400);
    expect(prisma.configuracion.upsert).not.toHaveBeenCalled();
  });
});
