import { describe, it, expect } from 'vitest';
import { limpiarRespuestasDeDescanso, MAXIMO_DE_RESPUESTAS } from './cuerpoDeRespuestaDescanso';

// EL ÚNICO CAMINO DE ESCRITURA SOBRE LA DECLARACIÓN DEL DÍA DE DESCANSO (21 de septiembre de 2026).
//
// Antes de escribir esto se comprobó que no hubiera otro: las únicas apariciones de `descansoTipo`,
// `descansoDia` y `descansoAcuerdoEn` fuera de pruebas están en `descansoObligatorio.ts`, y son el
// tipo y la guarda que las LEEN. Nada las escribía. Por eso toda la validación vive aquí y no puede
// apoyarse en que alguien más la haga antes.
//
// Y por eso importa más de lo que parece: `descansoAcuerdoEn` es la afirmación de que existe un
// acuerdo escrito con el trabajador. Es lo único que autoriza a mover el descanso fuera del domingo
// y, con él, a dejar de pagar el recargo dominical. Un cuerpo mal validado aquí no rompe una
// pantalla: deja de pagarle un recargo a alguien.

const HORARIOS = ['h1', 'h2'];
const ok = (respuestas: unknown, validos: readonly string[] = HORARIOS) =>
  limpiarRespuestasDeDescanso(respuestas, validos);

describe('lo que se acepta', () => {
  it('un día fijo con su día', () => {
    const r = ok([{ horarioId: 'h1', tipo: 'FIJO', dia: 'MIERCOLES' }], ['h1']);
    expect(r).toEqual({ ok: true, datos: [{ horarioId: 'h1', tipo: 'FIJO', dia: 'MIERCOLES' }] });
  });

  it('un rotativo, que no lleva día', () => {
    const r = ok([{ horarioId: 'h1', tipo: 'ROTATIVO' }], ['h1']);
    expect(r).toEqual({ ok: true, datos: [{ horarioId: 'h1', tipo: 'ROTATIVO', dia: null }] });
  });

  it('a un rotativo que llegue con día se le quita', () => {
    // La pantalla oculta el selector al marcar «rotativo», así que si llega un día es residuo de lo
    // que el administrador había elegido antes de cambiar de idea. Guardarlo dejaría una
    // declaración que dice dos cosas.
    const r = ok([{ horarioId: 'h1', tipo: 'ROTATIVO', dia: 'LUNES' }], ['h1']);
    expect(r).toEqual({ ok: true, datos: [{ horarioId: 'h1', tipo: 'ROTATIVO', dia: null }] });
  });

  it('el día se normaliza a mayúsculas y sin espacios', () => {
    const r = ok([{ horarioId: 'h1', tipo: 'FIJO', dia: '  miercoles ' }], ['h1']);
    expect(r).toEqual({ ok: true, datos: [{ horarioId: 'h1', tipo: 'FIJO', dia: 'MIERCOLES' }] });
  });

  it('declarar el domingo con acuerdo es válido, aunque coincida con la presunción', () => {
    // No hay razón para rechazarlo: el resultado es el mismo que la ley presume, y obligar a
    // explicarle al administrador por qué su respuesta «sobra» sería peor que aceptarla.
    const r = ok([{ horarioId: 'h1', tipo: 'FIJO', dia: 'DOMINGO' }], ['h1']);
    expect(r).toEqual({ ok: true, datos: [{ horarioId: 'h1', tipo: 'FIJO', dia: 'DOMINGO' }] });
  });
});

describe('lo que se rechaza', () => {
  it('un cuerpo que no es una lista', () => {
    expect(ok({ horarioId: 'h1' })).toEqual({ ok: false, motivo: expect.stringContaining('respuestas') });
  });

  it('una lista vacía', () => {
    expect(ok([])).toEqual({ ok: false, motivo: expect.stringContaining('respuestas') });
  });

  it('un horario que no es de esta empresa', () => {
    // La guarda de alcance. Sin ella, un cuerpo armado a mano declararía el descanso de la gente de
    // otra empresa, y con él dejaría de pagarles el recargo dominical.
    const r = ok([{ horarioId: 'de-otra-empresa', tipo: 'ROTATIVO' }]);
    expect(r).toEqual({ ok: false, motivo: expect.stringContaining('no existe') });
  });

  it('PRESUMIDO no es una respuesta válida', () => {
    // Responder «lo presumido» no es declarar nada: es el valor por defecto de todo el mundo.
    // Aceptarlo escribiría una fecha de acuerdo afirmando que existe un papel firmado que no existe.
    expect(ok([{ horarioId: 'h1', tipo: 'PRESUMIDO' }], ['h1']))
      .toEqual({ ok: false, motivo: expect.stringContaining('FIJO') });
  });

  it('un tipo desconocido', () => {
    expect(ok([{ horarioId: 'h1', tipo: 'LO_QUE_SEA' }], ['h1']))
      .toEqual({ ok: false, motivo: expect.stringContaining('FIJO') });
  });

  it('un FIJO sin día', () => {
    expect(ok([{ horarioId: 'h1', tipo: 'FIJO' }], ['h1']))
      .toEqual({ ok: false, motivo: expect.stringContaining('día') });
  });

  it('un FIJO con un día que no existe', () => {
    expect(ok([{ horarioId: 'h1', tipo: 'FIJO', dia: 'LUNEVES' }], ['h1']))
      .toEqual({ ok: false, motivo: expect.stringContaining('día') });
  });

  it('el mismo horario dos veces', () => {
    // Dos respuestas para el mismo horario significan que la última gana en silencio. Con una
    // declaración legal, «la última gana» no es una política: es un descuido.
    const r = ok([
      { horarioId: 'h1', tipo: 'ROTATIVO' },
      { horarioId: 'h1', tipo: 'FIJO', dia: 'LUNES' },
    ], ['h1']);
    expect(r).toEqual({ ok: false, motivo: expect.stringContaining('dos veces') });
  });

  it('una respuesta que deja horarios sin contestar', () => {
    // La empresa queda marcada como revisada en el mismo movimiento, así que una respuesta parcial
    // daría por resuelto lo que nadie respondió, y esos horarios no volverían a preguntarse nunca.
    const r = ok([{ horarioId: 'h1', tipo: 'ROTATIVO' }], ['h1', 'h2']);
    // Con mayúscula: `stringContaining` distingue, y el motivo es el principio de una frase.
    expect(r).toEqual({ ok: false, motivo: expect.stringContaining('Faltan') });
  });

  it('más respuestas que el tope', () => {
    // Guarda de abuso, no regla de negocio: ninguna empresa tiene cientos de horarios, y el cuerpo
    // llega de la red.
    const muchas = Array.from({ length: MAXIMO_DE_RESPUESTAS + 1 }, (_, i) => ({ horarioId: `h${i}`, tipo: 'ROTATIVO' }));
    expect(ok(muchas, muchas.map(m => m.horarioId)))
      .toEqual({ ok: false, motivo: expect.stringContaining('máximo') });
  });
});
