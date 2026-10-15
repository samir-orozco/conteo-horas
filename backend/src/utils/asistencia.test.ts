import { describe, it, expect } from 'vitest';
import { estadoDeAsistencia, asistenciaPorDia, type PersonaParaAsistencia } from './asistencia';

// QUIÉN DEBÍA VENIR Y QUIÉN LLEGÓ (15 de octubre de 2026).
//
// Una sola regla para «Aún no han marcado entrada», la asistencia de la semana del Inicio y el aviso
// «no ha llegado» de Telegram. Decisión del dueño: la de los días esperados (lo que el horario o el
// planificador exigían ESE día), que ya era la de Telegram y la del reporte. El Inicio miraba el
// horario de hoy y no veía los turnos pintados ni los días libres de la programación.
//
// Las horas van en hora de Bogotá con instantes UTC explícitos (CLAUDE.md §8.1).

const bog = (d: number, h = 0, min = 0) => new Date(Date.UTC(2026, 9, d, h + 5, min, 0));
const turno = (horaEntrada = '08:00', toleranciaMin = 5) => ({ programado: true, horaEntrada, toleranciaMin });
const base = {
  dia: turno(), inicioDia: bog(14), llego: false, creadoEn: bog(1), festivo: false, novedades: [], ahora: bog(14, 10),
};

describe('estadoDeAsistencia', () => {
  it('sin turno ese día', () => {
    expect(estadoDeAsistencia({ ...base, dia: null })).toBe('SIN_TURNO');
    expect(estadoDeAsistencia({ ...base, dia: { programado: false, horaEntrada: null, toleranciaMin: 0 } })).toBe('SIN_TURNO');
  });

  it('en un festivo nadie debía venir, como en el reporte', () => {
    expect(estadoDeAsistencia({ ...base, festivo: true })).toBe('FESTIVO');
  });

  it('quien todavía no existía en el sistema cuando tenía que entrar no cuenta', () => {
    expect(estadoDeAsistencia({ ...base, creadoEn: bog(14, 9) })).toBe('NO_EXISTIA');
  });

  it('llegó', () => {
    expect(estadoDeAsistencia({ ...base, llego: true })).toBe('LLEGO');
  });

  it('si llegó, llegó: una novedad no lo saca de los que vinieron', () => {
    const novedad = { fechaInicio: bog(14), fechaFin: bog(14), horaInicio: null, horaFin: null };
    expect(estadoDeAsistencia({ ...base, llego: true, novedades: [novedad] })).toBe('LLEGO');
  });

  it('con una novedad de día completo no debía venir', () => {
    const novedad = { fechaInicio: bog(13), fechaFin: bog(16), horaInicio: null, horaFin: null };
    expect(estadoDeAsistencia({ ...base, novedades: [novedad] })).toBe('NOVEDAD');
  });

  it('una novedad de la tarde no excusa la mañana', () => {
    const novedad = { fechaInicio: bog(14), fechaFin: bog(14), horaInicio: '14:00', horaFin: '16:00' };
    expect(estadoDeAsistencia({ ...base, novedades: [novedad] })).toBe('FALTA');
  });

  it('todavía está en su tolerancia: no es falta', () => {
    expect(estadoDeAsistencia({ ...base, ahora: bog(14, 8, 5) })).toBe('EN_TIEMPO');
  });

  it('pasada la tolerancia sin marcar: falta', () => {
    expect(estadoDeAsistencia({ ...base, ahora: bog(14, 8, 6) })).toBe('FALTA');
  });

  it('un día que todavía no llega está en tiempo', () => {
    expect(estadoDeAsistencia({ ...base, inicioDia: bog(16) })).toBe('EN_TIEMPO');
  });
});

describe('asistenciaPorDia', () => {
  const claves = ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15'];
  const persona = (id: string, extra: Partial<PersonaParaAsistencia> = {}): PersonaParaAsistencia => ({
    id, creadoEn: bog(1),
    dias: new Map(claves.map(k => [k, turno()])),
    llegoEn: new Set<string>(),
    novedades: [],
    ...extra,
  });
  // Miércoles 14 a las 10 a. m.
  const ahora = bog(14, 10);

  it('cuenta, día por día, cuántos debían venir y cuántos llegaron', () => {
    const dias = asistenciaPorDia(claves, ahora, [
      persona('ana', { llegoEn: new Set(['2026-10-12', '2026-10-13', '2026-10-14']) }),
      persona('luis', { llegoEn: new Set(['2026-10-12']) }),
    ], new Set());
    expect(dias.map(d => [d.clave, d.debian, d.llegaron])).toEqual([
      ['2026-10-12', 2, 2], ['2026-10-13', 2, 1], ['2026-10-14', 2, 1], ['2026-10-15', 0, 0],
    ]);
  });

  it('hoy, quien entra más tarde no cuenta todavía como que debía: va aparte', () => {
    const tarde = persona('tarde', { dias: new Map(claves.map(k => [k, turno('14:00')])) });
    const [, , hoy] = asistenciaPorDia(claves, ahora, [tarde], new Set());
    expect(hoy).toMatchObject({ esHoy: true, debian: 0, enTiempo: 1 });
  });

  it('un día que todavía no llega es futuro y dice cuántos tienen turno', () => {
    const [, , , jueves] = asistenciaPorDia(claves, ahora, [persona('ana'), persona('luis')], new Set());
    expect(jueves).toMatchObject({ futuro: true, debian: 0, conTurno: 2 });
  });

  it('quien llegó sin deber venir no infla el número: va aparte', () => {
    const libre = persona('libre', { dias: new Map(), llegoEn: new Set(['2026-10-13']) });
    const [, martes] = asistenciaPorDia(claves, ahora, [libre], new Set());
    expect(martes).toMatchObject({ debian: 0, llegaron: 0, llegaronSinTurno: 1 });
  });

  it('el festivo lo dice, y nadie debía venir', () => {
    const [lunes] = asistenciaPorDia(claves, ahora, [persona('ana', { llegoEn: new Set(['2026-10-12']) })], new Set(['2026-10-12']));
    expect(lunes).toMatchObject({ festivo: true, debian: 0, llegaron: 0, llegaronSinTurno: 1 });
  });

  it('las novedades se cuentan aparte de los que debían', () => {
    const conVacaciones = persona('vac', { novedades: [{ fechaInicio: bog(12), fechaFin: bog(16), horaInicio: null, horaFin: null }] });
    const [lunes] = asistenciaPorDia(claves, ahora, [conVacaciones], new Set());
    expect(lunes).toMatchObject({ debian: 0, conNovedad: 1 });
  });

  it('la fecha viaja como la medianoche de Bogotá, nunca como texto suelto', () => {
    const [lunes] = asistenciaPorDia(claves, ahora, [], new Set());
    expect(lunes.fecha.toISOString()).toBe('2026-10-12T05:00:00.000Z');
  });
});
