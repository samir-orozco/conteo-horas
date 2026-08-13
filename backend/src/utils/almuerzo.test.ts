import { describe, it, expect } from 'vitest';
import { minutosAlmuerzoADescontar } from './almuerzo';

// El almuerzo deja de ser un número suelto y pasa a ser una VENTANA horaria.
// Con eso, una sola regla resuelve cuatro problemas que hoy son distintos:
//
//   Se descuentan los minutos de la ventana durante los cuales la persona
//   estuvo marcada.
//
//  - Quien no marca almuerzo: estuvo marcado toda la ventana → se le descuenta
//    completa, igual que hoy. No gana nada por no marcar.
//  - Quien se va temprano y nunca llega a la ventana: no se le descuenta nada.
//    Hoy pierde una hora que jamás tomó.
//  - Quien marca su almuerzo: el hueco ya está fuera de lo trabajado, así que
//    no se le vuelve a descontar. Hoy se le cobra dos veces.
//  - Quien almuerza en 20 minutos: los otros 40 los estuvo marcado, así que se
//    le descuentan igual. El almuerzo es el almuerzo; ese tiempo se lo regala a
//    la empresa, no se lo cobra.

const bog = (dia: number, h: number, m = 0) => new Date(Date.UTC(2026, 7, dia, h + 5, m, 0));

// Día materializado de apoyo: jornada 08:00-17:00, almuerzo de 12:00 a 13:00.
const dia = (extra: Partial<Parameters<typeof minutosAlmuerzoADescontar>[1]> = {}) => ({
  fecha: bog(5, 0),
  almuerzoMin: 60,
  almuerzoInicio: '12:00' as string | null,
  almuerzoFin: '13:00' as string | null,
  ...extra,
});

const tramo = (h1: number, m1: number, h2: number, m2: number, d = 5) =>
  ({ entrada: bog(d, h1, m1), salida: bog(d, h2, m2) });

describe('minutosAlmuerzoADescontar — sin ventana configurada', () => {
  it('se comporta como hoy: descuenta los minutos fijos', () => {
    const d = dia({ almuerzoInicio: null, almuerzoFin: null });
    expect(minutosAlmuerzoADescontar([tramo(8, 0, 17, 0)], d)).toBe(60);
  });

  it('sin almuerzo configurado no descuenta nada', () => {
    const d = dia({ almuerzoInicio: null, almuerzoFin: null, almuerzoMin: 0 });
    expect(minutosAlmuerzoADescontar([tramo(8, 0, 17, 0)], d)).toBe(0);
  });
});

describe('minutosAlmuerzoADescontar — con ventana', () => {
  it('jornada completa sin marcar almuerzo: descuenta la ventana entera', () => {
    expect(minutosAlmuerzoADescontar([tramo(8, 0, 17, 0)], dia())).toBe(60);
  });

  it('se fue a las 10:00 por una novedad: NO se le descuenta almuerzo', () => {
    // Es el error que se corrige: hoy pierde 60 de los 120 minutos que trabajó.
    expect(minutosAlmuerzoADescontar([tramo(8, 0, 10, 0)], dia())).toBe(0);
  });

  it('trabajó hasta las 12:30: solo se descuenta lo que alcanzó a cruzar', () => {
    expect(minutosAlmuerzoADescontar([tramo(8, 0, 12, 30)], dia())).toBe(30);
  });

  it('llegó a las 12:30: igual, solo el cruce', () => {
    expect(minutosAlmuerzoADescontar([tramo(12, 30, 17, 0)], dia())).toBe(30);
  });

  it('marcó su almuerzo exacto: no se descuenta de nuevo', () => {
    // El hueco 12:00-13:00 ya está fuera de lo trabajado.
    const tramos = [tramo(8, 0, 12, 0), tramo(13, 0, 17, 0)];
    expect(minutosAlmuerzoADescontar(tramos, dia())).toBe(0);
  });

  it('almorzó 20 minutos: los 40 restantes se descuentan igual', () => {
    // Estuvo marcado de 12:20 a 13:00. El almuerzo es el almuerzo.
    const tramos = [tramo(8, 0, 12, 0), tramo(12, 20, 17, 0)];
    expect(minutosAlmuerzoADescontar(tramos, dia())).toBe(40);
  });

  it('almorzó 2 horas: no se descuenta nada extra, el hueco ya lo pagó', () => {
    const tramos = [tramo(8, 0, 12, 0), tramo(14, 0, 18, 0)];
    expect(minutosAlmuerzoADescontar(tramos, dia())).toBe(0);
  });

  it('salió a almorzar y no volvió: tampoco se le descuenta de nuevo', () => {
    expect(minutosAlmuerzoADescontar([tramo(8, 0, 12, 0)], dia())).toBe(0);
  });

  it('un día sin marcaciones no descuenta nada', () => {
    expect(minutosAlmuerzoADescontar([], dia())).toBe(0);
  });
});

describe('minutosAlmuerzoADescontar — turno que cruza medianoche', () => {
  it('el almuerzo de la madrugada se ubica en el día siguiente', () => {
    // Turno 21:00 → 05:00 con almuerzo de 01:00 a 01:30.
    const d = dia({ almuerzoInicio: '01:00', almuerzoFin: '01:30', almuerzoMin: 30 });
    const tramos = [{ entrada: bog(5, 21, 0), salida: bog(6, 5, 0) }];
    expect(minutosAlmuerzoADescontar(tramos, d)).toBe(30);
  });

  it('si se fue antes de la madrugada no alcanza su almuerzo', () => {
    const d = dia({ almuerzoInicio: '01:00', almuerzoFin: '01:30', almuerzoMin: 30 });
    const tramos = [{ entrada: bog(5, 21, 0), salida: bog(6, 0, 30) }];
    expect(minutosAlmuerzoADescontar(tramos, d)).toBe(0);
  });
});
