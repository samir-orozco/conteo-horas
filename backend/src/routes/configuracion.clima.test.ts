import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';

// LOS MOTIVOS DEL CLIMA SOLO SE ESCRIBEN POR SU RUTA (4 de octubre de 2026). Van en `configuracion`, y
// la ruta genérica PUT /api/configuracion guarda cualquier clave sin mirar el rol: un supervisor podía
// cambiar los motivos por ahí y quitar «Jefe o supervisor», saltándose «solo el administrador» y el
// plan. Lo encontró la revisión adversarial del módulo.

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

describe('PUT /api/configuracion y los motivos del clima', () => {
  it('un supervisor no puede escribir los motivos por aquí', async () => {
    const r = await pedir('SUPERVISOR', { climaMotivos: JSON.stringify(['Mucho trabajo']) });
    expect(r.statusCode).toBe(403);
    expect(prisma.configuracion.upsert).not.toHaveBeenCalled();
  });

  it('el administrador tampoco: su único camino es PUT /api/clima/motivos', async () => {
    const r = await pedir('ADMIN', { climaMotivos: JSON.stringify(['Mucho trabajo']) });
    expect(r.statusCode).toBe(403);
    expect(prisma.configuracion.upsert).not.toHaveBeenCalled();
  });

  it('las demás claves siguen guardándose como antes', async () => {
    const r = await pedir('SUPERVISOR', { KIOSCO_PERMITE_CEDULA: '1' });
    expect(r.statusCode).toBe(200);
    expect(prisma.configuracion.upsert).toHaveBeenCalledTimes(1);
  });
});
