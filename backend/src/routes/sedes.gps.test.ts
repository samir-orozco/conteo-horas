import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';

// El permiso de GPS en la ruta de sedes (15 de septiembre de 2026): ponerle ubicación a una sede,
// moverla o cambiarle el radio exige que el plan incluya la marcación por GPS / geocerca. Qué cuenta
// como cambio lo decide utils/ubicacionDeSede.ts, con sus pruebas. Aquí se prueba que la ruta lo
// aplica: responde 403 sin escribir nada y deja pasar lo demás.

const { prisma, estado } = vi.hoisted(() => {
  const estado = {
    sedesActivas: 1,
    existente: null as null | { id: string; empresaId: string; nombre: string; lat: number | null; lng: number | null; radio: number },
    features: {} as Record<string, boolean>,
  };
  const prisma = {
    sede: {
      count: vi.fn(async () => estado.sedesActivas),
      create: vi.fn(async ({ data }: { data: object }) => ({ id: 'nueva', ...data })),
      findFirst: vi.fn(async () => estado.existente),
      update: vi.fn(async ({ data }: { data: object }) => ({ ...estado.existente, ...data })),
    },
  };
  return { prisma, estado };
});
vi.mock('../prisma', () => ({ prisma }));
vi.mock('../utils/capacidades', () => ({
  capacidadesEmpresa: vi.fn(async () => ({ features: estado.features })),
}));

import sedeRoutes from './sedes';

async function montar() {
  const app = Fastify();
  app.decorate('requireEmpresa', async (request: { empresaId?: string }) => { request.empresaId = 'emp1'; });
  await app.register(sedeRoutes, { prefix: '/api/sedes' });
  await app.ready();
  return app;
}

const UBICACION = { lat: 6.2087, lng: -75.5674, radio: 150 };

beforeEach(() => {
  vi.clearAllMocks();
  estado.sedesActivas = 1;
  estado.existente = { id: 's1', empresaId: 'emp1', nombre: 'Sede principal', ...UBICACION };
  estado.features = { gps: false, multiSede: true };
});

describe('sin el permiso de GPS', () => {
  it('no deja crear una sede con ubicación, y no la crea', async () => {
    const app = await montar();
    const r = await app.inject({ method: 'POST', url: '/api/sedes', payload: { nombre: 'Norte', ...UBICACION } });
    expect(r.statusCode).toBe(403);
    expect(r.json()).toMatchObject({ codigo: 'FUNCION_PLAN', funcion: 'gps' });
    expect(prisma.sede.create).not.toHaveBeenCalled();
    await app.close();
  });

  it('tampoco si es la primera sede de la empresa', async () => {
    estado.sedesActivas = 0;
    const app = await montar();
    const r = await app.inject({ method: 'POST', url: '/api/sedes', payload: { nombre: 'Norte', ...UBICACION } });
    expect(r.statusCode).toBe(403);
    expect(prisma.sede.create).not.toHaveBeenCalled();
    await app.close();
  });

  it('deja crear una sede sin ubicación', async () => {
    const app = await montar();
    const r = await app.inject({ method: 'POST', url: '/api/sedes', payload: { nombre: 'Norte', lat: null, lng: null } });
    expect(r.statusCode).toBe(201);
    expect(prisma.sede.create).toHaveBeenCalledTimes(1);
    await app.close();
  });

  it('deja renombrar la sede que ya tenía ubicación, si la ubicación no cambia', async () => {
    const app = await montar();
    const r = await app.inject({ method: 'PUT', url: '/api/sedes/s1', payload: { nombre: 'Principal centro', ...UBICACION } });
    expect(r.statusCode).toBe(200);
    expect(prisma.sede.update).toHaveBeenCalledTimes(1);
    await app.close();
  });

  it('no deja moverla, y no la cambia', async () => {
    const app = await montar();
    const r = await app.inject({ method: 'PUT', url: '/api/sedes/s1', payload: { nombre: 'Sede principal', ...UBICACION, lng: -75.5675 } });
    expect(r.statusCode).toBe(403);
    expect(r.json()).toMatchObject({ codigo: 'FUNCION_PLAN', funcion: 'gps' });
    expect(prisma.sede.update).not.toHaveBeenCalled();
    await app.close();
  });

  it('no deja ponerle ubicación a una sede que no tenía', async () => {
    estado.existente = { id: 's1', empresaId: 'emp1', nombre: 'Sede principal', lat: null, lng: null, radio: 150 };
    const app = await montar();
    const r = await app.inject({ method: 'PUT', url: '/api/sedes/s1', payload: { nombre: 'Sede principal', ...UBICACION } });
    expect(r.statusCode).toBe(403);
    expect(prisma.sede.update).not.toHaveBeenCalled();
    await app.close();
  });

  it('deja quitarle la ubicación', async () => {
    const app = await montar();
    const r = await app.inject({ method: 'PUT', url: '/api/sedes/s1', payload: { nombre: 'Sede principal', lat: null, lng: null } });
    expect(r.statusCode).toBe(200);
    expect(prisma.sede.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ lat: null, lng: null }) }));
    await app.close();
  });
});

describe('con el permiso de GPS', () => {
  it('deja crear una sede con ubicación', async () => {
    estado.features = { gps: true, multiSede: true };
    const app = await montar();
    const r = await app.inject({ method: 'POST', url: '/api/sedes', payload: { nombre: 'Norte', ...UBICACION } });
    expect(r.statusCode).toBe(201);
    expect(prisma.sede.create).toHaveBeenCalledTimes(1);
    await app.close();
  });

  it('la segunda sede sigue exigiendo el permiso de varias sedes', async () => {
    estado.features = { gps: true, multiSede: false };
    const app = await montar();
    const r = await app.inject({ method: 'POST', url: '/api/sedes', payload: { nombre: 'Norte', lat: null, lng: null } });
    expect(r.statusCode).toBe(403);
    expect(r.json()).toMatchObject({ codigo: 'FUNCION_PLAN', funcion: 'multiSede' });
    expect(prisma.sede.create).not.toHaveBeenCalled();
    await app.close();
  });
});
