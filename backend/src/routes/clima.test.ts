import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify from 'fastify';

// EL PANEL DEL CLIMA LABORAL (4 de octubre de 2026). Lo que se prueba aquí es lo que no se ve en las
// cuentas de utils/clima.ts: quién entra, y qué sale del buzón confidencial.

const { prisma, estado } = vi.hoisted(() => ({
  estado: { tieneClima: true },
  prisma: {
    observacionConfidencial: { findMany: vi.fn() },
    configuracion: { findUnique: vi.fn(), upsert: vi.fn() },
    colaborador: { findFirst: vi.fn() },
    colaboradorSede: { findMany: vi.fn() },
    calificacionClima: { findMany: vi.fn() },
    seguimientoClima: { findMany: vi.fn() },
    usuario: { findMany: vi.fn() },
  },
}));
vi.mock('../utils/sedesDeEmpresa', () => ({ sedesPorDefecto: async () => () => null }));
vi.mock('../prisma', () => ({ prisma }));
vi.mock('../utils/capacidades', () => ({
  exigeFuncion: () => async (_req: unknown, reply: { status: (n: number) => { send: (b: unknown) => unknown } }) => {
    if (!estado.tieneClima) return reply.status(403).send({ codigo: 'FUNCION_PLAN' });
  },
  tieneFuncion: vi.fn(),
}));
import climaRoutes from './clima';

let rol = 'ADMIN';
async function pedir(method: 'GET' | 'PUT', url: string, payload?: unknown) {
  const app = Fastify();
  app.decorate('requireEmpresa', async (request: { user?: unknown; empresaId?: string }) => {
    request.user = { rol, empresaId: 'emp-1' };
    request.empresaId = 'emp-1';
  });
  await app.register(climaRoutes, { prefix: '/api/clima' });
  await app.ready();
  const r = await app.inject({ method, url, payload: payload as Record<string, unknown> | undefined });
  await app.close();
  return r;
}

beforeEach(() => {
  vi.clearAllMocks();
  rol = 'ADMIN';
  estado.tieneClima = true;
  prisma.configuracion.findUnique.mockResolvedValue(null);
  prisma.configuracion.upsert.mockResolvedValue({});
  prisma.observacionConfidencial.findMany.mockResolvedValue([]);
});
afterEach(() => vi.useRealTimers());

describe('quién entra al panel', () => {
  it('un supervisor no: las calificaciones van con nombre', async () => {
    rol = 'SUPERVISOR';
    const r = await pedir('GET', '/api/clima/motivos');
    expect(r.statusCode).toBe(403);
    expect(r.json().codigo).toBe('SOLO_ADMIN');
  });

  it('el administrador sí', async () => {
    expect((await pedir('GET', '/api/clima/motivos')).statusCode).toBe(200);
  });

  it('sin el módulo en el plan, tampoco el administrador', async () => {
    estado.tieneClima = false;
    expect((await pedir('GET', '/api/clima/motivos')).json().codigo).toBe('FUNCION_PLAN');
  });
});

describe('GET /api/clima/buzon', () => {
  it('solo el texto: ni el id ni nada que diga cuándo llegó cada nota', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-14T15:00:00.000Z'));
    const lunes5 = new Date('2026-10-05T05:00:00.000Z');
    const lunes12 = new Date('2026-10-12T05:00:00.000Z');
    prisma.observacionConfidencial.findMany.mockResolvedValue([
      { id: 'n1', semana: lunes5, texto: 'uno' },
      { id: 'n2', semana: lunes12, texto: 'dos' },
      { id: 'n3', semana: lunes5, texto: 'tres' },
    ]);
    const r = await pedir('GET', '/api/clima/buzon');
    const cuerpo = r.json();
    // La semana más nueva primero, y dentro de cada semana solo textos.
    expect(cuerpo.semanas.map((s: { semana: string }) => s.semana)).toEqual([lunes12.toISOString(), lunes5.toISOString()]);
    expect([...cuerpo.semanas[1].notas].sort()).toEqual(['tres', 'uno']);
    expect(r.body).not.toMatch(/n1|n2|n3/);
  });

  it('pide a la base solo lo de su empresa y lo que ya se puede ver', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const ahora = new Date('2026-10-14T15:00:00.000Z');
    vi.setSystemTime(ahora);
    await pedir('GET', '/api/clima/buzon');
    const { where } = prisma.observacionConfidencial.findMany.mock.calls[0][0];
    expect(where.empresaId).toBe('emp-1');
    expect(where.visibleDesde).toEqual({ lte: ahora });
  });
});

describe('PUT /api/clima/motivos', () => {
  it('guarda los motivos validados en la configuración de la empresa', async () => {
    const r = await pedir('PUT', '/api/clima/motivos', { motivos: [' Turno largo ', 'Clientes difíciles'] });
    expect(r.statusCode).toBe(200);
    expect(prisma.configuracion.upsert).toHaveBeenCalledWith({
      where: { empresaId_clave: { empresaId: 'emp-1', clave: 'climaMotivos' } },
      create: { empresaId: 'emp-1', clave: 'climaMotivos', valor: JSON.stringify(['Turno largo', 'Clientes difíciles']) },
      update: { valor: JSON.stringify(['Turno largo', 'Clientes difíciles']) },
    });
  });

  it('rechaza más de cinco, y no guarda nada', async () => {
    const r = await pedir('PUT', '/api/clima/motivos', { motivos: ['a', 'b', 'c', 'd', 'e', 'f'] });
    expect(r.statusCode).toBe(400);
    expect(prisma.configuracion.upsert).not.toHaveBeenCalled();
  });
});

describe('GET /api/clima/resumen', () => {
  it('un rango de fechas inválido se rechaza antes de leer nada', async () => {
    expect((await pedir('GET', '/api/clima/resumen?desde=2026-10-10&hasta=2026-10-01')).statusCode).toBe(400);
    expect((await pedir('GET', '/api/clima/resumen?desde=ayer&hasta=hoy')).statusCode).toBe(400);
  });
});

// «Revisar» en «Necesitan atención» (4 de octubre de 2026): el historial de una persona, con nombre.
describe('GET /api/clima/persona/:id', () => {
  beforeEach(() => {
    prisma.colaborador.findFirst.mockResolvedValue({ id: 'c1', nombre: 'Andrea', apellido: 'Gómez', cargo: 'Caja', modalidad: 'PRESENCIAL' });
    prisma.colaboradorSede.findMany.mockResolvedValue([{ sede: { nombre: 'Sede Sur' } }]);
    prisma.seguimientoClima.findMany.mockResolvedValue([]);
    prisma.usuario.findMany.mockResolvedValue([{ id: 'u-1', nombre: 'Admin Uno' }]);
    prisma.calificacionClima.findMany.mockResolvedValue([
      { fecha: new Date('2026-10-03T05:00:00.000Z'), carita: 1, motivos: ['Mucho trabajo'], observacion: 'Me dejaron sola' },
      { fecha: new Date('2026-10-02T05:00:00.000Z'), carita: 4, motivos: [], observacion: null },
    ]);
  });

  it('busca a la persona SOLO dentro de la empresa de quien pregunta', async () => {
    await pedir('GET', '/api/clima/persona/c1');
    expect(prisma.colaborador.findFirst.mock.calls[0][0].where).toEqual({ id: 'c1', empresaId: 'emp-1' });
    expect(prisma.calificacionClima.findMany.mock.calls[0][0].where).toEqual({ colaboradorId: 'c1', empresaId: 'emp-1' });
  });

  it('una persona de otra empresa no existe para este panel', async () => {
    prisma.colaborador.findFirst.mockResolvedValue(null);
    const r = await pedir('GET', '/api/clima/persona/otra');
    expect(r.statusCode).toBe(404);
    expect(prisma.calificacionClima.findMany).not.toHaveBeenCalled();
  });

  it('devuelve sus respuestas, de la más nueva a la más vieja, con motivos y la observación directa', async () => {
    const r = await pedir('GET', '/api/clima/persona/c1');
    const cuerpo = r.json();
    expect(cuerpo.nombre).toBe('Andrea Gómez');
    expect(cuerpo.sedes).toEqual(['Sede Sur']);
    expect(cuerpo.respuestas[0]).toEqual({ fecha: '2026-10-03T05:00:00.000Z', carita: 1, motivos: ['Mucho trabajo'], observacion: 'Me dejaron sola' });
    expect(prisma.calificacionClima.findMany.mock.calls[0][0].orderBy).toEqual({ fecha: 'desc' });
  });

  it('trae su caso de seguimiento (el abierto antes que el último cerrado) y quiénes pueden ser responsables', async () => {
    prisma.seguimientoClima.findMany.mockResolvedValue([
      { id: 'cerrado', estado: 'CERRADO', responsableId: null, desde: new Date(), abiertoEn: new Date(), cerradoEn: new Date(), comentarios: [] },
      { id: 'abierto', estado: 'EN_SEGUIMIENTO', responsableId: 'u-1', desde: new Date(), abiertoEn: new Date(), cerradoEn: null,
        comentarios: [{ id: 'k1', autorNombre: 'Admin Uno', texto: 'Hablé con ella', creadoEn: new Date(), editadoEn: null }] },
    ]);
    const cuerpo = (await pedir('GET', '/api/clima/persona/c1')).json();
    expect(cuerpo.seguimiento.id).toBe('abierto');
    expect(cuerpo.seguimiento.comentarios[0].texto).toBe('Hablé con ella');
    expect(cuerpo.responsables).toEqual([{ id: 'u-1', nombre: 'Admin Uno' }]);
    expect(prisma.seguimientoClima.findMany.mock.calls[0][0].where).toEqual({ colaboradorId: 'c1', empresaId: 'emp-1' });
  });

  it('nunca toca las observaciones confidenciales', async () => {
    await pedir('GET', '/api/clima/persona/c1');
    expect(prisma.observacionConfidencial.findMany).not.toHaveBeenCalled();
  });

  it('un supervisor tampoco ve el historial', async () => {
    rol = 'SUPERVISOR';
    expect((await pedir('GET', '/api/clima/persona/c1')).statusCode).toBe(403);
  });
});
