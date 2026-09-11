import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { Writable } from 'node:stream';
import { Prisma } from '@prisma/client';

// El webhook de Wompi es el único camino por el que entra plata sin que nadie
// esté mirando. Con el borrado de empresas apareció un caso nuevo: Wompi aprueba
// un pago de una empresa que ya no existe (el cliente abrió el pago antes del
// borrado, o PSE tardó en confirmar). Wompi ya cobró, así que el silencio no es
// una opción: tiene que quedar una huella con qué devolver la plata.
//
// La ruta se monta sin levantar el servidor: `wompi.ts` importa `prisma` de
// './prisma' (CLAUDE.md 8.5), y aquí se reemplaza junto con la función que
// escribe el pago.

const { aplicarPagoAprobado, aplicarPlanDelPago } = vi.hoisted(() => ({ aplicarPagoAprobado: vi.fn(), aplicarPlanDelPago: vi.fn() }));
vi.mock('../prisma', () => ({ prisma: {} }));
vi.mock('../utils/suscripcion', () => ({ aplicarPagoAprobado, aplicarPlanDelPago }));
// Estas pruebas son SIN secreto de eventos, pase lo que pase en el entorno: el
// .env local lo trae puesto y se carga al importar, así que borrar la variable no
// alcanza. Se reemplaza la constante. Con secreto están en wompi.firma.test.ts.
vi.mock('../utils/wompi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../utils/wompi')>()),
  WOMPI_EVENTS_SECRET: '',
}));

import wompiRoutes from './wompi';
import { referenciaPago, referenciaUpgrade } from '../utils/wompi';

const EMPRESA = 'cempresaborrada01';
const REFERENCIA = referenciaPago(EMPRESA, new Date(Date.UTC(2026, 9, 1, 5)));

type Linea = { level: number; [k: string]: unknown };

async function montar() {
  const lineas: Linea[] = [];
  const salida = new Writable({
    write(trozo, _codificacion, listo) {
      for (const l of String(trozo).split('\n')) if (l.trim()) lineas.push(JSON.parse(l));
      listo();
    },
  });
  const app = Fastify({ logger: { level: 'info', stream: salida } });
  await app.register(wompiRoutes, { prefix: '/api/wompi' });
  await app.ready();
  return { app, lineas };
}

const evento = (transaccion: Record<string, unknown> = {}) => ({
  event: 'transaction.updated',
  data: { transaction: { id: 'tx-1234', status: 'APPROVED', reference: REFERENCIA, amount_in_cents: 29_990_000, ...transaccion } },
  timestamp: 1_789_000_000,
});

const errorPrisma = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('falla simulada', { code, clientVersion: '5.22.0' });

// Lo que hace falta para devolver la plata desde el panel de Wompi.
const huellaDelPagoSinEmpresa = (lineas: Linea[]) =>
  lineas.find(l =>
    l.level >= 50 && l.wompiTransaccionId === 'tx-1234' && l.referencia === REFERENCIA && l.montoCentavos === 29_990_000);

beforeEach(() => { aplicarPagoAprobado.mockReset(); aplicarPlanDelPago.mockReset(); });

describe('un pago aprobado de una empresa que existe', () => {
  it('se aplica y responde 200 sin dejar ningún error', async () => {
    aplicarPagoAprobado.mockResolvedValue({ id: 'pago-1' });
    const { app, lineas } = await montar();
    const r = await app.inject({ method: 'POST', url: '/api/wompi/eventos', payload: evento() });
    expect(r.statusCode).toBe(200);
    expect(aplicarPagoAprobado).toHaveBeenCalledWith(
      expect.anything(), EMPRESA, expect.objectContaining({ monto: 299_900, wompiTransaccionId: 'tx-1234' }));
    expect(lineas.filter(l => l.level >= 50)).toEqual([]);
    await app.close();
  });

  it('un evento que no es APPROVED no aplica nada', async () => {
    const { app } = await montar();
    const r = await app.inject({ method: 'POST', url: '/api/wompi/eventos', payload: evento({ status: 'DECLINED' }) });
    expect(r.statusCode).toBe(200);
    expect(aplicarPagoAprobado).not.toHaveBeenCalled();
    await app.close();
  });
});

describe('un pago aprobado de una empresa que ya no existe', () => {
  it('si la empresa ya se había borrado, responde 200 y deja huella con la transacción, la referencia y el monto', async () => {
    aplicarPagoAprobado.mockResolvedValue(null);
    const { app, lineas } = await montar();
    const r = await app.inject({ method: 'POST', url: '/api/wompi/eventos', payload: evento() });
    expect(r.statusCode).toBe(200);
    expect(huellaDelPagoSinEmpresa(lineas)).toBeDefined();
    await app.close();
  });

  it('si la empresa se borra justo mientras llega el pago, tampoco responde error: deja la misma huella', async () => {
    // P2003: la llave hacia la suscripción ya no existe al hacer commit.
    // P2025: la suscripción desapareció entre leerla y actualizarla.
    // Responder 500 solo haría que Wompi reintente tres veces en 24 horas contra
    // una empresa que no va a volver.
    for (const code of ['P2003', 'P2025']) {
      aplicarPagoAprobado.mockReset();
      aplicarPagoAprobado.mockRejectedValue(errorPrisma(code));
      const { app, lineas } = await montar();
      const r = await app.inject({ method: 'POST', url: '/api/wompi/eventos', payload: evento() });
      expect(r.statusCode, code).toBe(200);
      expect(huellaDelPagoSinEmpresa(lineas), code).toBeDefined();
      await app.close();
    }
  });

  it('un error conocido de Prisma que no es de empresa borrada también responde error', async () => {
    // P2002: dos entregas simultáneas del mismo evento chocan en el
    // wompiTransaccionId único. No es una empresa que dejó de existir, y
    // tratarlo así escribiría una orden de devolver plata que ya se registró.
    aplicarPagoAprobado.mockRejectedValue(errorPrisma('P2002'));
    const { app, lineas } = await montar();
    const r = await app.inject({ method: 'POST', url: '/api/wompi/eventos', payload: evento() });
    expect(r.statusCode).toBe(500);
    expect(huellaDelPagoSinEmpresa(lineas)).toBeUndefined();
    await app.close();
  });

  it('cualquier otro error sí responde error, para que Wompi lo reintente', async () => {
    // Una base caída no es una empresa borrada: ahí el reintento es lo correcto.
    aplicarPagoAprobado.mockRejectedValue(new Error("Can't reach database server"));
    const { app, lineas } = await montar();
    const r = await app.inject({ method: 'POST', url: '/api/wompi/eventos', payload: evento() });
    expect(r.statusCode).toBe(500);
    expect(huellaDelPagoSinEmpresa(lineas)).toBeUndefined();
    await app.close();
  });
});

describe('sin secreto de eventos configurado', () => {
  it('el evento se acepta, pero deja un aviso de que no se pudo verificar la firma', async () => {
    // Pasa en desarrollo. En producción sería el hueco de aceptar eventos
    // fabricados, y tiene que verse en el log.
    aplicarPagoAprobado.mockResolvedValue({ id: 'pago-1' });
    const { app, lineas } = await montar();
    const r = await app.inject({ method: 'POST', url: '/api/wompi/eventos', payload: evento() });
    expect(r.statusCode).toBe(200);
    expect(lineas.some(l => l.level === 40 && /sin verificar/i.test(String(l.msg)))).toBe(true);
    await app.close();
  });
});

describe('un pago aprobado de cambio de plan', () => {
  it('aplica el plan destino, igual que /confirmar', async () => {
    // Quien paga el cambio con PSE o Nequi y cierra la pestaña antes de volver
    // al sitio solo tiene este camino: si el webhook no aplica el plan, queda
    // cobrado y en el plan viejo.
    aplicarPagoAprobado.mockResolvedValue({ id: 'pago-1' });
    const referencia = referenciaUpgrade(EMPRESA, 'EMPRESARIAL', new Date(Date.UTC(2026, 9, 1, 5)));
    const { app } = await montar();
    const r = await app.inject({ method: 'POST', url: '/api/wompi/eventos', payload: evento({ reference: referencia }) });
    expect(r.statusCode).toBe(200);
    expect(aplicarPlanDelPago).toHaveBeenCalledWith(expect.anything(), EMPRESA, referencia);
    await app.close();
  });

  it('control: si la empresa ya no existe, no intenta aplicar ningún plan', async () => {
    aplicarPagoAprobado.mockResolvedValue(null);
    const { app } = await montar();
    await app.inject({ method: 'POST', url: '/api/wompi/eventos', payload: evento() });
    expect(aplicarPlanDelPago).not.toHaveBeenCalled();
    await app.close();
  });
});
