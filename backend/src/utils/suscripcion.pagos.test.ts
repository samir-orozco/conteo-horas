import { describe, it, expect, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { pagosDeLaEmpresa } from './suscripcion';

// Lo que el admin de una empresa ve de sus pagos (3 de octubre de 2026). Antes la
// ruta mandaba la fila entera: la foto del comprobante, la nota interna y el correo
// del super admin que lo registró, y además los pagos rechazados y pendientes.

const falso = () => {
  const findMany = vi.fn(async () => []);
  return { prisma: { pago: { findMany } } as unknown as PrismaClient, findMany };
};
const argumentos = async () => {
  const { prisma, findMany } = falso();
  await pagosDeLaEmpresa(prisma, 's1');
  return (findMany.mock.calls[0] as unknown as [{ where: Record<string, unknown>; select: Record<string, boolean>; take?: number }])[0];
};

describe('los pagos que ve la empresa', () => {
  it('solo los aprobados de su propia suscripción', async () => {
    const a = await argumentos();
    expect(a.where).toEqual({ suscripcionId: 's1', estado: 'APROBADO' });
  });

  it('todos, no solo los últimos doce', async () => {
    expect((await argumentos()).take).toBeUndefined();
  });

  it('sin el comprobante, la nota interna ni quién lo registró', async () => {
    const { select } = await argumentos();
    expect(select.comprobanteBase64).toBeUndefined();
    expect(select.nota).toBeUndefined();
    expect(select.registradoPor).toBeUndefined();
  });

  it('con lo que necesita el recibo en PDF', async () => {
    const { select } = await argumentos();
    for (const campo of ['id', 'monto', 'colaboradoresFacturados', 'periodoInicio', 'periodoFin', 'metodo', 'wompiTransaccionId', 'creadoEn']) {
      expect(select[campo], campo).toBe(true);
    }
  });
});
