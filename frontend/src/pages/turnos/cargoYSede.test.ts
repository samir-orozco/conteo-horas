import { describe, it, expect } from 'vitest';
import { cargoYSede } from './cargoYSede';

// LA SEGUNDA LÍNEA DE LA COLUMNA DE LA PERSONA (28 de septiembre de 2026, pedido del dueño).
//
// La maqueta escribe «Guarda · Centro» debajo del nombre y la vista real solo decía el cargo. En una
// rejilla de doce personas, saber de qué sede es cada una es lo que evita programarle a alguien un
// turno en un sitio al que no va.
//
// POR QUÉ ES UNA FUNCIÓN PURA Y NO UN `? :` EN EL JSX: los dos datos pueden faltar por separado, así
// que son CUATRO casos y no dos. Es exactamente el conjunto abierto del que advierte el §9.4 del
// CLAUDE.md, y escrito como ternario anidado lo que sale es « · Centro» o «Guarda · » en cuanto uno
// de los dos viene vacío.
//
// Y HAY UN QUINTO que el ternario nunca vería: en este producto una persona puede tener VARIAS sedes
// —la modalidad híbrida existe y el filtro ya pregunta «tiene esta entre las suyas»—, mientras que la
// maqueta supone una sola. Tres nombres de sede no caben en una columna de 180 px.

const p = (cargo: string | null, ...sedes: string[]) =>
  ({ cargo, sedes: sedes.map((nombre, i) => ({ id: `s${i}`, nombre })) });

describe('la línea de cargo y sede', () => {
  it('los dos, separados por un punto medio', () => {
    expect(cargoYSede(p('Guarda', 'Centro'))).toBe('Guarda · Centro');
  });

  it('solo el cargo, sin el separador colgando', () => {
    expect(cargoYSede(p('Guarda'))).toBe('Guarda');
  });

  it('solo la sede, que es el caso de quien no tiene cargo escrito', () => {
    expect(cargoYSede(p(null, 'Centro'))).toBe('Centro');
  });

  it('ninguno de los dos: una raya, y no una línea en blanco', () => {
    // Una línea vacía deja la fila descuadrada respecto a las demás, y además no se distingue de un
    // dato que no cargó.
    expect(cargoYSede(p(null))).toBe('—');
  });

  it('VARIAS SEDES SE CUENTAN, no se listan', () => {
    // Con la modalidad híbrida una persona puede estar en dos o tres. «Centro, Norte, Sur» no cabe en
    // los 180 px de la columna y saldría recortado a «Centro, No…», que dice menos que el número.
    expect(cargoYSede(p('Guarda', 'Centro', 'Norte'))).toBe('Guarda · 2 sedes');
    expect(cargoYSede(p('Guarda', 'Centro', 'Norte', 'Sur'))).toBe('Guarda · 3 sedes');
  });

  it('un cargo en blanco NO es un cargo', () => {
    // Llega así de un Excel importado con la celda vacía pero no nula.
    expect(cargoYSede({ cargo: '   ', sedes: [{ id: 's1', nombre: 'Centro' }] })).toBe('Centro');
  });

  it('una sede sin nombre tampoco cuenta', () => {
    expect(cargoYSede({ cargo: 'Guarda', sedes: [{ id: 's1', nombre: '' }] })).toBe('Guarda');
  });

  it('SIN `sedes` NO REVIENTA, que es lo que pasa con una respuesta vieja en caché', () => {
    // Ya mordió una vez hoy: el campo `sedes` se agregó esta misma tarde, y un navegador con la
    // respuesta anterior guardada dejó la pantalla en blanco con «Cannot read properties of
    // undefined». Una rejilla sin la sede se lee; una rejilla que no se pinta, no.
    expect(cargoYSede({ cargo: 'Guarda', sedes: undefined })).toBe('Guarda');
  });
});

// ────────── EL TERCER DATO: CUÁNDO DESCANSA (29 de septiembre de 2026, pedido del dueño) ──────────
//
// Sale de una conversación concreta: a quien NO tiene horario, pintarle turnos no le pone ningún
// descanso, hay que marcárselo con el botón «Descanso». Quien programa no puede acordarse de eso si no
// ve quién es, y ese dato no estaba en ninguna parte de la rejilla: había que abrir persona por
// persona.
//
// DE DÓNDE SALE EL DÍA (30 de septiembre de 2026, regla del dueño): de las FRANJAS del horario, o de la
// programación de cada semana si no tiene horario. Antes eran tres estados declarados por persona
// (PRESUMIDO, FIJO, ROTATIVO) y esas columnas se borraron. Aquí solo llegan dos casos, ya resueltos por
// el backend.
//
// SOLO SE ESCRIBE LO QUE SE APARTA DEL DOMINGO, y esa es toda la decisión. Casi todo el mundo descansa
// el domingo: ponérselo a las veinte filas gasta la línea entera en repetir lo que ya se supone, y
// entonces lo que de verdad hay que ver deja de saltar a la vista.
//
// UNA LÍNEA Y NO UN CHIP: los chips de esta columna son avisos —«3 descansos», «1 semana sin
// descanso»—, o sea cosas que están MAL. No tener horario no está mal, es un atributo, y pintarlo con
// la forma de una alarma haría que las alarmas de verdad se leyeran como atributos.

const conDescanso = (
  de: 'HORARIO' | 'PROGRAMACION', dia: string | null = null,
) => ({ ...p('Guarda', 'Centro'), descanso: { de, dia } });

describe('cuándo descansa, en la misma línea', () => {
  it('SIN HORARIO se dice, porque es a quien hay que marcarle el descanso a mano', () => {
    expect(cargoYSede(conDescanso('PROGRAMACION'))).toBe('Guarda · Centro · descanso según programación');
  });

  it('con horario, si el día libre NO es el domingo se dice CUÁL', () => {
    // Es lo que evita programarle encima: alguien que libra el miércoles no tiene nada que lo
    // distinga en la rejilla si no se escribe.
    expect(cargoYSede(conDescanso('HORARIO', 'MIERCOLES'))).toBe('Guarda · Centro · descansa miércoles');
  });

  it('EL DOMINGO NO SE DICE: es lo que ya se supone de todo el mundo', () => {
    // Escribirlo en las veinte filas gastaría la línea en repetir el caso normal, y los que no tienen
    // horario dejarían de saltar a la vista, que es para lo único que este dato está aquí.
    expect(cargoYSede(conDescanso('HORARIO', 'DOMINGO'))).toBe('Guarda · Centro');
  });

  it('con horario y sin día no se inventa uno', () => {
    // No debería llegar: `diaDeDescansoDelHorario` siempre devuelve un día, y con cero o varios libres
    // devuelve el domingo. Si llega, callar es lo correcto y nombrar un día sería inventarlo.
    expect(cargoYSede(conDescanso('HORARIO', null))).toBe('Guarda · Centro');
  });

  it('SIN el campo no revienta ni escribe nada', () => {
    // La misma razón que `sedes` es opcional: un navegador con la respuesta anterior en caché lo
    // trae sin él. Ya dejó esta pantalla en blanco una vez.
    expect(cargoYSede(p('Guarda', 'Centro'))).toBe('Guarda · Centro');
  });

  it('sin cargo ni sede, el descanso va SOLO y no detrás de una raya', () => {
    // La raya es el respaldo de «no hay nada que decir». Con algo que decir, «— · descanso según
    // programación» sería una raya que ya no significa nada.
    expect(cargoYSede({ cargo: null, sedes: [], descanso: { de: 'PROGRAMACION', dia: null } }))
      .toBe('descanso según programación');
  });

  it('y sin nada de nada sigue siendo la raya', () => {
    expect(cargoYSede({ cargo: null, sedes: [], descanso: { de: 'HORARIO', dia: 'DOMINGO' } })).toBe('—');
  });
});
