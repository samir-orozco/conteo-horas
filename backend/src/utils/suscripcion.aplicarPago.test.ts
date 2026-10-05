import { describe, it, expect, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { aplicarPagoAprobado } from './suscripcion';

// El período que queda escrito en un pago aprobado (4 de octubre de 2026). Es el que
// dice el recibo, y su fin es hasta cuándo la empresa queda al día. Tiene que ser el
// mismo que se le cobró: antes empezaba el día del pago, y el recibo de un mes completo
// pagado el 20 decía «20 al 31 de octubre».

const bog = (a: number, mes: number, d: number, h = 12, min = 0) => new Date(Date.UTC(a, mes - 1, d, h + 5, min));
const medianoche = (a: number, mes: number, d: number) => bog(a, mes, d, 0);

const falso = (susc: { finPrueba: Date; pagadoHasta: Date | null }, pagosPrevios: number) => {
  const create = vi.fn(async (args: { data: Record<string, unknown> }) => ({ id: 'p1', creadoEn: new Date(), ...args.data }));
  const update = vi.fn(async (args: { data: Record<string, unknown> }) => args);
  const prisma = {
    suscripcion: { findUnique: async () => ({ id: 's1', ...susc }), update },
    pago: { findUnique: async () => null, count: async () => pagosPrevios, create },
    colaborador: { count: async () => 3 },
    empresa: { findUnique: async () => null },
    $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops),
  } as unknown as PrismaClient;
  return { prisma, escrito: () => create.mock.calls[0][0].data, vigencia: () => update.mock.calls[0][0].data.pagadoHasta };
};
const DATOS = { monto: 1000, metodo: 'LINK_WOMPI' as const, wompiTransaccionId: 'tx-1' };

describe('el período que queda escrito en el pago', () => {
  it('el primer pago, hecho en la prueba, empieza el día en que termina la prueba', async () => {
    const FIN = bog(2026, 10, 8, 23, 59);
    const f = falso({ finPrueba: FIN, pagadoHasta: null }, 0);
    await aplicarPagoAprobado(f.prisma, 'e1', DATOS, bog(2026, 10, 4));
    expect(f.escrito().periodoInicio).toEqual(FIN);
    expect(f.escrito().periodoFin).toEqual(medianoche(2026, 11, 1));
    expect(f.vigencia()).toEqual(medianoche(2026, 11, 1));
  });

  it('el pago atrasado de quien ya había pagado cubre el mes desde el día 1', async () => {
    const f = falso({ finPrueba: bog(2026, 3, 8), pagadoHasta: medianoche(2026, 10, 1) }, 1);
    await aplicarPagoAprobado(f.prisma, 'e1', DATOS, bog(2026, 10, 20));
    expect(f.escrito().periodoInicio).toEqual(medianoche(2026, 10, 1));
    expect(f.escrito().periodoFin).toEqual(medianoche(2026, 11, 1));
  });

  it('un pago de diferencia, con el mes ya pagado, corre desde hoy', async () => {
    const hoy = bog(2026, 10, 20);
    const f = falso({ finPrueba: bog(2026, 3, 8), pagadoHasta: medianoche(2026, 11, 1) }, 1);
    await aplicarPagoAprobado(f.prisma, 'e1', DATOS, hoy);
    expect(f.escrito().periodoInicio).toEqual(hoy);
    expect(f.escrito().periodoFin).toEqual(medianoche(2026, 11, 1));
  });

  it('si la prueba termina el mes que viene, el pago cubre ese mes', async () => {
    const f = falso({ finPrueba: bog(2026, 11, 3, 10), pagadoHasta: null }, 0);
    await aplicarPagoAprobado(f.prisma, 'e1', DATOS, bog(2026, 10, 30));
    expect(f.escrito().periodoFin).toEqual(medianoche(2026, 12, 1));
    expect(f.vigencia()).toEqual(medianoche(2026, 12, 1));
  });

  it('quien ya pagó cubre desde el día 1 aunque su prueba termine este mes', async () => {
    // Una prueba que el super admin extendió hasta el 8 después de un pago.
    const f = falso({ finPrueba: bog(2026, 10, 8), pagadoHasta: medianoche(2026, 10, 1) }, 1);
    await aplicarPagoAprobado(f.prisma, 'e1', DATOS, bog(2026, 10, 20));
    expect(f.escrito().periodoInicio).toEqual(medianoche(2026, 10, 1));
  });
});
