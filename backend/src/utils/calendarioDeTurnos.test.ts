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
