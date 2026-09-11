import { describe, it, expect } from 'vitest';
import { partirEnLotes } from './lotes';

// Borrar una empresa grande de un solo DELETE ... WHERE id IN (...) revienta:
// MySQL y MariaDB aceptan 65.535 marcadores por sentencia, y una empresa con
// más marcaciones que eso no se podía eliminar. Además, un IN enorme hace que
// el motor abandone el índice y recorra la tabla de TODAS las empresas
// bloqueándola. Por eso la cascada borra por id y en lotes, y esta es la
// función que decide los lotes.

describe('partir una lista en lotes', () => {
  it('respeta el tamaño y deja el resto en el último lote', () => {
    expect(partirEnLotes([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('un múltiplo exacto no deja un lote vacío al final', () => {
    expect(partirEnLotes([1, 2, 3, 4], 2)).toEqual([[1, 2], [3, 4]]);
  });

  it('sin elementos no hay lotes: no se manda ninguna sentencia vacía', () => {
    expect(partirEnLotes([], 1000)).toEqual([]);
  });

  it('una lista más corta que el lote va entera en uno solo', () => {
    expect(partirEnLotes(['a', 'b'], 1000)).toEqual([['a', 'b']]);
  });

  it('no toca la lista original', () => {
    const ids = ['a', 'b', 'c'];
    partirEnLotes(ids, 2);
    expect(ids).toEqual(['a', 'b', 'c']);
  });

  it('con más de 65.535 ids ningún lote pasa del tamaño y no se pierde ni se repite nada', () => {
    // El caso que motivó esto: una empresa con más marcaciones que marcadores.
    const ids = Array.from({ length: 70_001 }, (_, i) => `r${i}`);
    const lotes = partirEnLotes(ids, 1000);
    expect(lotes).toHaveLength(71);
    expect(Math.max(...lotes.map(l => l.length))).toBe(1000);
    expect(lotes.at(-1)).toHaveLength(1);
    expect(lotes.flat()).toEqual(ids);
  });

  it('un tamaño que no es un entero positivo es un error, no un ciclo sin fin', () => {
    // Con 0 el ciclo nunca avanza y la transacción se queda colgada hasta el
    // timeout, con las filas ya borradas bloqueadas para las demás empresas.
    for (const malo of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => partirEnLotes([1, 2, 3], malo)).toThrow(RangeError);
    }
  });
});
