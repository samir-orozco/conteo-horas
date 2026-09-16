import { describe, it, expect } from 'vitest';
import { novedadesDelPeriodo } from './novedadesDelPeriodo';

// Las novedades de una persona dentro del período del reporte de nómina (15 de septiembre de 2026).
//
// Cuenta días de calendario, no instantes: una novedad que empezó antes del período o que termina
// después solo aporta los días que caen dentro. Las de parte del día (una cita médica de 14:00 a
// 17:00) NO suman un día: van contadas aparte, porque en la nómina un día es un día completo y
// mandarlo como tal a un ERP pagaría de más.
//
// Si está remunerada o no lo dice la política de la empresa, la misma que usa el saldo de tiempo.

// Un instante dado en hora de Bogotá (UTC-5 todo el año).
const bog = (a: number, mes: number, d: number, h = 0) => new Date(Date.UTC(a, mes - 1, d, h + 5));

// Primera quincena de septiembre: del 1 al 15, con el corte en la medianoche del 16.
const DESDE = bog(2026, 9, 1);
const FIN = bog(2026, 9, 16);

const novedad = (tipo: string, ini: Date, fin: Date, horas?: { horaInicio: string; horaFin: string }) =>
  ({ tipo, fechaInicio: ini, fechaFin: fin, horaInicio: horas?.horaInicio ?? null, horaFin: horas?.horaFin ?? null });

// VACACIONES es remunerada por ley; PERSONAL solo si la empresa la marcó; NO_REMUNERADO nunca.
const POLITICA = new Set(['PERSONAL']);

describe('novedadesDelPeriodo', () => {
  it('sin novedades no devuelve filas', () => {
    expect(novedadesDelPeriodo([], DESDE, FIN, POLITICA)).toEqual([]);
  });

  it('una novedad de tres días dentro del período cuenta tres días', () => {
    const r = novedadesDelPeriodo([novedad('VACACIONES', bog(2026, 9, 7), bog(2026, 9, 9))], DESDE, FIN, POLITICA);
    expect(r).toEqual([{ tipo: 'VACACIONES', remunerado: true, dias: 3, parciales: 0 }]);
  });

  it('una de un solo día cuenta un día', () => {
    const r = novedadesDelPeriodo([novedad('INCAPACIDAD_EPS', bog(2026, 9, 3), bog(2026, 9, 3))], DESDE, FIN, POLITICA);
    expect(r[0]).toMatchObject({ tipo: 'INCAPACIDAD_EPS', dias: 1 });
  });

  it('la que viene de antes del período empieza a contar en el primer día del período', () => {
    const r = novedadesDelPeriodo([novedad('INCAPACIDAD_EPS', bog(2026, 8, 28), bog(2026, 9, 2))], DESDE, FIN, POLITICA);
    expect(r[0].dias).toBe(2);
  });

  it('la que sigue después del período cuenta hasta el último día', () => {
    const r = novedadesDelPeriodo([novedad('LICENCIA_MATERNIDAD', bog(2026, 9, 14), bog(2026, 10, 20))], DESDE, FIN, POLITICA);
    expect(r[0].dias).toBe(2);
  });

  it('la que no toca el período no aparece', () => {
    const r = novedadesDelPeriodo([novedad('VACACIONES', bog(2026, 8, 1), bog(2026, 8, 20))], DESDE, FIN, POLITICA);
    expect(r).toEqual([]);
  });

  it('varias del mismo tipo se suman en una sola fila', () => {
    const r = novedadesDelPeriodo([
      novedad('VACACIONES', bog(2026, 9, 2), bog(2026, 9, 3)),
      novedad('VACACIONES', bog(2026, 9, 10), bog(2026, 9, 10)),
    ], DESDE, FIN, POLITICA);
    expect(r).toEqual([{ tipo: 'VACACIONES', remunerado: true, dias: 3, parciales: 0 }]);
  });

  it('dos del mismo tipo que se pisan no cuentan dos veces el día compartido', () => {
    const r = novedadesDelPeriodo([
      novedad('VACACIONES', bog(2026, 9, 7), bog(2026, 9, 9)),
      novedad('VACACIONES', bog(2026, 9, 9), bog(2026, 9, 10)),
    ], DESDE, FIN, POLITICA);
    expect(r).toEqual([{ tipo: 'VACACIONES', remunerado: true, dias: 4, parciales: 0 }]);
  });

  it('la de parte del día no suma días: se cuenta aparte', () => {
    const r = novedadesDelPeriodo([
      novedad('MEDICO', bog(2026, 9, 4), bog(2026, 9, 4), { horaInicio: '14:00', horaFin: '17:00' }),
    ], DESDE, FIN, POLITICA);
    expect(r).toEqual([{ tipo: 'MEDICO', remunerado: false, dias: 0, parciales: 1 }]);
  });

  it('dice cuáles se pagan según la política de la empresa', () => {
    const r = novedadesDelPeriodo([
      novedad('PERSONAL', bog(2026, 9, 5), bog(2026, 9, 5)),
      novedad('NO_REMUNERADO', bog(2026, 9, 6), bog(2026, 9, 6)),
    ], DESDE, FIN, POLITICA);
    expect(r).toEqual([
      { tipo: 'NO_REMUNERADO', remunerado: false, dias: 1, parciales: 0 },
      { tipo: 'PERSONAL', remunerado: true, dias: 1, parciales: 0 },
    ]);
  });
});
