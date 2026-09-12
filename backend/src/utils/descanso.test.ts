import { describe, it, expect } from 'vitest';
import { minutosDescansoADescontar, puedeSalirADescanso, dentroDelDescanso, minutosAlmuerzoADescontar } from './almuerzo';

// El DESCANSO NO REMUNERADO es una segunda pausa, aparte del almuerzo, con la
// misma regla de fondo: se descuentan los minutos de su ventana durante los
// cuales la persona estuvo MARCADA. Marcarlo deja el hueco fuera de lo
// trabajado; no marcarlo lo descuenta igual.
//
// Lo que NO hereda del almuerzo: los minutos fijos de respaldo. El almuerzo los
// conserva por el histórico; el descanso nace con ventana, así que sin ventana
// no hay descanso y no se descuenta nada.

const bog = (dia: number, h: number, m = 0) => new Date(Date.UTC(2026, 7, dia, h + 5, m, 0));

// Día de apoyo: 08:00-17:00 con almuerzo de 12:00 a 13:00 y descanso de 09:00 a 09:15.
const dia = (extra: Record<string, unknown> = {}) => ({
  fecha: bog(5, 0),
  almuerzoMin: 60,
  almuerzoInicio: '12:00' as string | null,
  almuerzoFin: '13:00' as string | null,
  descansoInicio: '09:00' as string | null,
  descansoFin: '09:15' as string | null,
  ...extra,
});

const tramo = (h1: number, m1: number, h2: number, m2: number, d = 5) =>
  ({ entrada: bog(d, h1, m1), salida: bog(d, h2, m2) });

describe('minutosDescansoADescontar', () => {
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
    expect(minutosDescansoADescontar([tramo(8, 0, 17, 0)], dia({ descansoInicio: null, descansoFin: null }))).toBe(0);
  });

  it('media ventana no es un descanso', () => {
    expect(minutosDescansoADescontar([tramo(8, 0, 17, 0)], dia({ descansoFin: null }))).toBe(0);
  });

  it('un día sin marcaciones no descuenta nada', () => {
    expect(minutosDescansoADescontar([], dia())).toBe(0);
  });

  it('turno nocturno: el descanso de la madrugada se ubica en el día siguiente', () => {
    const d = dia({ descansoInicio: '02:00', descansoFin: '02:15' });
    expect(minutosDescansoADescontar([{ entrada: bog(5, 21, 0), salida: bog(6, 5, 0) }], d)).toBe(15);
  });

  it('el descanso y el almuerzo se miden cada uno con su propia ventana', () => {
    const t = [tramo(8, 0, 17, 0)];
    expect(minutosDescansoADescontar(t, dia())).toBe(15);
    expect(minutosAlmuerzoADescontar(t, dia())).toBe(60);
  });
});

// La misma compuerta para el kiosco y para el servidor, igual que en el almuerzo:
// si la pantalla ofreciera un descanso que el servidor no cree, la persona
// marcaría creyendo que salió a descansar.
describe('puedeSalirADescanso', () => {
  const conVentana = { descansoInicio: '09:00', descansoFin: '09:15' };

  it('sin día materializado no se ofrece', () => {
    expect(puedeSalirADescanso(null, false)).toBe(false);
  });

  it('el día sin ventana de descanso no lo ofrece', () => {
    expect(puedeSalirADescanso({ descansoInicio: null, descansoFin: null }, false)).toBe(false);
  });

  it('con ventana y sin haberlo tomado, se ofrece', () => {
    expect(puedeSalirADescanso(conVentana, false)).toBe(true);
  });

  it('quien ya lo tomó no vuelve a verlo', () => {
    expect(puedeSalirADescanso(conVentana, true)).toBe(false);
  });
});

describe('dentroDelDescanso', () => {
  it('dentro de su ventana dice que sí, y el instante de fin ya no cuenta', () => {
    expect(dentroDelDescanso(bog(5, 9, 5), dia())).toBe(true);
    expect(dentroDelDescanso(bog(5, 9, 15), dia())).toBe(false);
  });

  it('en la hora del almuerzo no está en su descanso', () => {
    expect(dentroDelDescanso(bog(5, 12, 30), dia())).toBe(false);
  });

  it('turno nocturno: prueba también la madrugada siguiente', () => {
    const d = dia({ descansoInicio: '02:00', descansoFin: '02:15' });
    expect(dentroDelDescanso(bog(6, 2, 5), d)).toBe(true);
  });

  it('sin ventana, nunca', () => {
    expect(dentroDelDescanso(bog(5, 9, 5), dia({ descansoInicio: null, descansoFin: null }))).toBe(false);
  });
});
