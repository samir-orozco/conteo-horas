import { describe, it, expect } from 'vitest';
import { progresoDelTope } from './progresoDelTope';

// LA COLUMNA DE TOTAL, COMO BARRA DE PROGRESO (29 de septiembre de 2026, propuesta del dueño).
//
// «50,3 h / 42 h» obliga a dividir de cabeza para saber si eso es mucho. Una barra contesta antes de
// leer los números, que es de lo que se trata cuando se están mirando veinte filas.
//
// LA DECISIÓN QUE HAY QUE ENTENDER ANTES DE TOCARLA: la barra y el porcentaje NO dicen lo mismo
// cuando alguien se pasa del tope.
//
//   - La BARRA se corta en 100%, porque una barra más larga que su carril no se puede dibujar: o se
//     sale de la caja o hay que reescalar el carril, y reescalarlo haría que 50 h se vieran MÁS
//     cortas que 42 h en la fila de al lado. Dos filas dejarían de poder compararse, que es lo único
//     que una barra hace bien.
//   - El PORCENTAJE dice la verdad: 120%. Recortarlo a 100% escondería justo el dato que importa.
//
// O sea: el dibujo se rinde y el número no. Si algún día alguien «arregla» la barra para que pase de
// 100, las filas dejan de compararse; si «arregla» el número para que no pase, se pierde el exceso.
//
// EL TOPE NO SE ESCRIBE AQUÍ: entra por parámetro porque sale de la jornada legal vigente, que bajó
// a 42 h en 2026 y volverá a moverse.

describe('el progreso contra el tope semanal', () => {
  it('la mitad justa es 50%', () => {
    expect(progresoDelTope(21 * 60, 42 * 60)).toEqual({ pct: 50, ancho: 50, pasa: false });
  });

  it('el caso de la propuesta: 8 h de 42 son 19%', () => {
    expect(progresoDelTope(8 * 60, 42 * 60)).toEqual({ pct: 19, ancho: 19, pasa: false });
  });

  it('cero es cero, y no un vacío', () => {
    expect(progresoDelTope(0, 42 * 60)).toEqual({ pct: 0, ancho: 0, pasa: false });
  });

  it('el tope JUSTO no se pasa', () => {
    // El borde exacto. `>=` aquí pintaría en rojo a quien cumple la ley al milímetro.
    expect(progresoDelTope(42 * 60, 42 * 60)).toEqual({ pct: 100, ancho: 100, pasa: false });
  });

  it('un minuto más ya se pasa', () => {
    const r = progresoDelTope(42 * 60 + 1, 42 * 60);
    expect(r.pasa).toBe(true);
  });

  it('PASADO EL TOPE, EL NÚMERO DICE LA VERDAD Y LA BARRA SE CORTA', () => {
    // 50,4 h sobre 42 son 120%. La barra no puede medir 120 de 100.
    expect(progresoDelTope(3024, 42 * 60)).toEqual({ pct: 120, ancho: 100, pasa: true });
  });

  it('y con el doble tampoco se sale del carril', () => {
    expect(progresoDelTope(84 * 60, 42 * 60)).toEqual({ pct: 200, ancho: 100, pasa: true });
  });

  it('un tope de cero no divide entre cero', () => {
    // Pasa si la jornada legal no cargó. `Infinity` o `NaN` se pintarían como una barra rota o como
    // un ancho absurdo; cero y «no se pasa» es lo que se puede afirmar sin inventar nada.
    expect(progresoDelTope(500, 0)).toEqual({ pct: 0, ancho: 0, pasa: false });
  });

  it('el porcentaje se redondea, no se trunca', () => {
    // 41,9 h de 42 es 99,76%: truncando saldría 99 y redondeando 100. Con 100 y `pasa: false`, que es
    // lo correcto, la fila dice «llegó al tope sin pasarse», que es exactamente lo que ocurrió.
    const r = progresoDelTope(2514, 42 * 60);
    expect(r).toEqual({ pct: 100, ancho: 100, pasa: false });
  });
});
