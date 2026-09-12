import { describe, it, expect } from 'vitest';
import {
  resumirDescansosDelDia, resumirAlmuerzoDelDia, minutosContadosDelDia, partirDiaEnJornadas,
  marcacionQueCierra, momentosDelDia, jornadaDeCadaMarcacion, instantesDeJornada, tramosDeLaJornada,
  leerDescansosDelCuerpo,
} from './jornada';
import { minutosDescansoADescontar } from './descansos';

// La jornada con el almuerzo y los DESCANSOS NO REMUNERADOS. Todas las pausas viven
// en el hueco entre dos tramos y ninguna cierra la jornada: entrada, descansos,
// almuerzo y salida son UNA sola fila. Solo una entrada después de cerrar abre otra.
//
// Desde el 12 de septiembre de 2026 el día trae una LISTA de descansos. Los casos de
// un solo descanso conservan sus números; los de varios usan el ejemplo del dueño.

const bog = (h: number, m = 0, dia = 5) => new Date(Date.UTC(2026, 7, dia, h + 5, m, 0));
const lista = (...v: [string, string][]) => JSON.stringify(v.map(([inicio, fin]) => ({ inicio, fin })));

const reg = (
  entrada: Date | null,
  salida: Date | null,
  extra: { salidaAlmuerzo?: boolean; salidaDescanso?: boolean; entradaEstimada?: boolean; descansoVentana?: string | null } = {},
) => ({
  entrada, salida,
  salidaAlmuerzo: extra.salidaAlmuerzo ?? false,
  salidaDescanso: extra.salidaDescanso ?? false,
  entradaEstimada: extra.entradaEstimada ?? false,
  descansoVentana: extra.descansoVentana ?? null,
});

// 08:00-17:00, almuerzo de 12:00 a 13:00 y descanso de 09:00 a 09:15: el día exige 465.
const diaCompleto = (extra: Record<string, unknown> = {}) => ({
  fecha: bog(0),
  programado: true,
  horaEntrada: '08:00' as string | null,
  horaSalida: '17:00' as string | null,
  toleranciaSalidaMin: 0,
  ajustaEntrada: false,
  almuerzoMin: 60,
  almuerzoInicio: '12:00' as string | null,
  almuerzoFin: '13:00' as string | null,
  descansos: lista(['09:00', '09:15']) as string | null,
  ...extra,
});

// EL EJEMPLO DEL DUEÑO (12 de septiembre de 2026): de 07:00 a 16:00, almuerzo de
// 12:00 a 13:00 y descansos de 09:00 a 09:15 y de 15:00 a 15:10. El día exige
// 540 − 60 − 15 − 10 = 455.
const diaDelEjemplo = () => diaCompleto({
  horaEntrada: '07:00', horaSalida: '16:00', descansos: lista(['09:00', '09:15'], ['15:00', '15:10']),
});
// Ana marca todo a tiempo.
const ana = () => [
  reg(bog(7), bog(9), { salidaDescanso: true, descansoVentana: '09:00-09:15' }),
  reg(bog(9, 15), bog(12), { salidaAlmuerzo: true }),
  reg(bog(13), bog(15), { salidaDescanso: true, descansoVentana: '15:00-15:10' }),
  reg(bog(15, 10), bog(16)),
];
// Beto no marca ninguna pausa.
const beto = () => [reg(bog(7), bog(16))];
// Carla toma el descanso de la mañana de 10:00 a 10:15. El kiosco anota esa salida
// como el de las 15:00 (el próximo que empieza) y la de las 15:00 como el de las
// 09:00 (el único pendiente). Sin ventana guardada, se infiere igual por la hora.
const carla = (guardada = true) => [
  reg(bog(7), bog(10), { salidaDescanso: true, descansoVentana: guardada ? '15:00-15:10' : null }),
  reg(bog(10, 15), bog(12), { salidaAlmuerzo: true }),
  reg(bog(13), bog(15), { salidaDescanso: true, descansoVentana: guardada ? '09:00-09:15' : null }),
  reg(bog(15, 10), bog(16)),
];

const conLasDos = () => [
  reg(bog(8), bog(9), { salidaDescanso: true }),
  reg(bog(9, 15), bog(12), { salidaAlmuerzo: true }),
  reg(bog(13), bog(17)),
];
const conIds = <T,>(regs: T[]) => regs.map((r, i) => ({ ...r, id: 'abcdef'[i] }));
const tramos = (regs: ReturnType<typeof reg>[]) => regs.filter(r => r.entrada && r.salida).map(r => ({ entrada: r.entrada!, salida: r.salida! }));

describe('resumirDescansosDelDia, con un solo descanso', () => {
  it('lo marcó: sale la hora real y no se descuenta de nuevo', () => {
    const [r] = resumirDescansosDelDia([reg(bog(8), bog(9), { salidaDescanso: true }), reg(bog(9, 15), bog(17))], diaCompleto());
    expect(r.estado).toBe('MARCADO');
    expect(r.ventana).toEqual({ inicio: '09:00', fin: '09:15' });
    expect(r.salida).toEqual(bog(9));
    expect(r.regreso).toEqual(bog(9, 15));
    expect(r.minutos).toBe(15);
    expect(r.minutosVentana).toBe(15);
    expect(r.minutosDescontados).toBe(0);
  });

  it('nadie lo marcó: se descuenta la ventana entera', () => {
    const [r] = resumirDescansosDelDia([reg(bog(8), bog(17))], diaCompleto());
    expect(r.estado).toBe('NO_MARCADO');
    expect(r.minutosDescontados).toBe(15);
  });

  it('sin descansos en el día no hay resúmenes, ni minutos que descontar', () => {
    expect(resumirDescansosDelDia([reg(bog(8), bog(17))], diaCompleto({ descansos: null }))).toEqual([]);
  });

  it('la salida a almorzar no es la salida al descanso', () => {
    const [r] = resumirDescansosDelDia([reg(bog(8), bog(12), { salidaAlmuerzo: true }), reg(bog(13), bog(17))], diaCompleto());
    expect(r.estado).toBe('NO_MARCADO');
    expect(r.salida).toBeNull();
  });

  it('con las dos pausas marcadas, cada resumen encuentra la suya', () => {
    const regs = [
      reg(bog(8), bog(9), { salidaDescanso: true }),
      reg(bog(9, 10), bog(12), { salidaAlmuerzo: true }),
      reg(bog(13, 5), bog(17)),
    ];
    const [descanso] = resumirDescansosDelDia(regs, diaCompleto());
    const almuerzo = resumirAlmuerzoDelDia(regs, diaCompleto());
    expect([descanso.minutos, descanso.seExcedio]).toEqual([10, false]);
    expect([almuerzo.minutos, almuerzo.minutosDeMas]).toEqual([65, 5]);
  });

  it('recién salido, está en su descanso', () => {
    const [r] = resumirDescansosDelDia([reg(bog(8), bog(9), { salidaDescanso: true })], diaCompleto(), bog(9, 10));
    expect(r.estado).toBe('EN_CURSO');
  });

  it('salió al descanso y no volvió, pasada la gracia: queda abierto', () => {
    const [r] = resumirDescansosDelDia([reg(bog(8), bog(9), { salidaDescanso: true })], diaCompleto(), bog(10, 30));
    expect(r.estado).toBe('ABIERTO');
  });
});

describe('resumirDescansosDelDia, con varios descansos', () => {
  it('un resumen por ventana, en el orden de la jornada', () => {
    expect(resumirDescansosDelDia(ana(), diaDelEjemplo()).map(r => [r.ventana?.inicio, r.estado, r.minutosDescontados]))
      .toEqual([['09:00', 'MARCADO', 0], ['15:00', 'MARCADO', 0]]);
    expect(resumirDescansosDelDia(beto(), diaDelEjemplo()).map(r => [r.ventana?.inicio, r.estado, r.minutosDescontados]))
      .toEqual([['09:00', 'NO_MARCADO', 15], ['15:00', 'NO_MARCADO', 10]]);
  });

  it('los descontados de cada ventana suman el descuento del día', () => {
    const escenarios = [
      { regs: beto(), dia: diaDelEjemplo() },
      { regs: carla(), dia: diaDelEjemplo() },
      // Dos ventanas congeladas que se pisan: la hora compartida se cobra una vez.
      { regs: beto(), dia: diaCompleto({ horaEntrada: '07:00', descansos: lista(['09:00', '09:30'], ['09:15', '09:45']) }) },
      // 7,5 + 7,5: redondeadas por separado darían 16.
      {
        regs: [reg(bog(7), new Date(bog(9, 7).getTime() + 30_000)), reg(new Date(bog(10, 2).getTime() + 30_000), bog(16))],
        dia: diaCompleto({ horaEntrada: '07:00', descansos: lista(['09:00', '09:10'], ['10:00', '10:10']) }),
      },
    ];
    for (const e of escenarios) {
      const suma = resumirDescansosDelDia(e.regs, e.dia).reduce((s, r) => s + r.minutosDescontados, 0);
      expect(suma).toBe(minutosDescansoADescontar(tramos(e.regs), e.dia));
    }
  });

  it('Carla: la salida de las 10:00 se resume en la ventana de las 15:00, con 5 min de más; la de las 15:00, en la de las 09:00, con 15 descontados y 0 de más', () => {
    for (const guardada of [true, false]) {
      const [manana, tarde] = resumirDescansosDelDia(carla(guardada), diaDelEjemplo());
      expect([manana.ventana, manana.estado, manana.salida, manana.regreso, manana.minutosDescontados, manana.minutosDeMas, manana.seExcedio], `guardada ${guardada}`)
        .toEqual([{ inicio: '09:00', fin: '09:15' }, 'MARCADO', bog(15), bog(15, 10), 15, 0, false]);
      expect([tarde.ventana, tarde.estado, tarde.salida, tarde.regreso, tarde.minutosDescontados, tarde.minutosDeMas, tarde.seExcedio], `guardada ${guardada}`)
        .toEqual([{ inicio: '15:00', fin: '15:10' }, 'MARCADO', bog(10), bog(10, 15), 0, 5, true]);
    }
  });

  it('una salida al descanso que no tiene ventana donde anotarse se resume sin ventana, y no descuenta', () => {
    const sinDescansos = diaCompleto({ descansos: null });
    expect(resumirDescansosDelDia([reg(bog(8), bog(9), { salidaDescanso: true }), reg(bog(9, 15), bog(17))], sinDescansos))
      .toEqual([expect.objectContaining({ estado: 'MARCADO', ventana: null, salida: bog(9), regreso: bog(9, 15), minutos: 15, minutosDescontados: 0, minutosDeMas: 0 })]);
    const salioYNoVolvio = [reg(bog(8), bog(9), { salidaDescanso: true })];
    expect(resumirDescansosDelDia(salioYNoVolvio, sinDescansos, bog(9, 30))[0].estado).toBe('EN_CURSO');
    expect(resumirDescansosDelDia(salioYNoVolvio, sinDescansos, bog(12))[0].estado).toBe('ABIERTO');
  });
});

describe('la jornada con descanso y almuerzo es una sola fila', () => {
  it('entrada, descanso, almuerzo y salida: una jornada de tres marcaciones', () => {
    const j = partirDiaEnJornadas(conLasDos(), diaCompleto());
    expect(j).toHaveLength(1);
    expect(j[0].marcaciones).toHaveLength(3);
    expect(j[0].minutosContados).toBe(465);
  });

  it('con dos descansos y el almuerzo: una jornada de cuatro marcaciones', () => {
    const j = partirDiaEnJornadas(ana(), diaDelEjemplo());
    expect(j).toHaveLength(1);
    expect(j[0].marcaciones).toHaveLength(4);
    expect(j[0].descansos.map(r => r.estado)).toEqual(['MARCADO', 'MARCADO']);
  });

  it('una entrada después de cerrar la jornada sí es otra fila', () => {
    const j = partirDiaEnJornadas([...conLasDos(), reg(bog(19), bog(21))], diaCompleto());
    expect(j).toHaveLength(2);
    expect(j[1].marcaciones).toHaveLength(1);
  });

  it('la salida al descanso no cierra la jornada', () => {
    expect(marcacionQueCierra([reg(bog(8), bog(9), { salidaDescanso: true })])).toBeNull();
    expect(marcacionQueCierra(conLasDos())?.salida).toEqual(bog(17));
  });

  it('cada marca tiene su rótulo, y el regreso dice de qué pausa vuelve', () => {
    const r = momentosDelDia(conIds(conLasDos()));
    expect(r.get('a')).toEqual({ entrada: 'ENTRADA', salida: 'SALIDA_DESCANSO' });
    expect(r.get('b')).toEqual({ entrada: 'REGRESO_DESCANSO', salida: 'SALIDA_ALMUERZO' });
    expect(r.get('c')).toEqual({ entrada: 'REGRESO_ALMUERZO', salida: 'SALIDA' });
  });

  it('el descanso de la tarde, después del almuerzo, se rotula igual de bien', () => {
    const r = momentosDelDia(conIds([
      reg(bog(8), bog(12), { salidaAlmuerzo: true }),
      reg(bog(13), bog(15), { salidaDescanso: true }),
      reg(bog(15, 15), bog(17)),
    ]));
    expect(r.get('b')).toEqual({ entrada: 'REGRESO_ALMUERZO', salida: 'SALIDA_DESCANSO' });
    expect(r.get('c')).toEqual({ entrada: 'REGRESO_DESCANSO', salida: 'SALIDA' });
  });

  it('el turno de cada marca dice lo mismo: las tres son el turno 0 y la extra el 1', () => {
    const r = jornadaDeCadaMarcacion(conIds([...conLasDos(), reg(bog(19), bog(21))]));
    expect([r.get('a'), r.get('b'), r.get('c'), r.get('d')]).toEqual([0, 0, 0, 1]);
  });
});

describe('minutosContadosDelDia, con descansos', () => {
  it('jornada corrida sin marcar pausas: se descuentan las dos ventanas', () => {
    expect(minutosContadosDelDia([reg(bog(8), bog(17))], diaCompleto())).toBe(465);
  });

  it('marcó las dos pausas: no se le vuelve a descontar ninguna', () => {
    expect(minutosContadosDelDia(conLasDos(), diaCompleto())).toBe(465);
  });

  it('el ejemplo del dueño: Ana 455, Beto 455 y Carla 440', () => {
    expect([ana(), beto(), carla()].map(regs => minutosContadosDelDia(regs, diaDelEjemplo()))).toEqual([455, 455, 440]);
  });
});

describe('partirDiaEnJornadas, con descansos', () => {
  it('el descanso se cuelga de la jornada que lo contiene, y solo de esa', () => {
    const j = partirDiaEnJornadas(
      [reg(bog(8), bog(9), { salidaDescanso: true }), reg(bog(9, 15), bog(17)), reg(bog(19), bog(21))],
      diaCompleto(),
    );
    expect(j[0].descansos.map(r => r.estado)).toEqual(['MARCADO']);
    expect(j[1].descansos).toEqual([]);
  });

  it('con dos descansos, cada resumen va en la jornada de su salida; el no marcado, en la primera', () => {
    const j = partirDiaEnJornadas(
      [reg(bog(7), bog(11)), reg(bog(14), bog(15), { salidaDescanso: true, descansoVentana: '15:00-15:10' }), reg(bog(15, 10), bog(16))],
      diaDelEjemplo(),
    );
    expect(j.map(x => x.descansos.map(r => `${r.ventana?.inicio} ${r.estado}`))).toEqual([['09:00 NO_MARCADO'], ['15:00 MARCADO']]);
  });

  it('el descanso no marcado lo paga la jornada que estuvo dentro de su ventana', () => {
    // 08:00-09:05 pisa 5 minutos del descanso; 09:30-17:00 no pisa nada del
    // descanso pero sí la hora entera del almuerzo.
    const j = partirDiaEnJornadas([reg(bog(8), bog(9, 5)), reg(bog(9, 30), bog(17))], diaCompleto());
    expect(j).toHaveLength(2);
    expect([j[0].minutosDescansoAqui, j[1].minutosDescansoAqui]).toEqual([5, 0]);
    expect([j[0].minutosAlmuerzoAqui, j[1].minutosAlmuerzoAqui]).toEqual([0, 60]);
    expect([j[0].minutosContados, j[1].minutosContados]).toEqual([60, 390]);
  });

  it('cada jornada paga lo que cayó dentro de sus ventanas', () => {
    const j = partirDiaEnJornadas([reg(bog(7), bog(10)), reg(bog(14), bog(16))], diaDelEjemplo());
    expect(j.map(x => x.minutosDescansoAqui)).toEqual([15, 10]);
    expect(j.map(x => x.minutosContados)).toEqual([165, 110]);
  });

  it('LA INVARIANTE con descansos: las jornadas suman exactamente lo que cuenta el día', () => {
    const escenarios = [
      { nombre: 'las dos pausas marcadas', regs: conLasDos(), dia: diaCompleto() },
      { nombre: 'ninguna pausa marcada', regs: [reg(bog(8), bog(17))], dia: diaCompleto() },
      { nombre: 'descanso a medias entre dos jornadas', regs: [reg(bog(8), bog(9, 5)), reg(bog(9, 10), bog(17))], dia: diaCompleto() },
      {
        nombre: 'almuerzo fijo y descanso en una jornada corta',
        regs: [reg(bog(8), bog(9, 10)), reg(bog(10), bog(17))],
        dia: diaCompleto({ almuerzoInicio: null, almuerzoFin: null }),
      },
      { nombre: 'descanso y además extra', regs: [...conLasDos(), reg(bog(19), bog(21))], dia: diaCompleto() },
      { nombre: 'dos descansos, ninguno marcado', regs: beto(), dia: diaDelEjemplo() },
      { nombre: 'dos descansos, uno marcado', regs: [reg(bog(7), bog(9), { salidaDescanso: true }), reg(bog(9, 15), bog(16))], dia: diaDelEjemplo() },
      { nombre: 'dos descansos repartidos en dos jornadas', regs: [reg(bog(7), bog(9, 10)), reg(bog(14), bog(15, 5)), reg(bog(15, 8), bog(16))], dia: diaDelEjemplo() },
      { nombre: 'Carla', regs: carla(), dia: diaDelEjemplo() },
    ];
    for (const e of escenarios) {
      const suma = partirDiaEnJornadas(e.regs, e.dia).reduce((s, j) => s + j.minutosContados, 0);
      expect(suma, e.nombre).toBe(minutosContadosDelDia(e.regs, e.dia));
    }
  });
});

// Cómo se parte en filas una jornada que el administrador reescribe entera: una
// fila por tramo, y cada una sabe cómo termina. Lo que no se puede cumplir se
// rechaza aquí, con un mensaje, antes de tocar la base.
describe('tramosDeLaJornada', () => {
  const t = (horas: Parameters<typeof instantesDeJornada>[1]) => instantesDeJornada(bog(0), horas);

  it('sin pausas: un solo tramo que termina en la salida del día', () => {
    expect(tramosDeLaJornada(t({ entrada: '08:00', salida: '17:00' })))
      .toEqual({ tramos: [{ entrada: bog(8), salida: bog(17), fin: 'SALIDA' }] });
  });

  it('sin salida todavía: el tramo queda abierto', () => {
    expect(tramosDeLaJornada(t({ entrada: '08:00' })))
      .toEqual({ tramos: [{ entrada: bog(8), salida: null, fin: null }] });
  });

  it('con descanso y almuerzo: tres filas, cada una termina donde debe', () => {
    expect(tramosDeLaJornada(t({
      entrada: '08:00', descansos: [{ salida: '09:00', regreso: '09:15' }],
      almuerzo: { salida: '12:00', regreso: '13:00' }, salida: '17:00',
    }))).toEqual({
      tramos: [
        { entrada: bog(8), salida: bog(9), fin: 'DESCANSO' },
        { entrada: bog(9, 15), salida: bog(12), fin: 'ALMUERZO' },
        { entrada: bog(13), salida: bog(17), fin: 'SALIDA' },
      ],
    });
  });

  it('salió a su última pausa y no ha vuelto: la jornada queda ahí, sin una fila abierta de más', () => {
    expect(tramosDeLaJornada(t({ entrada: '08:00', almuerzo: { salida: '12:00' } })))
      .toEqual({ tramos: [{ entrada: bog(8), salida: bog(12), fin: 'ALMUERZO' }] });
  });

  it('una pausa sin regreso no puede tener salida del día después', () => {
    const r = tramosDeLaJornada(t({ entrada: '08:00', almuerzo: { salida: '12:00' }, salida: '17:00' }));
    expect(r).toEqual({ error: expect.stringMatching(/no puede tener hora de salida/) });
  });

  it('ni otra pausa después', () => {
    const r = tramosDeLaJornada(t({
      entrada: '08:00', descansos: [{ salida: '09:00' }], almuerzo: { salida: '12:00', regreso: '13:00' },
    }));
    expect(r).toEqual({ error: expect.stringMatching(/no puede haber otra pausa después/) });
  });

  // Varios descansos (12 de septiembre de 2026): cada uno entra en su orden desde la
  // entrada, no en el orden en que llegan.
  it('con dos descansos y el almuerzo: cuatro filas, en el orden en que ocurrieron', () => {
    expect(tramosDeLaJornada(t({
      entrada: '07:00', descansos: [{ salida: '15:00', regreso: '15:10' }, { salida: '09:00', regreso: '09:15' }],
      almuerzo: { salida: '12:00', regreso: '13:00' }, salida: '16:00',
    }))).toEqual({
      tramos: [
        { entrada: bog(7), salida: bog(9), fin: 'DESCANSO' },
        { entrada: bog(9, 15), salida: bog(12), fin: 'ALMUERZO' },
        { entrada: bog(13), salida: bog(15), fin: 'DESCANSO' },
        { entrada: bog(15, 10), salida: bog(16), fin: 'SALIDA' },
      ],
    });
  });

  it('nocturno con tres descansos y el almuerzo: cinco filas en orden, cruzando la medianoche', () => {
    expect(tramosDeLaJornada(t({
      entrada: '22:00',
      descansos: [{ salida: '04:30', regreso: '04:40' }, { salida: '23:55', regreso: '00:05' }, { salida: '03:00', regreso: '03:10' }],
      almuerzo: { salida: '01:00', regreso: '01:30' }, salida: '06:00',
    }))).toEqual({
      tramos: [
        { entrada: bog(22), salida: bog(23, 55), fin: 'DESCANSO' },
        { entrada: bog(0, 5, 6), salida: bog(1, 0, 6), fin: 'ALMUERZO' },
        { entrada: bog(1, 30, 6), salida: bog(3, 0, 6), fin: 'DESCANSO' },
        { entrada: bog(3, 10, 6), salida: bog(4, 30, 6), fin: 'DESCANSO' },
        { entrada: bog(4, 40, 6), salida: bog(6, 0, 6), fin: 'SALIDA' },
      ],
    });
  });

  // Una pausa que se cruza con otra rodaba al día siguiente (instantesDeJornada solo
  // sabe avanzar) y la jornada quedaba de 33 horas. Desde el 12 de septiembre de 2026
  // una jornada que no cabe en un día se rechaza.
  it('almuerzo de 12:00 a 13:00 y descanso de 12:30 a 12:45 se rechazan: no cabe en un día', () => {
    expect(tramosDeLaJornada(t({
      entrada: '08:00', almuerzo: { salida: '12:00', regreso: '13:00' }, descansos: [{ salida: '12:30', regreso: '12:45' }], salida: '17:00',
    }))).toEqual({ error: 'La jornada no cabe en un día: revisa que las pausas no se crucen y que la salida sea posterior a la entrada' });
  });

  it('también sin pausas: entrada 08:00 y salida 08:00 ya no es una jornada de 24 horas', () => {
    // CAMBIO DE COMPORTAMIENTO, dicho a propósito: antes pasaba como 24 horas. Una
    // jornada así no es creíble; el auto-cierre la topa en 16.
    expect(tramosDeLaJornada(t({ entrada: '08:00', salida: '08:00' })))
      .toEqual({ error: 'La jornada no cabe en un día: revisa que las pausas no se crucen y que la salida sea posterior a la entrada' });
  });

  it('un descanso sin regreso que rueda al día siguiente también se rechaza, aunque sea la última pausa', () => {
    expect(tramosDeLaJornada(t({
      entrada: '08:00', almuerzo: { salida: '12:00', regreso: '13:00' }, descansos: [{ salida: '12:30' }],
    }))).toEqual({ error: expect.stringMatching(/no cabe en un día/) });
  });

  it('un nocturno de 23 horas y 59 minutos todavía cabe', () => {
    expect(tramosDeLaJornada(t({ entrada: '08:00', salida: '07:59' })))
      .toEqual({ tramos: [{ entrada: bog(8), salida: bog(7, 59, 6), fin: 'SALIDA' }] });
  });
});

// Lo que llega del editor en `descansos` (12 de septiembre de 2026). Lo que no se
// entiende no se inventa: una fila vacía se ignora, y un regreso sin su salida o más
// descansos de los que caben se rechazan diciendo qué pasa.
describe('leerDescansosDelCuerpo', () => {
  it('lo que no es una lista es sin descansos', () => {
    for (const valor of [undefined, null, 'x', {}, 42]) {
      expect(leerDescansosDelCuerpo(valor), String(valor)).toEqual({ descansos: [] });
    }
  });

  it('las filas vacías se descartan, y lo que no es texto no es una hora', () => {
    expect(leerDescansosDelCuerpo([{ salida: '', regreso: '' }, { salida: '09:00', regreso: '09:15' }, { salida: 900 }, null]))
      .toEqual({ descansos: [{ salida: '09:00', regreso: '09:15' }] });
  });

  it('una fila con solo la salida viaja sin regreso', () => {
    expect(leerDescansosDelCuerpo([{ salida: '09:00' }])).toEqual({ descansos: [{ salida: '09:00', regreso: undefined }] });
  });

  it('un regreso sin su salida se rechaza diciendo cuál descanso', () => {
    expect(leerDescansosDelCuerpo([{ salida: '09:00', regreso: '09:15' }, { salida: '', regreso: '15:10' }]))
      .toEqual({ error: 'Para registrar el regreso del descanso 2 hace falta la hora en que salió.' });
  });

  it('el descanso N es la posición en que llegó la fila, contando las vacías', () => {
    // Desde el 12 de septiembre de 2026 el editor manda todas sus filas, también las
    // vacías, y la pantalla numera por posición: el mensaje tiene que nombrar esa fila.
    expect(leerDescansosDelCuerpo([{ salida: '', regreso: '' }, { salida: '', regreso: '15:10' }]))
      .toEqual({ error: 'Para registrar el regreso del descanso 2 hace falta la hora en que salió.' });
    expect(leerDescansosDelCuerpo([null, {}, { salida: '09:00' }, { regreso: '15:10' }]))
      .toEqual({ error: 'Para registrar el regreso del descanso 4 hace falta la hora en que salió.' });
  });

  it('las filas vacías no cuentan para el tope de tres', () => {
    const tres = ['08:00', '09:00', '10:00'].map(s => ({ salida: s, regreso: `${s.slice(0, 2)}:10` }));
    expect(leerDescansosDelCuerpo([{ salida: '', regreso: '' }, ...tres, {}])).toEqual({ descansos: tres });
  });

  it('más de tres descansos se rechazan con su código', () => {
    const cuatro = ['08:00', '09:00', '10:00', '11:00'].map(s => ({ salida: s, regreso: `${s.slice(0, 2)}:10` }));
    expect(leerDescansosDelCuerpo(cuatro)).toEqual({ error: 'Una jornada puede tener hasta 3 descansos.', codigo: 'DEMASIADOS_DESCANSOS' });
    expect(leerDescansosDelCuerpo(cuatro.slice(0, 3))).toEqual({ descansos: cuatro.slice(0, 3) });
  });
});
