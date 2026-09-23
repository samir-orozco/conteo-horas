import { describe, it, expect } from 'vitest';
import { diasQueTrabaja, preguntasDeDescanso, revisionDescansoPendiente } from './revisionDescanso';

// A QUIÉN SE LE PREGUNTA QUÉ DÍA DESCANSA SU GENTE (21 de septiembre de 2026).
//
// Gemela de `revisionPendiente` y por la misma razón (§8.2): la ruta que la usa no tiene pruebas de
// integración, así que una condición escrita dentro del `return` no la protegería nada.
//
// La diferencia con el auxilio es QUIÉN responde. El auxilio se revisa persona por persona porque
// la sospecha es sobre un salario. Aquí se pregunta por HORARIO: quienes comparten horario
// comparten el patrón de días, y preguntarle a cada persona por separado sería pedir treinta y
// cinco veces la misma respuesta.
//
// Y no se pregunta a todos los horarios. La ley presume el domingo, así que un horario que NO
// trabaja domingo ya está resuelto sin preguntar nada: el motor hace hoy exactamente eso. Preguntar
// ahí sería ruido, y el ruido es lo que hace que la gente cierre los avisos sin leerlos.
//
// Medido en la base local el 21 de septiembre de 2026: de 10 horarios activos, 9 son PRESUNCION y
// solo 1 hay que preguntar. En producción el dueño midió 22 horarios que incluyen domingo.

const franjas = (...dias: string[][]) => dias.map(d => ({ dias: d }));
const L_V = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'];
const TODA_LA_SEMANA = [...L_V, 'SABADO', 'DOMINGO'];

const horario = (id: string, nombre: string, dias: string[][], personas = 1) =>
  ({ id, nombre, franjas: franjas(...dias), personas });

describe('diasQueTrabaja: junta los días de todas las franjas', () => {
  it('une varias franjas sin repetir', () => {
    // El caso normal: L-V en una franja y el sábado corto en otra.
    expect(diasQueTrabaja(franjas(L_V, ['SABADO'])).sort())
      .toEqual([...L_V, 'SABADO'].sort());
  });

  it('un día repetido en dos franjas cuenta una vez', () => {
    expect(diasQueTrabaja(franjas(['LUNES'], ['LUNES', 'MARTES'])).sort()).toEqual(['LUNES', 'MARTES']);
  });

  it('sin franjas no trabaja ningún día', () => {
    expect(diasQueTrabaja([])).toEqual([]);
  });

  it('una columna `dias` que no es una lista no rompe nada', () => {
    // `FranjaHorario.dias` es Json en la base: puede traer cualquier cosa de una fila vieja, y un
    // dato raro no puede decidir quién descansa cuándo.
    expect(diasQueTrabaja([{ dias: null }, { dias: 'LUNES' }, { dias: 7 }])).toEqual([]);
  });

  it('descarta lo que no sea un día dentro de la lista', () => {
    expect(diasQueTrabaja(franjas(['LUNES', '', 'XYZ', 'MARTES']))).toEqual(['LUNES', 'MARTES']);
  });
});

describe('preguntasDeDescanso: solo se pregunta donde la ley no responde sola', () => {
  it('un horario de lunes a viernes NO se pregunta', () => {
    // El domingo está libre y la ley lo presume. Es lo que el motor ya calcula.
    expect(preguntasDeDescanso([horario('h1', 'Oficina', [L_V])])).toEqual([]);
  });

  it('un horario de lunes a sábado tampoco: el domingo sigue libre', () => {
    expect(preguntasDeDescanso([horario('h1', 'Oficina', [[...L_V, 'SABADO']])])).toEqual([]);
  });

  it('un horario de los SIETE días se pregunta, y no hay día que sugerir', () => {
    // El caso real de la base local («Jornada demo», 2 personas) y la forma que toma una operación
    // rotativa metida en una herramienta de horarios fijos.
    expect(preguntasDeDescanso([horario('h1', 'Jornada demo', [TODA_LA_SEMANA], 2)])).toEqual([
      { id: 'h1', nombre: 'Jornada demo', personas: 2, origen: 'SIN_DIA_LIBRE', sugerido: null },
    ]);
  });

  it('si trabaja domingo y le queda UN día libre, ese día se sugiere', () => {
    // Se sugiere, no se da por cierto: mover el descanso fuera del domingo exige acuerdo escrito, y
    // darlo por hecho sería dejar de pagar un recargo por deducción propia.
    const dias = TODA_LA_SEMANA.filter(d => d !== 'MIERCOLES');
    expect(preguntasDeDescanso([horario('h1', 'Rotativo', [dias], 5)])).toEqual([
      { id: 'h1', nombre: 'Rotativo', personas: 5, origen: 'PROPUESTA', sugerido: 'MIERCOLES' },
    ]);
  });

  it('si trabaja domingo y le quedan DOS días libres, no se sugiere ninguno', () => {
    const dias = TODA_LA_SEMANA.filter(d => d !== 'MIERCOLES' && d !== 'JUEVES');
    expect(preguntasDeDescanso([horario('h1', 'Parcial', [dias])])).toEqual([
      { id: 'h1', nombre: 'Parcial', personas: 1, origen: 'AMBIGUO', sugerido: null },
    ]);
  });

  it('un horario sin franjas no se pregunta', () => {
    // Sin días no trabaja el domingo, así que la presunción legal ya lo resuelve.
    expect(preguntasDeDescanso([horario('h1', 'Vacío', [])])).toEqual([]);
  });

  it('un horario ambiguo al que NO está asignado nadie activo tampoco se pregunta', () => {
    // Misma doctrina que `revisionPendiente`: bloquear ahí es pedirle a alguien que responda por un
    // conjunto vacío. Un horario que nadie cumple no está liquidando mal el domingo de nadie.
    //
    // Y ojo con de dónde sale ese número: `_count.colaboradores` de Prisma cuenta TAMBIÉN a los
    // retirados. Medido en la base local el 21 de septiembre de 2026, el horario «Turno diurno» da
    // _count=1 con 0 activos. Si la ruta pasara el `_count`, este horario se preguntaría y el modal
    // diría «afecta a 1 persona» sin afectar a ninguna.
    expect(preguntasDeDescanso([horario('h1', 'Siete días sin gente', [TODA_LA_SEMANA], 0)])).toEqual([]);
  });

  it('de una lista mezclada salen SOLO los que hay que preguntar, en orden', () => {
    const lista = [
      horario('h1', 'Oficina', [L_V]),
      horario('h2', 'Siete días', [TODA_LA_SEMANA], 3),
      horario('h3', 'Sábados', [['SABADO']]),
    ];
    expect(preguntasDeDescanso(lista).map(p => p.id)).toEqual(['h2']);
  });
});

describe('revisionDescansoPendiente', () => {
  it('bloquea a la empresa que no ha revisado y tiene horarios por resolver', () => {
    expect(revisionDescansoPendiente(null, 1)).toBe(true);
  });

  it('no bloquea a la que ya revisó', () => {
    expect(revisionDescansoPendiente(new Date('2026-09-21T05:00:00Z'), 3)).toBe(false);
  });

  it('no bloquea a la que no tiene NINGÚN horario ambiguo, aunque nunca haya revisado', () => {
    // La mayoría de las empresas: todo su mundo es de lunes a viernes o a sábado. Bloquearlas sería
    // pedirles que respondan una pregunta que la ley ya respondió.
    expect(revisionDescansoPendiente(null, 0)).toBe(false);
  });

  it('la marca manda aunque después aparezca un horario ambiguo', () => {
    // Igual que en el auxilio: quien ya respondió no vuelve a ver el aviso. Si más adelante crea un
    // horario de siete días, eso se declara en la ficha, no con un bloqueo a toda la empresa.
    expect(revisionDescansoPendiente(new Date('2026-09-21T05:00:00Z'), 0)).toBe(false);
  });
});
