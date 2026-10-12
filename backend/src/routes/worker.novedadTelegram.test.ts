import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';

// LA NOVEDAD POR APROBAR LLEGA AL GRUPO SIN DECIR DE QUÉ ES (12 de octubre de 2026).
//
// Esta es la costura: la ruta real del kiosco, POST /api/worker/novedad, con la base de mentira y
// Telegram interceptado. Lo que decide el texto está probado aparte (telegramDelKiosco.test.ts); aquí
// se prueba que la ruta lo usa, que respeta el interruptor, y que ni el tipo ni lo que escribió la
// persona se cuelan al grupo: una cita médica es un dato de salud.

const { prisma, enviados, config } = vi.hoisted(() => {
  const enviados: { chat: string; texto: string }[] = [];
  const config: { clave: string; valor: string }[] = [];
  const prisma = {
    colaborador: { findUnique: vi.fn(async (q: { select?: Record<string, boolean> }) =>
      q.select?.nombre ? { nombre: 'Carlos', apellido: 'Mejía', empresaId: 'emp-1' } : { id: 'col-1' }) },
    empresa: { findUnique: vi.fn(async () => ({ id: 'emp-1', nombre: 'La Esquina', exentaPago: true })) },
    suscripcion: { findUnique: vi.fn(async () => null) },
    permiso: { create: vi.fn(async () => ({ id: 'per-1' })) },
    notificacion: { create: vi.fn(async () => ({})) },
    configuracion: { findMany: vi.fn(async () => config) },
  };
  return { prisma, enviados, config };
});
vi.mock('../prisma', () => ({ prisma }));
vi.mock('../utils/telegram', () => ({
  enviarTelegram: vi.fn(async (chat: string, texto: string) => { enviados.push({ chat, texto }); return { ok: true }; }),
  telegramConfigurado: true,
}));

import workerRoutes from './worker';

async function reportar(payload: Record<string, string>) {
  const app = Fastify();
  app.decorate('authenticate', async (request: { user?: unknown }) => { request.user = { id: 'col-1', rol: 'WORKER', empresaId: 'emp-1' }; });
  await app.register(workerRoutes, { prefix: '/api/worker' });
  await app.ready();
  const r = await app.inject({ method: 'POST', url: '/api/worker/novedad', payload });
  // El aviso no bloquea la respuesta: se le da un respiro para que salga.
  await new Promise(res => setTimeout(res, 20));
  await app.close();
  return r;
}

beforeEach(() => { enviados.length = 0; config.length = 0; vi.clearAllMocks(); });

describe('POST /api/worker/novedad y Telegram', () => {
  it('con el aviso encendido, llega al grupo sin el tipo ni el motivo', async () => {
    config.push({ clave: 'TELEGRAM_NOVEDADES', valor: '1' }, { clave: 'TELEGRAM_CHAT_ID', valor: '-100' });
    const r = await reportar({ tipo: 'MEDICO', descripcion: 'Cita con el psiquiatra' });
    expect(r.statusCode).toBe(201);
    expect(enviados).toHaveLength(1);
    expect(enviados[0].chat).toBe('-100');
    expect(enviados[0].texto).toContain('<b>Carlos Mejía</b> reportó una novedad y espera tu aprobación');
    expect(enviados[0].texto).toContain('/app/colaboradores/col-1?tab=novedades');
    expect(enviados[0].texto).not.toMatch(/MEDICO|médic|psiquiatra/i);
  });

  it('con el aviso apagado, no llega nada, aunque el de llegadas tarde esté encendido', async () => {
    config.push({ clave: 'TELEGRAM_ALERTAS_TARDE', valor: '1' }, { clave: 'TELEGRAM_CHAT_ID', valor: '-100' });
    const r = await reportar({ tipo: 'PERSONAL', descripcion: '' });
    expect(r.statusCode).toBe(201);
    expect(enviados).toHaveLength(0);
  });

  it('la campana sigue recibiendo la novedad, encendido o no el aviso de Telegram', async () => {
    await reportar({ tipo: 'PERSONAL', descripcion: '' });
    expect(prisma.notificacion.create).toHaveBeenCalledTimes(1);
  });
});
