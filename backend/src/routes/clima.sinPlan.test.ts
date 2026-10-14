import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';

// LAS RUTAS DEL CLIMA SIN EL PLAN (14 de octubre de 2026, PENDIENTES nº 39, fase 4). Lo que se decide está en
// utils/climaSinPlan.ts, con sus pruebas. Aquí: que estas rutas NO exigen el plan mientras el panel completo sí, que
// solo el administrador las lee, que de la base pueden salir nombres y textos pero de la respuesta no, que la vista
// sin el plan no abre casos de seguimiento, y que el conteo del buzón ni siquiera lee el texto de las notas.

const bog = (a: number, mes: number, d: number) => new Date(Date.UTC(a, mes - 1, d, 5));

const { prisma } = vi.hoisted(() => {
  const andrea = { id: 'c1', nombre: 'Andrea', apellido: 'Gómez', cargo: 'Cajera', modalidad: 'PRESENCIAL', activo: true };
  const luis = { id: 'c2', nombre: 'Luis', apellido: 'Pérez', cargo: null, modalidad: 'PRESENCIAL', activo: true };
  const dia = (d: number) => new Date(Date.UTC(2026, 9, d, 5));
  const mala = (d: number) => ({ colaboradorId: 'c1', fecha: dia(d), carita: 1, motivos: ['Mucho trabajo'], observacion: 'Me dejaron sola en el cierre', actualizadoEn: dia(d) });
  const filas = [mala(1), mala(2), mala(3), { colaboradorId: 'c2', fecha: dia(2), carita: 5, motivos: [], observacion: null, actualizadoEn: dia(2) }];
  const prisma = {
    colaborador: { findMany: vi.fn(async () => [andrea, luis]) },
    colaboradorSede: { findMany: vi.fn(async () => []) },
    sede: { findMany: vi.fn(async () => [{ id: 's1', nombre: 'Bodega Norte' }]) },
    calificacionClima: {
      // Las malas para «necesita atención» se piden por carita; las del período, por fecha.
      findMany: vi.fn(async ({ where }: { where: { carita?: unknown } }) => (where.carita ? filas.filter(f => f.carita <= 2) : filas)),
      groupBy: vi.fn(async () => [{ colaboradorId: 'c2', _max: { fecha: dia(2) } }]),
    },
    registro: { groupBy: vi.fn(async () => [1, 2, 3, 4, 5].map(d => ({ colaboradorId: 'c1', fecha: dia(d) }))) },
    seguimientoClima: { findMany: vi.fn(async () => []), createMany: vi.fn(async () => ({ count: 1 })) },
    observacionConfidencial: {
      findMany: vi.fn(async () => [{ id: 'n1', semana: dia(5), texto: 'El microondas lleva un mes dañado' }]),
      groupBy: vi.fn(async () => [{ semana: dia(5), _count: { _all: 2 } }, { semana: dia(12), _count: { _all: 3 } }]),
    },
  };
  return { prisma };
});
vi.mock('../prisma', () => ({ prisma }));
// Una empresa SIN el plan: el guardián del plan responde 403, como en producción.
vi.mock('../utils/capacidades', () => ({
  exigeFuncion: () => async (_request: unknown, reply: { status: (n: number) => { send: (b: unknown) => unknown } }) =>
    reply.status(403).send({ error: 'Tu plan no incluye esta función.', codigo: 'FUNCION_BLOQUEADA' }),
  tieneFuncion: vi.fn(),
  capacidadesEmpresa: async () => ({ features: { clima: false } }),
}));
vi.mock('../utils/sedesDeEmpresa', () => ({ sedesPorDefecto: async () => () => 's1' }));
vi.mock('../utils/notificaciones', () => ({ notificar: vi.fn() }));
import climaRoutes from './clima';

async function pedir(url: string, rol = 'ADMIN') {
  const app = Fastify();
  app.decorate('requireEmpresa', async (request: { user?: unknown; empresaId?: string }) => {
    request.user = { rol, empresaId: 'emp-1' };
    request.empresaId = 'emp-1';
  });
  await app.register(climaRoutes, { prefix: '/api/clima' });
  await app.ready();
  const r = await app.inject({ method: 'GET', url: `/api/clima${url}` });
  await app.close();
  return r;
}

const RANGO = '?desde=2026-10-01&hasta=2026-10-14';

beforeEach(() => { vi.clearAllMocks(); });

describe('GET /api/clima/vistazo', () => {
  it('sin el plan responde, mientras el panel completo dice que no', async () => {
    expect((await pedir(`/resumen${RANGO}`)).statusCode).toBe(403);
    expect((await pedir(`/vistazo${RANGO}`)).statusCode).toBe(200);
  });

  it('las cifras del período, con CUÁNTOS necesitan atención', async () => {
    const r = await pedir(`/vistazo${RANGO}`);
    expect(r.json()).toEqual({ total: 4, personas: 2, promedio: 2, variacion: null, jornadas: 5, atencion: 1 });
  });

  it('ni un nombre, ni un cargo, ni un motivo, ni una observación, ni una sede salen, aunque la base los tenga', async () => {
    const cuerpo = (await pedir(`/vistazo${RANGO}`)).body;
    for (const dato of ['Andrea', 'Gómez', 'Luis', 'Cajera', 'Mucho trabajo', 'Me dejaron sola', 'Bodega Norte', 'c1', 'c2']) {
      expect(cuerpo).not.toContain(dato);
    }
  });

  it('no abre casos de seguimiento: nadie podría verlos', async () => {
    await pedir(`/vistazo${RANGO}`);
    expect(prisma.calificacionClima.findMany).toHaveBeenCalled();
    expect(prisma.seguimientoClima.createMany).not.toHaveBeenCalled();
  });

  it('solo el administrador', async () => {
    expect((await pedir(`/vistazo${RANGO}`, 'SUPERVISOR')).statusCode).toBe(403);
  });

  it('un rango que no vale es 400', async () => {
    expect((await pedir('/vistazo?desde=2026-10-14&hasta=2026-10-01')).statusCode).toBe(400);
  });
});

describe('GET /api/clima/buzon/conteo', () => {
  it('sin el plan responde, mientras el buzón completo dice que no', async () => {
    expect((await pedir('/buzon')).statusCode).toBe(403);
    expect((await pedir('/buzon/conteo')).statusCode).toBe(200);
  });

  it('cuántas notas por semana, la más reciente primero', async () => {
    expect((await pedir('/buzon/conteo')).json()).toEqual({
      semanas: [{ semana: bog(2026, 10, 12).toISOString(), notas: 3 }, { semana: bog(2026, 10, 5).toISOString(), notas: 2 }],
    });
  });

  it('ni siquiera lee el texto de las notas', async () => {
    await pedir('/buzon/conteo');
    expect(prisma.observacionConfidencial.findMany).not.toHaveBeenCalled();
    expect(JSON.stringify(prisma.observacionConfidencial.groupBy.mock.calls)).not.toContain('texto');
  });

  it('solo el administrador', async () => {
    expect((await pedir('/buzon/conteo', 'SUPERVISOR')).statusCode).toBe(403);
  });
});
