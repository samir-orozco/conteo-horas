import { describe, it, expect } from 'vitest';
import { filasDelRecibo, type PagoRecibo } from './recibo';

// Lo que dice el recibo en PDF. Lo descargan el super admin y, desde el 3 de octubre
// de 2026, el admin de la empresa. Las pruebas corren en Los Ángeles a propósito.

const PAGO: PagoRecibo = {
  id: 'cm1abcdefgh12345678', monto: 99900, colaboradoresFacturados: 1,
  // 22 de octubre a las 9 a. m. en Bogotá; cubre hasta la medianoche del 1 de noviembre.
  periodoInicio: '2026-10-22T14:00:00.000Z', periodoFin: '2026-11-01T05:00:00.000Z',
  metodo: 'LINK_WOMPI', creadoEn: '2026-10-22T14:00:00.000Z', wompiTransaccionId: '1234-abc',
  suscripcion: { empresa: { nombre: 'Tuercas', nit: '900', email: 'a@b.co' } },
};
const valor = (pago: PagoRecibo, fila: string) => filasDelRecibo(pago).find(([k]) => k === fila)?.[1];

describe('las filas del recibo', () => {
  it('el período termina el último día pagado, en hora de Bogotá', () => {
    expect(valor(PAGO, 'Período cubierto')).toBe('22 de octubre de 2026 a 31 de octubre de 2026');
  });

  it('el colaborador va en singular cuando es uno', () => {
    expect(valor(PAGO, 'Concepto')).toBe('Suscripción HoraPro · 1 colaborador');
  });

  it('sin nota ni quién lo registró (el de la empresa) no lleva esas filas', () => {
    const filas = filasDelRecibo(PAGO).map(([k]) => k);
    expect(filas).not.toContain('Nota');
    expect(filas).not.toContain('Registrado por');
  });

  it('con nota y quién lo registró (el del super admin) sí las lleva', () => {
    const interno = { ...PAGO, nota: 'Transferencia Bancolombia', registradoPor: 'admin@horapro.co' };
    expect(valor(interno, 'Nota')).toBe('Transferencia Bancolombia');
    expect(valor(interno, 'Registrado por')).toBe('admin@horapro.co');
  });
});
