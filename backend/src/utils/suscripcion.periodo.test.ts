import { describe, it, expect } from 'vitest';
import { periodoACobrar } from './suscripcion';

// Qué período paga hoy una empresa que no está al día (4 de octubre de 2026). El primer
// pago se contaba desde el día en que se pagaba: con la prueba hasta el 8 de octubre,
// pagaba 28 días si pagaba el 4 y 19 si esperaba al 13, último día de gracia, usando el
// sistema entretanto. Cada día de espera salía más barato. Ahora cuenta desde el fin de
// la prueba.

// Un instante dado en hora de Bogotá (UTC-5 todo el año).
const bog = (a: number, mes: number, d: number, h = 12, min = 0) => new Date(Date.UTC(a, mes - 1, d, h + 5, min));
const medianoche = (a: number, mes: number, d: number) => bog(a, mes, d, 0);

describe('el período del primer pago', () => {
  const FIN_PRUEBA = bog(2026, 10, 8, 23, 59);

  it('pagando en la prueba, cubre desde el día en que termina la prueba, no desde hoy', () => {
    const p = periodoACobrar(FIN_PRUEBA, false, bog(2026, 10, 4));
    expect(p.desde).toEqual(FIN_PRUEBA);
    expect(p.hasta).toEqual(medianoche(2026, 11, 1));
    expect([p.diasRestantes, p.diasMes]).toEqual([24, 31]);
  });

  it('esperar al último día de gracia no lo abarata', () => {
    const p = periodoACobrar(FIN_PRUEBA, false, bog(2026, 10, 13, 23));
    expect([p.diasRestantes, p.diasMes]).toEqual([24, 31]);
    expect(p.factor).toBeCloseTo(24 / 31);
  });

  it('si la prueba terminó en un mes anterior, es el mes en curso completo', () => {
    const p = periodoACobrar(bog(2026, 9, 28), false, bog(2026, 10, 20));
    expect(p.desde).toEqual(medianoche(2026, 10, 1));
    expect([p.diasRestantes, p.diasMes, p.factor]).toEqual([31, 31, 1]);
  });

  it('si la prueba termina el mes que viene, cubre ese mes desde el fin de la prueba', () => {
    // Se registró el 27 de octubre a las 10 a. m. y paga el 30, todavía en prueba.
    const p = periodoACobrar(bog(2026, 11, 3, 10), false, bog(2026, 10, 30));
    expect([p.diasRestantes, p.diasMes]).toEqual([28, 30]);
    expect(p.hasta).toEqual(medianoche(2026, 12, 1));
  });
});

describe('el período de quien ya pagó alguna vez', () => {
  it('es el mes en curso completo, pague el día que pague', () => {
    const p = periodoACobrar(bog(2026, 3, 8), true, bog(2026, 10, 20));
    expect(p.desde).toEqual(medianoche(2026, 10, 1));
    expect(p.hasta).toEqual(medianoche(2026, 11, 1));
    expect(p.factor).toBe(1);
  });

  it('también si su prueba termina este mes (una prueba extendida después de un pago)', () => {
    const p = periodoACobrar(bog(2026, 10, 8), true, bog(2026, 10, 20));
    expect(p.desde).toEqual(medianoche(2026, 10, 1));
    expect(p.factor).toBe(1);
  });
});
