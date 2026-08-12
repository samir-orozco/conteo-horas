import { describe, it, expect } from 'vitest';
import { rangoReporte } from './fechas';

// Estas pruebas fijan el arreglo del bug del 2026-08-11: `new Date("2026-07-01")`
// es medianoche UTC, que en Bogotá es el 30 de junio a las 7 p.m. Usarlo directo
// dejaba fuera el último día del rango y corría el cálculo un día hacia atrás.

describe('rangoReporte', () => {
  it('ancla el inicio a la medianoche de Bogotá (05:00 UTC), no a la de UTC', () => {
    const { desdeF } = rangoReporte('2026-07-01', '2026-07-31');
    expect(desdeF.toISOString()).toBe('2026-07-01T05:00:00.000Z');
  });

  it('el fin es EXCLUSIVO: la medianoche de Bogotá del día siguiente al último', () => {
    const { finExclusivo } = rangoReporte('2026-07-01', '2026-07-31');
    expect(finExclusivo.toISOString()).toBe('2026-08-01T05:00:00.000Z');
  });

  it('incluye los registros del último día del rango', () => {
    // El kiosco guarda `fecha` como medianoche Bogotá del día marcado.
    const registroDel31 = new Date('2026-07-31T05:00:00.000Z');
    const { desdeF, finExclusivo } = rangoReporte('2026-07-01', '2026-07-31');
    expect(registroDel31 >= desdeF).toBe(true);
    expect(registroDel31 < finExclusivo).toBe(true);
  });

  it('excluye el día siguiente al final del rango', () => {
    const registroDel1Ago = new Date('2026-08-01T05:00:00.000Z');
    const { finExclusivo } = rangoReporte('2026-07-01', '2026-07-31');
    expect(registroDel1Ago < finExclusivo).toBe(false);
  });

  it('excluye el día anterior al inicio del rango', () => {
    const registroDel30Jun = new Date('2026-06-30T05:00:00.000Z');
    const { desdeF } = rangoReporte('2026-07-01', '2026-07-31');
    expect(registroDel30Jun >= desdeF).toBe(false);
  });

  it('un rango de un solo día cubre exactamente 24 horas', () => {
    const { desdeF, finExclusivo } = rangoReporte('2026-07-15', '2026-07-15');
    expect(finExclusivo.getTime() - desdeF.getTime()).toBe(24 * 60 * 60 * 1000);
  });
});
