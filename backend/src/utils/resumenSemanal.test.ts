import { describe, it, expect } from 'vitest';
import { semanaDelResumen } from './resumenSemanal';

// QUÉ SEMANA LE TOCA AL CORREO DEL LUNES (11 de octubre de 2026).
//
// El resumen sale el lunes a las 7 a. m. de Bogotá con la semana anterior completa, de lunes a
// domingo. El trabajo corre también al arrancar la app (programarDiario.ts), así que esta función
// es la que decide si a esa hora toca o no: un despliegue el martes no puede mandar el resumen.
//
// Instantes en UTC explícito (CLAUDE.md §8.1): la suite corre en Los Ángeles a propósito.
const bog = (a: number, mes: number, d: number, h: number, min = 0) =>
  new Date(Date.UTC(a, mes - 1, d, h + 5, min, 0));

describe('semanaDelResumen', () => {
  it('el lunes a las 7 de Bogotá devuelve la semana anterior y la de antes, para comparar', () => {
    expect(semanaDelResumen(bog(2026, 10, 12, 7))).toEqual({
      desde: '2026-10-05', hasta: '2026-10-11',
      anterior: { desde: '2026-09-28', hasta: '2026-10-04' },
    });
  });

  it('el lunes más tarde también toca: si el hosting tenía la app dormida a las 7, sale con la primera visita', () => {
    expect(semanaDelResumen(bog(2026, 10, 12, 16, 30))?.desde).toBe('2026-10-05');
    expect(semanaDelResumen(bog(2026, 10, 12, 23, 59))?.desde).toBe('2026-10-05');
  });

  it('el lunes antes de las 7 no toca', () => {
    expect(semanaDelResumen(bog(2026, 10, 12, 6, 59))).toBeNull();
  });

  it('el domingo en la noche de Bogotá no toca, aunque en UTC ya sea lunes', () => {
    // 21:00 del domingo 11 en Bogotá = 02:00 del lunes 12 en UTC.
    expect(semanaDelResumen(bog(2026, 10, 11, 21))).toBeNull();
  });

  it('el martes no toca: un resumen que llega tarde ya no sirve', () => {
    expect(semanaDelResumen(bog(2026, 10, 13, 7))).toBeNull();
  });

  it('cruza el cambio de año sin perderse', () => {
    expect(semanaDelResumen(bog(2027, 1, 4, 7))).toEqual({
      desde: '2026-12-28', hasta: '2027-01-03',
      anterior: { desde: '2026-12-21', hasta: '2026-12-27' },
    });
  });
});
