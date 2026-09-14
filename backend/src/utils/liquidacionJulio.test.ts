import { describe, it, expect } from 'vitest';
import { calcularValorHora } from './horasColombiana';
import { calcularHorasEsperadas, armarSaldo } from './saldoTiempo';
import { calcularTardanzas, construirExtraConfig } from './tardanzas';
import { rangoReporte } from './fechas';
import { calcularDiasEsperados } from './diasEsperados';
import { jornadaVigente } from './vigencias';
import { liquidarRegistros } from './liquidarRegistros';

// Prueba de extremo a extremo del motor, sin base de datos, sobre el escenario de
// julio 2026 que se verificó A MANO contra el reporte real (ver prisma/seed-julio-saldo.ts
// y prisma/verificar-saldo.ts). Si alguno de estos números cambia sin que nadie lo
// haya pedido, el cálculo del dinero se rompió.
//
// Colaborador: horario L-V 08:00–16:00 (8h) y sábado 08:00–12:00 (4h), sin almuerzo,
// 3 min de tolerancia. Salario $2.000.000, jornada legal 42h → horasMes 210.

const bog = (fecha: string, hora: number, min = 0) => {
  const [a, m, d] = fecha.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d, hora + 5, min, 0));
};

const HORARIO: any = {
  activo: true, toleranciaMin: 3, almuerzoMin: 0,
  franjas: [
    { dias: ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'], horaEntrada: '08:00', horaSalida: '16:00', tieneAlmuerzo: true },
    { dias: ['SABADO'], horaEntrada: '08:00', horaSalida: '12:00', tieneAlmuerzo: true },
  ],
};

// Vigentes desde siempre, como las guarda la base: `tiposVigentes` descarta el tipo
// inactivo o fuera de su vigencia.
const SIEMPRE = new Date(Date.UTC(2000, 0, 1, 5));
const TIPOS = [
  { codigo: 'HOD', nombre: 'Ordinaria Diurna', horaInicio: 6, horaFin: 21, recargo: 1.0 },
  { codigo: 'HON', nombre: 'Ordinaria Nocturna', horaInicio: 6, horaFin: 21, recargo: 1.35 },
  { codigo: 'HED', nombre: 'Extra Diurna', horaInicio: 6, horaFin: 21, recargo: 1.25 },
  { codigo: 'HEN', nombre: 'Extra Nocturna', horaInicio: 6, horaFin: 21, recargo: 1.75 },
  { codigo: 'HDD', nombre: 'Dominical Diurna', horaInicio: 6, horaFin: 21, recargo: 1.9 },
  { codigo: 'HND', nombre: 'Dominical Nocturna', horaInicio: 6, horaFin: 21, recargo: 2.25 },
  { codigo: 'HEDD', nombre: 'Extra Dominical Diurna', horaInicio: 6, horaFin: 21, recargo: 2.15 },
  { codigo: 'HEND', nombre: 'Extra Dominical Nocturna', horaInicio: 6, horaFin: 21, recargo: 2.65 },
].map(t => ({ ...t, activo: true, vigenteDesde: SIEMPRE, vigenteHasta: null }));

// Día trabajado: [día del mes, hora entrada, min entrada, hora salida, min salida]
const DIAS: [number, number, number, number, number][] = [
  [1, 8, 0, 16, 0], [2, 8, 0, 16, 0], [3, 8, 0, 16, 0], [4, 8, 0, 12, 0],   // semana 1
  [6, 8, 25, 16, 0],                                                        // lunes: 25 min tarde
  [7, 8, 0, 16, 0],
  [8, 8, 0, 16, 25],                                                        // miércoles: repone 25 min
  [9, 8, 0, 16, 0], [10, 8, 0, 16, 0], [11, 8, 0, 12, 0],
  [13, 8, 40, 16, 0],                                                       // lunes: 40 min tarde, no repone
  [14, 8, 0, 16, 0], [15, 8, 0, 16, 0],
  // jue 16: permiso NO remunerado (no trabaja)
  [17, 8, 0, 16, 0], [18, 8, 0, 12, 0],
  // lun 20: festivo · mar 21: vacaciones
  [22, 8, 0, 16, 0], [23, 8, 0, 16, 0], [24, 8, 0, 16, 0], [25, 8, 0, 12, 0],
  [27, 8, 0, 16, 0], [28, 8, 0, 16, 0], [29, 8, 0, 16, 0],
  // jue 30: permiso PERSONAL
  [31, 8, 0, 16, 0],
];

const REGISTROS = DIAS.map(([d, hi, mi, hf, mf]) => ({
  id: `r${d}`,
  fecha: bog(`2026-07-${String(d).padStart(2, '0')}`, 0),
  entrada: bog(`2026-07-${String(d).padStart(2, '0')}`, hi, mi),
  salida: bog(`2026-07-${String(d).padStart(2, '0')}`, hf, mf),
}));

const FESTIVOS = [bog('2026-07-20', 0)]; // Día de la Independencia
const PERMISOS = [
  { fechaInicio: bog('2026-07-20', 0), fechaFin: bog('2026-07-21', 0), tipo: 'VACACIONES' },
  { fechaInicio: bog('2026-07-16', 0), fechaFin: bog('2026-07-16', 0), tipo: 'NO_REMUNERADO' },
  { fechaInicio: bog('2026-07-30', 0), fechaFin: bog('2026-07-30', 0), tipo: 'PERSONAL' },
];

const SALARIO = 2_000_000;
const HORAS_MES = 210; // jornada vigente al cierre del período (42h) × 5

// La Ley 2101 baja la jornada de 44h a 42h el 15 de julio de 2026, así que las
// dos primeras semanas del mes tienen un tope distinto a las dos últimas. El
// motor resuelve la jornada UNA vez por semana ISO, con el primer día que ve.
// Las vigencias van como las guarda la base, y de ellas salen las dos cuentas: la
// de la liquidación y la del saldo.
const JORNADAS = [
  { id: 'ley-44', vigenteDesde: SIEMPRE, horasSemanales: 44 },
  { id: 'ley-42', vigenteDesde: new Date(Date.UTC(2026, 6, 15, 5, 0, 0)), horasSemanales: 42 },
];
const jornadaDe = (fecha: Date) => jornadaVigente(fecha, JORNADAS);

describe('julio 2026 — escenario verificado a mano', () => {
  const { desdeF, finExclusivo } = rangoReporte('2026-07-01', '2026-07-31');
  // Los días esperados llegan materializados, como en producción. Se generan con
  // el mismo horario de arriba: si materializar cambiara un solo minuto, los
  // números de este archivo se moverían y la prueba lo cantaría.
  const DIAS_ESPERADOS = calcularDiasEsperados(desdeF, finExclusivo, HORARIO);
  // La liquidación de verdad, con lo que le pasa /liquidacion. Hasta el 12 de septiembre
  // de 2026 aquí había una réplica a mano del cálculo, que seguía en verde aunque el
  // cálculo real cambiara.
  const { minutosOrdinarios } = liquidarRegistros(
    REGISTROS, HORARIO, construirExtraConfig('SEMANAL', HORARIO, DIAS_ESPERADOS), FESTIVOS, TIPOS, JORNADAS,
    SALARIO, HORAS_MES, false, DIAS_ESPERADOS,
  );

  it('trabajó 167h 20min de horas ordinarias', () => {
    expect(minutosOrdinarios).toBe(167 * 60 + 20);
  });

  it('con PERSONAL remunerado: debía 176h y queda debiendo 8h 40min', () => {
    const esp = calcularHorasEsperadas(
      desdeF, finExclusivo, DIAS_ESPERADOS, FESTIVOS, PERMISOS,
      new Set(['CALAMIDAD', 'MEDICO', 'PERSONAL', 'OTRO']), jornadaDe,
    );
    expect(esp.minutosEsperados).toBe(176 * 60);
    const saldo = armarSaldo(esp, minutosOrdinarios, calcularValorHora(SALARIO, HORAS_MES), false);
    expect(saldo.minutosSaldo).toBe(8 * 60 + 40);
    expect(Math.round(saldo.montoSaldo)).toBe(82_540);
  });

  it('con PERSONAL no remunerado: debía 184h y queda debiendo 16h 40min', () => {
    const esp = calcularHorasEsperadas(
      desdeF, finExclusivo, DIAS_ESPERADOS, FESTIVOS, PERMISOS,
      new Set(['CALAMIDAD', 'MEDICO', 'OTRO']), jornadaDe,
    );
    expect(esp.minutosEsperados).toBe(184 * 60);
    const saldo = armarSaldo(esp, minutosOrdinarios, calcularValorHora(SALARIO, HORAS_MES), false);
    expect(saldo.minutosSaldo).toBe(16 * 60 + 40);
    expect(Math.round(saldo.montoSaldo)).toBe(158_730);
  });

  it('la deuda es la tardanza NO repuesta, no la suma de todas las tardanzas', () => {
    // Llegó tarde 25 min el 6 y 40 min el 13 (65 en total), pero repuso 25 el día 8.
    // Del permiso no remunerado salen 8h. Total: 8h + 40min.
    const esp = calcularHorasEsperadas(
      desdeF, finExclusivo, DIAS_ESPERADOS, FESTIVOS, PERMISOS,
      new Set(['CALAMIDAD', 'MEDICO', 'PERSONAL', 'OTRO']), jornadaDe,
    );
    const saldo = armarSaldo(esp, minutosOrdinarios, calcularValorHora(SALARIO, HORAS_MES), false);
    expect(saldo.minutosSaldo - 8 * 60).toBe(40);
  });

  it('reporta 2 días tarde y 59 min (ya descontada la tolerancia de 3 min)', () => {
    const t = calcularTardanzas(REGISTROS as any, DIAS_ESPERADOS, FESTIVOS.map(f => ({ fecha: f })) as any, []);
    expect(t.diasTarde).toBe(2);
    expect(t.totalMinutos).toBe(22 + 37);
  });

  it('el festivo del 20 y las vacaciones del 21 no generan deuda', () => {
    const esp = calcularHorasEsperadas(
      desdeF, finExclusivo, DIAS_ESPERADOS, FESTIVOS, PERMISOS,
      new Set(['CALAMIDAD', 'MEDICO', 'PERSONAL', 'OTRO']), jornadaDe,
    );
    // Solo el 21 se excusa por vacaciones (8h); el 20 es festivo y no se trabajaba.
    expect(esp.minutosPermisoRemunerado).toBe(16 * 60); // 21 jul (8h) + 30 jul PERSONAL (8h)
  });
});
