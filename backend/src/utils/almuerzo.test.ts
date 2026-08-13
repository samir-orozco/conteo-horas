import { describe, it, expect } from 'vitest';
import { minutosAlmuerzoADescontar, puedeSalirAAlmorzar } from './almuerzo';
import { calcularDiasEsperados } from './diasEsperados';

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

// Una sola compuerta decide si el kiosco ofrece "salgo a almorzar" y si el
// servidor le cree a esa marca. Van juntas a propósito: si la pantalla ofreciera
// algo que el servidor rechaza, la persona marcaría creyendo que almorzó.
describe('puedeSalirAAlmorzar', () => {
  const conVentana = { almuerzoInicio: '12:00', almuerzoFin: '13:00' };

  it('sin día materializado no se ofrece', () => {
    expect(puedeSalirAAlmorzar(null, false)).toBe(false);
  });

  it('el día sin ventana no ofrece almuerzo', () => {
    // Es el caso de todo el histórico y del día en curso cuando el admin recién
    // configuró la ventana: ese día ya se congeló sin ella.
    expect(puedeSalirAAlmorzar({ almuerzoInicio: null, almuerzoFin: null }, false)).toBe(false);
  });

  it('media ventana no es una ventana', () => {
    expect(puedeSalirAAlmorzar({ almuerzoInicio: '12:00', almuerzoFin: null }, false)).toBe(false);
  });

  it('con ventana y sin haber almorzado, se ofrece', () => {
    expect(puedeSalirAAlmorzar(conVentana, false)).toBe(true);
  });

  it('quien ya almorzó no vuelve a ver la pregunta', () => {
    // La segunda salida del día es el fin de la jornada: preguntar de nuevo
    // sobraría, y peor, dejaría partir el día en tres tramos por error.
    expect(puedeSalirAAlmorzar(conVentana, true)).toBe(false);
  });
});

// La ventana define su propia duración: el admin pone las horas y el sistema
// calcula los minutos. Antes había que escribir los minutos aparte, lo que era
// circular —la ventana venía justamente a reemplazarlos— y además dejaba dos
// fuentes de verdad que podían contradecirse.
describe('la ventana manda sobre los minutos sueltos', () => {
  it('el almuerzo dura lo que dice la ventana, no lo que diga almuerzoMin', () => {
    const horario: any = {
      activo: true, toleranciaMin: 0, almuerzoMin: 0, // ← cero a propósito
      franjas: [{
        dias: ['MIERCOLES'], horaEntrada: '08:00', horaSalida: '17:00',
        tieneAlmuerzo: true, almuerzoInicio: '12:00', almuerzoFin: '13:00',
      }],
    };
    const [d] = calcularDiasEsperados(
      new Date(Date.UTC(2026, 6, 1, 5, 0, 0)),
      new Date(Date.UTC(2026, 6, 2, 5, 0, 0)),
      horario,
    );
    expect(d.almuerzoMin).toBe(60);          // derivado de la ventana
    expect(d.minutosEsperados).toBe(480);     // 9h de franja − 1h de almuerzo
    expect(d.almuerzoInicio).toBe('12:00');   // y la ventana se congela
  });

  it('sin ventana se conservan los minutos configurados', () => {
    const horario: any = {
      activo: true, toleranciaMin: 0, almuerzoMin: 45,
      franjas: [{ dias: ['MIERCOLES'], horaEntrada: '08:00', horaSalida: '17:00', tieneAlmuerzo: true }],
    };
    const [d] = calcularDiasEsperados(
      new Date(Date.UTC(2026, 6, 1, 5, 0, 0)),
      new Date(Date.UTC(2026, 6, 2, 5, 0, 0)),
      horario,
    );
    expect(d.almuerzoMin).toBe(45);
    expect(d.almuerzoInicio).toBeNull();
  });
});

// Una fila de día puede contener DOS tramos de noches distintas: el regreso del
// almuerzo de la noche anterior (madrugada) y la noche siguiente completa. Sus
// almuerzos caen en madrugadas distintas, así que hay que contar las dos
// posiciones de la ventana, no elegir una.
describe('turno nocturno con dos tramos en la misma fila', () => {
  const U = (d: number, h: number, m = 0) => new Date(Date.UTC(2026, 7, d, h + 5, m, 0));
  const diaMartes = { fecha: U(11, 0), almuerzoMin: 60, almuerzoInicio: '01:00', almuerzoFin: '02:00' };
  const regresoDelLunes = { entrada: U(11, 1, 30), salida: U(11, 6, 0) };
  const nocheDelMartes = { entrada: U(11, 22, 0), salida: U(12, 6, 0) };

  it('cada tramo por separado da lo suyo', () => {
    expect(minutosAlmuerzoADescontar([regresoDelLunes], diaMartes)).toBe(30);
    expect(minutosAlmuerzoADescontar([nocheDelMartes], diaMartes)).toBe(60);
  });

  it('juntos suman, no se tapan', () => {
    // Antes devolvía 30: el solape directo cortaba el cálculo y la ventana
    // corrida un día —donde estaba el almuerzo no marcado de la noche del
    // martes— no se probaba nunca. Esos 60 minutos se pagaban como nocturnos.
    expect(minutosAlmuerzoADescontar([regresoDelLunes, nocheDelMartes], diaMartes)).toBe(90);
  });
});
