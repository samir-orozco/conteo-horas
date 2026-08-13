import { describe, it, expect } from 'vitest';
import { calcularDiasEsperados, combinarDiasEsperados } from './diasEsperados';
import { rangoReporte } from './fechas';

// El día esperado se materializa: por cada colaborador y día se guarda lo que su
// horario exigía ESE día. Así, editar el horario después ya no reescribe el pasado.
//
// Lo que esta función NO hace, a propósito:
//  - No aplica festivos: son ley nacional y viven en su propia tabla, se resuelven al leer.
//  - No aplica el tope semanal legal: depende de la jornada vigente por fecha.
//  - No aplica permisos: se resuelven al calcular el saldo.
// Aquí solo se responde "¿qué pedía el horario este día?".

const HORARIO: any = {
  activo: true, toleranciaMin: 3, almuerzoMin: 60,
  franjas: [
    { dias: ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'], horaEntrada: '08:00', horaSalida: '17:00', tieneAlmuerzo: true },
    { dias: ['SABADO'], horaEntrada: '08:00', horaSalida: '12:00', tieneAlmuerzo: false },
  ],
};

const dias = (desde: string, hasta: string, horario: any = HORARIO) => {
  const { desdeF, finExclusivo } = rangoReporte(desde, hasta);
  return calcularDiasEsperados(desdeF, finExclusivo, horario);
};

describe('calcularDiasEsperados', () => {
  it('genera una fila por cada día del rango, trabajado o no', () => {
    expect(dias('2026-07-01', '2026-07-31')).toHaveLength(31);
  });

  it('ancla la fecha a la medianoche de Bogotá', () => {
    const [primero] = dias('2026-07-01', '2026-07-01');
    expect(primero.fecha.toISOString()).toBe('2026-07-01T05:00:00.000Z');
  });

  it('un día laborable queda programado, con sus horas', () => {
    // 1 de julio de 2026 es miércoles.
    const [d] = dias('2026-07-01', '2026-07-01');
    expect(d.programado).toBe(true);
    expect(d.horaEntrada).toBe('08:00');
    expect(d.horaSalida).toBe('17:00');
    expect(d.toleranciaMin).toBe(3);
  });

  it('descuenta el almuerzo cuando la franja lo aplica', () => {
    const [miercoles] = dias('2026-07-01', '2026-07-01');
    expect(miercoles.minutosEsperados).toBe(480); // 9h de franja − 1h de almuerzo
    expect(miercoles.almuerzoMin).toBe(60);
  });

  it('no descuenta almuerzo en una franja que no lo aplica', () => {
    // 4 de julio de 2026 es sábado: 08:00–12:00 y tieneAlmuerzo = false.
    const [sabado] = dias('2026-07-04', '2026-07-04');
    expect(sabado.minutosEsperados).toBe(240);
    expect(sabado.almuerzoMin).toBe(0);
  });

  it('un día sin franja queda como no programado y sin horas', () => {
    // 5 de julio de 2026 es domingo y el horario no lo cubre.
    const [domingo] = dias('2026-07-05', '2026-07-05');
    expect(domingo.programado).toBe(false);
    expect(domingo.minutosEsperados).toBe(0);
    expect(domingo.horaEntrada).toBeNull();
  });

  it('sin horario asignado no exige nada, pero deja constancia del día', () => {
    const r = dias('2026-07-01', '2026-07-02', null);
    expect(r).toHaveLength(2);
    expect(r.every(d => !d.programado && d.minutosEsperados === 0)).toBe(true);
  });

  it('un horario inactivo se trata como si no hubiera horario', () => {
    const r = dias('2026-07-01', '2026-07-01', { ...HORARIO, activo: false });
    expect(r[0].programado).toBe(false);
  });

  it('soporta franjas que cruzan medianoche', () => {
    const nocturno = {
      activo: true, toleranciaMin: 5, almuerzoMin: 0,
      franjas: [{ dias: ['MIERCOLES'], horaEntrada: '21:00', horaSalida: '05:00', tieneAlmuerzo: false }],
    };
    const [d] = dias('2026-07-01', '2026-07-01', nocturno);
    expect(d.minutosEsperados).toBe(480);
  });

  it('el almuerzo nunca deja la jornada en negativo', () => {
    const corto = {
      activo: true, toleranciaMin: 0, almuerzoMin: 120,
      franjas: [{ dias: ['MIERCOLES'], horaEntrada: '08:00', horaSalida: '09:00', tieneAlmuerzo: true }],
    };
    const [d] = dias('2026-07-01', '2026-07-01', corto);
    expect(d.minutosEsperados).toBe(0);
  });

  it('los días salen en orden y sin repetirse', () => {
    const r = dias('2026-07-01', '2026-07-05');
    const claves = r.map(d => d.fecha.toISOString());
    expect(claves).toEqual([...claves].sort());
    expect(new Set(claves).size).toBe(claves.length);
  });
});

// El backfill no ha corrido para todo el mundo, y hay colaboradores anteriores a
// la función. Para esos días no hay fila y hay que caer al horario actual: es lo
// que el sistema hacía siempre, así que nadie ve un cambio. Donde SÍ hay fila,
// manda la fila, que es de lo que se trata.
describe('combinarDiasEsperados', () => {
  const combinar = (desde: string, hasta: string, materializados: any[], horario: any = HORARIO) => {
    const { desdeF, finExclusivo } = rangoReporte(desde, hasta);
    return combinarDiasEsperados(desdeF, finExclusivo, materializados, horario);
  };

  it('sin filas materializadas cae al horario actual, día por día', () => {
    const r = combinar('2026-07-01', '2026-07-03', []);
    expect(r).toHaveLength(3);
    expect(r.every(d => d.programado && d.minutosEsperados === 480)).toBe(true);
  });

  it('la fila materializada manda sobre el horario', () => {
    const congelado = {
      fecha: new Date('2026-07-01T05:00:00.000Z'),
      programado: true, horaEntrada: '06:00', horaSalida: '10:00',
      toleranciaMin: 0, almuerzoMin: 0, minutosEsperados: 240,
    };
    const [d] = combinar('2026-07-01', '2026-07-01', [congelado]);
    expect(d.minutosEsperados).toBe(240);
    expect(d.horaEntrada).toBe('06:00');
  });

  it('mezcla: los días con fila quedan congelados y el resto sigue el horario', () => {
    const congelado = {
      fecha: new Date('2026-07-02T05:00:00.000Z'),
      programado: false, horaEntrada: null, horaSalida: null,
      toleranciaMin: 0, almuerzoMin: 0, minutosEsperados: 0,
    };
    const r = combinar('2026-07-01', '2026-07-03', [congelado]);
    expect(r.map(d => d.minutosEsperados)).toEqual([480, 0, 480]);
  });

  it('empareja por día calendario de Bogotá, no por instante exacto', () => {
    // MySQL puede devolver la fecha con segundos o milisegundos; sigue siendo el
    // mismo día y no puede quedar huérfana.
    const congelado = {
      fecha: new Date('2026-07-01T05:00:00.123Z'),
      programado: true, horaEntrada: '06:00', horaSalida: '10:00',
      toleranciaMin: 0, almuerzoMin: 0, minutosEsperados: 240,
    };
    const [d] = combinar('2026-07-01', '2026-07-01', [congelado]);
    expect(d.minutosEsperados).toBe(240);
  });

  it('descarta las filas que caen fuera del rango', () => {
    const fuera = {
      fecha: new Date('2026-08-01T05:00:00.000Z'),
      programado: true, horaEntrada: '06:00', horaSalida: '10:00',
      toleranciaMin: 0, almuerzoMin: 0, minutosEsperados: 240,
    };
    const r = combinar('2026-07-01', '2026-07-01', [fuera]);
    expect(r).toHaveLength(1);
    expect(r[0].minutosEsperados).toBe(480);
  });

  it('sin horario y sin filas, deja constancia del día pero no exige nada', () => {
    const r = combinar('2026-07-01', '2026-07-02', [], null);
    expect(r).toHaveLength(2);
    expect(r.every(d => !d.programado && d.minutosEsperados === 0)).toBe(true);
  });
});
