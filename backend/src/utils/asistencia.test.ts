import { describe, it, expect } from 'vitest';
import { estadoDeAsistencia, asistenciaPorDia, huecosDelVinculo, type PersonaParaAsistencia } from './asistencia';

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

  // Revisión adversarial (15 de octubre de 2026): dado de alta a las 9 y marcando a las 9:30, la barra lo contaba
  // «sin turno» mientras la tarjeta de llegadas tarde y el reporte le ponían 85 minutos tarde. Si marcó, llegó.
  it('quien llega el día de su alta, después de su hora, cuenta como llegó, igual que en las llegadas tarde', () => {
    expect(estadoDeAsistencia({ ...base, creadoEn: bog(14, 9), llego: true })).toBe('LLEGO');
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

// LOS HUECOS DEL VÍNCULO (15 de octubre de 2026, revisiones adversariales). Quien se retiró y volvió no debía venir
// mientras estuvo retirado, pero sí antes de retirarse. El retiro es el último día trabajado (se puede entrar y salir
// el mismo día, utils/vinculacion.ts), así que el hueco empieza la medianoche siguiente; y termina cuando se REGISTRÓ
// el reingreso, nunca antes de su fecha: reingresado a las 10 de la mañana, el turno de las 8 ya había pasado.
describe('huecosDelVinculo', () => {
  const ev = (tipo: 'INGRESO' | 'RETIRO' | 'REINGRESO', fecha: Date, creadoEn: Date = fecha) => ({ tipo, fecha, creadoEn });

  it('sin retiros no hay huecos', () => {
    expect(huecosDelVinculo([ev('INGRESO', bog(1))])).toEqual([]);
  });

  it('del día siguiente al retiro hasta que se registró el reingreso', () => {
    expect(huecosDelVinculo([ev('RETIRO', bog(9)), ev('REINGRESO', bog(14), bog(14, 10))])).toEqual([[bog(10), bog(14, 10)]]);
  });

  it('un reingreso registrado antes de su fecha cuenta desde su fecha', () => {
    expect(huecosDelVinculo([ev('RETIRO', bog(9)), ev('REINGRESO', bog(14), bog(12, 8))])).toEqual([[bog(10), bog(14)]]);
  });

  it('retirado por error y reingresado el mismo día: no hay hueco', () => {
    expect(huecosDelVinculo([ev('RETIRO', bog(15), bog(15, 9)), ev('REINGRESO', bog(15), bog(15, 10))])).toEqual([]);
  });

  it('varios retiros, en el orden en que pasaron aunque lleguen desordenados', () => {
    expect(huecosDelVinculo([ev('REINGRESO', bog(14)), ev('RETIRO', bog(2)), ev('RETIRO', bog(11)), ev('REINGRESO', bog(5))]))
      .toEqual([[bog(3), bog(5)], [bog(12), bog(14)]]);
  });

  // El Inicio solo lee personas activas: si su último evento es un retiro, o es uno programado para más adelante o los
  // datos quedaron incoherentes (un reingreso que no se escribió). Un hueco abierto escondería sus faltas para siempre,
  // en silencio; mejor que se vean (verificación adversarial).
  it('un retiro sin reingreso, en una persona activa, no esconde nada', () => {
    expect(huecosDelVinculo([ev('RETIRO', bog(9))])).toEqual([]);
  });

  // La migración del historial solo sembró INGRESO: quien se retiró antes no tiene RETIRO. Si se le reingresa, estuvo
  // retirada hasta entonces (verificación adversarial).
  it('un reingreso sin retiro antes: retirada desde siempre hasta que se registró', () => {
    expect(huecosDelVinculo([ev('INGRESO', bog(1)), ev('REINGRESO', bog(15), bog(15, 10))])).toEqual([[new Date(0), bog(15, 10)]]);
  });

  // Solo el primer evento puede ser el reingreso de antes del historial. Un segundo reingreso seguido es un dato
  // incoherente, y no puede borrar todo lo de antes como si hubiera estado retirada desde siempre.
  it('dos reingresos seguidos: el segundo no borra lo de antes', () => {
    expect(huecosDelVinculo([ev('RETIRO', bog(2)), ev('REINGRESO', bog(5)), ev('REINGRESO', bog(14))])).toEqual([[bog(3), bog(5)]]);
  });

  // En el orden en que se registraron, no por su fecha: un retiro programado para el lunes 12 y deshecho el jueves 8
  // con un reingreso no deja hueco.
  it('un retiro programado y deshecho antes de su fecha no deja hueco', () => {
    expect(huecosDelVinculo([ev('RETIRO', bog(12), bog(8, 10)), ev('REINGRESO', bog(8), bog(8, 15))])).toEqual([]);
  });
});

describe('estadoDeAsistencia con los huecos del vínculo', () => {
  it('un turno dentro de un hueco es de cuando no estaba: no falta', () => {
    expect(estadoDeAsistencia({ ...base, huecos: [[bog(10), bog(14, 10)]] })).toBe('NO_EXISTIA');
  });

  it('antes de retirarse sí debía venir: la falta de antes del retiro sigue siendo falta', () => {
    expect(estadoDeAsistencia({ ...base, huecos: [[bog(16), bog(20)]] })).toBe('FALTA');
  });

  it('si marcó, llegó, aunque caiga en un hueco', () => {
    expect(estadoDeAsistencia({ ...base, llego: true, huecos: [[bog(10), bog(14, 10)]] })).toBe('LLEGO');
  });
});
