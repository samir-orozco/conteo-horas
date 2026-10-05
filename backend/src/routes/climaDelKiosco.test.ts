import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify from 'fastify';
import { descifrar } from '../utils/cifradoConfidencial';

// LAS RUTAS DE LAS CARITAS DEL KIOSCO (4 de octubre de 2026). Lo que se prueba aquí es la costura que
// la lógica pura no ve: quién puede escribir, con qué día, y sobre todo que la observación confidencial
// llegue a la base SIN el nombre a la vista y sin la hora.

const { prisma } = vi.hoisted(() => ({
  prisma: {
    configuracion: { findUnique: vi.fn() },
    calificacionClima: { upsert: vi.fn(), updateMany: vi.fn() },
    observacionConfidencial: { create: vi.fn() },
  },
}));
vi.mock('../prisma', () => ({ prisma }));
import climaDelKioscoRoutes from './climaDelKiosco';

const CLAVE_HEX = '07'.repeat(32);
const CLAVE = Buffer.from(CLAVE_HEX, 'hex');
// El día de la jornada, a medianoche de Bogotá (05:00 UTC).
const FECHA = '2026-10-05T05:00:00.000Z';

type Quien = Record<string, unknown>;
let quien: Quien;
const tokenClima = (extra: Quien = {}): Quien =>
  ({ rol: 'CLIMA', id: 'col-1', empresaId: 'emp-1', fecha: FECHA, jti: 'jti-1', ...extra });

async function pedir(method: 'PUT' | 'POST', url: string, payload: unknown) {
  const app = Fastify();
  app.decorate('authenticate', async (request: { user?: unknown }) => { request.user = quien; });
  await app.register(climaDelKioscoRoutes, { prefix: '/api/worker/clima' });
  await app.ready();
  const r = await app.inject({ method, url, payload: payload as Record<string, unknown> });
  await app.close();
  return r;
}

beforeEach(() => {
  vi.clearAllMocks();
  quien = tokenClima();
  prisma.configuracion.findUnique.mockResolvedValue(null);
  prisma.calificacionClima.upsert.mockResolvedValue({});
  prisma.calificacionClima.updateMany.mockResolvedValue({ count: 1 });
  prisma.observacionConfidencial.create.mockResolvedValue({});
  vi.stubEnv('CLAVE_CONFIDENCIAL', CLAVE_HEX);
});
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });

describe('PUT /api/worker/clima — la carita y los motivos', () => {
  it('con el token de la sesión del kiosco no se puede: hace falta el de la salida', async () => {
    // Con TODOS los campos del de la salida, para que lo único que lo distinga sea el rol: si el
    // rechazo dependiera de que le falta un campo, la prueba pasaría sin mirar el rol.
    quien = tokenClima({ rol: 'WORKER' });
    const r = await pedir('PUT', '/api/worker/clima', { carita: 4 });
    expect(r.statusCode).toBe(403);
    expect(prisma.calificacionClima.upsert).not.toHaveBeenCalled();
  });

  it('guarda la carita en el día de la jornada que dice el token, para esa persona', async () => {
    const r = await pedir('PUT', '/api/worker/clima', { carita: 2, motivos: ['Compañeros', 'Otro'] });
    expect(r.statusCode).toBe(200);
    // «Otro» no se guarda con la calificación: ver la prueba de leerCalificacion.
    expect(prisma.calificacionClima.upsert).toHaveBeenCalledWith({
      where: { colaboradorId_fecha: { colaboradorId: 'col-1', fecha: new Date(FECHA) } },
      create: { empresaId: 'emp-1', colaboradorId: 'col-1', fecha: new Date(FECHA), carita: 2, motivos: ['Compañeros'] },
      update: { carita: 2, motivos: ['Compañeros'] },
    });
  });

  it('el día y la persona salen del token, nunca del cuerpo', async () => {
    await pedir('PUT', '/api/worker/clima', { carita: 3, colaboradorId: 'otra', fecha: '2020-01-01', empresaId: 'otra' });
    const arg = prisma.calificacionClima.upsert.mock.calls[0][0];
    expect(arg.create).toMatchObject({ empresaId: 'emp-1', colaboradorId: 'col-1', fecha: new Date(FECHA) });
  });

  it('valida los motivos contra los de SU empresa', async () => {
    prisma.configuracion.findUnique.mockResolvedValue({ valor: JSON.stringify(['Clientes difíciles']) });
    const malo = await pedir('PUT', '/api/worker/clima', { carita: 1, motivos: ['Compañeros'] });
    expect(malo.statusCode).toBe(400);
    const bueno = await pedir('PUT', '/api/worker/clima', { carita: 1, motivos: ['Clientes difíciles'] });
    expect(bueno.statusCode).toBe(200);
    expect(prisma.configuracion.findUnique).toHaveBeenCalledWith({ where: { empresaId_clave: { empresaId: 'emp-1', clave: 'climaMotivos' } } });
  });

  it('una carita fuera de rango no se guarda', async () => {
    const r = await pedir('PUT', '/api/worker/clima', { carita: 9 });
    expect(r.statusCode).toBe(400);
    expect(prisma.calificacionClima.upsert).not.toHaveBeenCalled();
  });
});

describe('POST /api/worker/clima/observacion — directa', () => {
  it('va pegada a la calificación del día, con nombre', async () => {
    const r = await pedir('POST', '/api/worker/clima/observacion', { texto: ' Faltó gente ', confidencial: false });
    expect(r.statusCode).toBe(200);
    expect(prisma.calificacionClima.updateMany).toHaveBeenCalledWith({
      where: { colaboradorId: 'col-1', fecha: new Date(FECHA) },
      data: { observacion: 'Faltó gente' },
    });
    expect(prisma.observacionConfidencial.create).not.toHaveBeenCalled();
  });

  it('sin carita del día no hay a qué pegarla', async () => {
    prisma.calificacionClima.updateMany.mockResolvedValue({ count: 0 });
    const r = await pedir('POST', '/api/worker/clima/observacion', { texto: 'Hola' });
    expect(r.statusCode).toBe(409);
  });
});

describe('POST /api/worker/clima/observacion — confidencial', () => {
  it('se guarda aparte, sin la persona a la vista, sin la hora y con el autor cifrado', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    // Miércoles 7 de octubre, 5:42 p. m. de Bogotá.
    vi.setSystemTime(new Date('2026-10-07T22:42:00.000Z'));
    const r = await pedir('POST', '/api/worker/clima/observacion', { texto: 'El microondas', confidencial: true });
    expect(r.statusCode).toBe(200);
    expect(prisma.calificacionClima.updateMany).not.toHaveBeenCalled();

    const { data } = prisma.observacionConfidencial.create.mock.calls[0][0];
    expect(Object.keys(data).sort()).toEqual(['autorCifrado', 'empresaId', 'semana', 'texto', 'visibleDesde']);
    expect(data.empresaId).toBe('emp-1');
    expect(data.texto).toBe('El microondas');
    // Lunes 5 de octubre y jueves 8, los dos a medianoche de Bogotá: ninguno dice las 5:42 p. m.
    expect(data.semana).toEqual(new Date('2026-10-05T05:00:00.000Z'));
    expect(data.visibleDesde).toEqual(new Date('2026-10-08T05:00:00.000Z'));
    expect(data.autorCifrado).not.toContain('col-1');
    expect(descifrar(data.autorCifrado, CLAVE)).toBe('col-1');
  });

  it('una sola por salida: la segunda con el mismo token se rechaza', async () => {
    quien = tokenClima({ jti: 'jti-unico' });
    expect((await pedir('POST', '/api/worker/clima/observacion', { texto: 'a', confidencial: true })).statusCode).toBe(200);
    expect((await pedir('POST', '/api/worker/clima/observacion', { texto: 'b', confidencial: true })).statusCode).toBe(409);
    expect(prisma.observacionConfidencial.create).toHaveBeenCalledTimes(1);
  });

  it('dos envíos A LA VEZ con la misma salida: solo uno se guarda', async () => {
    // Encontrado por la revisión adversarial: el jti se marcaba después de guardar, así que mientras la
    // base respondía, otra petición pasaba la revisión. Se simula una base lenta.
    quien = tokenClima({ jti: 'jti-carrera' });
    prisma.observacionConfidencial.create.mockImplementation(() => new Promise(r => setTimeout(() => r({}), 20)));
    const app = Fastify();
    app.decorate('authenticate', async (request: { user?: unknown }) => { request.user = quien; });
    await app.register(climaDelKioscoRoutes, { prefix: '/api/worker/clima' });
    await app.ready();
    const envio = () => app.inject({ method: 'POST', url: '/api/worker/clima/observacion', payload: { texto: 'a', confidencial: true } });
    const estados = (await Promise.all([envio(), envio(), envio()])).map(r => r.statusCode).sort();
    await app.close();
    expect(estados).toEqual([200, 409, 409]);
    expect(prisma.observacionConfidencial.create).toHaveBeenCalledTimes(1);
  });

  it('sin la clave en el .env no se guarda, y lo dice con su propio código', async () => {
    vi.stubEnv('CLAVE_CONFIDENCIAL', '');
    quien = tokenClima({ jti: 'jti-sin-clave' });
    const r = await pedir('POST', '/api/worker/clima/observacion', { texto: 'a', confidencial: true });
    expect(r.statusCode).toBe(503);
    expect(r.json().codigo).toBe('SIN_CLAVE');
    expect(prisma.observacionConfidencial.create).not.toHaveBeenCalled();
    // Puesta la clave, la misma salida puede mandarla: el intento fallido no la gastó.
    vi.stubEnv('CLAVE_CONFIDENCIAL', CLAVE_HEX);
    expect((await pedir('POST', '/api/worker/clima/observacion', { texto: 'a', confidencial: true })).statusCode).toBe(200);
  });

  it('si la base falla, el texto no sale en la respuesta ni sigue al manejador de errores', async () => {
    quien = tokenClima({ jti: 'jti-falla' });
    prisma.observacionConfidencial.create.mockRejectedValue(new Error('Invalid create: texto "secreto del trabajador"'));
    const r = await pedir('POST', '/api/worker/clima/observacion', { texto: 'secreto del trabajador', confidencial: true });
    expect(r.statusCode).toBe(500);
    expect(r.body).not.toContain('secreto');
  });

  it('con un fallo, el mismo token puede reintentar', async () => {
    quien = tokenClima({ jti: 'jti-reintento' });
    prisma.observacionConfidencial.create.mockRejectedValueOnce(new Error('caída'));
    expect((await pedir('POST', '/api/worker/clima/observacion', { texto: 'a', confidencial: true })).statusCode).toBe(500);
    expect((await pedir('POST', '/api/worker/clima/observacion', { texto: 'a', confidencial: true })).statusCode).toBe(200);
  });
});
