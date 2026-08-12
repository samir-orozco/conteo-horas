import { describe, it, expect } from 'vitest';
import { calcularTardanzas, franjaDelDia, minutosDe, construirExtraConfig, DIAS_SEMANA } from './tardanzas';

const bog = (fecha: string, hora: number, min = 0) => {
  const [a, m, d] = fecha.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d, hora + 5, min, 0));
};

const HORARIO: any = {
  activo: true,
  toleranciaMin: 3,
  almuerzoMin: 0,
  franjas: [
    { dias: ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'], horaEntrada: '08:00', horaSalida: '16:00', tieneAlmuerzo: true },
    { dias: ['SABADO'], horaEntrada: '08:00', horaSalida: '12:00', tieneAlmuerzo: false },
  ],
};

const reg = (fecha: string, hora: number, min = 0): any => ({
  id: `r-${fecha}-${hora}-${min}`,
  fecha: bog(fecha, 0),
  entrada: bog(fecha, hora, min),
  salida: bog(fecha, 16),
});

const tardanzas = (registros: any[], opts: { festivos?: any[]; permisos?: any[]; horario?: any } = {}) =>
  calcularTardanzas(registros, opts.horario ?? HORARIO, opts.festivos ?? [], opts.permisos ?? []);

describe('minutosDe', () => {
  it('convierte HH:MM a minutos del día', () => {
    expect(minutosDe('08:00')).toBe(480);
    expect(minutosDe('00:30')).toBe(30);
  });
});

describe('franjaDelDia', () => {
  it('encuentra la franja del día de la semana', () => {
    expect(franjaDelDia(HORARIO, 'SABADO')!.horaSalida).toBe('12:00');
    expect(franjaDelDia(HORARIO, 'MIERCOLES')!.horaSalida).toBe('16:00');
  });
  it('devuelve null en un día que no se trabaja', () => {
    expect(franjaDelDia(HORARIO, 'DOMINGO')).toBeNull();
  });
});

describe('calcularTardanzas', () => {
  it('llegar dentro de la tolerancia no cuenta como tarde', () => {
    // 6 de julio de 2026 es lunes. Entrada 08:00, tolerancia 3 min.
    const r = tardanzas([reg('2026-07-06', 8, 3)]);
    expect(r.diasTarde).toBe(0);
  });

  it('descuenta la tolerancia de los minutos reportados', () => {
    // Llega 08:25 → 25 min reales, menos 3 de tolerancia = 22 reportados.
    const r = tardanzas([reg('2026-07-06', 8, 25)]);
    expect(r.diasTarde).toBe(1);
    expect(r.detalle[0].minutosTarde).toBe(22);
    expect(r.detalle[0].horaLlegada).toBe('08:25');
    expect(r.detalle[0].horaEsperada).toBe('08:00');
  });

  it('suma los minutos de varios días', () => {
    const r = tardanzas([reg('2026-07-06', 8, 25), reg('2026-07-13', 8, 40)]);
    expect(r.diasTarde).toBe(2);
    expect(r.totalMinutos).toBe(22 + 37);
  });

  it('usa la primera entrada del día, no la última', () => {
    const r = tardanzas([reg('2026-07-06', 14), reg('2026-07-06', 8, 25)]);
    expect(r.detalle[0].horaLlegada).toBe('08:25');
  });

  it('no cuenta un día que no está en el horario', () => {
    // 5 de julio de 2026 es domingo y el horario no lo cubre.
    expect(tardanzas([reg('2026-07-05', 10)]).diasTarde).toBe(0);
  });

  it('no cuenta los festivos', () => {
    const festivo = { fecha: bog('2026-07-06', 0) } as any;
    expect(tardanzas([reg('2026-07-06', 10)], { festivos: [festivo] }).diasTarde).toBe(0);
  });

  it('un día cubierto por una novedad no cuenta como tardanza', () => {
    const permiso = { fechaInicio: bog('2026-07-06', 0), fechaFin: bog('2026-07-06', 0) };
    expect(tardanzas([reg('2026-07-06', 10)], { permisos: [permiso] }).diasTarde).toBe(0);
  });

  it('respeta la franja propia del sábado', () => {
    // 11 de julio de 2026 es sábado: entrada 08:00 igual que entre semana.
    const r = tardanzas([reg('2026-07-11', 8, 30)]);
    expect(r.detalle[0].minutosTarde).toBe(27);
  });

  it('informa la tolerancia aplicada', () => {
    expect(tardanzas([]).toleranciaMin).toBe(3);
  });
});

describe('construirExtraConfig', () => {
  it('en modo SEMANAL ignora el horario', () => {
    expect(construirExtraConfig('SEMANAL', HORARIO)).toEqual({ modo: 'SEMANAL' });
  });

  it('en modo HORARIO arma la ventana de cada día', () => {
    const cfg = construirExtraConfig('HORARIO', HORARIO);
    expect(cfg.modo).toBe('HORARIO');
    expect(cfg.franjaPorDia![DIAS_SEMANA.indexOf('LUNES')]).toEqual({ ini: 480, fin: 960 });
    expect(cfg.franjaPorDia![DIAS_SEMANA.indexOf('SABADO')]).toEqual({ ini: 480, fin: 720 });
    expect(cfg.franjaPorDia![DIAS_SEMANA.indexOf('DOMINGO')]).toBeUndefined();
  });

  it('sin horario activo cae a SEMANAL', () => {
    expect(construirExtraConfig('HORARIO', { ...HORARIO, activo: false })).toEqual({ modo: 'SEMANAL' });
    expect(construirExtraConfig('HORARIO', null)).toEqual({ modo: 'SEMANAL' });
  });
});
