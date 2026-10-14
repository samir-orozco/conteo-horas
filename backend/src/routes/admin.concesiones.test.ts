import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';

// LAS RUTAS DEL SUPER ADMIN PARA DAR FUNCIONES CON FECHA (14 de octubre de 2026, PENDIENTES nº 39, fase 2). Qué
// fechas valen lo decide utils/concesiones.ts, con sus pruebas; aquí, que la ruta lo aplica, que deja escrito
// quién la dio, y que una concesión de OTRA empresa no se puede tocar desde la URL de esta.

const { prisma, estado } = vi.hoisted(() => {
  const estado = {
    empresa: { id: 'emp1' } as null | { id: string },
    concesion: null as null | { id: string; empresaId: string; funcion: string; revocadaEn: Date | null },
    vigente: null as null | { id: string },
  };
  const prisma = {
    empresa: { findUnique: vi.fn(async () => estado.empresa) },
    concesionFuncion: {
      findFirst: vi.fn(async ({ where }: { where: { id?: string } }) => (where.id ? estado.concesion : estado.vigente)),
      create: vi.fn(async ({ data }: { data: object }) => ({ id: 'c-nueva', ...data })),
      update: vi.fn(async ({ data }: { data: object }) => ({ ...estado.concesion, ...data })),
    },
  };
  return { prisma, estado };
});
vi.mock('../prisma', () => ({ prisma }));
import adminRoutes from './admin';

async function montar() {
  const app = Fastify();
  app.decorate('requireSuperAdmin', async (request: { user?: unknown }) => {
    request.user = { id: 'sa1', rol: 'SUPER_ADMIN', nombre: 'Samir', email: 'dueno@horapro.co' };
  });
  await app.register(adminRoutes, { prefix: '/api/admin' });
  await app.ready();
  return app;
}

// Lejos en el futuro, para que la prueba no dependa del día en que corre.
const LEJOS = '2027-06-30';

beforeEach(() => {
  vi.clearAllMocks();
  estado.empresa = { id: 'emp1' };
  estado.concesion = { id: 'c1', empresaId: 'emp1', funcion: 'clima', revocadaEn: null };
  estado.vigente = null;
});

describe('dar una función con fecha', () => {
  it('la guarda como del super admin, con quién la dio y su fin exclusivo', async () => {
    const app = await montar();
    const r = await app.inject({ method: 'POST', url: '/api/admin/empresas/emp1/concesiones', payload: { funcion: 'clima', hasta: LEJOS } });
    expect(r.statusCode).toBe(201);
    expect(prisma.concesionFuncion.create).toHaveBeenCalledWith({
      data: {
        empresaId: 'emp1', funcion: 'clima', hasta: new Date('2027-07-01T05:00:00.000Z'),
        origen: 'SUPER_ADMIN', otorgadaPorId: 'sa1', otorgadaPorNombre: 'Samir',
      },
    });
    await app.close();
  });

  it('una fecha o una función inválidas son 400 y no escriben', async () => {
    const app = await montar();
    const a = await app.inject({ method: 'POST', url: '/api/admin/empresas/emp1/concesiones', payload: { funcion: 'clima', hasta: '2020-01-01' } });
    const b = await app.inject({ method: 'POST', url: '/api/admin/empresas/emp1/concesiones', payload: { funcion: 'inventada', hasta: LEJOS } });
    expect([a.statusCode, b.statusCode]).toEqual([400, 400]);
    expect(prisma.concesionFuncion.create).not.toHaveBeenCalled();
    await app.close();
  });

  it('si ya la tiene vigente, no se apila otra: 409, y se le cambia la fecha a la que tiene', async () => {
    estado.vigente = { id: 'c1' };
    const app = await montar();
    const r = await app.inject({ method: 'POST', url: '/api/admin/empresas/emp1/concesiones', payload: { funcion: 'clima', hasta: LEJOS } });
    expect(r.statusCode).toBe(409);
    expect(prisma.concesionFuncion.create).not.toHaveBeenCalled();
    await app.close();
  });

  it('a una empresa que no existe, 404', async () => {
    estado.empresa = null;
    const app = await montar();
    const r = await app.inject({ method: 'POST', url: '/api/admin/empresas/nadie/concesiones', payload: { funcion: 'clima', hasta: LEJOS } });
    expect(r.statusCode).toBe(404);
    expect(prisma.concesionFuncion.create).not.toHaveBeenCalled();
    await app.close();
  });
});

describe('cambiarle la fecha y quitarla', () => {
  it('cambiar la fecha guarda el nuevo fin', async () => {
    const app = await montar();
    const r = await app.inject({ method: 'PUT', url: '/api/admin/empresas/emp1/concesiones/c1', payload: { hasta: LEJOS } });
    expect(r.statusCode).toBe(200);
    expect(prisma.concesionFuncion.update).toHaveBeenCalledWith({ where: { id: 'c1' }, data: { hasta: new Date('2027-07-01T05:00:00.000Z') } });
    await app.close();
  });

  it('quitarla no la borra: la marca quitada, y queda en el historial', async () => {
    const app = await montar();
    const r = await app.inject({ method: 'DELETE', url: '/api/admin/empresas/emp1/concesiones/c1' });
    expect(r.statusCode).toBe(200);
    const llamada = (prisma.concesionFuncion.update.mock.calls[0] as unknown as [{ where: object; data: { revocadaEn: Date } }])[0];
    expect(llamada.where).toEqual({ id: 'c1' });
    expect(llamada.data.revocadaEn).toBeInstanceOf(Date);
    await app.close();
  });

  it('una concesión de otra empresa, o ya quitada, no se toca desde esta URL: 404', async () => {
    const app = await montar();
    estado.concesion = { id: 'c1', empresaId: 'otra', funcion: 'clima', revocadaEn: null };
    const a = await app.inject({ method: 'PUT', url: '/api/admin/empresas/emp1/concesiones/c1', payload: { hasta: LEJOS } });
    const b = await app.inject({ method: 'DELETE', url: '/api/admin/empresas/emp1/concesiones/c1' });
    estado.concesion = { id: 'c1', empresaId: 'emp1', funcion: 'clima', revocadaEn: new Date() };
    const c = await app.inject({ method: 'DELETE', url: '/api/admin/empresas/emp1/concesiones/c1' });
    expect([a.statusCode, b.statusCode, c.statusCode]).toEqual([404, 404, 404]);
    expect(prisma.concesionFuncion.update).not.toHaveBeenCalled();
    await app.close();
  });

  it('una fecha que ya pasó, al cambiarla, es 400', async () => {
    const app = await montar();
    const r = await app.inject({ method: 'PUT', url: '/api/admin/empresas/emp1/concesiones/c1', payload: { hasta: '2020-01-01' } });
    expect(r.statusCode).toBe(400);
    expect(prisma.concesionFuncion.update).not.toHaveBeenCalled();
    await app.close();
  });
});
