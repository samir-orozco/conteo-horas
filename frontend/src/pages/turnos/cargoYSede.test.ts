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
