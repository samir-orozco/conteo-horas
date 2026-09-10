import { describe, it, expect, beforeEach } from 'vitest';
import { leerMemoria, recordar, olvidarTodo, DIAS_VIDA } from './memoriaPistas';

const DIA = 24 * 60 * 60 * 1000;
const AHORA = Date.UTC(2026, 8, 10, 12, 0, 0);   // fecha fija: nada de Date.now()

beforeEach(() => { olvidarTodo(); });

describe('la memoria de lo ya revisado', () => {
  it('devuelve vacío cuando no hay nada guardado', () => {
    expect(leerMemoria(AHORA).size).toBe(0);
  });

  it('guarda y devuelve la MEDICIÓN, no un sí o un no', () => {
    recordar(new Map([['r1:entrada', 0.94], ['r2:salida', 0.31]]), AHORA);
    const m = leerMemoria(AHORA);
    expect(m.get('r1:entrada')).toBeCloseTo(0.94, 6);
    expect(m.get('r2:salida')).toBeCloseTo(0.31, 6);
  });

  it('una segunda anotación se suma a la anterior en vez de pisarla', () => {
    recordar(new Map([['r1:entrada', 0.94]]), AHORA);
    recordar(new Map([['r2:entrada', 0.20]]), AHORA);
    expect(leerMemoria(AHORA).size).toBe(2);
  });

  it('caduca a los 60 días, igual que las fotos', () => {
    recordar(new Map([['viejo', 0.9]]), AHORA - (DIAS_VIDA + 1) * DIA);
    recordar(new Map([['nuevo', 0.9]]), AHORA);
    const m = leerMemoria(AHORA);
    expect(m.has('nuevo')).toBe(true);
    expect(m.has('viejo')).toBe(false);
  });

  it('descarta basura sin tumbar la pantalla', () => {
    localStorage.setItem('horapro.pistas.v1', '{no es json');
    expect(leerMemoria(AHORA).size).toBe(0);
    localStorage.setItem('horapro.pistas.v1', JSON.stringify({ a: { p: 'hola', t: AHORA }, b: { p: 0.5, t: AHORA } }));
    const m = leerMemoria(AHORA);
    expect(m.has('a')).toBe(false);
    expect(m.get('b')).toBe(0.5);
  });

  it('recordar nada no escribe nada', () => {
    recordar(new Map(), AHORA);
    expect(localStorage.getItem('horapro.pistas.v1')).toBeNull();
  });

  it('aguanta que localStorage no exista o falle', () => {
    const original = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() { throw new Error('modo privado'); },
    });
    expect(() => leerMemoria(AHORA)).not.toThrow();
    expect(leerMemoria(AHORA).size).toBe(0);
    expect(() => recordar(new Map([['x', 1]]), AHORA)).not.toThrow();
    if (original) Object.defineProperty(window, 'localStorage', original);
  });
});
