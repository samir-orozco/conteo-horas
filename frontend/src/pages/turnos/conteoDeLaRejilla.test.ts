import { describe, it, expect } from 'vitest';
import { conteoDeLaRejilla, type DiaParaContar } from './conteoDeLaRejilla';

// LAS TARJETAS DE RESUMEN DE LA REJILLA (28 de septiembre de 2026).
//
// La maqueta cuenta cuatro cosas y la vista solo tenía dos de ellas. Las que faltaban son «turnos
// programados» y «descansos marcados», y su cuenta lleva dentro una regla que no se ve venir.
//
// SOLO SE CUENTAN LOS DÍAS DEL MES, y por eso esto es una decisión pura y no un `filter` en el JSX.
// La vista de mes se dibuja con SEMANAS COMPLETAS: las columnas de los extremos son de agosto y de
// octubre. Contarlas infla los dos números con jornadas de meses que el título ni nombra, y nadie lo
// notaría: son números plausibles.
//
// UN DÍA VACÍO NO ES NINGUNA DE LAS DOS COSAS. `SIN_TURNO` es «todavía no se programó»: contarlo como
// descanso diría que esa persona tiene libre un día que en realidad está sin decidir.

const dia = (fecha: string, estado: DiaParaContar['estado']): DiaParaContar => ({ fecha, estado });

describe('qué cuenta cada tarjeta', () => {
  it('un día con turno cuenta como turno programado', () => {
    const r = conteoDeLaRejilla([[dia('2026-09-15', 'TRABAJA')]], '2026-09');
    expect(r).toEqual({ turnos: 1, descansos: 0 });
  });

  it('un día marcado libre cuenta como descanso', () => {
    const r = conteoDeLaRejilla([[dia('2026-09-15', 'DESCANSO')]], '2026-09');
    expect(r).toEqual({ turnos: 0, descansos: 1 });
  });

  it('un DESCANSO TRABAJADO cuenta como turno, no como descanso', () => {
    // Tiene un turno encima: esa persona trabaja ese día. Contarlo como descanso diría que descansó
    // justo el día que la ley obliga a pagarle recargo.
    const r = conteoDeLaRejilla([[dia('2026-09-15', 'DESCANSO_TRABAJADO')]], '2026-09');
    expect(r).toEqual({ turnos: 1, descansos: 0 });
  });

  it('un día SIN programar no es ninguna de las dos', () => {
    const r = conteoDeLaRejilla([[dia('2026-09-15', 'SIN_TURNO')]], '2026-09');
    expect(r).toEqual({ turnos: 0, descansos: 0 });
  });

  it('suma a todas las personas', () => {
    const r = conteoDeLaRejilla([
      [dia('2026-09-15', 'TRABAJA'), dia('2026-09-16', 'DESCANSO')],
      [dia('2026-09-15', 'TRABAJA'), dia('2026-09-16', 'TRABAJA')],
    ], '2026-09');
    expect(r).toEqual({ turnos: 3, descansos: 1 });
  });
});

describe('las columnas de relleno no cuentan', () => {
  it('un día de OTRO MES no suma, aunque esté en la rejilla', () => {
    // EL CASO QUE JUSTIFICA QUE ESTO SEA PURO. El mes se dibuja con semanas completas, así que en
    // pantalla hay días de agosto y de octubre. Contarlos infla el número con jornadas de un mes que
    // el título ni nombra.
    const r = conteoDeLaRejilla([[
      dia('2026-08-31', 'TRABAJA'),
      dia('2026-09-01', 'TRABAJA'),
      dia('2026-10-01', 'TRABAJA'),
    ]], '2026-09');
    expect(r).toEqual({ turnos: 1, descansos: 0 });
  });

  it('y tampoco los descansos de relleno', () => {
    const r = conteoDeLaRejilla([[
      dia('2026-08-30', 'DESCANSO'),
      dia('2026-09-06', 'DESCANSO'),
    ]], '2026-09');
    expect(r).toEqual({ turnos: 0, descansos: 1 });
  });

  it('el mismo mes de OTRO AÑO tampoco cuenta', () => {
    // Comparar solo el número de mes dejaría entrar septiembre del año que viene. Es el mismo error
    // que ya apareció en `esDeOtroMes`.
    const r = conteoDeLaRejilla([[
      dia('2026-09-15', 'TRABAJA'),
      dia('2027-09-15', 'TRABAJA'),
    ]], '2026-09');
    expect(r).toEqual({ turnos: 1, descansos: 0 });
  });
});

describe('fuera de la vista de mes cuentan TODOS los días', () => {
  it('con `null` no se descarta nada por su mes', () => {
    // La maqueta lo dice en una línea: `VISTA !== 'MES' || f.getMonth() === ancla.getMonth()`. En
    // semana y en día no hay columnas de relleno que descartar, y una semana puede cruzar de mes
    // legítimamente —la del 28 de septiembre llega al 4 de octubre—: ahí los siete días son la semana
    // que se está viendo y los siete cuentan.
    //
    // Sin este caso, la función quedaría con una regla MÁS ESTRECHA que la realidad y la tarjeta
    // diría de menos justo en las semanas que cruzan.
    const r = conteoDeLaRejilla([[
      dia('2026-09-30', 'TRABAJA'),
      dia('2026-10-01', 'TRABAJA'),
      dia('2026-10-04', 'DESCANSO'),
    ]], null);
    expect(r).toEqual({ turnos: 2, descansos: 1 });
  });
});

describe('los bordes', () => {
  it('sin personas no cuenta nada', () => {
    expect(conteoDeLaRejilla([], '2026-09')).toEqual({ turnos: 0, descansos: 0 });
  });

  it('una persona sin días tampoco', () => {
    expect(conteoDeLaRejilla([[]], '2026-09')).toEqual({ turnos: 0, descansos: 0 });
  });
});
