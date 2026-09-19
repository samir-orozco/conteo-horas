import { describe, it, expect } from 'vitest';
import { msHastaLaHoraBogota } from './programarDiario';

// A QUÉ HORA CORREN LOS TRABAJOS DIARIOS (19 de septiembre de 2026).
//
// Hasta hoy los cuatro barridos diarios se programaban con `setInterval(f, 24h)` desde el arranque,
// así que la hora a la que corrían era la hora del último despliegue. Es el defecto de la sección
// 8.3 del CLAUDE.md, el que dejó el auto-cierre sin cerrar durante dos semanas: un despliegue lo
// movió a las 22:12 y, como solo actúa sobre días pasados, nadie lo notó.
//
// Esta función es la decisión: cuánto falta para la próxima vez que den las N en Bogotá. Con ella
// el primer disparo se ancla al reloj y el `setInterval` de 24h que le sigue ya cae siempre a la
// misma hora, sin importar cuándo se reinició el servidor.
//
// Los instantes van en UTC explícito y nunca con `new Date(2026, 8, 19)`, que depende del reloj de
// quien corra la prueba (§8.1). Colombia es UTC-5 fijo, sin horario de verano.

// Un instante dado en hora de pared de Bogotá.
const bog = (a: number, mes: number, d: number, h: number, min = 0) =>
  new Date(Date.UTC(a, mes - 1, d, h + 5, min, 0));

const HORAS = 60 * 60 * 1000;

describe('msHastaLaHoraBogota', () => {
  it('si la hora todavía no llega hoy, espera hasta hoy', () => {
    // Es la 1 de la madrugada; las 3 son dentro de dos horas.
    expect(msHastaLaHoraBogota(bog(2026, 9, 19, 1), 3)).toBe(2 * HORAS);
  });

  it('si la hora ya pasó, espera hasta mañana', () => {
    // Son las 10 de la noche; las 3 de la madrugada son dentro de cinco horas.
    expect(msHastaLaHoraBogota(bog(2026, 9, 19, 22), 3)).toBe(5 * HORAS);
  });

  it('justo a la hora en punto espera un día entero, no cero', () => {
    // Cero dispararía dos veces seguidas: la llamada del arranque y el temporizador.
    expect(msHastaLaHoraBogota(bog(2026, 9, 19, 3), 3)).toBe(24 * HORAS);
  });

  it('un minuto antes de la hora espera ese minuto', () => {
    expect(msHastaLaHoraBogota(bog(2026, 9, 19, 2, 59), 3)).toBe(60 * 1000);
  });

  it('un minuto después de la hora espera casi un día', () => {
    expect(msHastaLaHoraBogota(bog(2026, 9, 19, 3, 1), 3)).toBe(24 * HORAS - 60 * 1000);
  });

  // El caso que rompe cualquier cuenta hecha en UTC: entre las 7 p.m. y la medianoche de Bogotá,
  // la fecha UTC ya es la del día siguiente. Una implementación que use `getUTCDate` para saber
  // "qué día es hoy" se salta un disparo justo aquí.
  it('a las 8 de la noche, cuando en UTC ya es mañana, sigue apuntando a la madrugada siguiente', () => {
    expect(msHastaLaHoraBogota(bog(2026, 9, 19, 20), 3)).toBe(7 * HORAS);
  });

  // LA PRUEBA QUE DISTINGUE EL ANCLA DE BOGOTÁ DE UNA CUENTA EN UTC.
  //
  // La de las 8 de la noche NO sirve para esto: a esa hora la fecha UTC ya es la del día
  // siguiente, y su medianoche más cinco horas cae en el mismo instante que la de Bogotá. Las dos
  // cuentas coinciden por casualidad y la mutación sobrevive.
  //
  // La franja que las separa es la madrugada de Bogotá, entre medianoche y las 5 a.m., cuando en
  // UTC todavía es el día ANTERIOR. Y es justo la franja por la que corren estos barridos.
  it('a las 2 de la madrugada de Bogotá faltan 60 minutos, no casi un día', () => {
    // En UTC son las 07:00 del mismo día, pero el día de Bogotá arrancó hace dos horas.
    // Una cuenta sobre la fecha UTC pondría el objetivo a las 08:00 UTC del día siguiente.
    expect(msHastaLaHoraBogota(bog(2026, 9, 19, 2), 3)).toBe(60 * 60 * 1000);
  });

  it('a las 00:30 de Bogotá faltan dos horas y media', () => {
    expect(msHastaLaHoraBogota(bog(2026, 9, 19, 0, 30), 3)).toBe(2.5 * HORAS);
  });

  it('sirve para cualquier hora, no solo las 3', () => {
    expect(msHastaLaHoraBogota(bog(2026, 9, 19, 10), 14)).toBe(4 * HORAS);
    expect(msHastaLaHoraBogota(bog(2026, 9, 19, 16), 14)).toBe(22 * HORAS);
  });

  it('el resultado nunca es cero ni negativo', () => {
    for (let h = 0; h < 24; h++) {
      const ms = msHastaLaHoraBogota(bog(2026, 9, 19, h, 30), 3);
      expect(ms).toBeGreaterThan(0);
      expect(ms).toBeLessThanOrEqual(24 * HORAS);
    }
  });
});
