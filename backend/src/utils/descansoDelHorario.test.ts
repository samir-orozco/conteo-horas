import { describe, it, expect } from 'vitest';
import { descansoDelHorario } from './descansoDelHorario';

// QUÉ DÍA DESCANSA LA GENTE DE UN HORARIO (29 de septiembre de 2026).
//
// Sale de una corrección del dueño: «el descanso se define por el horario, no por el trabajador».
// Tiene razón, y el producto ya lo trataba así —el modal de revisión pregunta POR HORARIO— pero el
// dato se guarda en cada colaborador, porque `descansoAcuerdoEn` es el acuerdo escrito y la ley lo
// pide por persona.
//
// De ahí sale esta pregunta, que antes no existía: para ENSEÑAR la declaración en el formulario del
// horario hay que leerla de su gente, y su gente puede no coincidir.
//
// TRES RESPUESTAS Y NO DOS:
//
//   la declaración   todos dicen lo mismo. El caso normal, porque se escribe a todos a la vez.
//   MIXTO            hay más de una. Pasa de verdad: alguien puede haber cambiado de horario
//                    arrastrando su declaración anterior, o haber entrado después de la revisión.
//   null             el horario no tiene gente activa. No hay nada que leer.
//
// MIXTO NO SE RESUELVE POR MAYORÍA, y esa es la decisión. Enseñar «descansan el miércoles» cuando dos
// de siete descansan el domingo haría que guardar sin tocar nada les CAMBIARA el día a esos dos, en
// silencio y sin que nadie lo pidiera. Diciendo que están mezclados, quien mira decide.

const p = (tipo: string, dia: string | null = null, acuerdo: Date | null = new Date('2026-01-01')) =>
  ({ descansoTipo: tipo, descansoDia: dia, descansoAcuerdoEn: acuerdo });

describe('el descanso declarado de un horario', () => {
  it('sin gente activa no hay nada que leer', () => {
    expect(descansoDelHorario([])).toBeNull();
  });

  it('todos presumidos: domingo por ley', () => {
    expect(descansoDelHorario([p('PRESUMIDO', null, null), p('PRESUMIDO', null, null)]))
      .toEqual({ tipo: 'PRESUMIDO', dia: null });
  });

  it('todos con el mismo día fijo', () => {
    expect(descansoDelHorario([p('FIJO', 'MIERCOLES'), p('FIJO', 'MIERCOLES')]))
      .toEqual({ tipo: 'FIJO', dia: 'MIERCOLES' });
  });

  it('todos rotativos', () => {
    expect(descansoDelHorario([p('ROTATIVO'), p('ROTATIVO')])).toEqual({ tipo: 'ROTATIVO', dia: null });
  });

  it('DOS DÍAS FIJOS DISTINTOS ES MIXTO, no el más repetido', () => {
    // Con mayoría, guardar sin tocar nada le cambiaría el día al que está en minoría, en silencio.
    expect(descansoDelHorario([p('FIJO', 'MIERCOLES'), p('FIJO', 'MIERCOLES'), p('FIJO', 'DOMINGO')]))
      .toBe('MIXTO');
  });

  it('tipos distintos también es mixto', () => {
    expect(descansoDelHorario([p('ROTATIVO'), p('PRESUMIDO', null, null)])).toBe('MIXTO');
  });

  it('SIN ACUERDO ESCRITO VALE COMO PRESUMIDO, y por eso no es mixto', () => {
    // La guarda legal de `estadoDescansoDe`: declarar otro día sin el papel no alcanza para dejar de
    // pagar el recargo dominical. Uno marcado «FIJO MIERCOLES» sin acuerdo y otro presumido son, para
    // el motor, exactamente lo mismo. Llamarlos mixtos mandaría a arreglar algo que ya está igual.
    expect(descansoDelHorario([p('FIJO', 'MIERCOLES', null), p('PRESUMIDO', null, null)]))
      .toEqual({ tipo: 'PRESUMIDO', dia: null });
  });

  it('un día que no existe cae a presumido, no inventa un día', () => {
    expect(descansoDelHorario([p('FIJO', 'DIA_RARO'), p('PRESUMIDO', null, null)]))
      .toEqual({ tipo: 'PRESUMIDO', dia: null });
  });

  it('con una sola persona, lo suyo', () => {
    expect(descansoDelHorario([p('FIJO', 'SABADO')])).toEqual({ tipo: 'FIJO', dia: 'SABADO' });
  });
});
