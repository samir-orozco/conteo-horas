import { describe, it, expect } from 'vitest';
import { armarCierre, valoresIniciales } from './cierreDeTurno';

// Qué se le manda al servidor al cerrar un turno olvidado. Los instantes se dan en UTC explícito:
// el reloj de quien corre la prueba no pinta nada (CLAUDE.md §8.1).

// 16:42:54 en Bogotá (UTC-5).
const ENTRADA_REAL = '2026-10-07T21:42:54.404Z';
const base = { turnoEntrada: ENTRADA_REAL, fecha: '2026-10-07', entrada: '16:42', salida: '19:00' };

describe('valoresIniciales', () => {
  it('lee la fecha y la hora de la entrada en hora de Bogotá, sin segundos', () => {
    expect(valoresIniciales(ENTRADA_REAL)).toEqual({ fecha: '2026-10-07', entrada: '16:42', salida: '' });
  });

  it('una entrada de las 21:00 de Bogotá sigue siendo del mismo día aunque en UTC ya sea el siguiente', () => {
    expect(valoresIniciales('2026-10-08T02:00:00.000Z')).toMatchObject({ fecha: '2026-10-07', entrada: '21:00' });
  });
});

describe('armarCierre', () => {
  it('con fecha y entrada sin tocar manda solo la salida', () => {
    const r = armarCierre(base);
    expect(r).toEqual({
      ok: true,
      cuerpo: { salida: new Date('2026-10-08T00:00:00.000Z') },
      salidaDiaSiguiente: false,
    });
  });

  it('con la entrada corregida la manda, anclada a la medianoche de Bogotá', () => {
    const r = armarCierre({ ...base, entrada: '16:00' });
    expect(r).toEqual({
      ok: true,
      cuerpo: { entrada: new Date('2026-10-07T21:00:00.000Z'), salida: new Date('2026-10-08T00:00:00.000Z') },
      salidaDiaSiguiente: false,
    });
  });

  it('con la fecha cambiada también manda la entrada, porque la fecha la mueve', () => {
    const r = armarCierre({ ...base, fecha: '2026-10-06' });
    expect(r).toEqual({
      ok: true,
      cuerpo: { entrada: new Date('2026-10-06T21:42:00.000Z'), salida: new Date('2026-10-07T00:00:00.000Z') },
      salidaDiaSiguiente: false,
    });
  });

  it('una salida con hora menor que la entrada es del día siguiente', () => {
    const r = armarCierre({ ...base, salida: '07:00' });
    expect(r).toEqual({
      ok: true,
      cuerpo: { salida: new Date('2026-10-08T12:00:00.000Z') },
      salidaDiaSiguiente: true,
    });
  });

  it('un turno de las 22:00 a las 06:00 cierra al día siguiente', () => {
    const r = armarCierre({ turnoEntrada: '2026-10-08T03:00:00.000Z', fecha: '2026-10-07', entrada: '22:00', salida: '06:00' });
    expect(r).toMatchObject({ ok: true, salidaDiaSiguiente: true });
    if (r.ok) expect(r.cuerpo.salida).toEqual(new Date('2026-10-08T11:00:00.000Z'));
  });

  it('un minuto después de la entrada ya es el mismo día, aunque la entrada real traiga segundos', () => {
    const r = armarCierre({ ...base, salida: '16:43' });
    expect(r).toMatchObject({ ok: true, salidaDiaSiguiente: false });
    if (r.ok) expect(r.cuerpo.salida.getTime()).toBeGreaterThan(new Date(ENTRADA_REAL).getTime());
  });

  it('la misma hora que la entrada no es un turno', () => {
    expect(armarCierre({ ...base, salida: '16:42' })).toEqual({ ok: false, error: 'La salida debe ser posterior a la entrada.' });
  });

  it('sin salida pide la hora', () => {
    expect(armarCierre({ ...base, salida: '' })).toEqual({ ok: false, error: 'Indica la hora de salida.' });
  });

  it('con la fecha o la entrada vacías no arma instantes inválidos', () => {
    expect(armarCierre({ ...base, fecha: '' })).toEqual({ ok: false, error: 'Indica la fecha y la hora de entrada.' });
    expect(armarCierre({ ...base, entrada: '' })).toEqual({ ok: false, error: 'Indica la fecha y la hora de entrada.' });
  });
});
