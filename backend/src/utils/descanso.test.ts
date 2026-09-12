import { describe, it, expect } from 'vitest';
import { minutosAlmuerzoADescontar } from './almuerzo';
import { minutosDescansoADescontar } from './descansos';

// El DESCANSO NO REMUNERADO es una pausa aparte del almuerzo, con la misma regla de
// fondo: se descuentan los minutos de su ventana durante los cuales la persona
// estuvo MARCADA. Marcarlo deja el hueco fuera de lo trabajado; no marcarlo lo
// descuenta igual.
//
// Lo que NO hereda del almuerzo: los minutos fijos de respaldo. El almuerzo los
// conserva por el histórico; el descanso nace con ventana, así que sin ventana no
// hay descanso y no se descuenta nada.
//
// Desde el 12 de septiembre de 2026 el día guarda una LISTA de descansos. Estos son
// los nueve casos de cuando había uno solo, con sus mismos números, escritos como
// una lista de una ventana: con cero o un descanso nada puede cambiar. Los casos de
// varios descansos viven en descansos.test.ts.

const bog = (dia: number, h: number, m = 0) => new Date(Date.UTC(2026, 7, dia, h + 5, m, 0));
const lista = (inicio: string, fin: string) => JSON.stringify([{ inicio, fin }]);

// Día de apoyo: 08:00-17:00 con almuerzo de 12:00 a 13:00 y descanso de 09:00 a 09:15.
const dia = (extra: Record<string, unknown> = {}) => ({
  fecha: bog(5, 0),
  almuerzoMin: 60,
  almuerzoInicio: '12:00' as string | null,
  almuerzoFin: '13:00' as string | null,
  descansos: lista('09:00', '09:15') as string | null,
  ...extra,
});

const tramo = (h1: number, m1: number, h2: number, m2: number, d = 5) =>
  ({ entrada: bog(d, h1, m1), salida: bog(d, h2, m2) });

describe('minutosDescansoADescontar, con una sola ventana', () => {
  it('jornada completa sin marcar el descanso: descuenta la ventana entera', () => {
    expect(minutosDescansoADescontar([tramo(8, 0, 17, 0)], dia())).toBe(15);
  });

  it('marcó su descanso: el hueco ya está fuera de lo trabajado', () => {
    expect(minutosDescansoADescontar([tramo(8, 0, 9, 0), tramo(9, 15, 17, 0)], dia())).toBe(0);
  });

  it('se tomó 5 minutos: los otros 10 estuvo marcado y se descuentan igual', () => {
    expect(minutosDescansoADescontar([tramo(8, 0, 9, 0), tramo(9, 5, 17, 0)], dia())).toBe(10);
  });

  it('se fue antes del descanso: no se le descuenta', () => {
    expect(minutosDescansoADescontar([tramo(8, 0, 8, 45)], dia())).toBe(0);
  });

  it('sin ventana no hay descanso: no hereda minutos fijos como el almuerzo', () => {
    expect(minutosDescansoADescontar([tramo(8, 0, 17, 0)], dia({ descansos: null }))).toBe(0);
  });

  it('un elemento con una sola hora no es un descanso', () => {
    expect(minutosDescansoADescontar([tramo(8, 0, 17, 0)], dia({ descansos: '[{"inicio":"09:00"}]' }))).toBe(0);
  });

  it('un día sin marcaciones no descuenta nada', () => {
    expect(minutosDescansoADescontar([], dia())).toBe(0);
  });

  it('turno nocturno: el descanso de la madrugada se ubica en el día siguiente', () => {
    const d = dia({ descansos: lista('02:00', '02:15') });
    expect(minutosDescansoADescontar([{ entrada: bog(5, 21, 0), salida: bog(6, 5, 0) }], d)).toBe(15);
  });

  it('el descanso y el almuerzo se miden cada uno con su propia ventana', () => {
    const t = [tramo(8, 0, 17, 0)];
    expect(minutosDescansoADescontar(t, dia())).toBe(15);
    expect(minutosAlmuerzoADescontar(t, dia())).toBe(60);
  });
});
