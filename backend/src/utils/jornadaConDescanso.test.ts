import { describe, it, expect } from 'vitest';
import {
  resumirDescansoDelDia, resumirAlmuerzoDelDia, minutosContadosDelDia, partirDiaEnJornadas,
  marcacionQueCierra, momentosDelDia, jornadaDeCadaMarcacion, instantesDeJornada, tramosDeLaJornada,
} from './jornada';

// La jornada con DOS pausas: el almuerzo y el descanso no remunerado. Las dos
// viven en el hueco entre dos tramos y ninguna cierra la jornada: entrada,
// descanso, almuerzo y salida son UNA sola fila. Solo una entrada después de
// cerrar abre otra.

const bog = (h: number, m = 0, dia = 5) => new Date(Date.UTC(2026, 7, dia, h + 5, m, 0));

const reg = (
  entrada: Date | null,
  salida: Date | null,
  extra: { salidaAlmuerzo?: boolean; salidaDescanso?: boolean; entradaEstimada?: boolean } = {},
) => ({
  entrada, salida,
  salidaAlmuerzo: extra.salidaAlmuerzo ?? false,
  salidaDescanso: extra.salidaDescanso ?? false,
  entradaEstimada: extra.entradaEstimada ?? false,
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
  descansoInicio: '09:00' as string | null,
  descansoFin: '09:15' as string | null,
  ...extra,
});

const conLasDos = () => [
  reg(bog(8), bog(9), { salidaDescanso: true }),
  reg(bog(9, 15), bog(12), { salidaAlmuerzo: true }),
  reg(bog(13), bog(17)),
];
const conIds = <T,>(regs: T[]) => regs.map((r, i) => ({ ...r, id: 'abcdef'[i] }));

describe('resumirDescansoDelDia', () => {
  it('lo marcó: sale la hora real y no se descuenta de nuevo', () => {
    const r = resumirDescansoDelDia([reg(bog(8), bog(9), { salidaDescanso: true }), reg(bog(9, 15), bog(17))], diaCompleto());
    expect(r.estado).toBe('MARCADO');
    expect(r.salida).toEqual(bog(9));
    expect(r.regreso).toEqual(bog(9, 15));
    expect(r.minutos).toBe(15);
    expect(r.minutosVentana).toBe(15);
    expect(r.minutosDescontados).toBe(0);
  });

  it('nadie lo marcó: se descuenta la ventana entera', () => {
    const r = resumirDescansoDelDia([reg(bog(8), bog(17))], diaCompleto());
    expect(r.estado).toBe('NO_MARCADO');
    expect(r.minutosDescontados).toBe(15);
  });

  it('sin ventana no hay descanso, ni minutos fijos que descontar', () => {
    const r = resumirDescansoDelDia([reg(bog(8), bog(17))], diaCompleto({ descansoInicio: null, descansoFin: null }));
    expect(r.estado).toBe('SIN_VENTANA');
    expect(r.minutosDescontados).toBe(0);
  });

  it('la salida a almorzar no es la salida al descanso', () => {
    const r = resumirDescansoDelDia([reg(bog(8), bog(12), { salidaAlmuerzo: true }), reg(bog(13), bog(17))], diaCompleto());
    expect(r.estado).toBe('NO_MARCADO');
    expect(r.salida).toBeNull();
  });

  it('con las dos pausas marcadas, cada resumen encuentra la suya', () => {
    const regs = [
      reg(bog(8), bog(9), { salidaDescanso: true }),
      reg(bog(9, 10), bog(12), { salidaAlmuerzo: true }),
      reg(bog(13, 5), bog(17)),
    ];
    const descanso = resumirDescansoDelDia(regs, diaCompleto());
    const almuerzo = resumirAlmuerzoDelDia(regs, diaCompleto());
    expect([descanso.minutos, descanso.seExcedio]).toEqual([10, false]);
    expect([almuerzo.minutos, almuerzo.minutosDeMas]).toEqual([65, 5]);
  });

  it('recién salido, está en su descanso', () => {
    const r = resumirDescansoDelDia([reg(bog(8), bog(9), { salidaDescanso: true })], diaCompleto(), bog(9, 10));
    expect(r.estado).toBe('EN_CURSO');
  });

  it('salió al descanso y no volvió, pasada la gracia: queda abierto', () => {
    const r = resumirDescansoDelDia([reg(bog(8), bog(9), { salidaDescanso: true })], diaCompleto(), bog(10, 30));
    expect(r.estado).toBe('ABIERTO');
  });
});

describe('la jornada con descanso y almuerzo es una sola fila', () => {
  it('entrada, descanso, almuerzo y salida: una jornada de tres marcaciones', () => {
    const j = partirDiaEnJornadas(conLasDos(), diaCompleto());
    expect(j).toHaveLength(1);
    expect(j[0].marcaciones).toHaveLength(3);
    expect(j[0].minutosContados).toBe(465);
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

describe('minutosContadosDelDia — con descanso', () => {
  it('jornada corrida sin marcar pausas: se descuentan las dos ventanas', () => {
    expect(minutosContadosDelDia([reg(bog(8), bog(17))], diaCompleto())).toBe(465);
  });

  it('marcó las dos pausas: no se le vuelve a descontar ninguna', () => {
    expect(minutosContadosDelDia(conLasDos(), diaCompleto())).toBe(465);
  });
});

describe('partirDiaEnJornadas — con descanso', () => {
  it('el descanso se cuelga de la jornada que lo contiene, y solo de esa', () => {
    const j = partirDiaEnJornadas(
      [reg(bog(8), bog(9), { salidaDescanso: true }), reg(bog(9, 15), bog(17)), reg(bog(19), bog(21))],
      diaCompleto(),
    );
    expect(j[0].descanso?.estado).toBe('MARCADO');
    expect(j[1].descanso).toBeNull();
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

  it('LA INVARIANTE con descanso: las jornadas suman exactamente lo que cuenta el día', () => {
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
      entrada: '08:00', descanso: { salida: '09:00', regreso: '09:15' },
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
      entrada: '08:00', descanso: { salida: '09:00' }, almuerzo: { salida: '12:00', regreso: '13:00' },
    }));
    expect(r).toEqual({ error: expect.stringMatching(/no puede haber otra pausa después/) });
  });
});
