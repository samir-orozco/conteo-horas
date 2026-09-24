import { describe, it, expect } from 'vitest';
import { descansoDelDia, estadoDelDia } from './calendarioDeTurnos';
import type { EstadoDescanso } from './descansoObligatorio';

const PRESUMIDO: EstadoDescanso = { tipo: 'PRESUMIDO' };
const FIJO_MIERCOLES: EstadoDescanso = { tipo: 'FIJO', dia: 'MIERCOLES' };
const ROTATIVO: EstadoDescanso = { tipo: 'ROTATIVO' };

describe('descansoDelDia: donde hay dato congelado manda el dato', () => {
  it('un true congelado manda, aunque la regla de hoy diría que no', () => {
    // Un miércoles congelado como descanso sigue siéndolo aunque hoy la persona figure PRESUMIDO.
    // Esta es la razón de ser de la columna: el pasado no se recalcula con la configuración de hoy.
    expect(descansoDelDia(true, 'MIERCOLES', PRESUMIDO)).toBe(true);
  });

  it('un FALSE congelado manda, y es el caso que obliga a distinguirlo de null', () => {
    // Un domingo que la fila dice que NO era su descanso. Si esto cayera a la regla, volvería a
    // decir "domingo" y el día cambiaría de sentido al releerlo.
    expect(descansoDelDia(false, 'DOMINGO', PRESUMIDO)).toBe(false);
  });

  it('null no es un dato: cae a la regla vigente de la persona', () => {
    // Las filas anteriores a la función. Para un PRESUMIDO la regla da el domingo, que es
    // exactamente lo que el motor calcula hoy: nadie ve un número distinto.
    expect(descansoDelDia(null, 'DOMINGO', PRESUMIDO)).toBe(true);
    expect(descansoDelDia(null, 'LUNES', PRESUMIDO)).toBe(false);
  });

  it('undefined es un día sin fila y se comporta igual que null', () => {
    // `combinarDiasEsperados` rellena con el horario vigente los días sin fila: ahí no hay
    // `esDescanso` de ninguna clase.
    expect(descansoDelDia(undefined, 'DOMINGO', PRESUMIDO)).toBe(true);
  });

  it('sin fila, un FIJO con acuerdo descansa su día y no el domingo', () => {
    expect(descansoDelDia(null, 'MIERCOLES', FIJO_MIERCOLES)).toBe(true);
    expect(descansoDelDia(null, 'DOMINGO', FIJO_MIERCOLES)).toBe(false);
  });

  it('sin fila, un ROTATIVO sin semana planificada cae al domingo', () => {
    // La dirección segura: un turno pintado puede AGREGAR un recargo, nunca quitarlo.
    expect(descansoDelDia(null, 'DOMINGO', ROTATIVO)).toBe(true);
    expect(descansoDelDia(null, 'MARTES', ROTATIVO)).toBe(false);
  });
});

describe('estadoDelDia: qué se pinta en la celda', () => {
  it('el descanso manda sobre no estar programado', () => {
    // Son la misma cosa vista de dos formas, y la celda tiene que decir "Libre" y no quedarse vacía:
    // un descanso obligatorio invisible es justo lo que esta pantalla viene a arreglar.
    expect(estadoDelDia({ programado: false, esDescanso: true })).toBe('DESCANSO');
  });

  it('un descanso TRABAJADO se llama por su nombre y no "trabaja"', () => {
    // El caso que cuesta dinero: la persona tiene turno el día que le tocaba descansar.
    expect(estadoDelDia({ programado: true, esDescanso: true })).toBe('DESCANSO_TRABAJADO');
  });

  it('programado y no es su descanso: trabaja', () => {
    expect(estadoDelDia({ programado: true, esDescanso: false })).toBe('TRABAJA');
  });

  it('ni programado ni descanso: no hay turno, que no es lo mismo que descansar', () => {
    // Alguien de lunes a viernes tiene DOS días sin trabajar y solo uno es el descanso obligatorio.
    // Pintarlos iguales sería afirmar que el sábado también lo es.
    expect(estadoDelDia({ programado: false, esDescanso: false })).toBe('SIN_TURNO');
  });
});

// UN DÍA QUE ALGUIEN PINTÓ COMO DESCANSO (23 de septiembre de 2026).
//
// Pedido del dueño, y sale de un defecto que él vio y que se reprodujo contra su base: pintar un
// descanso a María un jueves dejaba la celda mostrando el recuadro de «Agregar», como si ahí no
// hubiera nada.
//
// LA CAUSA, medida: `esDescanso` del día significa «este es el descanso OBLIGATORIO de esta
// persona», no «alguien pintó un descanso aquí». Y `esDescansoObligatorio` solo mira lo planificado
// cuando la persona es ROTATIVA: un FIJO usa su día pactado y un PRESUMIDO el domingo, siempre. Las
// tres personas de esa empresa son FIJO o PRESUMIDO, así que pintar no podía cambiar nada y el día
// quedaba `programado: false, esDescanso: false`, que es exactamente SIN_TURNO.
//
// Son dos hechos distintos y ahora se guardan por separado. Este es el segundo.
describe('estadoDelDia: un descanso PINTADO no es el descanso obligatorio', () => {
  it('un día pintado como descanso se ve como descanso, aunque no sea el obligatorio', () => {
    // El defecto que el dueño reportó, dicho como prueba.
    expect(estadoDelDia({ programado: false, esDescanso: false, descansoPintado: true }))
      .toBe('DESCANSO');
  });

  it('NO se vuelve DESCANSO_TRABAJADO, y esto es lo que cuesta dinero', () => {
    // DESCANSO_TRABAJADO dispara el recargo del descanso OBLIGATORIO (art. 179 y siguientes). Un
    // martes que un administrador marcó libre no es el descanso legal de nadie, así que trabajarlo
    // es trabajar un día normal. Confundirlos pagaría un recargo que la ley no exige, y nadie lo
    // vería: saldría como un número más en la liquidación.
    expect(estadoDelDia({ programado: true, esDescanso: false, descansoPintado: true }))
      .toBe('TRABAJA');
  });

  it('el descanso OBLIGATORIO sigue mandando sobre el pintado', () => {
    // Si los dos coinciden, gana el que tiene consecuencias legales.
    expect(estadoDelDia({ programado: true, esDescanso: true, descansoPintado: true }))
      .toBe('DESCANSO_TRABAJADO');
    expect(estadoDelDia({ programado: false, esDescanso: true, descansoPintado: true }))
      .toBe('DESCANSO');
  });

  it('sin pintar, todo se comporta igual que antes', () => {
    // La guarda de regresión: `descansoPintado` es opcional porque las filas viejas no lo traen, y
    // su ausencia no puede cambiar ningún estado.
    expect(estadoDelDia({ programado: false, esDescanso: false, descansoPintado: false }))
      .toBe('SIN_TURNO');
    expect(estadoDelDia({ programado: false, esDescanso: false })).toBe('SIN_TURNO');
    expect(estadoDelDia({ programado: true, esDescanso: false })).toBe('TRABAJA');
  });
});
