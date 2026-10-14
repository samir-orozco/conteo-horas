import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { finDePrueba } from '../utils/pruebaClima';
import { hoyEnBogota } from '../utils/fechas';

// LAS RUTAS DE LA PRUEBA GRATIS DEL CLIMA (14 de octubre de 2026, PENDIENTES nº 39, fase 3). Qué se decide está en
// utils/pruebaClima.ts, con sus pruebas. Aquí: que las rutas NO exigen el plan (son para quien no lo tiene), que
// solo el administrador la pide, que queda como concesión de origen PRUEBA con quién la pidió, que enciende la
// calificación del día y que avisa en la campana.

const { prisma, estado, notificar } = vi.hoisted(() => {
  const estado = { tieneClima: false, pruebas: [] as { desde: Date; hasta: Date; revocadaEn: Date | null }[] };
  const prisma = {
    concesionFuncion: {
      findMany: vi.fn(async () => estado.pruebas),
      create: vi.fn(async ({ data }: { data: object }) => ({ id: 'prueba-1', ...data })),
    },
    configuracion: { upsert: vi.fn(async () => ({})) },
  };
  return { prisma, estado, notificar: vi.fn() };
});
vi.mock('../prisma', () => ({ prisma }));
vi.mock('../utils/capacidades', () => ({
  exigeFuncion: () => async () => undefined,
  tieneFuncion: vi.fn(),
  capacidadesEmpresa: async () => ({ features: { clima: estado.tieneClima } }),
}));
vi.mock('../utils/sedesDeEmpresa', () => ({ sedesPorDefecto: async () => () => null }));
vi.mock('../utils/notificaciones', () => ({ notificar }));
import climaRoutes from './clima';

async function pedir(method: 'GET' | 'POST', rol = 'ADMIN') {
  const app = Fastify();
  app.decorate('requireEmpresa', async (request: { user?: unknown; empresaId?: string; usuarioId?: string; usuarioNombre?: string }) => {
    request.user = { rol, empresaId: 'emp-1' };
    request.empresaId = 'emp-1';
    request.usuarioId = 'u-1';
    request.usuarioNombre = 'Admin Uno';
  });
  await app.register(climaRoutes, { prefix: '/api/clima' });
  await app.ready();
  const r = await app.inject({ method, url: '/api/clima/prueba' });
  await app.close();
  return r;
}

beforeEach(() => {
  vi.clearAllMocks();
  estado.tieneClima = false;
  estado.pruebas = [];
});

describe('GET /api/clima/prueba', () => {
  it('sin pruebas y sin el plan, está disponible, y dice cuántos días dura', async () => {
    const r = await pedir('GET');
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual({ disponible: true, vigente: null, terminada: null, dias: 30 });
  });

  it('busca solo las pruebas del clima de esta empresa', async () => {
    await pedir('GET');
    expect(prisma.concesionFuncion.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { empresaId: 'emp-1', funcion: 'clima', origen: 'PRUEBA' },
    }));
  });
});

describe('POST /api/clima/prueba', () => {
  it('la guarda como prueba de 30 días, con quién la pidió, enciende la calificación y avisa', async () => {
    const r = await pedir('POST');
    expect(r.statusCode).toBe(201);
    expect(prisma.concesionFuncion.create).toHaveBeenCalledWith({
      data: {
        empresaId: 'emp-1', funcion: 'clima', hasta: finDePrueba(hoyEnBogota()), origen: 'PRUEBA',
        otorgadaPorId: 'u-1', otorgadaPorNombre: 'Admin Uno',
      },
    });
    expect(prisma.configuracion.upsert).toHaveBeenCalledWith({
      where: { empresaId_clave: { empresaId: 'emp-1', clave: 'CLIMA_CALIFICACION_DIA' } },
      create: { empresaId: 'emp-1', clave: 'CLIMA_CALIFICACION_DIA', valor: '1' },
      update: { valor: '1' },
    });
    expect(notificar).toHaveBeenCalledWith('emp-1', expect.objectContaining({
      tipo: 'PRUEBA_CLIMA_INICIO', entidad: 'clima', entidadId: 'prueba-1',
    }));
  });

  it('una empresa que ya la usó no la vuelve a pedir: 409', async () => {
    estado.pruebas = [{ desde: new Date('2026-01-01'), hasta: new Date('2026-01-31'), revocadaEn: null }];
    const r = await pedir('POST');
    expect(r.statusCode).toBe(409);
    expect(r.json().codigo).toBe('YA_USO');
    expect(prisma.concesionFuncion.create).not.toHaveBeenCalled();
    expect(notificar).not.toHaveBeenCalled();
  });

  it('una empresa que ya tiene el clima no la necesita: 409', async () => {
    estado.tieneClima = true;
    const r = await pedir('POST');
    expect(r.statusCode).toBe(409);
    expect(r.json().codigo).toBe('YA_TIENE');
    expect(prisma.concesionFuncion.create).not.toHaveBeenCalled();
  });

  it('solo el administrador la pide', async () => {
    const r = await pedir('POST', 'SUPERVISOR');
    expect(r.statusCode).toBe(403);
    expect(prisma.concesionFuncion.create).not.toHaveBeenCalled();
  });
});
