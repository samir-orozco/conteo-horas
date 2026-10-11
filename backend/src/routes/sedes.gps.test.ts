import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';

// El permiso de GPS en la ruta de sedes (15 de septiembre de 2026): ponerle ubicación a una sede,
// moverla o cambiarle el radio exige que el plan incluya la marcación por GPS / geocerca. Qué cuenta
// como cambio lo decide utils/ubicacionDeSede.ts, con sus pruebas. Aquí se prueba que la ruta lo
// aplica: responde 403 sin escribir nada y deja pasar lo demás.

const { prisma, estado } = vi.hoisted(() => {
  const estado = {
    sedesActivas: 1,
    existente: null as null | { id: string; empresaId: string; nombre: string; lat: number | null; lng: number | null; radio: number; margenFuera: number },
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
  estado.existente = { id: 's1', empresaId: 'emp1', nombre: 'Sede principal', ...UBICACION, margenFuera: 0 };
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

// El margen para marcar fuera de la geocerca, con alerta (11 de octubre de 2026). Qué valores valen lo
// decide leerMargenFuera, con sus pruebas; aquí, que la ruta lo aplica.
describe('el margen fuera de la geocerca', () => {
  const datosEscritos = () => (prisma.sede.update.mock.calls[0] as unknown as [{ data: Record<string, unknown> }])[0].data;

  it('un PUT que no lo manda lo deja como estaba, no lo apaga', async () => {
    estado.existente = { ...estado.existente!, margenFuera: 200 };
    const app = await montar();
    const r = await app.inject({ method: 'PUT', url: '/api/sedes/s1', payload: { nombre: 'Principal', ...UBICACION } });
    expect(r.statusCode).toBe(200);
    expect(datosEscritos().margenFuera).toBe(200);
    await app.close();
  });

  it('con el permiso de GPS se guarda lo que se manda', async () => {
    estado.features = { gps: true, multiSede: true };
    const app = await montar();
    const r = await app.inject({ method: 'PUT', url: '/api/sedes/s1', payload: { nombre: 'Principal', ...UBICACION, margenFuera: 250 } });
    expect(r.statusCode).toBe(200);
    expect(datosEscritos().margenFuera).toBe(250);
    await app.close();
  });

  it('sin el permiso de GPS, abrir el margen de una sede con ubicación es cambiar la geocerca: 403', async () => {
    const app = await montar();
    const r = await app.inject({ method: 'PUT', url: '/api/sedes/s1', payload: { nombre: 'Principal', ...UBICACION, margenFuera: 250 } });
    expect(r.statusCode).toBe(403);
    expect(prisma.sede.update).not.toHaveBeenCalled();
    await app.close();
  });

  it('un valor inválido se rechaza con 400 y no se escribe nada, al crear y al editar', async () => {
    estado.features = { gps: true, multiSede: true };
    const app = await montar();
    const crear = await app.inject({ method: 'POST', url: '/api/sedes', payload: { nombre: 'Norte', ...UBICACION, margenFuera: -5 } });
    const editar = await app.inject({ method: 'PUT', url: '/api/sedes/s1', payload: { nombre: 'Principal', ...UBICACION, margenFuera: 'mucho' } });
    expect([crear.statusCode, editar.statusCode]).toEqual([400, 400]);
    expect(prisma.sede.create).not.toHaveBeenCalled();
    expect(prisma.sede.update).not.toHaveBeenCalled();
    await app.close();
  });

  it('al crear sin mandarlo queda en 0, apagado', async () => {
    const app = await montar();
    await app.inject({ method: 'POST', url: '/api/sedes', payload: { nombre: 'Norte', lat: null, lng: null } });
    expect((prisma.sede.create.mock.calls[0] as unknown as [{ data: Record<string, unknown> }])[0].data.margenFuera).toBe(0);
    await app.close();
  });
});
