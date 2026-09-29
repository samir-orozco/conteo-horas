import { describe, it, expect } from 'vitest';
import { avisoDeDescansos } from './avisoDeDescansos';

// EL CHIP DE LA FILA: «⚠ 2 descansos · ocasional» (28 de septiembre de 2026).
//
// Sale de abrir la maqueta al lado de la aplicación y compararlas enteras. Allí cada persona lleva
// ese aviso pegado al nombre; aquí el dato existía pero solo como un NÚMERO en la tarjeta de resumen
// de arriba: «3 en descanso habitual». Ese número dice que hay tres y no dice quiénes son, así que
// para encontrarlos hay que abrir persona por persona.
//
// LO QUE ESTÁ EN JUEGO NO ES DECORACIÓN. Uno o dos descansos trabajados en el mes se pagan con
// recargo; desde el tercero, la compensación EN TIEMPO deja de ser opcional (art. 181). O sea que la
// diferencia entre «ocasional» y «habitual» cambia lo que la empresa debe, y quien programa la
// semana tiene que verla en la fila de esa persona, no en un total.
//
// EL NÚMERO Y LA PALABRA VAN SEPARADOS y no en una frase ya unida: el chip de la rejilla escribe
// «3 descansos» y deja «habitual» para el nombre accesible, porque en la columna no cabe entera.
// Uniéndolos aquí, quien llama tendría que partir la cadena para escribir la mitad.
//
// POR QUÉ ES UNA FUNCIÓN PURA: hay que decidir si se muestra, con qué palabra y con qué tono, a
// partir de dos campos. Escrito en el JSX serían tres ternarios anidados sobre un `clase` que es un
// conjunto CERRADO de tres valores, que es justo donde el §9.4 dice que aparece el cuarto caso.

describe('el aviso de descansos trabajados de una persona', () => {
  it('sin ninguno, no hay chip', () => {
    // La mayoría de la plantilla está aquí. Un chip que sale siempre deja de verse.
    expect(avisoDeDescansos({ trabajados: 0, clase: 'NINGUNO' })).toBeNull();
  });

  it('uno solo: se nombra en singular', () => {
    expect(avisoDeDescansos({ trabajados: 1, clase: 'OCASIONAL' }))
      .toEqual({ cuantos: '1 descanso', palabra: 'ocasional', grave: false });
  });

  it('dos: plural, y sigue siendo ocasional', () => {
    expect(avisoDeDescansos({ trabajados: 2, clase: 'OCASIONAL' }))
      .toEqual({ cuantos: '2 descansos', palabra: 'ocasional', grave: false });
  });

  it('HABITUAL ES EL GRAVE, y es el que cambia lo que se debe', () => {
    // Desde el tercero del mes, compensar en tiempo deja de ser opcional. Por eso este se pinta
    // distinto: no es «van tres», es «ya no puedes pagarlo y ya».
    expect(avisoDeDescansos({ trabajados: 3, clase: 'HABITUAL' }))
      .toEqual({ cuantos: '3 descansos', palabra: 'habitual', grave: true });
  });

  it('EL NÚMERO Y LA CLASE VIENEN DEL SERVIDOR POR SEPARADO, y no se deduce uno del otro', () => {
    // El umbral está en el backend (`MINIMO_HABITUAL`) y puede cambiar. Si aquí se dedujera la clase
    // del número, la pantalla diría «ocasional» de alguien que el servidor ya cuenta como habitual, y
    // la compensación en tiempo no se reclamaría. Se pinta lo que el servidor dice.
    expect(avisoDeDescansos({ trabajados: 2, clase: 'HABITUAL' }))
      .toEqual({ cuantos: '2 descansos', palabra: 'habitual', grave: true });
    expect(avisoDeDescansos({ trabajados: 9, clase: 'OCASIONAL' }))
      .toEqual({ cuantos: '9 descansos', palabra: 'ocasional', grave: false });
  });

  it('clase NINGUNO con número no dibuja nada, aunque suene raro', () => {
    // Es un estado que el servidor no debería mandar. Inventarle una palabra aquí sería inventarse
    // una categoría legal; que no salga el chip se nota y se pregunta.
    expect(avisoDeDescansos({ trabajados: 4, clase: 'NINGUNO' })).toBeNull();
  });
});
