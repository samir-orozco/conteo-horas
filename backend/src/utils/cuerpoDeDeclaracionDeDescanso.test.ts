import { describe, it, expect } from 'vitest';
import { limpiarDeclaracionDeDescanso } from './cuerpoDeDeclaracionDeDescanso';

// LA DECLARACIÓN DEL DESCANSO DESDE EL FORMULARIO DEL HORARIO (29 de septiembre de 2026).
//
// Hay una ya escrita, `limpiarRespuestasDeDescanso`, y NO se reusa entera. Esa es del modal que se
// pregunta una sola vez, y RECHAZA `PRESUMIDO` a propósito, con esta razón en su comentario:
// «responder "lo presumido" no es declarar nada, es el valor por defecto de todo el mundo, y
// aceptarlo escribiría una fecha de acuerdo afirmando que hay un papel firmado que no existe».
//
// Para el modal eso es correcto. Para un formulario que se puede EDITAR, no: si alguien declaró
// «miércoles» por error, o el acuerdo se rompió, tiene que poder volver al domingo por ley. Sin esto,
// la única salida sería tocar la base.
//
// VOLVER A PRESUMIDO BORRA LA FECHA DEL ACUERDO, y esa es la decisión de este módulo. `descansoAcuerdoEn`
// no es una marca de «cuándo se tocó esto»: es la afirmación de que existe un acuerdo escrito con el
// trabajador, y es lo único que autoriza a mover el descanso fuera del domingo. Dejándola puesta al
// volver al domingo quedaría un papel afirmado sobre una declaración que ya no lo necesita, y el día
// que alguien vuelva a poner «miércoles» la guarda legal lo daría por firmado sin que nadie firmara.
//
// EL DÍA DE UN ROTATIVO NO SE GUARDA aunque llegue, igual que en el otro: la pantalla esconde el
// selector al marcar «rotativo», así que lo que llegue es residuo de lo que se había elegido antes de
// cambiar de idea. Guardarlo dejaría una declaración que dice dos cosas a la vez.

describe('la declaración del descanso de un horario', () => {
  it('FIJO con su día', () => {
    expect(limpiarDeclaracionDeDescanso({ tipo: 'FIJO', dia: 'MIERCOLES' }))
      .toEqual({ ok: true, datos: { tipo: 'FIJO', dia: 'MIERCOLES', acuerdo: true } });
  });

  it('ROTATIVO, y el día que venga se descarta', () => {
    expect(limpiarDeclaracionDeDescanso({ tipo: 'ROTATIVO', dia: 'SABADO' }))
      .toEqual({ ok: true, datos: { tipo: 'ROTATIVO', dia: null, acuerdo: true } });
  });

  it('PRESUMIDO SE ACEPTA AQUÍ, al revés que en el modal, Y BORRA EL ACUERDO', () => {
    // Es la vuelta atrás. `acuerdo: false` es lo que hace que la fecha se ponga en null: no hay
    // papel que afirmar cuando el descanso es el que la ley presume.
    expect(limpiarDeclaracionDeDescanso({ tipo: 'PRESUMIDO' }))
      .toEqual({ ok: true, datos: { tipo: 'PRESUMIDO', dia: null, acuerdo: false } });
  });

  it('y PRESUMIDO tampoco guarda un día, aunque llegue', () => {
    expect(limpiarDeclaracionDeDescanso({ tipo: 'PRESUMIDO', dia: 'LUNES' }))
      .toEqual({ ok: true, datos: { tipo: 'PRESUMIDO', dia: null, acuerdo: false } });
  });

  it('un FIJO sin día no pasa: no se puede cumplir un día que no se dijo', () => {
    expect(limpiarDeclaracionDeDescanso({ tipo: 'FIJO' }).ok).toBe(false);
  });

  it('un FIJO con un día que no existe tampoco', () => {
    // Los nombres vienen de un selector, pero el cuerpo se puede armar a mano. Un día inválido
    // guardado dejaría a esa gente sin descanso que el motor pueda reconocer, y caerían al domingo
    // sin que nadie entienda por qué.
    expect(limpiarDeclaracionDeDescanso({ tipo: 'FIJO', dia: 'DIA_RARO' }).ok).toBe(false);
  });

  it('un tipo desconocido se rechaza, no se interpreta', () => {
    expect(limpiarDeclaracionDeDescanso({ tipo: 'LO_QUE_SEA' }).ok).toBe(false);
    expect(limpiarDeclaracionDeDescanso({}).ok).toBe(false);
    expect(limpiarDeclaracionDeDescanso(null).ok).toBe(false);
  });

  it('el tipo se acepta en minúsculas: viene de un cuerpo JSON, no de un enum', () => {
    expect(limpiarDeclaracionDeDescanso({ tipo: 'rotativo' }).datos?.tipo).toBe('ROTATIVO');
  });
});
