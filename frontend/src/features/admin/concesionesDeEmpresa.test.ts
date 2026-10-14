import { describe, it, expect } from 'vitest';
import { estadoDeFuncion, estadoEnElHistorial, ultimoDiaDe, diaMasDias, type Concesion } from './concesionesDeEmpresa';

// LAS FUNCIONES CON FECHA EN LA FICHA DE LA EMPRESA DEL SUPER ADMIN (14 de octubre de 2026, PENDIENTES nº 39,
// fase 2). Qué dice cada fila de la tabla. El servidor decide qué vale (utils/concesiones.ts); esto solo lo pinta.

// Un instante dado en hora de Bogotá (UTC-5 todo el año). Las pruebas del frontend corren en Los Ángeles.
const bog = (a: number, mes: number, d: number, h = 0) => new Date(Date.UTC(a, mes - 1, d, h + 5)).toISOString();

const concesion = (o: Partial<Concesion> = {}): Concesion => ({
  id: 'c1', funcion: 'clima', desde: bog(2026, 10, 1), hasta: bog(2026, 12, 15), origen: 'SUPER_ADMIN',
  otorgadaPorNombre: 'Samir', revocadaEn: null, creadoEn: bog(2026, 10, 1), ...o,
});
const AHORA = new Date(bog(2026, 10, 14, 10));

describe('estadoDeFuncion', () => {
  it('lo que trae el plan dice «incluida en su plan»', () => {
    expect(estadoDeFuncion('gps', { delPlan: true, extra: false }, [], AHORA)).toEqual({ tipo: 'PLAN' });
  });

  it('lo dado a la medida, para siempre, dice «extra»', () => {
    expect(estadoDeFuncion('turnos', { delPlan: false, extra: true }, [], AHORA)).toEqual({ tipo: 'EXTRA' });
  });

  it('con una concesión vigente dice hasta cuándo, y de quién', () => {
    const c = concesion();
    expect(estadoDeFuncion('clima', { delPlan: false, extra: false }, [c], AHORA)).toEqual({ tipo: 'CONCEDIDA', concesion: c });
  });

  it('una concesión vencida o quitada ya no cuenta: no la tiene', () => {
    expect(estadoDeFuncion('clima', { delPlan: false, extra: false }, [concesion({ hasta: bog(2026, 10, 10) })], AHORA)).toEqual({ tipo: 'NO' });
    expect(estadoDeFuncion('clima', { delPlan: false, extra: false }, [concesion({ revocadaEn: bog(2026, 10, 5) })], AHORA)).toEqual({ tipo: 'NO' });
  });

  it('la concesión de otra función no cuenta para esta', () => {
    expect(estadoDeFuncion('multiSede', { delPlan: false, extra: false }, [concesion()], AHORA)).toEqual({ tipo: 'NO' });
  });
});

describe('estadoEnElHistorial', () => {
  it('vigente, vencida o quitada', () => {
    expect(estadoEnElHistorial(concesion(), AHORA)).toBe('VIGENTE');
    expect(estadoEnElHistorial(concesion({ hasta: bog(2026, 10, 10) }), AHORA)).toBe('VENCIDA');
    expect(estadoEnElHistorial(concesion({ revocadaEn: bog(2026, 10, 5) }), AHORA)).toBe('QUITADA');
  });
});

describe('ultimoDiaDe', () => {
  // `hasta` es exclusivo (la medianoche de Bogotá siguiente): el último día es el anterior.
  it('es el día anterior al fin exclusivo, en Bogotá, aunque la máquina esté en otra zona', () => {
    expect(ultimoDiaDe(bog(2026, 12, 15))).toBe('2026-12-14');
    expect(ultimoDiaDe(bog(2027, 1, 1))).toBe('2026-12-31');
  });
});

describe('diaMasDias', () => {
  it('suma días a un «YYYY-MM-DD» sin pasar por la zona de la máquina', () => {
    expect(diaMasDias('2026-10-14', 30)).toBe('2026-11-13');
    expect(diaMasDias('2026-12-20', 30)).toBe('2027-01-19');
  });
});
