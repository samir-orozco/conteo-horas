import { describe, it, expect } from 'vitest';
import { puntosVisibles, PUNTOS_VISIBLES } from './puntosDeNovedades';

// CUATRO PUNTOS Y NO QUINCE (3 de octubre de 2026, pedido del dueño). Con quince novedades la fila
// de puntos no cabía en un celular. Se ven cuatro, la ventana se corre al avanzar, y el cuarto queda
// en gris —«hay más»— hasta que se llega a la última.

describe('puntosVisibles', () => {
  it('son cuatro', () => {
    expect(PUNTOS_VISIBLES).toBe(4);
  });

  it('con cuatro novedades o menos se ven todas', () => {
    expect(puntosVisibles(0, 3)).toEqual([0, 1, 2]);
    expect(puntosVisibles(2, 4)).toEqual([0, 1, 2, 3]);
  });

  it('al principio el punto activo avanza dentro de los cuatro primeros', () => {
    expect(puntosVisibles(0, 15)).toEqual([0, 1, 2, 3]);
    expect(puntosVisibles(1, 15)).toEqual([0, 1, 2, 3]);
    expect(puntosVisibles(2, 15)).toEqual([0, 1, 2, 3]);
  });

  it('en la cuarta la ventana se corre, para que después del activo siga un gris', () => {
    expect(puntosVisibles(3, 15)).toEqual([1, 2, 3, 4]);
    expect(puntosVisibles(7, 15)).toEqual([5, 6, 7, 8]);
  });

  it('en la penúltima el cuarto punto sigue en gris: es la última', () => {
    expect(puntosVisibles(13, 15)).toEqual([11, 12, 13, 14]);
  });

  it('solo en la última el activo es el cuarto', () => {
    expect(puntosVisibles(14, 15)).toEqual([11, 12, 13, 14]);
  });

  it('en ninguna novedad que no sea la última queda el activo en el cuarto lugar', () => {
    for (let actual = 0; actual < 15; actual++) {
      const puntos = puntosVisibles(actual, 15);
      expect(puntos).toHaveLength(4);
      expect(puntos).toContain(actual);
      expect(puntos.indexOf(actual) === 3).toBe(actual === 14);
    }
  });
});
