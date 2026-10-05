import { describe, it, expect } from 'vitest';
import { coincideBusqueda } from './busqueda';

// El criterio del buscador, que es el mismo en Colaboradores y en Revisión de
// marcaciones (4 de octubre de 2026). Vive una sola vez a propósito: dos
// buscadores que encuentran cosas distintas con lo mismo escrito son dos
// productos, no uno.

const ANA = ['Ana María', 'Gómez Ruiz', '1020304050'];

describe('coincideBusqueda', () => {
  it('sin nada escrito no filtra a nadie', () => {
    expect(coincideBusqueda('', ANA)).toBe(true);
    expect(coincideBusqueda('   ', ANA)).toBe(true);
  });

  it('encuentra por un trozo del nombre o del apellido', () => {
    expect(coincideBusqueda('ana', ANA)).toBe(true);
    expect(coincideBusqueda('gom', ANA)).toBe(true);
    expect(coincideBusqueda('ruiz', ANA)).toBe(true);
    expect(coincideBusqueda('pedro', ANA)).toBe(false);
  });

  // Las dos direcciones: nadie escribe la tilde en un buscador, y quien la
  // escriba tampoco puede quedarse sin resultados.
  it('las tildes y las mayúsculas no importan, en los dos sentidos', () => {
    expect(coincideBusqueda('GOMEZ', ANA)).toBe(true);
    expect(coincideBusqueda('gómez', ANA)).toBe(true);
    expect(coincideBusqueda('maria', ANA)).toBe(true);
  });

  // Se escribe «ana gomez» aunque en la ficha el apellido vaya en otro campo.
  it('varias palabras: todas tienen que estar, en cualquier campo y en cualquier orden', () => {
    expect(coincideBusqueda('ana gomez', ANA)).toBe(true);
    expect(coincideBusqueda('gomez ana', ANA)).toBe(true);
    expect(coincideBusqueda('ana lopez', ANA)).toBe(false);
  });

  it('encuentra por la cédula, completa o por el principio', () => {
    expect(coincideBusqueda('1020304050', ANA)).toBe(true);
    expect(coincideBusqueda('102030', ANA)).toBe(true);
  });

  // La cédula se guarda sin puntos y la gente la escribe con puntos: si no, el
  // buscador no encuentra lo que la persona está COPIANDO de otro lado.
  it('una cédula escrita con puntos encuentra a quien la tiene sin puntos', () => {
    expect(coincideBusqueda('1.020.304.050', ANA)).toBe(true);
    expect(coincideBusqueda('1.020', ANA)).toBe(true);
    expect(coincideBusqueda('9.999', ANA)).toBe(false);
  });

  it('los campos vacíos o sin dato no estorban', () => {
    expect(coincideBusqueda('ana', ['Ana', null, undefined, ''])).toBe(true);
    expect(coincideBusqueda('ana', [])).toBe(false);
  });
});
