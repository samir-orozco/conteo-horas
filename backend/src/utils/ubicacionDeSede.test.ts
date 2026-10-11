import { describe, it, expect } from 'vitest';
import { cambiaLaGeocerca, leerMargenFuera, MARGEN_FUERA_MAXIMO } from './ubicacionDeSede';

// Qué cambios de una sede exigen el permiso de GPS del plan (15 de septiembre de 2026). Una sede con
// coordenadas activa la geocerca en el kiosco, y hasta hoy cualquier plan podía ponérsela aunque no
// incluyera la marcación por GPS. Ponerla, moverla o cambiarle el radio exige el permiso. Quitarla o
// dejarla como estaba, no: una empresa sin GPS tiene que poder renombrar la sede que ya la tenía.

const sin = { lat: null, lng: null, radio: 150, margenFuera: 0 };
const en = (lat: number, lng: number, radio = 150, margenFuera = 0) => ({ lat, lng, radio, margenFuera });

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

  // El margen fuera de la geocerca (11 de octubre de 2026) la agranda: es cambiarla, igual que el radio.
  it('cambiarle solo el margen fuera de la geocerca, sí', () => {
    expect(cambiaLaGeocerca(en(6.2087, -75.5674, 150, 0), en(6.2087, -75.5674, 150, 200))).toBe(true);
  });

  it('quitarle la ubicación, no', () => {
    expect(cambiaLaGeocerca(en(6.2087, -75.5674), sin)).toBe(false);
  });

  it('media coordenada no es una geocerca', () => {
    expect(cambiaLaGeocerca(null, { lat: 6.2087, lng: null, radio: 150, margenFuera: 0 })).toBe(false);
  });
});

// El margen que llega del formulario de la sede (11 de octubre de 2026). Metros MÁS ALLÁ del radio
// en los que un presencial todavía marca, con alerta; 0 = no se permite.
describe('leerMargenFuera', () => {
  it('ausente es «no tocar»: un formulario viejo que no lo manda no lo apaga en silencio', () => {
    expect(leerMargenFuera(undefined)).toBeUndefined();
  });

  it('vacío o null es apagado', () => {
    expect(leerMargenFuera('')).toBe(0);
    expect(leerMargenFuera(null)).toBe(0);
  });

  it('un número de metros vale, también escrito como texto', () => {
    expect(leerMargenFuera(200)).toBe(200);
    expect(leerMargenFuera('350')).toBe(350);
  });

  it('se redondea al metro', () => {
    expect(leerMargenFuera(120.6)).toBe(121);
  });

  it('el tope vale y un metro más no', () => {
    expect(leerMargenFuera(MARGEN_FUERA_MAXIMO)).toBe(MARGEN_FUERA_MAXIMO);
    expect(leerMargenFuera(MARGEN_FUERA_MAXIMO + 1)).toBeNull();
  });

  it('negativo, texto o un valor que no es un número se rechaza, no se adivina', () => {
    expect(leerMargenFuera(-1)).toBeNull();
    expect(leerMargenFuera('mucho')).toBeNull();
    expect(leerMargenFuera(true)).toBeNull();
    expect(leerMargenFuera(Infinity)).toBeNull();
  });
});
