import { describe, it, expect } from 'vitest';
import { nombreDeLugar, textoDeSedes } from './sedesDeReporte';

// Cómo se lee la sede en los reportes de extras y de llegadas tarde. La regla de
// quién es mixto la decide el servidor (backend/src/utils/sedesDeReporte.ts): aquí
// solo se escribe lo que llega, sin volver a ordenar ni a decidir.

describe('nombreDeLugar', () => {
  it('una sede se lee por su nombre', () => {
    expect(nombreDeLugar({ id: 'sede-a', nombre: 'Laureles' })).toBe('Laureles');
  });

  it('lo que no tiene sede se lee «Sin sede»', () => {
    expect(nombreDeLugar({ id: null, nombre: null })).toBe('Sin sede');
  });

  it('una sede que el servidor no pudo nombrar no queda en blanco', () => {
    expect(nombreDeLugar({ id: 'sede-x', nombre: null })).toBe('Sede sin nombre');
  });
});

describe('textoDeSedes', () => {
  it('una sola sede no es mixto', () => {
    expect(textoDeSedes([{ id: 'sede-a', nombre: 'Laureles' }])).toEqual({ texto: 'Laureles', mixto: false });
  });

  it('varias sedes son mixto, en el orden en que las manda el servidor', () => {
    expect(textoDeSedes([{ id: 'sede-b', nombre: 'El Poblado' }, { id: 'sede-a', nombre: 'Laureles' }]))
      .toEqual({ texto: 'El Poblado · Laureles', mixto: true });
  });

  it('una sede más turnos sin sede también es mixto', () => {
    expect(textoDeSedes([{ id: 'sede-a', nombre: 'Laureles' }, { id: null, nombre: null }]))
      .toEqual({ texto: 'Laureles · Sin sede', mixto: true });
  });

  it('quien no marcó en el período no tiene sede que mostrar', () => {
    expect(textoDeSedes([])).toEqual({ texto: '—', mixto: false });
  });
});
