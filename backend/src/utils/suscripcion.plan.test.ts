import { describe, it, expect, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { aplicarPlanDelPago } from './suscripcion';
import { referenciaPago, referenciaUpgrade } from './wompi';

// Un pago de cambio de plan lleva el plan destino en su referencia. /confirmar lo
// aplicaba; el webhook de Wompi no, así que quien pagaba el cambio con PSE o
// Nequi y cerraba la pestaña antes de volver al sitio quedaba cobrado y en el
// plan viejo. Esta es la regla, en un solo lugar para los dos caminos.

const VENCE = new Date(Date.UTC(2026, 9, 1, 5));
const falso = () => {
  const update = vi.fn(async () => ({}));
  return { prisma: { suscripcion: { update } } as unknown as PrismaClient, update };
};

describe('el plan que trae la referencia de un pago', () => {
  it('una referencia de cambio de plan aplica el plan destino', async () => {
    const { prisma, update } = falso();
    expect(await aplicarPlanDelPago(prisma, 'emp1', referenciaUpgrade('emp1', 'EMPRESARIAL', VENCE))).toBe('EMPRESARIAL');
    expect(update).toHaveBeenCalledWith({ where: { empresaId: 'emp1' }, data: { plan: 'EMPRESARIAL' } });
  });

  it('un pago normal no toca el plan', async () => {
    const { prisma, update } = falso();
    expect(await aplicarPlanDelPago(prisma, 'emp1', referenciaPago('emp1', VENCE))).toBeNull();
    expect(update).not.toHaveBeenCalled();
  });

  it('un plan que no existe no se aplica', async () => {
    const { prisma, update } = falso();
    expect(await aplicarPlanDelPago(prisma, 'emp1', referenciaUpgrade('emp1', 'INVENTADO', VENCE))).toBeNull();
    expect(update).not.toHaveBeenCalled();
  });
});
