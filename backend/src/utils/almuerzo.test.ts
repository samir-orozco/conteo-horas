import { describe, it, expect } from 'vitest';
import { minutosAlmuerzoADescontar, minutosEnVentana, puedeSalirAAlmorzar, dentroDeLaVentana } from './almuerzo';
import { calcularDiasEsperados } from './diasEsperados';

// Cuánto almuerzo se le descuenta a alguien en un día. Regla del dueño del 12 de
// septiembre de 2026:
//
//   El almuerzo cuesta SIEMPRE el tiempo que fijó el horario. Lo que la persona se
//   tomó marcado cuenta para ese tiempo, y lo que falte se descuenta de lo trabajado.
//
//  - No marcó almuerzo: se descuenta completo.
//  - Lo marcó y volvió antes: se completa hasta el tiempo fijado. Volver antes es
//    decisión suya, no de la empresa.
//  - Lo tomó a otra hora: se descuenta una sola vez. La regla anterior medía el solape
//    con la ventana, y almorzar de 11:00 a 12:00 con ventana de 12:00 a 13:00 se cobraba
//    dos veces.
//  - Se demoró: no se descuenta nada más, y lo de más tampoco se paga porque no estaba
//    marcado.
//  - Se fue antes de la hora del almuerzo, o salió a almorzar y no volvió: se descuenta
//    igual el tiempo fijado.

const bog = (dia: number, h: number, m = 0) => new Date(Date.UTC(2026, 7, dia, h + 5, m, 0));

// Día materializado de apoyo: jornada 08:00-17:00, almuerzo de 12:00 a 13:00.
const dia = (extra: Record<string, unknown> = {}) => ({
  fecha: bog(5, 0),
  almuerzoMin: 60,
  almuerzoInicio: '12:00' as string | null,
  almuerzoFin: '13:00' as string | null,
  ...extra,
});

// Un tramo trabajado. `almuerzo` dice que su salida fue a almorzar.
const tramo = (h1: number, m1: number, h2: number, m2: number, almuerzo = false, d = 5) =>
  ({ entrada: bog(d, h1, m1), salida: bog(d, h2, m2), salidaAlmuerzo: almuerzo });

describe('minutosAlmuerzoADescontar — sin ventana configurada', () => {
  it('descuenta los minutos fijos', () => {
    const d = dia({ almuerzoInicio: null, almuerzoFin: null });
    expect(minutosAlmuerzoADescontar([tramo(8, 0, 17, 0)], d)).toBe(60);
  });

  it('sin almuerzo configurado no descuenta nada', () => {
    const d = dia({ almuerzoInicio: null, almuerzoFin: null, almuerzoMin: 0 });
    expect(minutosAlmuerzoADescontar([tramo(8, 0, 17, 0)], d)).toBe(0);
  });
});

describe('minutosAlmuerzoADescontar — siempre el tiempo fijado', () => {
  it('jornada completa sin marcar almuerzo: se descuenta completo', () => {
    expect(minutosAlmuerzoADescontar([tramo(8, 0, 17, 0)], dia())).toBe(60);
  });

  it('marcó su almuerzo de 12:00 a 13:00: ya lo tomó, no se descuenta de nuevo', () => {
    expect(minutosAlmuerzoADescontar([tramo(8, 0, 12, 0, true), tramo(13, 0, 17, 0)], dia())).toBe(0);
  });

  it('volvió a los 40 minutos: se completan los 20 que faltan', () => {
    expect(minutosAlmuerzoADescontar([tramo(8, 0, 12, 0, true), tramo(12, 40, 17, 0)], dia())).toBe(20);
  });

  it('salió 10 minutos antes y volvió a la hora: ya tomó su hora', () => {
    // De 11:50 a 12:50. Con la regla del solape se descontaban 10 más.
    expect(minutosAlmuerzoADescontar([tramo(8, 0, 11, 50, true), tramo(12, 50, 17, 0)], dia())).toBe(0);
  });

  it('almorzó a otra hora, de 11:00 a 12:00: se descuenta una sola vez', () => {
    // Con la regla del solape se cobraba la hora que salió y también la de la ventana.
    expect(minutosAlmuerzoADescontar([tramo(8, 0, 11, 0, true), tramo(12, 0, 17, 0)], dia())).toBe(0);
  });

  it('se demoró, de 12:00 a 13:30: no se descuenta nada más', () => {
    // La media hora de más tampoco se paga: no está en lo trabajado.
    expect(minutosAlmuerzoADescontar([tramo(8, 0, 12, 0, true), tramo(13, 30, 17, 0)], dia())).toBe(0);
  });

  it('se fue a las 10:00, antes de la hora del almuerzo: se descuenta igual', () => {
    expect(minutosAlmuerzoADescontar([tramo(8, 0, 10, 0)], dia())).toBe(60);
  });

  it('llegó a las 12:30: se descuenta igual', () => {
    expect(minutosAlmuerzoADescontar([tramo(12, 30, 17, 0)], dia())).toBe(60);
  });

  it('salió a almorzar y no volvió: se descuenta igual, no hay regreso que diga cuánto tomó', () => {
    expect(minutosAlmuerzoADescontar([tramo(8, 0, 12, 0, true)], dia())).toBe(60);
  });

  it('salir y volver sin marcar almuerzo no cuenta como almuerzo', () => {
    expect(minutosAlmuerzoADescontar([tramo(8, 0, 12, 0), tramo(13, 0, 17, 0)], dia())).toBe(60);
  });

  it('volvió y sigue trabajando: su regreso está en una marcación todavía abierta', () => {
    const abierta = { entrada: bog(5, 13, 0), salida: null, salidaAlmuerzo: false };
    expect(minutosAlmuerzoADescontar([tramo(8, 0, 12, 0, true), abierta], dia())).toBe(0);
  });

  it('unos segundos de más o de menos no cambian el minuto', () => {
    const marcas = [
      { entrada: bog(5, 8, 0), salida: new Date(bog(5, 12, 0).getTime() + 5_000), salidaAlmuerzo: true },
      { entrada: new Date(bog(5, 13, 0).getTime() - 2_000), salida: bog(5, 17, 0), salidaAlmuerzo: false },
    ];
    expect(minutosAlmuerzoADescontar(marcas, dia())).toBe(0);
  });

  it('un día sin tramos terminados no descuenta nada', () => {
    expect(minutosAlmuerzoADescontar([], dia())).toBe(0);
    expect(minutosAlmuerzoADescontar([{ entrada: bog(5, 8, 0), salida: null, salidaAlmuerzo: false }], dia())).toBe(0);
  });
});

describe('minutosAlmuerzoADescontar — turno que cruza medianoche', () => {
  // Turno 21:00 → 05:00 con almuerzo de 01:00 a 01:30.
  const d = dia({ almuerzoInicio: '01:00', almuerzoFin: '01:30', almuerzoMin: 30 });

  it('el almuerzo de la madrugada marcado completo no se descuenta de nuevo', () => {
    expect(minutosAlmuerzoADescontar([tramo(21, 0, 25, 0, true), tramo(25, 30, 29, 0)], d)).toBe(0);
  });

  it('sin marcarlo se descuenta completo, aunque se haya ido antes de la madrugada', () => {
    expect(minutosAlmuerzoADescontar([tramo(21, 0, 24, 30)], d)).toBe(30);
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

// A QUIÉN se le cobra el almuerzo en un día de varias jornadas lo decide lo que cada una
// pasó dentro de la ventana (utils/jornada.ts). Una fila de día puede tener tramos de dos
// noches distintas, y sus almuerzos caen en madrugadas distintas: se cuentan las dos
// posiciones de la ventana, no se elige una.
describe('minutosEnVentana: las dos posiciones de la ventana', () => {
  const U = (d: number, h: number, m = 0) => new Date(Date.UTC(2026, 7, d, h + 5, m, 0));
  const diaMartes = { fecha: U(11, 0), almuerzoMin: 60, almuerzoInicio: '01:00', almuerzoFin: '02:00' };
  const regresoDelLunes = { entrada: U(11, 1, 30), salida: U(11, 6, 0) };
  const nocheDelMartes = { entrada: U(11, 22, 0), salida: U(12, 6, 0) };

  it('cada tramo por separado da lo suyo', () => {
    expect(minutosEnVentana([regresoDelLunes], diaMartes)).toBe(30);
    expect(minutosEnVentana([nocheDelMartes], diaMartes)).toBe(60);
  });

  it('juntos suman, no se tapan', () => {
    expect(minutosEnVentana([regresoDelLunes, nocheDelMartes], diaMartes)).toBe(90);
  });
});

// El kiosco necesita saber si la persona está DENTRO de su ventana ahora mismo,
// para ofrecerle el descanso en el botón grande en vez de esconderlo detrás de
// "Registrar Salida". Antes había que adivinar que ese botón preguntaba.
describe('dentroDeLaVentana', () => {
  const dia = (extra: Record<string, unknown> = {}) => ({
    fecha: new Date(Date.UTC(2026, 7, 5, 5, 0, 0)), // medianoche de Bogotá
    almuerzoMin: 60,
    almuerzoInicio: '12:00' as string | null,
    almuerzoFin: '13:00' as string | null,
    ...extra,
  });
  const bog = (h: number, m = 0, d = 5) => new Date(Date.UTC(2026, 7, d, h + 5, m, 0));

  it('dentro de la ventana dice que sí', () => {
    expect(dentroDeLaVentana(bog(12, 30), dia())).toBe(true);
  });

  it('el instante de inicio ya cuenta', () => {
    expect(dentroDeLaVentana(bog(12, 0), dia())).toBe(true);
  });

  it('el instante de fin ya NO cuenta: la ventana se cerró', () => {
    expect(dentroDeLaVentana(bog(13, 0), dia())).toBe(false);
  });

  it('antes y después dicen que no', () => {
    expect(dentroDeLaVentana(bog(11, 59), dia())).toBe(false);
    expect(dentroDeLaVentana(bog(15), dia())).toBe(false);
  });

  it('turno nocturno: la ventana de madrugada es la del día SIGUIENTE al ancla', () => {
    // La fila ancla al 5 de agosto, pero quien entra a las 20:00 come a la 01:30
    // del día 6. Sin probar las dos posiciones, el botón nunca aparecería.
    const nocturno = dia({ almuerzoInicio: '01:00', almuerzoFin: '02:00' });
    expect(dentroDeLaVentana(bog(1, 30, 6), nocturno)).toBe(true);
    expect(dentroDeLaVentana(bog(1, 30, 5), nocturno)).toBe(true);
    expect(dentroDeLaVentana(bog(3, 0, 6), nocturno)).toBe(false);
  });

  it('sin ventana configurada, nunca', () => {
    expect(dentroDeLaVentana(bog(12, 30), dia({ almuerzoInicio: null, almuerzoFin: null }))).toBe(false);
  });
});
