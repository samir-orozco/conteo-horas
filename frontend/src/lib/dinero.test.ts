import { describe, it, expect } from 'vitest';
import { formatearMiles, parsearMiles, alEscribirMiles } from './dinero';

describe('cómo se muestra el dinero', () => {
  it('separa los miles y los millones a la colombiana', () => {
    expect(formatearMiles(1750905)).toBe('1.750.905');
    expect(formatearMiles(950000)).toBe('950.000');
    expect(formatearMiles(12500000)).toBe('12.500.000');
  });

  it('el cero se muestra vacío: en un campo, un "0" hay que borrarlo para escribir', () => {
    expect(formatearMiles(0)).toBe('');
  });
});

describe('cómo se lee lo que alguien escribió', () => {
  it('aguanta los puntos, el signo y los espacios', () => {
    for (const v of ['1.750.905', '$ 1.750.905', '1750905', ' 1.750.905 ']) {
      expect(parsearMiles(v)).toBe(1750905);
    }
  });

  it('lo que no tiene ningún número es cero', () => {
    expect(parsearMiles('')).toBe(0);
    expect(parsearMiles('mínimo')).toBe(0);
  });
});

describe('mientras se escribe', () => {
  it('los puntos aparecen solos, sin que nadie los ponga', () => {
    expect(alEscribirMiles('1750905')).toBe('1.750.905');
    expect(alEscribirMiles('175')).toBe('175');
    expect(alEscribirMiles('1750')).toBe('1.750');
  });

  it('vuelve a formatear lo que ya venía formateado, sin duplicar puntos', () => {
    expect(alEscribirMiles('1.750.905')).toBe('1.750.905');
  });

  it('borrarlo todo deja el campo vacío, no un cero', () => {
    expect(alEscribirMiles('')).toBe('');
    expect(alEscribirMiles('abc')).toBe('');
  });

  it('las letras que se cuelan se caen', () => {
    expect(alEscribirMiles('1750905 pesos')).toBe('1.750.905');
  });
});
