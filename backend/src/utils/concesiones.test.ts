import { describe, it, expect } from 'vitest';
import { concesionVigente, funcionesConcedidas, leerConcesion, leerNuevoFin, finDelDiaBogota, ORIGENES_DE_CONCESION } from './concesiones';

// FUNCIONES CON FECHA (14 de octubre de 2026, PENDIENTES nº 39, fase 2). El super admin le da a una empresa
// una función por un tiempo («pruébalo 2 meses»), y la prueba gratis del clima (fase 3) usa lo mismo. Se
// calcula AL LEER: una concesión vencida deja de contar sola, sin un barrido que la apague.

// Un instante dado en hora de Bogotá (UTC-5 todo el año). CLAUDE.md §8.1.
const bog = (a: number, mes: number, d: number, h = 0, min = 0) => new Date(Date.UTC(a, mes - 1, d, h + 5, min));

const concesion = (o: Partial<{ funcion: string; desde: Date; hasta: Date; revocadaEn: Date | null }> = {}) => ({
  funcion: 'clima', desde: bog(2026, 10, 1), hasta: bog(2026, 11, 1), revocadaEn: null, ...o,
});

describe('concesionVigente', () => {
  it('vale desde su comienzo hasta antes de su fin', () => {
    expect(concesionVigente(concesion(), bog(2026, 10, 1))).toBe(true);
    expect(concesionVigente(concesion(), bog(2026, 10, 31, 23, 59))).toBe(true);
  });

  it('el instante de su fin ya no vale: el fin es exclusivo', () => {
    expect(concesionVigente(concesion(), bog(2026, 11, 1))).toBe(false);
  });

  it('antes de empezar no vale', () => {
    expect(concesionVigente(concesion(), bog(2026, 9, 30, 23, 59))).toBe(false);
  });

  it('una concesión quitada no vale, aunque su fecha no haya pasado', () => {
    expect(concesionVigente(concesion({ revocadaEn: bog(2026, 10, 5) }), bog(2026, 10, 10))).toBe(false);
  });
});

describe('funcionesConcedidas', () => {
  it('enciende las funciones de las concesiones vigentes, y solo esas', () => {
    expect(funcionesConcedidas([
      concesion({ funcion: 'clima' }),
      concesion({ funcion: 'multiSede', hasta: bog(2026, 10, 5) }),
      concesion({ funcion: 'turnos', revocadaEn: bog(2026, 10, 2) }),
    ], bog(2026, 10, 10))).toEqual({ clima: true });
  });

  it('una función que no existe en el catálogo no se enciende', () => {
    expect(funcionesConcedidas([concesion({ funcion: 'inventada' })], bog(2026, 10, 10))).toEqual({});
  });
});

describe('finDelDiaBogota', () => {
  // «Hasta el 14 de diciembre» incluye ese día entero: el fin es la medianoche de Bogotá del 15.
  it('es la medianoche de Bogotá del día siguiente', () => {
    expect(finDelDiaBogota('2026-12-14')).toEqual(bog(2026, 12, 15));
    expect(finDelDiaBogota('2026-12-31')).toEqual(bog(2027, 1, 1));
  });
});

describe('leerConcesion', () => {
  const hoy = '2026-10-14';
  it('una función del catálogo con su último día vale', () => {
    expect(leerConcesion({ funcion: 'clima', hasta: '2026-12-14' }, hoy))
      .toEqual({ ok: true, funcion: 'clima', hasta: bog(2026, 12, 15) });
  });

  it('el último día puede ser hoy: vale hasta esta medianoche', () => {
    expect(leerConcesion({ funcion: 'clima', hasta: hoy }, hoy)).toEqual({ ok: true, funcion: 'clima', hasta: bog(2026, 10, 15) });
  });

  it('una fecha que ya pasó no se acepta', () => {
    expect(leerConcesion({ funcion: 'clima', hasta: '2026-10-13' }, hoy)).toEqual({ ok: false, error: 'La fecha de fin ya pasó.' });
  });

  it('más de dos años no se acepta: eso ya es cambiarle el plan', () => {
    expect(leerConcesion({ funcion: 'clima', hasta: '2028-10-15' }, hoy).ok).toBe(false);
    expect(leerConcesion({ funcion: 'clima', hasta: '2028-10-14' }, hoy).ok).toBe(true);
  });

  it('una función que no existe, o que todavía no existe (Siigo), no se concede', () => {
    expect(leerConcesion({ funcion: 'inventada', hasta: '2026-12-14' }, hoy)).toEqual({ ok: false, error: 'Esa función no existe.' });
    expect(leerConcesion({ funcion: 'siigo', hasta: '2026-12-14' }, hoy)).toEqual({ ok: false, error: 'Esa función todavía no está disponible.' });
  });

  it('una fecha mal escrita o un cuerpo vacío responden con su error, no revientan', () => {
    expect(leerConcesion({ funcion: 'clima', hasta: '14/12/2026' }, hoy)).toEqual({ ok: false, error: 'La fecha de fin no es válida.' });
    expect(leerConcesion({ funcion: 'clima', hasta: '2026-02-30' }, hoy)).toEqual({ ok: false, error: 'La fecha de fin no es válida.' });
    expect(leerConcesion(null, hoy)).toEqual({ ok: false, error: 'Esa función no existe.' });
  });
});

describe('leerNuevoFin', () => {
  it('cambiar la fecha de una concesión usa las mismas reglas de fecha', () => {
    expect(leerNuevoFin({ hasta: '2027-01-31' }, '2026-10-14')).toEqual({ ok: true, hasta: bog(2027, 2, 1) });
    expect(leerNuevoFin({ hasta: '2026-10-01' }, '2026-10-14')).toEqual({ ok: false, error: 'La fecha de fin ya pasó.' });
  });
});

describe('ORIGENES_DE_CONCESION', () => {
  it('son la prueba gratis y el super admin', () => {
    expect(ORIGENES_DE_CONCESION).toEqual(['PRUEBA', 'SUPER_ADMIN']);
  });
});
