import { describe, it, expect } from 'vitest';
import { resumirAlmuerzoDelDia } from './jornada';

// El almuerzo no vive en un registro: vive en el HUECO entre dos. Un día con
// almuerzo son dos tramos —08:00-12:00 y 13:00-17:00— y lo que hay en medio es
// el almuerzo. Esta función lee ese hueco y dice qué pasó, para que la columna
// de Registros y el modal digan lo mismo y no puedan contradecirse.

const bog = (h: number, m = 0, dia = 5) => new Date(Date.UTC(2026, 7, dia, h + 5, m, 0));

const dia = (extra: Record<string, unknown> = {}) => ({
  fecha: bog(0),
  almuerzoMin: 60,
  almuerzoInicio: '12:00' as string | null,
  almuerzoFin: '13:00' as string | null,
  ...extra,
});

const reg = (
  entrada: Date | null,
  salida: Date | null,
  extra: { salidaAlmuerzo?: boolean; entradaEstimada?: boolean } = {},
) => ({
  entrada, salida,
  salidaAlmuerzo: extra.salidaAlmuerzo ?? false,
  entradaEstimada: extra.entradaEstimada ?? false,
});

describe('resumirAlmuerzoDelDia — sin ventana', () => {
  it('el día sin ventana no tiene nada que contar', () => {
    const r = resumirAlmuerzoDelDia([reg(bog(8), bog(17))], dia({ almuerzoInicio: null, almuerzoFin: null }));
    expect(r.estado).toBe('SIN_VENTANA');
    expect(r.ventana).toBeNull();
  });

  it('aun sin ventana informa lo que se descuenta, que son los minutos fijos', () => {
    // Es el histórico entero: hay descuento, pero no hay hora que mostrar.
    const r = resumirAlmuerzoDelDia([reg(bog(8), bog(17))], dia({ almuerzoInicio: null, almuerzoFin: null }));
    expect(r.minutosDescontados).toBe(60);
  });
});

describe('resumirAlmuerzoDelDia — con ventana', () => {
  it('lo marcó completo: sale la hora real, no la programada', () => {
    const r = resumirAlmuerzoDelDia(
      [reg(bog(8), bog(12), { salidaAlmuerzo: true }), reg(bog(13), bog(17))],
      dia(),
    );
    expect(r.estado).toBe('MARCADO');
    expect(r.salida).toEqual(bog(12));
    expect(r.regreso).toEqual(bog(13));
    expect(r.minutos).toBe(60);
    expect(r.seExcedio).toBe(false);
    expect(r.regresoEstimado).toBe(false);
    // No se le descuenta de nuevo: el hueco ya quedó fuera de lo trabajado.
    expect(r.minutosDescontados).toBe(0);
  });

  it('almorzó 20 minutos: se ve lo que tomó, y lo que se descuenta sigue siendo la ventana', () => {
    const r = resumirAlmuerzoDelDia(
      [reg(bog(8), bog(12), { salidaAlmuerzo: true }), reg(bog(12, 20), bog(17))],
      dia(),
    );
    expect(r.minutos).toBe(20);
    expect(r.seExcedio).toBe(false);
    // Estuvo marcado de 12:20 a 13:00: esos 40 se descuentan igual.
    expect(r.minutosDescontados).toBe(40);
  });

  it('se le pasó la hora: se marca como excedido', () => {
    const r = resumirAlmuerzoDelDia(
      [reg(bog(8), bog(12), { salidaAlmuerzo: true }), reg(bog(13, 25), bog(17))],
      dia(),
    );
    expect(r.minutos).toBe(85);
    expect(r.seExcedio).toBe(true);
  });

  it('el regreso lo puso el sistema: eso tiene que constar', () => {
    const r = resumirAlmuerzoDelDia(
      [reg(bog(8), bog(12), { salidaAlmuerzo: true }), reg(bog(13), bog(17), { entradaEstimada: true })],
      dia(),
    );
    expect(r.estado).toBe('MARCADO');
    expect(r.regresoEstimado).toBe(true);
  });

  it('salió a almorzar y no volvió: queda abierto, sin inventar un regreso', () => {
    const r = resumirAlmuerzoDelDia([reg(bog(8), bog(12), { salidaAlmuerzo: true })], dia());
    expect(r.estado).toBe('ABIERTO');
    expect(r.salida).toEqual(bog(12));
    expect(r.regreso).toBeNull();
    expect(r.minutos).toBeNull();
  });

  it('nadie marcó el almuerzo: se descuenta la ventana entera', () => {
    const r = resumirAlmuerzoDelDia([reg(bog(8), bog(17))], dia());
    expect(r.estado).toBe('NO_MARCADO');
    expect(r.salida).toBeNull();
    expect(r.minutosDescontados).toBe(60);
  });

  it('se fue temprano y nunca llegó a la ventana: no marcó, pero tampoco paga', () => {
    const r = resumirAlmuerzoDelDia([reg(bog(8), bog(10))], dia());
    expect(r.estado).toBe('NO_MARCADO');
    expect(r.minutosDescontados).toBe(0);
  });

  it('un día sin marcaciones no descuenta nada', () => {
    const r = resumirAlmuerzoDelDia([], dia());
    expect(r.estado).toBe('NO_MARCADO');
    expect(r.minutosDescontados).toBe(0);
  });
});

describe('resumirAlmuerzoDelDia — casos que podrían confundirla', () => {
  it('los tramos abiertos no cuentan como regreso ni rompen el cálculo', () => {
    // El segundo tramo aún no tiene salida (la persona está adentro).
    const r = resumirAlmuerzoDelDia(
      [reg(bog(8), bog(12), { salidaAlmuerzo: true }), reg(bog(13), null)],
      dia(),
    );
    expect(r.estado).toBe('MARCADO');
    expect(r.regreso).toEqual(bog(13));
    expect(r.minutos).toBe(60);
  });

  it('el regreso es el primer tramo posterior, no cualquiera', () => {
    const r = resumirAlmuerzoDelDia(
      [
        reg(bog(8), bog(12), { salidaAlmuerzo: true }),
        reg(bog(13), bog(15)),
        reg(bog(15, 30), bog(17)),
      ],
      dia(),
    );
    expect(r.regreso).toEqual(bog(13));
  });

  it('no depende del orden en que lleguen los registros', () => {
    const r = resumirAlmuerzoDelDia(
      [reg(bog(13), bog(17)), reg(bog(8), bog(12), { salidaAlmuerzo: true })],
      dia(),
    );
    expect(r.salida).toEqual(bog(12));
    expect(r.regreso).toEqual(bog(13));
  });

  it('turno nocturno: el almuerzo de la madrugada es del día en que entró', () => {
    // Turno 21:00 → 05:00 con almuerzo de 01:00 a 01:30.
    const d = dia({ almuerzoInicio: '01:00', almuerzoFin: '01:30', almuerzoMin: 30 });
    const r = resumirAlmuerzoDelDia(
      [
        reg(bog(21), bog(1, 0, 6), { salidaAlmuerzo: true }),
        reg(bog(1, 30, 6), bog(5, 0, 6)),
      ],
      d,
    );
    expect(r.estado).toBe('MARCADO');
    expect(r.minutos).toBe(30);
    expect(r.seExcedio).toBe(false);
  });
});
