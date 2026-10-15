import { describe, it, expect } from 'vitest';
import { llegadasTardePorDia } from './llegadasTardePorDia';
import type { Tardanza } from './tardanzas';

// LAS LLEGADAS TARDE DE LOS ÚLTIMOS 7 DÍAS, DÍA POR DÍA, PARA EL INICIO (15 de octubre de 2026).
//
// Cada persona trae su detalle de `calcularTardanzas` (la regla del reporte, sin copias); aquí solo
// se reordena por día. Las fechas son claves de Bogotá ('YYYY-MM-DD'), así que la zona de la máquina
// no interviene.

const tarde = (fecha: string, horaLlegada: string, minutosTarde: number): Tardanza =>
  ({ fecha, horaEsperada: '08:00', horaLlegada, minutosTarde, toleranciaMin: 5 });
const CLAVES = ['2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15'];

describe('llegadasTardePorDia', () => {
  it('devuelve siempre los 7 días en orden, también los que no tienen a nadie', () => {
    const dias = llegadasTardePorDia(CLAVES, []);
    expect(dias.map(d => d.clave)).toEqual(CLAVES);
    expect(dias.every(d => d.totalMinutos === 0 && d.personas.length === 0)).toBe(true);
  });

  it('junta a las personas de cada día y suma sus minutos', () => {
    const dias = llegadasTardePorDia(CLAVES, [
      { colaboradorId: 'ana', detalle: [tarde('2026-10-13', '08:20', 15), tarde('2026-10-15', '08:12', 7)] },
      { colaboradorId: 'luis', detalle: [tarde('2026-10-13', '08:45', 40)] },
    ]);
    const martes = dias.find(d => d.clave === '2026-10-13')!;
    expect(martes.totalMinutos).toBe(55);
    expect(dias.find(d => d.clave === '2026-10-15')!.personas).toEqual([{ id: 'ana', horaEsperada: '08:00', horaLlegada: '08:12', minutosTarde: 7 }]);
  });

  it('dentro del día, primero el que llegó más tarde', () => {
    const [, , , , martes] = llegadasTardePorDia(CLAVES, [
      { colaboradorId: 'ana', detalle: [tarde('2026-10-13', '08:20', 15)] },
      { colaboradorId: 'luis', detalle: [tarde('2026-10-13', '08:45', 40)] },
    ]);
    expect(martes.personas.map(p => p.id)).toEqual(['luis', 'ana']);
  });

  it('lo que cae fuera de los 7 días no entra', () => {
    const dias = llegadasTardePorDia(CLAVES, [{ colaboradorId: 'ana', detalle: [tarde('2026-10-08', '09:00', 55)] }]);
    expect(dias.reduce((s, d) => s + d.totalMinutos, 0)).toBe(0);
  });

  it('la suma de los 7 días es la misma que la del reporte para el mismo rango', () => {
    const filas = [
      { colaboradorId: 'ana', detalle: [tarde('2026-10-09', '08:30', 25), tarde('2026-10-14', '08:10', 5)] },
      { colaboradorId: 'luis', detalle: [tarde('2026-10-11', '09:00', 55)] },
    ];
    const totalDelReporte = filas.flatMap(f => f.detalle).reduce((s, t) => s + t.minutosTarde, 0);
    expect(llegadasTardePorDia(CLAVES, filas).reduce((s, d) => s + d.totalMinutos, 0)).toBe(totalDelReporte);
  });
});
