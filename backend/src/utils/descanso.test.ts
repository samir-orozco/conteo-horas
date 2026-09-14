import { describe, it, expect } from 'vitest';
import { minutosAlmuerzoADescontar } from './almuerzo';
import { minutosDescansoADescontar } from './descansos';

// El DESCANSO NO REMUNERADO es una pausa aparte del almuerzo, con la misma regla del
// dueño (12 de septiembre de 2026): cada descanso cuesta SIEMPRE el tiempo de su ventana.
// Lo que la persona se tomó marcado cuenta para ese tiempo, y lo que falte se descuenta
// de lo trabajado.
//
// Lo que NO hereda del almuerzo: los minutos fijos de respaldo. El descanso nace con
// ventana, así que sin ventana no hay descanso y no se descuenta nada.
//
// Aquí van los casos de un solo descanso, escritos como una lista de una ventana. Los de
// varios viven en descansos.test.ts.

const bog = (dia: number, h: number, m = 0) => new Date(Date.UTC(2026, 7, dia, h + 5, m, 0));
const lista = (inicio: string, fin: string) => JSON.stringify([{ inicio, fin }]);

// Día de apoyo: 08:00-17:00 con almuerzo de 12:00 a 13:00 y descanso de 09:00 a 09:15.
const dia = (extra: Record<string, unknown> = {}) => ({
  fecha: bog(5, 0),
  horaEntrada: '08:00' as string | null,
  almuerzoMin: 60,
  almuerzoInicio: '12:00' as string | null,
  almuerzoFin: '13:00' as string | null,
  descansos: lista('09:00', '09:15') as string | null,
  ...extra,
});

// Un tramo trabajado. `pausa` dice a qué salió al terminarlo.
const tramo = (h1: number, m1: number, h2: number, m2: number, pausa: 'D' | 'A' | null = null, d = 5) =>
  ({ entrada: bog(d, h1, m1), salida: bog(d, h2, m2), salidaDescanso: pausa === 'D', salidaAlmuerzo: pausa === 'A' });

describe('minutosDescansoADescontar, con una sola ventana', () => {
  it('jornada completa sin marcar el descanso: se descuenta completo', () => {
    expect(minutosDescansoADescontar([tramo(8, 0, 17, 0)], dia())).toBe(15);
  });

  it('marcó su descanso completo: ya lo tomó, no se descuenta de nuevo', () => {
    expect(minutosDescansoADescontar([tramo(8, 0, 9, 0, 'D'), tramo(9, 15, 17, 0)], dia())).toBe(0);
  });

  it('se tomó 5 minutos: se completan los 10 que faltan', () => {
    expect(minutosDescansoADescontar([tramo(8, 0, 9, 0, 'D'), tramo(9, 5, 17, 0)], dia())).toBe(10);
  });

  it('lo tomó a otra hora, de 10:00 a 10:15: se descuenta una sola vez', () => {
    expect(minutosDescansoADescontar([tramo(8, 0, 10, 0, 'D'), tramo(10, 15, 17, 0)], dia())).toBe(0);
  });

  it('se fue antes del descanso: se descuenta igual', () => {
    expect(minutosDescansoADescontar([tramo(8, 0, 8, 45)], dia())).toBe(15);
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

  it('turno nocturno: el descanso de la madrugada sin marcar se descuenta completo', () => {
    const d = dia({ horaEntrada: '21:00', descansos: lista('02:00', '02:15') });
    expect(minutosDescansoADescontar([{ entrada: bog(5, 21, 0), salida: bog(6, 5, 0) }], d)).toBe(15);
  });

  it('el descanso y el almuerzo se cuentan cada uno con su propia salida', () => {
    // Salió al descanso de 09:00 a 09:15 y no marcó almuerzo.
    const t = [tramo(8, 0, 9, 0, 'D'), tramo(9, 15, 17, 0)];
    expect(minutosDescansoADescontar(t, dia())).toBe(0);
    expect(minutosAlmuerzoADescontar(t, dia())).toBe(60);
  });
});
