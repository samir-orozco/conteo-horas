import { describe, it, expect } from 'vitest';
import type { Suscripcion } from '@prisma/client';
import { pausaDelKiosco, kioscoPausado, mensajeKioscoPausado } from './suscripcion';

// Cuándo se pausa el kiosco de una empresa que no pagó (4 de octubre de 2026). Hasta
// ahora no se pausaba nunca: una empresa podía marcar meses en el kiosco sin pagar ni
// abrir el panel, y al pagar un mes recuperaba todos esos datos. Decisión del dueño: el
// kiosco sigue 10 días después de la suspensión, que llega a los 5 de gracia, y se pausa
// a la medianoche siguiente. Las empresas que ya estén suspendidas al desplegar no
// reciben días extra.

// Un instante dado en hora de Bogotá (UTC-5 todo el año).
const bog = (a: number, mes: number, d: number, h = 12, min = 0) => new Date(Date.UTC(a, mes - 1, d, h + 5, min));
const medianoche = (a: number, mes: number, d: number) => bog(a, mes, d, 0);
const susc = (c: { finPrueba: Date; pagadoHasta?: Date | null; estado?: string }) =>
  ({ id: 's1', estado: 'PRUEBA', pagadoHasta: null, ...c }) as unknown as Suscripcion;
const NORMAL = { exentaPago: false };

describe('el día en que se pausa el kiosco', () => {
  it('prueba hasta el 8 a las 11:59 p. m.: gracia hasta el 13, suspendida del 14 al 23, pausa el 24', () => {
    expect(pausaDelKiosco(susc({ finPrueba: bog(2026, 10, 8, 23, 59) }))).toEqual(medianoche(2026, 10, 24));
  });

  it('si la prueba termina a media mañana, igual se pausa a medianoche y no en plena jornada', () => {
    expect(pausaDelKiosco(susc({ finPrueba: bog(2026, 10, 8, 10) }))).toEqual(medianoche(2026, 10, 24));
  });

  it('mes pagado hasta el 31 de octubre: gracia del 1 al 5, suspendida del 6 al 15, pausa el 16', () => {
    const pagada = susc({ finPrueba: bog(2026, 3, 8), pagadoHasta: medianoche(2026, 11, 1) });
    expect(pausaDelKiosco(pagada)).toEqual(medianoche(2026, 11, 16));
  });
});

describe('si el kiosco está pausado', () => {
  const VENCIDA = susc({ finPrueba: bog(2026, 10, 8, 23, 59) });

  it('el último día se marca, y a la medianoche se pausa', () => {
    expect(kioscoPausado(NORMAL, VENCIDA, bog(2026, 10, 23, 23, 59))).toBe(false);
    expect(kioscoPausado(NORMAL, VENCIDA, medianoche(2026, 10, 24))).toBe(true);
  });

  it('al pagar se reactiva en el acto', () => {
    const pagada = susc({ finPrueba: bog(2026, 10, 8, 23, 59), pagadoHasta: medianoche(2026, 12, 1), estado: 'ACTIVA' });
    expect(kioscoPausado(NORMAL, pagada, bog(2026, 11, 2))).toBe(false);
  });

  it('una empresa suspendida hace meses se pausa ya, sin días extra', () => {
    const vieja = susc({ finPrueba: bog(2026, 3, 8), pagadoHasta: medianoche(2026, 7, 1), estado: 'SUSPENDIDA' });
    expect(kioscoPausado(NORMAL, vieja, bog(2026, 10, 10))).toBe(true);
  });

  it('una empresa exenta nunca se pausa', () => {
    expect(kioscoPausado({ exentaPago: true }, VENCIDA, bog(2027, 1, 1))).toBe(false);
  });

  it('sin suscripción no se pausa, igual que el panel', () => {
    expect(kioscoPausado(NORMAL, null, bog(2027, 1, 1))).toBe(false);
  });

  it('una suscripción cancelada se pausa, igual que el panel', () => {
    const cancelada = susc({ finPrueba: bog(2026, 10, 8), pagadoHasta: medianoche(2026, 12, 1), estado: 'CANCELADA' });
    expect(kioscoPausado(NORMAL, cancelada, bog(2026, 11, 2))).toBe(true);
  });
});

describe('lo que ve el trabajador en el kiosco pausado', () => {
  it('un mensaje neutro, sin decir que la empresa no pagó (decisión del dueño)', () => {
    const m = mensajeKioscoPausado('Transportes El Cóndor');
    expect(m).toBe('El kiosco de Transportes El Cóndor está pausado. Avísale al administrador de tu empresa.');
    expect(m).not.toMatch(/pag|suscrip|mora/i);
  });
});
