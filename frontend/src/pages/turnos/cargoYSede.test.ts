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
// Sale de una conversación concreta: pintarle turnos a alguien de descanso ROTATIVO no le mueve el
// descanso, hay que marcárselo con el botón «Descanso». Quien programa no puede acordarse de eso si
// no ve quién es rotativo, y el tipo de descanso no estaba en ninguna parte de la rejilla: había que
// abrir persona por persona.
//
// SOLO SE ESCRIBE LO QUE SE APARTA DEL DOMINGO, y esa es toda la decisión. Casi todo el mundo
// descansa el domingo: ponérselo a las veinte filas gasta la línea entera en repetir lo que ya se
// supone, y entonces lo que de verdad hay que ver —los tres rotativos— deja de saltar a la vista.
//
// Por eso FIJO-domingo y PRESUMIDO no escriben nada, aunque sean estados distintos por dentro: los
// dos significan lo mismo para quien programa, «descansa el domingo». La ausencia no es un dato que
// falte, es el caso normal.
//
// UNA LÍNEA Y NO UN CHIP: los chips de esta columna son avisos —«3 descansos», «1 semana sin
// descanso»—, o sea cosas que están MAL. Ser rotativo no está mal, es un atributo, y pintarlo con la
// forma de una alarma haría que las alarmas de verdad se leyeran como atributos.

const conDescanso = (
  tipo: 'PRESUMIDO' | 'FIJO' | 'ROTATIVO', dia: string | null = null,
) => ({ ...p('Guarda', 'Centro'), descanso: { tipo, dia } });

describe('cuándo descansa, en la misma línea', () => {
  it('ROTATIVO se dice, porque es a quien hay que marcarle el descanso a mano', () => {
    expect(cargoYSede(conDescanso('ROTATIVO'))).toBe('Guarda · Centro · descanso rotativo');
  });

  it('FIJO en otro día se dice CUÁL, que es lo que evita programarle encima', () => {
    expect(cargoYSede(conDescanso('FIJO', 'MIERCOLES'))).toBe('Guarda · Centro · descansa miércoles');
  });

  it('FIJO EN DOMINGO NO SE DICE: es lo que ya se supone de todo el mundo', () => {
    // Escribirlo en las veinte filas gastaría la línea en repetir el caso normal, y los rotativos
    // dejarían de saltar a la vista, que es para lo único que este dato está aquí.
    expect(cargoYSede(conDescanso('FIJO', 'DOMINGO'))).toBe('Guarda · Centro');
  });

  it('PRESUMIDO tampoco: por dentro es otro estado, para quien programa es el mismo domingo', () => {
    expect(cargoYSede(conDescanso('PRESUMIDO'))).toBe('Guarda · Centro');
  });

  it('FIJO sin día no se inventa uno', () => {
    // Pasa con datos viejos. `estadoDescansoDe` ya cae a PRESUMIDO en ese caso, así que esto no
    // debería llegar; si llega, callar es lo correcto y nombrar un día sería inventarlo.
    expect(cargoYSede(conDescanso('FIJO', null))).toBe('Guarda · Centro');
  });

  it('SIN el campo no revienta ni escribe nada', () => {
    // La misma razón que `sedes` es opcional: un navegador con la respuesta anterior en caché lo
    // trae sin él. Ya dejó esta pantalla en blanco una vez.
    expect(cargoYSede(p('Guarda', 'Centro'))).toBe('Guarda · Centro');
  });

  it('sin cargo ni sede, el descanso va SOLO y no detrás de una raya', () => {
    // La raya es el respaldo de «no hay nada que decir». Con algo que decir, «— · descanso rotativo»
    // sería una raya que ya no significa nada.
    expect(cargoYSede({ cargo: null, sedes: [], descanso: { tipo: 'ROTATIVO', dia: null } }))
      .toBe('descanso rotativo');
  });

  it('y sin nada de nada sigue siendo la raya', () => {
    expect(cargoYSede({ cargo: null, sedes: [], descanso: { tipo: 'PRESUMIDO', dia: null } })).toBe('—');
  });
});
