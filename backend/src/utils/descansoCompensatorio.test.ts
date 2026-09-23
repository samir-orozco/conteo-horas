import { describe, it, expect } from 'vitest';
import {
  opcionesDeCompensacion, revisionDeDecision, decisionValida, claseValida, decisionDelDia,
} from './descansoCompensatorio';

// CÓMO SE COMPENSA UN DÍA DE DESCANSO TRABAJADO (22 de septiembre de 2026).
//
// Vive aparte de `descansoObligatorio` a propósito: aquel responde CUÁL día es el descanso, y este
// responde QUÉ SE LE DEBE a quien lo trabajó. Son dos preguntas distintas y juntarlas haría que un
// cambio en una tocara la otra.
//
// LA LEY, leída y citada (no es la especificación de nadie):
//
//   art. 179 §1  ocasional = hasta DOS días de descanso obligatorio en el mes calendario;
//                habitual  = TRES o más.
//   art. 180     quien lo trabaja excepcionalmente tiene derecho a compensatorio O a dinero,
//                «A SU ELECCIÓN». La elección es del TRABAJADOR, no de la empresa.
//   art. 181     quien lo trabaja HABITUALMENTE tiene derecho al compensatorio «SIN PERJUICIO DE»
//                la retribución en dinero. Los dos, y sin elección.
//
// De ahí sale todo lo de abajo. Ojo con el nombre: la norma dice «días de descanso obligatorio», no
// «domingos», así que aplica igual a quien descansa el miércoles.
//
// LO QUE ESTE MÓDULO NO DECIDE, por decisión del dueño del 22 de septiembre de 2026: si alguien
// trabaja tres descansos en un mes, ¿los dos primeros (decididos cuando era ocasional) también
// generan compensatorio? El artículo 181 habla del trabajador habitual, no del día suelto, y no lo
// dice con todas las letras. Es una pregunta jurídica, la contesta un abogado, y mientras tanto el
// sistema NO elige: guarda lo que se decidió y AVISA cuando la clase del mes ya no es la misma.
// Reabrir hacia atrás queda como un interruptor, no como un rediseño.

describe('opcionesDeCompensacion', () => {
  it('ocasional: dos opciones, y la elección es del TRABAJADOR', () => {
    // Es el punto que corrige el diseño original, donde elegía la empresa. El artículo 180 dice
    // «a su elección» y el sujeto de esa frase es el trabajador.
    expect(opcionesDeCompensacion('OCASIONAL')).toEqual({
      opciones: ['DINERO', 'COMPENSATORIO'],
      eligeElTrabajador: true,
    });
  });

  it('habitual: no hay opciones, van las dos cosas', () => {
    // El recargo se paga igual; lo que deja de ser opcional es el día libre. Por eso la única
    // «decisión» que queda por registrar es en qué día cae.
    expect(opcionesDeCompensacion('HABITUAL')).toEqual({
      opciones: ['COMPENSATORIO'],
      eligeElTrabajador: false,
    });
  });

  it('sin ningún descanso trabajado no hay nada que compensar', () => {
    expect(opcionesDeCompensacion('NINGUNO')).toEqual({
      opciones: [],
      eligeElTrabajador: false,
    });
  });
});

describe('revisionDeDecision', () => {
  it('sin decidir todavía no hay nada que revisar: está pendiente, que es otra cosa', () => {
    expect(revisionDeDecision({
      decision: 'PENDIENTE', claseAlDecidir: null, claseActual: 'OCASIONAL',
    })).toBe('SIN_DECIDIR');
  });

  it('decidido y la clase no se movió: al día', () => {
    expect(revisionDeDecision({
      decision: 'DINERO', claseAlDecidir: 'OCASIONAL', claseActual: 'OCASIONAL',
    })).toBe('AL_DIA');
  });

  it('EL CASO QUE MOTIVA TODO: eligió dinero cuando era ocasional y el mes pasó a habitual', () => {
    // María trabajó el domingo 4 y eligió plata. Al trabajar también el 11 y el 18, el mes cruzó a
    // habitual. ¿El 4 genera además un día libre? El sistema NO lo decide: lo marca para que lo
    // resuelva una persona.
    expect(revisionDeDecision({
      decision: 'DINERO', claseAlDecidir: 'OCASIONAL', claseActual: 'HABITUAL',
    })).toBe('REVISAR_COMPENSATORIO');
  });

  it('si ya había elegido compensatorio, pasar a habitual no cambia nada', () => {
    // Ya tiene su día libre. Avisar aquí lo mandaría a revisar algo que está resuelto.
    expect(revisionDeDecision({
      decision: 'COMPENSATORIO', claseAlDecidir: 'OCASIONAL', claseActual: 'HABITUAL',
    })).toBe('AL_DIA');
  });

  it('decidido siendo habitual y sigue habitual: al día', () => {
    expect(revisionDeDecision({
      decision: 'COMPENSATORIO', claseAlDecidir: 'HABITUAL', claseActual: 'HABITUAL',
    })).toBe('AL_DIA');
  });

  it('el mes BAJA de habitual a ocasional porque alguien corrigió un día', () => {
    // Pasa justamente porque el modal se puede editar libremente, que fue lo que pidió el dueño. Si
    // el tercer descanso resulta que no se trabajó, el mes deja de ser habitual y el compensatorio
    // que se dio por obligatorio ya no lo era. No se le quita a nadie un día ya concedido: se marca
    // para que alguien lo mire.
    expect(revisionDeDecision({
      decision: 'COMPENSATORIO', claseAlDecidir: 'HABITUAL', claseActual: 'OCASIONAL',
    })).toBe('REVISAR_SOBRANTE');
  });

  it('y si el mes se queda sin ningún descanso trabajado, igual', () => {
    expect(revisionDeDecision({
      decision: 'COMPENSATORIO', claseAlDecidir: 'HABITUAL', claseActual: 'NINGUNO',
    })).toBe('REVISAR_SOBRANTE');
  });

  it('dinero decidido siendo habitual y el mes baja: no sobra nada', () => {
    // El recargo en dinero se paga en los dos casos, así que bajar de clase no lo vuelve indebido.
    expect(revisionDeDecision({
      decision: 'DINERO', claseAlDecidir: 'HABITUAL', claseActual: 'OCASIONAL',
    })).toBe('AL_DIA');
  });

  it('una decisión sin clase guardada no inventa una revisión', () => {
    // Filas anteriores a esta función, o cargadas a mano. `null` es la AUSENCIA del dato y no una
    // clase: suponerle una produciría avisos falsos sobre meses que nadie revisó.
    expect(revisionDeDecision({
      decision: 'DINERO', claseAlDecidir: null, claseActual: 'HABITUAL',
    })).toBe('AL_DIA');
  });
});

// LEER LA DECISIÓN QUE VIENE DE LA BASE (22 de septiembre de 2026).
//
// La columna `descansos_trabajados.decision` es VARCHAR a propósito: un cuarto valor no puede
// obligar a un ALTER de una tabla con datos (misma razón que `colaboradores.descansoTipo`). El
// precio de esa decisión es que la base PUEDE tener cualquier cosa guardada, así que al leerla hay
// que estrecharla en vez de afirmarle a TypeScript que confíe.
//
// Salió de un error de compilación real, no de una precaución teórica: la ruta pasaba el `string`
// crudo a `revisionDeDecision` y `tsc` lo rechazó. Taparlo con un `as` habría afirmado una garantía
// que la columna no da.
//
// LO QUE NO SE RECONOCE CAE A `PENDIENTE`, que es el lado seguro: significa «nadie ha resuelto
// esto», así que el día sale a revisión en vez de darse por cerrado en silencio. Es la misma
// doctrina de `diaValido` y de `estadoDescansoDe`, donde un valor raro nunca deja a alguien sin lo
// que le corresponde.
describe('decisionValida', () => {
  it('las tres decisiones reales pasan tal cual', () => {
    expect(decisionValida('PENDIENTE')).toBe('PENDIENTE');
    expect(decisionValida('DINERO')).toBe('DINERO');
    expect(decisionValida('COMPENSATORIO')).toBe('COMPENSATORIO');
  });

  it('normaliza mayúsculas y espacios, como el resto del producto', () => {
    expect(decisionValida('  dinero  ')).toBe('DINERO');
  });

  it('un valor que no se reconoce cae a PENDIENTE, no revienta', () => {
    // El día que alguien agregue un cuarto valor y despliegue el backend viejo, esas filas tienen
    // que salir a revisión, no desaparecer ni tumbar la pantalla.
    expect(decisionValida('REABIERTO')).toBe('PENDIENTE');
    expect(decisionValida('')).toBe('PENDIENTE');
  });

  it('lo que ni siquiera es una cadena tampoco', () => {
    expect(decisionValida(null)).toBe('PENDIENTE');
    expect(decisionValida(undefined)).toBe('PENDIENTE');
    expect(decisionValida(7)).toBe('PENDIENTE');
  });
});

// LEER LA CLASE CONGELADA QUE VIENE DE LA BASE (22 de septiembre de 2026).
//
// Misma historia que `decisionValida`: `descansos_trabajados.claseAlDecidir` es VARCHAR y puede
// tener cualquier cosa, así que se estrecha al leer. La ruta tenía aquí un
// `as Parameters<typeof revisionDeDecision>[0]['claseAlDecidir']`, que es la misma deshonestidad:
// afirmarle a TypeScript una garantía que la columna no da.
//
// PERO CAE A UN LADO DISTINTO, y la diferencia importa:
//
//   `decisionValida` cae a PENDIENTE  -> lo desconocido SALE A REVISIÓN.
//   `claseValida`    cae a null       -> lo desconocido NO INVENTA UNA COMPARACIÓN.
//
// Si esta cayera a una clase, `revisionDeDecision` compararía la clase actual contra algo que nadie
// guardó, y marcaría «revisar compensatorio» en meses que nadie tocó. Un aviso falso sobre plata
// que quizá se debe es peor que no avisar: manda a buscar lo que no falta, y enseña a ignorar los
// avisos.
describe('claseValida', () => {
  it('las tres clases reales pasan tal cual', () => {
    expect(claseValida('NINGUNO')).toBe('NINGUNO');
    expect(claseValida('OCASIONAL')).toBe('OCASIONAL');
    expect(claseValida('HABITUAL')).toBe('HABITUAL');
  });

  it('normaliza mayúsculas y espacios, como el resto del producto', () => {
    expect(claseValida('  habitual  ')).toBe('HABITUAL');
  });

  it('un valor desconocido es null, NO una clase inventada', () => {
    // `null` es la AUSENCIA del dato, y `revisionDeDecision` ya sabe tratarla: no compara y devuelve
    // AL_DIA. Devolver una clase aquí produciría el aviso falso.
    expect(claseValida('MUY_HABITUAL')).toBeNull();
    expect(claseValida('')).toBeNull();
  });

  it('lo que no es una cadena también es null', () => {
    expect(claseValida(null)).toBeNull();
    expect(claseValida(undefined)).toBeNull();
    expect(claseValida(3)).toBeNull();
  });
});

// QUÉ MARCA LLEVA LA CELDA DEL CALENDARIO (22 de septiembre de 2026).
//
// Pedido del dueño: que se vea si la decisión está pendiente. Hoy un descanso trabajado se pinta
// ámbar y nada dice si ya se resolvió qué hacer con él, así que hay que abrir el modal uno por uno
// para saberlo.
//
// LA REGLA QUE NO ES OBVIA: un descanso trabajado SIN fila guardada está PENDIENTE, no «sin
// decisión». La fila solo nace cuando alguien decide; su ausencia significa que nadie lo hizo
// todavía, que es justo lo que hay que mostrar. Confundir «no hay fila» con «no aplica» escondería
// exactamente los días que falta atender.
//
// Y un día que NO es descanso trabajado no lleva marca ninguna: `null`. Marcarlo «pendiente» sería
// pedir una decisión sobre un día que no la necesita.
describe('decisionDelDia', () => {
  it('un día que no es descanso trabajado no lleva marca', () => {
    expect(decisionDelDia(false, null)).toBeNull();
    expect(decisionDelDia(false, 'DINERO')).toBeNull();
  });

  it('un descanso trabajado SIN fila guardada está pendiente', () => {
    // El caso que motiva todo: la fila nace al decidir, así que su ausencia es «nadie lo ha hecho».
    expect(decisionDelDia(true, null)).toBe('PENDIENTE');
    expect(decisionDelDia(true, undefined)).toBe('PENDIENTE');
  });

  it('un descanso trabajado con decisión guardada la refleja', () => {
    expect(decisionDelDia(true, 'DINERO')).toBe('DINERO');
    expect(decisionDelDia(true, 'COMPENSATORIO')).toBe('COMPENSATORIO');
  });

  it('un valor raro en la columna cae a pendiente, o sea a la vista', () => {
    // Misma guarda que `decisionValida`: la columna es VARCHAR. Lo desconocido sale a revisión en
    // vez de darse por resuelto en silencio.
    expect(decisionDelDia(true, 'REABIERTO')).toBe('PENDIENTE');
  });
});
