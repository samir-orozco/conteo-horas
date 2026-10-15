import { describe, it, expect } from 'vitest';
import { fechaMinimaDeRetiro, retiroEsCoherente, desdeCuandoExiste } from './vinculacion';

// Fechas de calendario en la convención de Bogotá (medianoche = 05:00 UTC).
const f = (iso: string) => new Date(iso + 'T05:00:00.000Z');

describe('desde cuándo puede empezar un retiro', () => {
  it('sin historia, cualquier fecha vale', () => {
    expect(fechaMinimaDeRetiro([])).toBeNull();
  });

  it('no puede ser anterior al ingreso', () => {
    const eventos = [{ tipo: 'INGRESO' as const, fecha: f('2026-01-15') }];
    expect(fechaMinimaDeRetiro(eventos)).toEqual(f('2026-01-15'));
  });

  it('manda el ÚLTIMO reingreso, no el ingreso original', () => {
    // Quien entró en enero, salió en marzo y volvió en junio no puede tener un
    // retiro fechado en abril: en abril no trabajaba aquí.
    const eventos = [
      { tipo: 'INGRESO' as const, fecha: f('2026-01-15') },
      { tipo: 'RETIRO' as const, fecha: f('2026-03-30') },
      { tipo: 'REINGRESO' as const, fecha: f('2026-06-01') },
    ];
    expect(fechaMinimaDeRetiro(eventos)).toEqual(f('2026-06-01'));
  });

  it('el orden en que lleguen los eventos no cambia el resultado', () => {
    const desordenados = [
      { tipo: 'REINGRESO' as const, fecha: f('2026-06-01') },
      { tipo: 'INGRESO' as const, fecha: f('2026-01-15') },
      { tipo: 'RETIRO' as const, fecha: f('2026-03-30') },
    ];
    expect(fechaMinimaDeRetiro(desordenados)).toEqual(f('2026-06-01'));
  });

  it('los retiros no cuentan como inicio de vínculo', () => {
    const eventos = [
      { tipo: 'INGRESO' as const, fecha: f('2026-01-15') },
      { tipo: 'RETIRO' as const, fecha: f('2026-09-30') },
    ];
    expect(fechaMinimaDeRetiro(eventos)).toEqual(f('2026-01-15'));
  });
});

describe('si un retiro es coherente con la historia', () => {
  const historia = [
    { tipo: 'INGRESO' as const, fecha: f('2026-01-15') },
    { tipo: 'RETIRO' as const, fecha: f('2026-03-30') },
    { tipo: 'REINGRESO' as const, fecha: f('2026-06-01') },
  ];

  it('el mismo día del reingreso sí vale: se puede entrar y salir el mismo día', () => {
    expect(retiroEsCoherente(f('2026-06-01'), historia)).toBe(true);
  });

  it('después del reingreso vale', () => {
    expect(retiroEsCoherente(f('2026-08-24'), historia)).toBe(true);
  });

  it('antes del reingreso NO vale, aunque caiga dentro del vínculo anterior', () => {
    expect(retiroEsCoherente(f('2026-05-31'), historia)).toBe(false);
    expect(retiroEsCoherente(f('2026-02-10'), historia)).toBe(false);
  });

  it('sin historia, cualquier fecha vale', () => {
    expect(retiroEsCoherente(f('2020-01-01'), [])).toBe(true);
  });
});

// DESDE CUÁNDO EXISTE PARA EL SALDO (15 de octubre de 2026, verificación adversarial). Los días de antes de que la
// persona existiera no gastan el tope de la semana partida. Un reingreso conserva el `creadoEn` original, y los días
// del hueco siguen programados: sin mirar el reingreso, gastaban tope y perdonaban faltas reales después del corte.
// El reingreso cuenta desde que se registró, nunca antes de su fecha, y solo si ya había pasado al cierre del período.
describe('desdeCuandoExiste', () => {
  const t = (iso: string) => new Date(iso);
  const creadoEn = t('2025-03-10T14:00:00.000Z');
  const reingreso = (fecha: string, creado: string) => ({ fecha: f(fecha), creadoEn: t(creado) });

  it('sin reingresos, desde que se creó', () => {
    expect(desdeCuandoExiste(creadoEn, [], f('2026-10-16'))).toEqual(creadoEn);
  });

  it('con un reingreso, desde que se registró', () => {
    expect(desdeCuandoExiste(creadoEn, [reingreso('2026-09-30', '2026-09-30T14:00:00.000Z')], f('2026-10-16'))).toEqual(t('2026-09-30T14:00:00.000Z'));
  });

  it('registrado antes de su fecha, desde su fecha; con varios, el último', () => {
    expect(desdeCuandoExiste(creadoEn, [reingreso('2026-09-30', '2026-09-25T14:00:00.000Z'), reingreso('2026-05-01', '2026-05-01T14:00:00.000Z')], f('2026-10-16')))
      .toEqual(f('2026-09-30'));
  });

  it('un reingreso posterior al período no cuenta: en ese período estaba vinculada desde antes', () => {
    expect(desdeCuandoExiste(creadoEn, [reingreso('2026-10-20', '2026-10-20T14:00:00.000Z')], f('2026-10-16'))).toEqual(creadoEn);
  });
});
