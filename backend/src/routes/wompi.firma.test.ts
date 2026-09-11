import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import crypto from 'node:crypto';

// La firma del evento es lo único que distingue un aviso de Wompi de uno que
// fabrica cualquiera. Antes solo se comprobaba SI la firma venía: un POST sin el
// campo `signature` se aceptaba, y con la referencia de una empresa real
// registraba un pago APROBADO que nadie hizo, activaba la suscripción y le
// causaba comisión al afiliado. Wompi firma todos sus eventos, así que con el
// secreto puesto, sin firma no pasa.
//
// El secreto se fija reemplazando la constante de utils/wompi.ts, que lo lee del
// entorno al cargar: así no depende del .env de quien corre las pruebas.

const SECRETO = 'test_events_secreto_de_prueba';
const { aplicarPagoAprobado } = vi.hoisted(() => ({ aplicarPagoAprobado: vi.fn() }));
vi.mock('../prisma', () => ({ prisma: {} }));
vi.mock('../utils/suscripcion', () => ({ aplicarPagoAprobado, aplicarPlanDelPago: vi.fn() }));
vi.mock('../utils/wompi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../utils/wompi')>()),
  WOMPI_EVENTS_SECRET: 'test_events_secreto_de_prueba',
}));

import wompiRoutes from './wompi';
import { referenciaPago } from '../utils/wompi';

const PROPIEDADES = ['transaction.id', 'transaction.status', 'transaction.amount_in_cents'];
const TS = 1_789_000_000;
const data = {
  transaction: {
    id: 'tx-9', status: 'APPROVED', amount_in_cents: 29_990_000,
    reference: referenciaPago('cempresareal01', new Date(Date.UTC(2026, 9, 1, 5))),
  } as Record<string, unknown>,
};
const firmar = (secreto: string) =>
  crypto.createHash('sha256')
    .update(PROPIEDADES.map(p => String(data.transaction[p.split('.')[1]])).join('') + TS + secreto)
    .digest('hex');

async function enviar(cuerpo: Record<string, unknown>) {
  const app = Fastify();
  await app.register(wompiRoutes, { prefix: '/api/wompi' });
  await app.ready();
  const r = await app.inject({ method: 'POST', url: '/api/wompi/eventos', payload: cuerpo });
  await app.close();
  return r;
}

beforeEach(() => {
  aplicarPagoAprobado.mockReset();
  aplicarPagoAprobado.mockResolvedValue({ id: 'pago-1' });
});

describe('con el secreto de eventos puesto', () => {
  it('un evento sin firma se rechaza con 401 y no registra ningún pago', async () => {
    const r = await enviar({ event: 'transaction.updated', data, timestamp: TS });
    expect(r.statusCode).toBe(401);
    expect(aplicarPagoAprobado).not.toHaveBeenCalled();
  });

  it('una firma sin checksum se rechaza igual', async () => {
    const r = await enviar({ event: 'transaction.updated', data, timestamp: TS, signature: { properties: PROPIEDADES } });
    expect(r.statusCode).toBe(401);
    expect(aplicarPagoAprobado).not.toHaveBeenCalled();
  });

  it('control: con una firma hecha con otro secreto, 401', async () => {
    const r = await enviar({ event: 'transaction.updated', data, timestamp: TS, signature: { properties: PROPIEDADES, checksum: firmar('otro-secreto') } });
    expect(r.statusCode).toBe(401);
    expect(aplicarPagoAprobado).not.toHaveBeenCalled();
  });

  it('control: con la firma correcta, se registra el pago', async () => {
    const r = await enviar({ event: 'transaction.updated', data, timestamp: TS, signature: { properties: PROPIEDADES, checksum: firmar(SECRETO) } });
    expect(r.statusCode).toBe(200);
    expect(aplicarPagoAprobado).toHaveBeenCalledTimes(1);
  });
});
