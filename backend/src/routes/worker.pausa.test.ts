import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';

// El kiosco pausado por falta de pago, en las rutas (4 de octubre de 2026). La regla está probada
// en utils/suscripcion.ts; aquí se prueba que cada puerta del kiosco la consulte y corte ANTES de
// escribir nada. Mismo patrón que worker.test.ts: el Prisma de mentira solo responde lo que se
// espera, y cualquier otra consulta revienta y queda anotada.

const { prisma, llamadas, estado } = vi.hoisted(() => {
  const llamadas: string[] = [];
  const estado = { suscripcion: null as unknown };
  const respuestas: Record<string, () => unknown> = {
    'empresa.findUnique': () => ({ id: 'e1', nombre: 'Tuercas & Pernos', activa: true, exentaPago: false, marcadorToken: 'tok' }),
    'suscripcion.findUnique': () => estado.suscripcion,
    'colaborador.findUnique': () => ({ id: 'c1', empresaId: 'e1', nombre: 'Ana', horario: null }),
    'configuracion.findUnique': () => null,
    'configuracion.findMany': () => [],
    'sede.count': () => 0,
  };
  const modelo = (nombre: string) =>
    new Proxy({}, {
      get: (_t, metodo) => {
        if (typeof metodo !== 'string' || metodo === 'then') return undefined;
        return () => {
          const clave = `${nombre}.${metodo}`;
          llamadas.push(clave);
          const r = respuestas[clave];
          return r ? Promise.resolve(r()) : Promise.reject(new Error(`la ruta siguió de largo hasta ${clave}`));
        };
      },
    });
  const prisma = new Proxy({}, {
    get: (_t, nombre) => (typeof nombre !== 'string' || nombre === 'then' ? undefined : modelo(nombre)),
  });
  return { prisma, llamadas, estado };
});
vi.mock('../prisma', () => ({ prisma }));

import workerRoutes from './worker';

const PAUSADA = { estado: 'SUSPENDIDA', finPrueba: new Date('2026-03-01T15:00:00.000Z'), pagadoHasta: new Date('2026-08-01T05:00:00.000Z') };
const AL_DIA = { estado: 'ACTIVA', finPrueba: new Date('2026-03-01T15:00:00.000Z'), pagadoHasta: new Date('2099-01-01T05:00:00.000Z') };
const MENSAJE = 'El kiosco de Tuercas & Pernos está pausado. Avísale al administrador de tu empresa.';

async function montar() {
  const app = Fastify();
  app.decorate('authenticate', async (request: { user?: unknown }) => {
    request.user = { id: 'c1', rol: 'WORKER', empresaId: 'e1' };
  });
  await app.register(workerRoutes, { prefix: '/api/worker' });
  await app.ready();
  return app;
}

beforeEach(() => {
  llamadas.length = 0;
  estado.suscripcion = PAUSADA;
});

describe('el kiosco pausado en cada puerta', () => {
  it('al cargar, el kiosco dice que está pausado', async () => {
    const app = await montar();
    const r = await app.inject({ method: 'GET', url: '/api/worker/kiosco/tok' });
    expect(r.json().pausado).toBe(true);
    await app.close();
  });

  it('control: al día, no está pausado', async () => {
    estado.suscripcion = AL_DIA;
    const app = await montar();
    const r = await app.inject({ method: 'GET', url: '/api/worker/kiosco/tok' });
    expect(r.json().pausado).toBe(false);
    await app.close();
  });

  it('entrar con la cédula responde 402 con el mensaje neutro, sin consultar nada más', async () => {
    const app = await montar();
    const r = await app.inject({ method: 'POST', url: '/api/worker/login', payload: { cedula: '1020304050', marcadorToken: 'tok' } });
    expect(r.statusCode).toBe(402);
    expect(r.json()).toEqual({ error: MENSAJE, codigo: 'KIOSCO_PAUSADO' });
    expect(llamadas).toEqual(['empresa.findUnique', 'suscripcion.findUnique']);
    await app.close();
  });

  it('entrar con el rostro también', async () => {
    const app = await montar();
    const r = await app.inject({ method: 'POST', url: '/api/worker/login-rostro', payload: { descriptor: Array(128).fill(0.1), marcadorToken: 'tok' } });
    expect(r.statusCode).toBe(402);
    expect(llamadas).toEqual(['empresa.findUnique', 'suscripcion.findUnique']);
    await app.close();
  });

  it('marcar con una sesión abierta antes de la pausa responde 402 sin escribir la marca', async () => {
    const app = await montar();
    const r = await app.inject({ method: 'POST', url: '/api/worker/marcar', payload: {} });
    expect(r.statusCode).toBe(402);
    expect(r.json().codigo).toBe('KIOSCO_PAUSADO');
    expect(llamadas).toEqual(['colaborador.findUnique', 'empresa.findUnique', 'suscripcion.findUnique']);
    await app.close();
  });

  it('reportar una novedad tampoco deja crearla', async () => {
    const app = await montar();
    const r = await app.inject({ method: 'POST', url: '/api/worker/novedad', payload: { tipo: 'VACACIONES', descripcion: 'Cita' } });
    expect(r.statusCode).toBe(402);
    expect(llamadas).toEqual(['colaborador.findUnique', 'empresa.findUnique', 'suscripcion.findUnique']);
    await app.close();
  });

  it('control: al día, marcar sigue de largo, más allá de la pausa', async () => {
    estado.suscripcion = AL_DIA;
    const app = await montar();
    const r = await app.inject({ method: 'POST', url: '/api/worker/marcar', payload: {} });
    expect(r.statusCode).not.toBe(402);
    expect(llamadas.length).toBeGreaterThan(3);
    await app.close();
  });
});
