import { describe, it, expect } from 'vitest';
import { TABS, tabValido, tabDesdeUrl, urlConTab, type ClaveTab } from './tabs';

describe('los tabs de la ficha', () => {
  it('son cinco y el primero es el resumen', () => {
    expect(TABS.map(t => t.clave)).toEqual(['resumen', 'asistencia', 'contratos', 'novedades', 'historia']);
  });

  it('todos tienen etiqueta legible', () => {
    for (const t of TABS) expect(t.etiqueta.length).toBeGreaterThan(3);
  });
});

describe('qué tab se abre', () => {
  it('sin nada en la dirección, el resumen', () => {
    expect(tabDesdeUrl('')).toBe('resumen');
    expect(tabDesdeUrl('?otra=cosa')).toBe('resumen');
  });

  it('respeta el que venga en la dirección', () => {
    expect(tabDesdeUrl('?tab=contratos')).toBe('contratos');
    expect(tabDesdeUrl('?desde=x&tab=novedades')).toBe('novedades');
  });

  it('un tab inventado cae al resumen y no deja la pantalla en blanco', () => {
    // Un enlace viejo o mal escrito no puede dejar la ficha vacía.
    expect(tabDesdeUrl('?tab=inventado')).toBe('resumen');
    expect(tabDesdeUrl('?tab=')).toBe('resumen');
  });

  it('valida claves sueltas', () => {
    expect(tabValido('historia')).toBe(true);
    expect(tabValido('HISTORIA')).toBe(false);
    expect(tabValido('')).toBe(false);
    expect(tabValido(undefined)).toBe(false);
  });
});

describe('la dirección que deja compartible el tab', () => {
  it('agrega el tab conservando lo que ya había', () => {
    expect(urlConTab('?desde=2026-01-01', 'contratos')).toBe('?desde=2026-01-01&tab=contratos');
  });

  it('reemplaza el tab anterior en vez de acumularlo', () => {
    expect(urlConTab('?tab=novedades', 'historia')).toBe('?tab=historia');
  });

  it('el resumen no ensucia la dirección, porque es el de por defecto', () => {
    expect(urlConTab('?tab=historia', 'resumen')).toBe('');
    expect(urlConTab('', 'resumen')).toBe('');
  });

  it('desde una dirección vacía', () => {
    expect(urlConTab('', 'asistencia')).toBe('?tab=asistencia');
  });
});

describe('los contadores que van en el tab', () => {
  it('no se pinta contador cuando no hay nada', () => {
    const t: ClaveTab = 'novedades';
    expect(TABS.find(x => x.clave === t)!.clave).toBe('novedades');
  });
});
