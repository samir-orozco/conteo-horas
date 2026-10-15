import { describe, it, expect } from 'vitest';
import {
  fechasDelPeriodo, periodoDeLasFechas, salarioDelPeriodo, periodoTerminado, hoyEnBogota, textoDelPeriodo,
  totalDelReporte, avisoSinTotal, rotuloDelSalario, quincenaDeHoy,
} from './periodoDePago';

// EL PERÍODO DE PAGO EN LOS REPORTES (13 de octubre de 2026, decisión del dueño). El «Total a pagar» sumaba el
// salario MENSUAL completo a cualquier rango, así que del 1 al 15 salía con medio salario de más. En vez de
// guardar un tipo de pago por persona, el reporte se pide por período: primera quincena, segunda quincena o
// mes completo. El mes de nómina es de 30 días: cada quincena es medio salario, aunque el mes tenga 31 o 28.
describe('fechasDelPeriodo', () => {
  it('la primera quincena va del 1 al 15', () => {
    expect(fechasDelPeriodo({ tipo: 'PRIMERA_QUINCENA', anio: 2026, mes: 10 })).toEqual({ desde: '2026-10-01', hasta: '2026-10-15' });
  });

  it('la segunda quincena va del 16 al último día, sea 31, 30 o 28', () => {
    expect(fechasDelPeriodo({ tipo: 'SEGUNDA_QUINCENA', anio: 2026, mes: 10 })).toEqual({ desde: '2026-10-16', hasta: '2026-10-31' });
    expect(fechasDelPeriodo({ tipo: 'SEGUNDA_QUINCENA', anio: 2026, mes: 9 })).toEqual({ desde: '2026-09-16', hasta: '2026-09-30' });
    expect(fechasDelPeriodo({ tipo: 'SEGUNDA_QUINCENA', anio: 2026, mes: 2 })).toEqual({ desde: '2026-02-16', hasta: '2026-02-28' });
    expect(fechasDelPeriodo({ tipo: 'SEGUNDA_QUINCENA', anio: 2028, mes: 2 })).toEqual({ desde: '2028-02-16', hasta: '2028-02-29' });
  });

  it('el mes completo va del 1 al último día', () => {
    expect(fechasDelPeriodo({ tipo: 'MES', anio: 2026, mes: 12 })).toEqual({ desde: '2026-12-01', hasta: '2026-12-31' });
  });
});

describe('periodoDeLasFechas', () => {
  it('reconoce cada período por sus fechas exactas', () => {
    expect(periodoDeLasFechas('2026-10-01', '2026-10-15')).toEqual({ tipo: 'PRIMERA_QUINCENA', anio: 2026, mes: 10 });
    expect(periodoDeLasFechas('2026-02-16', '2026-02-28')).toEqual({ tipo: 'SEGUNDA_QUINCENA', anio: 2026, mes: 2 });
    expect(periodoDeLasFechas('2026-10-01', '2026-10-31')).toEqual({ tipo: 'MES', anio: 2026, mes: 10 });
  });

  // Fechas cambiadas a mano: no son un período de pago, y el total no se muestra (decisión del dueño).
  it('cualquier otro rango no es un período de pago', () => {
    expect(periodoDeLasFechas('2026-10-01', '2026-10-13')).toBeNull();
    expect(periodoDeLasFechas('2026-10-03', '2026-10-20')).toBeNull();
    expect(periodoDeLasFechas('2026-10-16', '2026-10-30')).toBeNull();
    expect(periodoDeLasFechas('2026-09-16', '2026-10-15')).toBeNull();
    expect(periodoDeLasFechas('2026-10-02', '2026-10-15')).toBeNull();
  });

  it('una fecha mal escrita no es un período', () => {
    expect(periodoDeLasFechas('', '')).toBeNull();
    expect(periodoDeLasFechas('2026-10-1', '2026-10-15')).toBeNull();
  });

  it('va y vuelve: las fechas de un período se reconocen como ese período', () => {
    for (const tipo of ['PRIMERA_QUINCENA', 'SEGUNDA_QUINCENA', 'MES'] as const) {
      for (const mes of [1, 2, 4, 12]) {
        const { desde, hasta } = fechasDelPeriodo({ tipo, anio: 2026, mes });
        expect(periodoDeLasFechas(desde, hasta)).toEqual({ tipo, anio: 2026, mes });
      }
    }
  });
});

describe('salarioDelPeriodo', () => {
  it('cada quincena es medio salario; el mes, el salario entero', () => {
    expect(salarioDelPeriodo(1_750_905, 'PRIMERA_QUINCENA')).toBe(875_452.5);
    expect(salarioDelPeriodo(1_750_905, 'SEGUNDA_QUINCENA')).toBe(875_452.5);
    expect(salarioDelPeriodo(1_750_905, 'MES')).toBe(1_750_905);
  });
});

// Un período que no ha terminado cuenta como «debía trabajar» los días que todavía no llegan, así que el
// descuento sale inflado y el total sería falso. Termina cuando ya pasó su último día, en hora de Bogotá.
describe('periodoTerminado', () => {
  const primera = { tipo: 'PRIMERA_QUINCENA' as const, anio: 2026, mes: 10 };
  it('no ha terminado mientras no pase su último día', () => {
    expect(periodoTerminado(primera, '2026-10-13')).toBe(false);
    expect(periodoTerminado(primera, '2026-10-15')).toBe(false);
  });

  it('terminó al día siguiente de su último día', () => {
    expect(periodoTerminado(primera, '2026-10-16')).toBe(true);
    expect(periodoTerminado(primera, '2027-01-01')).toBe(true);
  });
});

describe('hoyEnBogota', () => {
  // Las pruebas corren en Los Ángeles a propósito: a las 9 p. m. de allá ya es el día siguiente en Bogotá.
  it('es el día de Bogotá, no el de la máquina', () => {
    expect(hoyEnBogota(new Date(Date.UTC(2026, 9, 16, 4, 30)))).toBe('2026-10-15');
    expect(hoyEnBogota(new Date(Date.UTC(2026, 9, 16, 5, 30)))).toBe('2026-10-16');
  });
});

describe('textoDelPeriodo', () => {
  it('dice el período como lo diría una persona', () => {
    expect(textoDelPeriodo({ tipo: 'PRIMERA_QUINCENA', anio: 2026, mes: 10 })).toBe('primera quincena de octubre de 2026');
    expect(textoDelPeriodo({ tipo: 'SEGUNDA_QUINCENA', anio: 2026, mes: 2 })).toBe('segunda quincena de febrero de 2026');
    expect(textoDelPeriodo({ tipo: 'MES', anio: 2026, mes: 12 })).toBe('diciembre de 2026');
  });
});

// LO QUE MUESTRA EL «TOTAL A PAGAR». Una sola decisión para la pantalla y el Excel del reporte.
describe('totalDelReporte', () => {
  const base = { salarioMensual: 1_750_905, totalAdicional: 58_364, descuento: 63_505, hoy: '2026-10-20' };

  // El caso de la captura del dueño, pedido como primera quincena ya terminada.
  it('con un período terminado: salario del período + adicional − descuento', () => {
    expect(totalDelReporte({ ...base, desde: '2026-10-01', hasta: '2026-10-15' })).toEqual({
      estado: 'TOTAL', periodo: { tipo: 'PRIMERA_QUINCENA', anio: 2026, mes: 10 },
      salario: 875_452.5, total: 875_452.5 + 58_364 - 63_505,
    });
  });

  it('el mes completo suma el salario entero', () => {
    const r = totalDelReporte({ ...base, desde: '2026-09-01', hasta: '2026-09-30' });
    expect(r.estado === 'TOTAL' && r.total).toBe(1_750_905 + 58_364 - 63_505);
  });

  it('con fechas que no son un período, no hay total', () => {
    expect(totalDelReporte({ ...base, desde: '2026-10-01', hasta: '2026-10-13' })).toEqual({ estado: 'SIN_PERIODO' });
  });

  // El salario del período se sabe desde el primer día; lo único provisional es la deuda, y por eso es
  // el total lo que no se muestra (14 de octubre de 2026: la pantalla decía «Salario base mensual» con
  // «Primera quincena» elegida, y se contradecía).
  it('con un período que no ha terminado, no hay total, pero el salario del período sí', () => {
    expect(totalDelReporte({ ...base, hoy: '2026-10-13', desde: '2026-10-01', hasta: '2026-10-15' })).toEqual({
      estado: 'SIN_TERMINAR', periodo: { tipo: 'PRIMERA_QUINCENA', anio: 2026, mes: 10 }, salario: 875_452.5,
    });
  });
});

describe('avisoSinTotal', () => {
  it('sin período, pide elegir uno', () => {
    expect(avisoSinTotal({ estado: 'SIN_PERIODO' }))
      .toBe('Para ver el total a pagar, elige un período de pago: primera quincena, segunda quincena o mes completo.');
  });

  it('sin terminar, dice qué período y que los días que faltan cuentan como no trabajados', () => {
    expect(avisoSinTotal({ estado: 'SIN_TERMINAR', periodo: { tipo: 'SEGUNDA_QUINCENA', anio: 2026, mes: 10 }, salario: 0 }))
      .toBe('La segunda quincena de octubre de 2026 termina el 31 de octubre. El total a pagar sale cuando termine: '
        + 'hasta entonces, los días que faltan cuentan como no trabajados.');
  });

  it('el mes completo se dice con su artículo', () => {
    expect(avisoSinTotal({ estado: 'SIN_TERMINAR', periodo: { tipo: 'MES', anio: 2026, mes: 10 }, salario: 0 }))
      .toMatch(/^El mes de octubre de 2026 termina el 31 de octubre\./);
  });
});

// La etiqueta del salario en el reporte. «Salario de la primera quincena de…», pero «Salario de octubre de
// 2026», no «Salario de la octubre» (salió así a producción el 13 de octubre de 2026 con «Mes completo»).
describe('rotuloDelSalario', () => {
  it('una quincena lleva su artículo', () => {
    expect(rotuloDelSalario({ tipo: 'PRIMERA_QUINCENA', anio: 2026, mes: 10 })).toBe('Salario de la primera quincena de octubre de 2026');
    expect(rotuloDelSalario({ tipo: 'SEGUNDA_QUINCENA', anio: 2026, mes: 9 })).toBe('Salario de la segunda quincena de septiembre de 2026');
  });

  it('el mes completo no', () => {
    expect(rotuloDelSalario({ tipo: 'MES', anio: 2026, mes: 10 })).toBe('Salario de octubre de 2026');
  });
});

// La quincena en curso, para las extras y los recargos del Inicio (15 de octubre de 2026).
describe('quincenaDeHoy', () => {
  it('del 1 al 15, la primera; del 16 en adelante, la segunda', () => {
    expect(quincenaDeHoy('2026-10-01')).toEqual({ tipo: 'PRIMERA_QUINCENA', anio: 2026, mes: 10 });
    expect(quincenaDeHoy('2026-10-15')).toEqual({ tipo: 'PRIMERA_QUINCENA', anio: 2026, mes: 10 });
    expect(quincenaDeHoy('2026-10-16')).toEqual({ tipo: 'SEGUNDA_QUINCENA', anio: 2026, mes: 10 });
    expect(quincenaDeHoy('2027-02-28')).toEqual({ tipo: 'SEGUNDA_QUINCENA', anio: 2027, mes: 2 });
  });
});
