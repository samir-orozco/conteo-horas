import { describe, it, expect } from 'vitest';
import { rangoReporte, hoyEnBogota, medianocheBogota } from './fechas';

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

describe('hoyEnBogota', () => {
  it('a media tarde da el mismo día que UTC', () => {
    // 25 ago 2026, 15:00 UTC = 10:00 en Bogotá
    expect(hoyEnBogota(new Date('2026-08-25T15:00:00Z'))).toBe('2026-08-25');
  });

  it('después de las 7 p.m. de Bogotá, UTC ya cambió de día y esta función no', () => {
    // 26 ago 2026, 02:00 UTC = 25 ago, 9 p.m. en Bogotá. Es la razón de existir:
    // un retiro registrado a esa hora quedaría fechado mañana con toISOString.
    const instante = new Date('2026-08-26T02:00:00Z');
    expect(instante.toISOString().slice(0, 10)).toBe('2026-08-26');
    expect(hoyEnBogota(instante)).toBe('2026-08-25');
  });

  it('justo a medianoche de Bogotá ya es el día nuevo', () => {
    // 05:00 UTC es 00:00 en Bogotá
    expect(hoyEnBogota(new Date('2026-08-26T05:00:00Z'))).toBe('2026-08-26');
    expect(hoyEnBogota(new Date('2026-08-26T04:59:00Z'))).toBe('2026-08-25');
  });

  it('el resultado sirve para medianocheBogota sin desfase', () => {
    const iso = hoyEnBogota(new Date('2026-08-26T02:00:00Z'));
    expect(medianocheBogota(iso).toISOString()).toBe('2026-08-25T05:00:00.000Z');
  });
});
