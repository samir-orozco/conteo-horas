import { describe, it, expect } from 'vitest';
import { dimensionesDeFoto, LADO_MAX, LADO_MINI } from './foto';

describe('a qué tamaño se guarda la foto de perfil', () => {
  it('una foto más pequeña que el tope no se estira', () => {
    expect(dimensionesDeFoto(200, 150)).toEqual({ ancho: 200, alto: 150 });
  });

  it('una foto apaisada se limita por el ancho', () => {
    expect(dimensionesDeFoto(2000, 1000)).toEqual({ ancho: LADO_MAX, alto: LADO_MAX / 2 });
  });

  it('una foto vertical se limita por el alto, que es el caso de un celular', () => {
    expect(dimensionesDeFoto(1000, 2000)).toEqual({ ancho: LADO_MAX / 2, alto: LADO_MAX });
  });

  it('una cuadrada queda cuadrada', () => {
    expect(dimensionesDeFoto(3000, 3000)).toEqual({ ancho: LADO_MAX, alto: LADO_MAX });
  });

  it('nunca devuelve píxeles fraccionarios', () => {
    const d = dimensionesDeFoto(1234, 987);
    expect(Number.isInteger(d.ancho)).toBe(true);
    expect(Number.isInteger(d.alto)).toBe(true);
  });

  it('un lado nunca queda en cero: una imagen muy alargada seguiría siendo visible', () => {
    expect(dimensionesDeFoto(4000, 3).alto).toBeGreaterThanOrEqual(1);
  });

  it('unas dimensiones imposibles no revientan', () => {
    expect(dimensionesDeFoto(0, 0)).toEqual({ ancho: 1, alto: 1 });
  });
});

describe('la miniatura para las listas', () => {
  it('es mucho más chica que la de la ficha', () => {
    // La lista pinta un círculo de 36 píxeles. Mandar la de la ficha por cada
    // persona son megas en un plan de 150 colaboradores.
    expect(LADO_MINI).toBeLessThan(LADO_MAX / 4);
  });

  it('usa la misma regla de proporción', () => {
    expect(dimensionesDeFoto(2000, 1000, LADO_MINI)).toEqual({ ancho: LADO_MINI, alto: LADO_MINI / 2 });
  });

  it('una foto ya pequeña tampoco se estira para la miniatura', () => {
    expect(dimensionesDeFoto(40, 30, LADO_MINI)).toEqual({ ancho: 40, alto: 30 });
  });
});
