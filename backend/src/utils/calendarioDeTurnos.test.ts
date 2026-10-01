import { describe, it, expect } from 'vitest';
import { descansoDelDia, estadoDelDia } from './calendarioDeTurnos';
import type { FuenteDelDescanso } from './descansoDelHorario';

// LOS TRES CASOS QUE LA CELDA PUEDE ENCONTRAR (30 de septiembre de 2026). Antes eran los tres estados
// de una declaración por persona; ahora salen del horario, que es donde el dueño dice que está la
// respuesta: «solo sabemos el día de descanso de un trabajador a través del horario fijo».
//
// Un horario de lunes a sábado: le sobra el domingo, que es además lo que presume la ley.
const HORARIO_L_A_S: FuenteDelDescanso = {
  de: 'HORARIO', diasQueTrabaja: ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'],
};
// Uno que libra el MIÉRCOLES: el único caso en que el descanso no es el domingo.
const LIBRA_MIERCOLES: FuenteDelDescanso = {
  de: 'HORARIO', diasQueTrabaja: ['LUNES', 'MARTES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'],
};
// Sin horario: no tiene día fijo, lo pone la programación de cada semana.
const SIN_HORARIO: FuenteDelDescanso = { de: 'PROGRAMACION' };

describe('descansoDelDia: donde hay dato congelado manda el dato', () => {
  it('un true congelado manda, aunque la regla de hoy diría que no', () => {
    // Un miércoles congelado como descanso sigue siéndolo aunque hoy su horario diga que ese día
    // trabaja. Esta es la razón de ser de la columna: el pasado no se recalcula con lo de hoy.
    expect(descansoDelDia(true, 'MIERCOLES', HORARIO_L_A_S)).toBe(true);
  });

  it('un FALSE congelado manda, y es el caso que obliga a distinguirlo de null', () => {
    // Un domingo que la fila dice que NO era su descanso. Si esto cayera a la regla, volvería a
    // decir "domingo" y el día cambiaría de sentido al releerlo.
    expect(descansoDelDia(false, 'DOMINGO', HORARIO_L_A_S)).toBe(false);
  });

  it('null no es un dato: cae al horario vigente de la persona', () => {
    // Las filas anteriores a la función. Con un horario de lunes a sábado la regla da el domingo, que
    // es exactamente lo que el motor calcula hoy: nadie ve un número distinto.
    expect(descansoDelDia(null, 'DOMINGO', HORARIO_L_A_S)).toBe(true);
    expect(descansoDelDia(null, 'LUNES', HORARIO_L_A_S)).toBe(false);
  });

  it('undefined es un día sin fila y se comporta igual que null', () => {
    // `combinarDiasEsperados` rellena con el horario vigente los días sin fila: ahí no hay
    // `esDescanso` de ninguna clase.
    expect(descansoDelDia(undefined, 'DOMINGO', HORARIO_L_A_S)).toBe(true);
  });

  it('sin fila, quien libra el miércoles descansa el miércoles y no el domingo', () => {
    expect(descansoDelDia(null, 'MIERCOLES', LIBRA_MIERCOLES)).toBe(true);
    expect(descansoDelDia(null, 'DOMINGO', LIBRA_MIERCOLES)).toBe(false);
  });

  it('SIN HORARIO Y SIN PROGRAMAR, la celda del domingo SÍ es descanso', () => {
    // CORREGIDO EL 1 DE OCTUBRE DE 2026. Entre el 30/09 y el 01/10 esto devolvió `false` también
    // para el domingo, y así se desplegó: la celda del domingo se pintaba como un día cualquiera
    // para las 105 personas sin horario que hay en producción.
    //
    // `descansoDelDia` resuelve UNA celda y no sabe de la semana, así que le llega `null` como día
    // programado. Ese `null` significa «nadie ha programado todavía», no «esta semana no hay
    // descanso», y mientras nadie programe manda la presunción legal.
    expect(descansoDelDia(null, 'DOMINGO', SIN_HORARIO)).toBe(true);
    expect(descansoDelDia(null, 'MARTES', SIN_HORARIO)).toBe(false);
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
