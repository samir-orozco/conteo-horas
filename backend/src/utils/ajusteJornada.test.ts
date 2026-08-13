import { describe, it, expect } from 'vitest';
import { ajustarAJornada } from './ajusteJornada';

// Tolerancia de salida: si alguien se queda unos minutos de más SIN orden previa,
// esos minutos no se pagan como extra — se toma la hora de salida que tenía
// programada. Pasado el umbral, el tiempo cuenta completo, porque ahí ya se
// entiende que trabajó de verdad.
//
// La hora programada sale de la fila del día (`DiaEsperado`), no del horario
// vigente: cambiar el horario hoy no puede mover lo que se pagó en junio.

const bog = (fecha: string, hora: number, min = 0) => {
  const [a, m, d] = fecha.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d, hora + 5, min, 0));
};

// Día materializado de apoyo: 08:00–16:00 programado.
const dia = (extra: Partial<Parameters<typeof ajustarAJornada>[2]> = {}) => ({
  fecha: bog('2026-08-05', 0),
  programado: true,
  horaEntrada: '08:00',
  horaSalida: '16:00',
  toleranciaSalidaMin: 15,
  ajustaEntrada: false,
  ...extra,
});

describe('ajustarAJornada — salida', () => {
  it('quedarse 10 min con tolerancia de 15 se recorta a la hora programada', () => {
    const r = ajustarAJornada(bog('2026-08-05', 8), bog('2026-08-05', 16, 10), dia());
    expect(r.salida).toEqual(bog('2026-08-05', 16));
    expect(r.ajustada).toBe(true);
  });

  it('justo en el umbral todavía se recorta', () => {
    const r = ajustarAJornada(bog('2026-08-05', 8), bog('2026-08-05', 16, 15), dia());
    expect(r.salida).toEqual(bog('2026-08-05', 16));
  });

  it('pasado el umbral el tiempo cuenta completo', () => {
    const salida = bog('2026-08-05', 16, 20);
    const r = ajustarAJornada(bog('2026-08-05', 8), salida, dia());
    expect(r.salida).toEqual(salida);
    expect(r.ajustada).toBe(false);
  });

  it('salir ANTES de la hora programada no se toca', () => {
    // Irse temprano es lo contrario: eso sí es tiempo que no trabajó.
    const salida = bog('2026-08-05', 15, 30);
    const r = ajustarAJornada(bog('2026-08-05', 8), salida, dia());
    expect(r.salida).toEqual(salida);
  });

  it('sin tolerancia configurada (el valor por defecto) nunca se toca', () => {
    const salida = bog('2026-08-05', 16, 10);
    const r = ajustarAJornada(bog('2026-08-05', 8), salida, dia({ toleranciaSalidaMin: 0 }));
    expect(r.salida).toEqual(salida);
  });

  it('un día no programado no se toca', () => {
    const salida = bog('2026-08-05', 16, 10);
    const r = ajustarAJornada(bog('2026-08-05', 8), salida, dia({ programado: false, horaSalida: null }));
    expect(r.salida).toEqual(salida);
  });

  it('un turno que cruza medianoche compara contra el día siguiente', () => {
    // 21:00–05:00: la salida programada es a las 05:00 del día siguiente.
    const d = dia({ horaEntrada: '21:00', horaSalida: '05:00' });
    const r = ajustarAJornada(bog('2026-08-05', 21), bog('2026-08-06', 5, 10), d);
    expect(r.salida).toEqual(bog('2026-08-06', 5));
    expect(r.ajustada).toBe(true);
  });
});

describe('ajustarAJornada — entrada', () => {
  it('con la casilla apagada, llegar temprano no se toca', () => {
    const entrada = bog('2026-08-05', 7, 50);
    const r = ajustarAJornada(entrada, bog('2026-08-05', 16), dia());
    expect(r.entrada).toEqual(entrada);
  });

  it('con la casilla encendida, llegar 10 min antes se recorta a la hora programada', () => {
    const r = ajustarAJornada(bog('2026-08-05', 7, 50), bog('2026-08-05', 16), dia({ ajustaEntrada: true }));
    expect(r.entrada).toEqual(bog('2026-08-05', 8));
    expect(r.ajustada).toBe(true);
  });

  it('llegar mucho antes del umbral cuenta completo', () => {
    const entrada = bog('2026-08-05', 7, 30);
    const r = ajustarAJornada(entrada, bog('2026-08-05', 16), dia({ ajustaEntrada: true }));
    expect(r.entrada).toEqual(entrada);
  });

  it('llegar TARDE nunca se recorta: se cuenta desde que llegó', () => {
    const entrada = bog('2026-08-05', 8, 10);
    const r = ajustarAJornada(entrada, bog('2026-08-05', 16), dia({ ajustaEntrada: true }));
    expect(r.entrada).toEqual(entrada);
  });
});

describe('ajustarAJornada — no inventa jornadas', () => {
  it('el ajuste nunca deja la salida antes de la entrada', () => {
    // Entró tardísimo y salió a los 5 minutos, dentro de la tolerancia de salida.
    const entrada = bog('2026-08-05', 16, 5);
    const salida = bog('2026-08-05', 16, 10);
    const r = ajustarAJornada(entrada, salida, dia());
    expect(r.salida.getTime()).toBeGreaterThanOrEqual(r.entrada.getTime());
    expect(r.salida).toEqual(salida); // se deja tal cual: recortar daría negativo
  });
});
