import { describe, it, expect } from 'vitest';
import {
  MODALIDADES, ETIQUETA_MODALIDAD, AYUDA_MODALIDAD, TONO_MODALIDAD,
  OPCIONES_MODALIDAD, normalizarModalidad,
} from './modalidad';

describe('normalizarModalidad', () => {
  it('deja pasar las tres', () => {
    expect(normalizarModalidad('PRESENCIAL')).toBe('PRESENCIAL');
    expect(normalizarModalidad('HIBRIDO')).toBe('HIBRIDO');
    expect(normalizarModalidad('REMOTO')).toBe('REMOTO');
  });

  it('lo que no reconoce cae en PRESENCIAL', () => {
    // Aquí sí se adivina, al revés que en el backend: esto solo decide qué
    // pintar. Dejar el control sin nada seleccionado haría que guardar cambiara
    // la modalidad de alguien sin que nadie lo pidiera.
    expect(normalizarModalidad(undefined)).toBe('PRESENCIAL');
    expect(normalizarModalidad(null)).toBe('PRESENCIAL');
    expect(normalizarModalidad('')).toBe('PRESENCIAL');
    expect(normalizarModalidad('TELETRABAJO')).toBe('PRESENCIAL');
  });
});

describe('etiquetas y ayudas', () => {
  it('las tres tienen etiqueta en español', () => {
    expect(ETIQUETA_MODALIDAD.PRESENCIAL).toBe('Presencial');
    expect(ETIQUETA_MODALIDAD.HIBRIDO).toBe('Híbrido');
    expect(ETIQUETA_MODALIDAD.REMOTO).toBe('Remoto');
  });

  it('las tres etiquetas son distintas entre sí', () => {
    // Se usan como `key` al pintar la fila de datos de la ficha.
    const vistas = new Set(MODALIDADES.map(m => ETIQUETA_MODALIDAD[m]));
    expect(vistas.size).toBe(MODALIDADES.length);
  });

  it('la ayuda dice qué le pasa a la ubicación, que es lo que no se adivina del nombre', () => {
    for (const m of MODALIDADES) {
      expect(AYUDA_MODALIDAD[m].toLowerCase()).toContain('ubicación');
    }
  });

  it('cada una tiene su tono para el chip', () => {
    for (const m of MODALIDADES) expect(TONO_MODALIDAD[m]).toBeTruthy();
  });
});

describe('OPCIONES_MODALIDAD', () => {
  it('ofrece las tres, con su texto', () => {
    expect(OPCIONES_MODALIDAD.map(o => o.valor)).toEqual(['PRESENCIAL', 'HIBRIDO', 'REMOTO']);
    for (const o of OPCIONES_MODALIDAD) expect(o.texto.length).toBeGreaterThan(0);
  });

  it('presencial va primero, que es como trabaja casi todo el mundo', () => {
    expect(OPCIONES_MODALIDAD[0].valor).toBe('PRESENCIAL');
  });
});
