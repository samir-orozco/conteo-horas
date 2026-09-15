import { describe, it, expect } from 'vitest';
import { cambiaLaGeocerca } from './ubicacionDeSede';

// Qué cambios de una sede exigen el permiso de GPS del plan (15 de septiembre de 2026). Una sede con
// coordenadas activa la geocerca en el kiosco, y hasta hoy cualquier plan podía ponérsela aunque no
// incluyera la marcación por GPS. Ponerla, moverla o cambiarle el radio exige el permiso. Quitarla o
// dejarla como estaba, no: una empresa sin GPS tiene que poder renombrar la sede que ya la tenía.

const sin = { lat: null, lng: null, radio: 150 };
const en = (lat: number, lng: number, radio = 150) => ({ lat, lng, radio });

describe('cambiaLaGeocerca', () => {
  it('crear una sede sin ubicación no cambia ninguna geocerca', () => {
    expect(cambiaLaGeocerca(null, sin)).toBe(false);
  });

  it('crear una sede con ubicación sí', () => {
    expect(cambiaLaGeocerca(null, en(6.2087, -75.5674))).toBe(true);
  });

  it('ponerle ubicación a una sede que no tenía, sí', () => {
    expect(cambiaLaGeocerca(sin, en(6.2087, -75.5674))).toBe(true);
  });

  it('guardarla con la misma ubicación y el mismo radio, por ejemplo al renombrarla, no', () => {
    expect(cambiaLaGeocerca(en(6.2087, -75.5674), en(6.2087, -75.5674))).toBe(false);
  });

  it('moverla, sí', () => {
    expect(cambiaLaGeocerca(en(6.2087, -75.5674), en(6.2087, -75.5675))).toBe(true);
    expect(cambiaLaGeocerca(en(6.2087, -75.5674), en(6.2088, -75.5674))).toBe(true);
  });

  it('cambiarle solo el radio, sí', () => {
    expect(cambiaLaGeocerca(en(6.2087, -75.5674, 150), en(6.2087, -75.5674, 300))).toBe(true);
  });

  it('quitarle la ubicación, no', () => {
    expect(cambiaLaGeocerca(en(6.2087, -75.5674), sin)).toBe(false);
  });

  it('media coordenada no es una geocerca', () => {
    expect(cambiaLaGeocerca(null, { lat: 6.2087, lng: null, radio: 150 })).toBe(false);
  });
});
