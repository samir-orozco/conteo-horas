import { describe, it, expect } from 'vitest';
import { tiempoRelativo } from './tiempoRelativo';

// Fechas ancladas a medianoche de Bogotá, como las guarda el backend.
const f = (iso: string) => new Date(iso + 'T05:00:00.000Z');
const hoy = f('2026-08-26');

describe('el rótulo de tiempo de la línea de tiempo', () => {
  it('el mismo día dice HOY', () => {
    expect(tiempoRelativo(f('2026-08-26'), hoy)).toBe('HOY');
  });

  it('el día anterior dice AYER', () => {
    expect(tiempoRelativo(f('2026-08-25'), hoy)).toBe('AYER');
  });

  it('dentro de la semana cuenta los días', () => {
    expect(tiempoRelativo(f('2026-08-24'), hoy)).toBe('HACE 2 DÍAS');
    expect(tiempoRelativo(f('2026-08-20'), hoy)).toBe('HACE 6 DÍAS');
  });

  it('un retiro que aún no llega no puede leerse como pasado', () => {
    expect(tiempoRelativo(f('2026-08-27'), hoy)).toBe('MAÑANA');
    expect(tiempoRelativo(f('2026-08-31'), hoy)).toBe('EN 5 DÍAS');
  });

  it('pasada la semana no devuelve rótulo', () => {
    // Al lado ya está la fecha completa. Repetirla aquí no agrega nada, y
    // "hace 43 días" obliga a hacer la cuenta que uno quería evitar.
    expect(tiempoRelativo(f('2026-07-14'), hoy)).toBeNull();
    expect(tiempoRelativo(f('2025-07-14'), hoy)).toBeNull();
    expect(tiempoRelativo(f('2026-09-15'), hoy)).toBeNull();
  });

  it('el límite de los siete días es exacto, a lado y lado', () => {
    expect(tiempoRelativo(f('2026-08-19'), hoy)).toBe('HACE 7 DÍAS');
    expect(tiempoRelativo(f('2026-08-18'), hoy)).toBeNull();
    expect(tiempoRelativo(f('2026-09-02'), hoy)).toBe('EN 7 DÍAS');
    expect(tiempoRelativo(f('2026-09-03'), hoy)).toBeNull();
  });

  it('cuenta días de calendario, no horas: dos marcas a lado y lado de medianoche son días distintos', () => {
    const casiMedianoche = new Date('2026-08-26T04:59:00.000Z'); // 25 de agosto, 11:59 p.m. en Bogotá
    expect(tiempoRelativo(casiMedianoche, hoy)).toBe('AYER');
  });
});
