import { describe, it, expect } from 'vitest';
import { clasificarDescansos, descansosTrabajadosPorMes, MINIMO_HABITUAL } from './descansoHabitual';

// CUÁNDO TRABAJAR EL DÍA DE DESCANSO DEJA DE SER OCASIONAL (21 de septiembre de 2026).
//
// Según la norma que me pasó el dueño: trabajar 1 o 2 días de descanso en un MES CALENDARIO es
// ocasional; a partir de 3 es HABITUAL, y ahí la compensación en tiempo deja de ser opcional. El
// recargo se paga igual en los dos casos: lo que cambia es que aparece la obligación de dar el
// descanso compensatorio.
//
// (Esto es la especificación del dueño, no una verificación legal mía.)
//
// DOS DECISIONES QUE PARECEN DETALLE Y NO LO SON:
//
// 1. Cuenta el día TRABAJADO, no el día programado con turno. Medido en la base local el 21 de
//    septiembre de 2026, las dos cosas resultaron DISJUNTAS: Julián y María tienen 3 descansos con
//    turno programado y CERO con marcaciones, y QA Recargos tiene 0 programados y 2 con
//    marcaciones. Contar lo programado le habría sumado 3 a quien no trabajó ninguno y 0 a quien
//    sí trabajó dos.
//
// 2. La ventana es el MES CALENDARIO, no una ventana móvil ni la semana. El motor de horas no
//    tiene ninguna ventana mensual —solo `semanaKey`—, así que esto es nuevo.

// Un instante en hora de Bogotá (UTC-5 fijo). Las fechas de `DiaEsperado` son medianoche de Bogotá
// guardada como 05:00 UTC (CLAUDE.md §8.1).
const bog = (a: number, mes: number, d: number, h = 0) => new Date(Date.UTC(a, mes - 1, d, h + 5, 0, 0));
const dia = (fecha: Date, esDescanso: boolean, trabajado: boolean) => ({ fecha, esDescanso, trabajado });

describe('clasificarDescansos', () => {
  it('sin ninguno, no hay nada que clasificar', () => {
    expect(clasificarDescansos(0)).toBe('NINGUNO');
  });

  it('uno o dos en el mes es ocasional', () => {
    expect(clasificarDescansos(1)).toBe('OCASIONAL');
    expect(clasificarDescansos(2)).toBe('OCASIONAL');
  });

  it('el TERCERO es el que cruza a habitual', () => {
    // El umbral exacto, que es lo único que de verdad hay que acertar aquí.
    expect(clasificarDescansos(MINIMO_HABITUAL)).toBe('HABITUAL');
    expect(clasificarDescansos(3)).toBe('HABITUAL');
  });

  it('de ahí para arriba sigue siendo habitual', () => {
    expect(clasificarDescansos(4)).toBe('HABITUAL');
    expect(clasificarDescansos(31)).toBe('HABITUAL');
  });

  it('un número imposible no inventa una clase', () => {
    // La cuenta viene de una consulta; si algún día llega en negativo, que no diga «habitual».
    expect(clasificarDescansos(-1)).toBe('NINGUNO');
  });
});

describe('descansosTrabajadosPorMes', () => {
  it('solo cuenta el día que ERA descanso Y se trabajó', () => {
    const dias = [
      dia(bog(2026, 9, 6), true, true),    // descanso trabajado: cuenta
      dia(bog(2026, 9, 13), true, false),  // descansó de verdad: no cuenta
      dia(bog(2026, 9, 15), false, true),  // trabajó un martes normal: no cuenta
      dia(bog(2026, 9, 16), false, false), // ni una cosa ni la otra
    ];
    expect(descansosTrabajadosPorMes(dias)).toEqual({ '2026-09': 1 });
  });

  it('el día de descanso NO trabajado no suma, que es el caso de la mayoría', () => {
    const dias = [dia(bog(2026, 9, 6), true, false), dia(bog(2026, 9, 13), true, false)];
    expect(descansosTrabajadosPorMes(dias)).toEqual({});
  });

  it('trabajar un día que NO es su descanso tampoco suma', () => {
    // El caso inverso real de la base: QA Recargos tiene marcaciones en días que no son su
    // descanso. Contarlas lo empujaría a «habitual» sin haber trabajado ningún descanso.
    const dias = [dia(bog(2026, 9, 15), false, true), dia(bog(2026, 9, 16), false, true)];
    expect(descansosTrabajadosPorMes(dias)).toEqual({});
  });

  it('agrupa por mes calendario, no por semana', () => {
    const dias = [
      dia(bog(2026, 8, 2), true, true), dia(bog(2026, 8, 9), true, true), dia(bog(2026, 8, 16), true, true),
      dia(bog(2026, 9, 6), true, true),
    ];
    expect(descansosTrabajadosPorMes(dias)).toEqual({ '2026-08': 3, '2026-09': 1 });
  });

  it('el cambio de mes se parte por el calendario de BOGOTÁ, no por UTC', () => {
    // 2026-09-01 a las 02:00 UTC es todavía el 31 de agosto en Bogotá. Contarlo en septiembre
    // movería a alguien de ocasional a habitual en el mes equivocado.
    const dias = [
      dia(new Date('2026-09-01T02:00:00Z'), true, true), // 31 de agosto en Bogotá
      dia(bog(2026, 9, 1), true, true),                  // 1 de septiembre en Bogotá
    ];
    expect(descansosTrabajadosPorMes(dias)).toEqual({ '2026-08': 1, '2026-09': 1 });
  });

  it('sin días, no hay meses', () => {
    expect(descansosTrabajadosPorMes([])).toEqual({});
  });
});
