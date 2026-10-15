import { describe, it, expect } from 'vitest';
import { leerRangoDelInicio, resumenDeLaQuincena, DIAS_MAXIMOS_DEL_RANGO } from './extrasDelInicio';

// LAS EXTRAS Y LOS RECARGOS DE LA QUINCENA EN EL INICIO (15 de octubre de 2026). Decisión del dueño: en pesos, con
// las horas pequeñas debajo. Sale de `liquidarEmpresa`, la misma cuenta del reporte de extras: el número del Inicio
// tiene que ser el «Total» de ese reporte para las mismas fechas. Las fechas las pone la pantalla, que es la que sabe
// qué quincena es (lib/periodoDePago.ts del frontend); aquí solo se valida que sean un rango corto.

describe('leerRangoDelInicio', () => {
  it('acepta un rango de fechas reales', () => {
    expect(leerRangoDelInicio({ desde: '2026-10-01', hasta: '2026-10-15' })).toEqual({ ok: true, desde: '2026-10-01', hasta: '2026-10-15' });
    expect(leerRangoDelInicio({ desde: '2026-02-16', hasta: '2026-02-28' })).toEqual({ ok: true, desde: '2026-02-16', hasta: '2026-02-28' });
  });

  it('rechaza lo que no es una fecha, o una que no existe', () => {
    for (const q of [{}, { desde: '2026-10-01' }, { desde: 'hoy', hasta: '2026-10-15' }, { desde: '2026-10-01', hasta: '2026-10-15T00:00' }, { desde: '2026-02-27', hasta: '2026-02-30' }, null]) {
      expect(leerRangoDelInicio(q).ok).toBe(false);
    }
  });

  it('rechaza un rango al revés', () => {
    expect(leerRangoDelInicio({ desde: '2026-10-15', hasta: '2026-10-01' }).ok).toBe(false);
  });

  // El Inicio se carga a cada rato: no puede ser la puerta para liquidar un año entero.
  it('rechaza un rango de más de un mes', () => {
    expect(DIAS_MAXIMOS_DEL_RANGO).toBe(31);
    expect(leerRangoDelInicio({ desde: '2026-10-01', hasta: '2026-10-31' }).ok).toBe(true);
    expect(leerRangoDelInicio({ desde: '2026-10-01', hasta: '2026-11-01' }).ok).toBe(false);
  });
});

describe('resumenDeLaQuincena', () => {
  const fila = (o: Partial<{ totalRecargos: number; totalExtra: number; totalAdicional: number; minutosExtra: number; minutosConRecargo: number }>) =>
    ({ totalRecargos: 0, totalExtra: 0, totalAdicional: 0, minutosExtra: 0, minutosConRecargo: 0, ...o });

  it('suma la empresa entera: el total es la suma de lo adicional de cada persona, como el reporte', () => {
    expect(resumenDeLaQuincena([
      fila({ totalRecargos: 1000.25, totalExtra: 5000.5, totalAdicional: 6000.75, minutosExtra: 90, minutosConRecargo: 30 }),
      fila({ totalRecargos: 200.1, totalExtra: 0, totalAdicional: 200.1, minutosConRecargo: 15 }),
      fila({}),
    ])).toEqual({ total: 6200.85, extras: 5000.5, recargos: 1200.35, minutosExtra: 90, minutosConRecargo: 45, personas: 2 });
  });

  it('sin nadie, todo en cero', () => {
    expect(resumenDeLaQuincena([])).toEqual({ total: 0, extras: 0, recargos: 0, minutosExtra: 0, minutosConRecargo: 0, personas: 0 });
  });

  // Sumar decimales en coma flotante deja colas (0.1 + 0.2 = 0.30000000000000004): se cortan a centavos.
  it('sin colas de coma flotante', () => {
    expect(resumenDeLaQuincena([fila({ totalAdicional: 0.1 }), fila({ totalAdicional: 0.2 })]).total).toBe(0.3);
  });
});
