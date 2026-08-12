import { describe, it, expect } from 'vitest';
import {
  calcularHorasTrabajadas, calcularLiquidacion, descontarAlmuerzo,
  calcularValorHora, CODIGOS_EXTRA, type TipoHoraCalculo,
} from './horasColombiana';

// Recargos colombianos vigentes en 2026. La franja diurna es 06:00–21:00.
const TIPOS = [
  { codigo: 'HOD', nombre: 'Hora Ordinaria Diurna', horaInicio: 6, horaFin: 21, recargo: 1.0 },
  { codigo: 'HON', nombre: 'Hora Ordinaria Nocturna', horaInicio: 6, horaFin: 21, recargo: 1.35 },
  { codigo: 'HED', nombre: 'Hora Extra Diurna', horaInicio: 6, horaFin: 21, recargo: 1.25 },
  { codigo: 'HEN', nombre: 'Hora Extra Nocturna', horaInicio: 6, horaFin: 21, recargo: 1.75 },
  { codigo: 'HDD', nombre: 'Hora Dominical/Festiva Diurna', horaInicio: 6, horaFin: 21, recargo: 1.9 },
  { codigo: 'HND', nombre: 'Hora Dominical/Festiva Nocturna', horaInicio: 6, horaFin: 21, recargo: 2.25 },
  { codigo: 'HEDD', nombre: 'Extra Dominical Diurna', horaInicio: 6, horaFin: 21, recargo: 2.15 },
  { codigo: 'HEND', nombre: 'Extra Dominical Nocturna', horaInicio: 6, horaFin: 21, recargo: 2.65 },
];

// Instante UTC a partir de una hora de pared de Bogotá (UTC-5 fijo).
// Se usa Date.UTC y no una cadena ISO porque a partir de las 19:00 la hora + 5
// pasa de 24 y habría que acarrear el día a mano; Date.UTC lo hace solo.
const bog = (fecha: string, hora: number, min = 0) => {
  const [a, m, d] = fecha.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d, hora + 5, min, 0));
};

const minutosDe = (r: TipoHoraCalculo[], codigo: string) =>
  r.find(t => t.codigo === codigo)?.minutos ?? 0;

describe('calcularHorasTrabajadas — clasificación', () => {
  it('una jornada diurna de lunes es toda HOD', () => {
    // 6 de julio de 2026 es lunes.
    const { resultado, minutosOrdinariosTrabajados } = calcularHorasTrabajadas(
      bog('2026-07-06', 8), bog('2026-07-06', 16), [], TIPOS, 42,
    );
    expect(minutosDe(resultado, 'HOD')).toBe(480);
    expect(minutosOrdinariosTrabajados).toBe(480);
  });

  it('separa la parte nocturna a partir de las 21:00', () => {
    const { resultado } = calcularHorasTrabajadas(
      bog('2026-07-06', 19), bog('2026-07-06', 23), [], TIPOS, 42,
    );
    expect(minutosDe(resultado, 'HOD')).toBe(120); // 19:00–21:00
    expect(minutosDe(resultado, 'HON')).toBe(120); // 21:00–23:00
  });

  it('un domingo se liquida como dominical, no como ordinario', () => {
    // 5 de julio de 2026 es domingo.
    const { resultado, minutosOrdinariosTrabajados } = calcularHorasTrabajadas(
      bog('2026-07-05', 8), bog('2026-07-05', 16), [], TIPOS, 42,
    );
    expect(minutosDe(resultado, 'HDD')).toBe(480);
    expect(minutosDe(resultado, 'HOD')).toBe(0);
    // El domingo no cuenta contra el tope de la jornada ordinaria semanal.
    expect(minutosOrdinariosTrabajados).toBe(0);
  });

  it('un festivo se liquida igual que un domingo', () => {
    const festivo = bog('2026-07-06', 0);
    const { resultado } = calcularHorasTrabajadas(
      bog('2026-07-06', 8), bog('2026-07-06', 16), [festivo], TIPOS, 42,
    );
    expect(minutosDe(resultado, 'HDD')).toBe(480);
  });

  it('lo que pasa del tope semanal se vuelve hora extra', () => {
    // Ya lleva 41h de la semana; trabaja 4h más → 1h ordinaria + 3h extra.
    const { resultado } = calcularHorasTrabajadas(
      bog('2026-07-06', 8), bog('2026-07-06', 12), [], TIPOS, 42, 41 * 60,
    );
    expect(minutosDe(resultado, 'HOD')).toBe(60);
    expect(minutosDe(resultado, 'HED')).toBe(180);
  });

  it('en modo HORARIO, lo trabajado fuera de la franja es extra aunque no pase el tope', () => {
    const extra = {
      modo: 'HORARIO' as const,
      franjaPorDia: { 1: { ini: 8 * 60, fin: 16 * 60 } }, // lunes 08:00–16:00
      toleranciaMin: 0,
    };
    const { resultado } = calcularHorasTrabajadas(
      bog('2026-07-06', 8), bog('2026-07-06', 18), [], TIPOS, 42, 0, extra,
    );
    expect(minutosDe(resultado, 'HOD')).toBe(480); // dentro de la franja
    expect(minutosDe(resultado, 'HED')).toBe(120); // 16:00–18:00 fuera
  });

  it('un turno que cruza medianoche se reparte entre los dos días', () => {
    const { resultado } = calcularHorasTrabajadas(
      bog('2026-07-06', 22), bog('2026-07-07', 2), [], TIPOS, 42,
    );
    expect(minutosDe(resultado, 'HON')).toBe(240); // todo nocturno
  });
});

describe('descontarAlmuerzo', () => {
  it('descuenta del HOD', () => {
    const r: TipoHoraCalculo[] = [{ codigo: 'HOD', nombre: 'x', recargo: 1, minutos: 480 }];
    const { descontado } = descontarAlmuerzo(r, 60);
    expect(descontado).toBe(60);
    expect(r[0].minutos).toBe(420);
  });

  it('no descuenta más de lo trabajado', () => {
    const r: TipoHoraCalculo[] = [{ codigo: 'HOD', nombre: 'x', recargo: 1, minutos: 30 }];
    const { descontado } = descontarAlmuerzo(r, 60);
    expect(descontado).toBe(30);
    expect(r[0].minutos).toBe(0);
  });

  it('con almuerzo en cero no hace nada', () => {
    const r: TipoHoraCalculo[] = [{ codigo: 'HOD', nombre: 'x', recargo: 1, minutos: 480 }];
    expect(descontarAlmuerzo(r, 0).descontado).toBe(0);
    expect(r[0].minutos).toBe(480);
  });

  // BUG CONOCIDO, sin corregir todavía: solo mira el código HOD. Un turno 100%
  // nocturno (HON) o dominical (HDD) NO pierde el almuerzo, así que se paga una
  // hora que no se trabajó. Afecta a empresas de vigilancia y salud.
  it.fails('debería descontar el almuerzo también en un turno 100% nocturno', () => {
    const r: TipoHoraCalculo[] = [{ codigo: 'HON', nombre: 'x', recargo: 1.35, minutos: 480 }];
    const { descontado } = descontarAlmuerzo(r, 60);
    expect(descontado).toBe(60);
  });
});

describe('calcularValorHora', () => {
  it('divide el salario entre las horas del mes', () => {
    expect(calcularValorHora(2_000_000, 210)).toBeCloseTo(9523.81, 2);
  });
});

describe('calcularLiquidacion', () => {
  it('la hora ordinaria diurna no se paga aparte: ya está en el salario', () => {
    const [l] = calcularLiquidacion(2_000_000, 210, [
      { codigo: 'HOD', nombre: 'Ordinaria', recargo: 1.0, minutos: 480 },
    ]);
    expect(l.factorPagado).toBe(0);
    expect(l.subtotal).toBe(0);
  });

  it('de una ordinaria nocturna solo se paga el recargo por encima de la hora', () => {
    const [l] = calcularLiquidacion(2_000_000, 210, [
      { codigo: 'HON', nombre: 'Nocturna', recargo: 1.35, minutos: 60 },
    ]);
    expect(l.factorPagado).toBe(0.35);
    expect(l.subtotal).toBeCloseTo(9523.81 * 0.35, 1);
  });

  it('de una hora extra se paga el factor completo', () => {
    const [l] = calcularLiquidacion(2_000_000, 210, [
      { codigo: 'HED', nombre: 'Extra diurna', recargo: 1.25, minutos: 60 },
    ]);
    expect(l.esExtra).toBe(true);
    expect(l.factorPagado).toBe(1.25);
    expect(l.subtotal).toBeCloseTo(9523.81 * 1.25, 1);
  });

  it('los cuatro códigos de extra están marcados como tales', () => {
    expect([...CODIGOS_EXTRA].sort()).toEqual(['HED', 'HEDD', 'HEN', 'HEND']);
  });
});
