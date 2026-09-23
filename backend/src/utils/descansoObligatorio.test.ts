import { describe, it, expect } from 'vitest';
import { deducirDiaDescanso } from './descansoObligatorio';

// QUÉ DÍA ES EL DESCANSO OBLIGATORIO DE UNA PERSONA (20 de septiembre de 2026).
//
// Hoy el motor lo decide con `esDomingo = diaSemana === 'DOMINGO'` escrito a mano
// (horasColombiana.ts:136). Eso acierta por una razón frágil: nadie ha podido registrar nunca otro
// día, así que la presunción se cumple sola. Medido en producción, 22 horarios activos incluyen el
// domingo, y en 10 de ellos (26 personas) se trabajan los SIETE días.
//
// La regla legal tiene dos mitades y esta función solo resuelve la primera:
//
//   1. ¿Qué día quedaría libre según lo que la persona trabaja?  <- esto
//   2. ¿Se puede mover el descanso fuera del domingo?            <- exige acuerdo escrito, no se deduce
//
// Por eso la salida distingue una PRESUNCIÓN (el domingo está libre: lo dice la ley, no hace falta
// acuerdo) de una PROPUESTA (el domingo se trabaja y queda un solo día libre: es lo más probable,
// pero sin acuerdo escrito no se puede dar por cierto). Confundirlas sería dejar de pagar un
// recargo por deducción propia, que es justo lo que no se puede hacer.

describe('cuando el domingo NO se trabaja', () => {
  it('de lunes a viernes: el descanso es el domingo, aunque el sábado también esté libre', () => {
    expect(deducirDiaDescanso(['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES']))
      .toEqual({ dia: 'DOMINGO', origen: 'PRESUNCION' });
  });

  it('de lunes a sábado: el descanso es el domingo', () => {
    expect(deducirDiaDescanso(['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO']))
      .toEqual({ dia: 'DOMINGO', origen: 'PRESUNCION' });
  });

  // Caso degenerado: un horario sin días. No trabaja nada, así que el domingo está libre como
  // cualquier otro. Devolver null aquí obligaría a preguntar por alguien que no tiene jornada.
  it('un horario sin días también presume el domingo', () => {
    expect(deducirDiaDescanso([])).toEqual({ dia: 'DOMINGO', origen: 'PRESUNCION' });
  });
});

describe('cuando el domingo SÍ se trabaja', () => {
  // Es el caso de WE HOSPITALITY «COCINA 1», medido en producción: trabaja de martes a domingo.
  // El lunes es casi con certeza su descanso, pero eso lo tiene que confirmar la empresa.
  it('con un solo día libre, lo PROPONE y no lo afirma', () => {
    expect(deducirDiaDescanso(['MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO']))
      .toEqual({ dia: 'LUNES', origen: 'PROPUESTA' });
  });

  it('con varios días libres no se deduce nada', () => {
    expect(deducirDiaDescanso(['MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO']))
      .toEqual({ dia: null, origen: 'AMBIGUO' });
  });

  // Es el caso de ROSA DE CASTRO «LA DOCE» y de otros nueve horarios: la semana completa, que es la
  // forma que toma una operación rotativa metida en una herramienta de horarios fijos.
  it('con los siete días trabajados no hay nada que deducir', () => {
    expect(deducirDiaDescanso(['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO']))
      .toEqual({ dia: null, origen: 'SIN_DIA_LIBRE' });
  });
});

describe('lo que llega mal escrito', () => {
  // `FranjaHorario.dias` es una columna Json que se llena desde la pantalla. No se puede confiar en
  // que traiga exactamente los siete nombres esperados.
  it('ignora los valores que no son días', () => {
    expect(deducirDiaDescanso(['LUNES', 'MARTES', 'FERIADO', '', 'MIERCOLES', 'JUEVES', 'VIERNES']))
      .toEqual({ dia: 'DOMINGO', origen: 'PRESUNCION' });
  });

  it('los días repetidos no cambian el resultado', () => {
    expect(deducirDiaDescanso(['LUNES', 'LUNES', 'MARTES', 'MARTES']))
      .toEqual({ dia: 'DOMINGO', origen: 'PRESUNCION' });
  });

  // Dos franjas del mismo horario traen listas distintas y el llamador las junta. Si alguna viene
  // en minúsculas por un guardado viejo, el día contaría como no trabajado y el resultado cambiaría.
  it('acepta los días en minúsculas y con espacios', () => {
    expect(deducirDiaDescanso([' lunes ', 'Martes', 'MIERCOLES', 'jueves', 'VIERNES', 'sabado', 'DOMINGO']))
      .toEqual({ dia: null, origen: 'SIN_DIA_LIBRE' });
  });

  it('una lista que no trae nada útil se comporta como una vacía', () => {
    expect(deducirDiaDescanso(['', '  ', 'XYZ'])).toEqual({ dia: 'DOMINGO', origen: 'PRESUNCION' });
  });
});
