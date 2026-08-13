import { describe, it, expect } from 'vitest';
import {
  calcularHorasEsperadas, armarSaldo, duracionFranjaMin,
  esPermisoRemunerado, parsearPoliticaPermisos, normalizarPoliticaPermisos,
  PERMISOS_CONFIGURABLES,
} from './saldoTiempo';
import { rangoReporte } from './fechas';
import { calcularDiasEsperados } from './diasEsperados';

// Horario de apoyo: se le pasa qué días de la semana trabaja y con qué horas.
const horarioDe = (dias: string[], horaEntrada = '08:00', horaSalida = '16:00', almuerzoMin = 0): any => ({
  activo: true,
  almuerzoMin,
  franjas: [{ dias, horaEntrada, horaSalida, tieneAlmuerzo: true }],
});
const TODOS = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];

// Jornada legal alta para que el tope semanal no interfiera salvo cuando se prueba.
const sinTope = () => 200;

// `calcularHorasEsperadas` ya no recorre el horario: lee los días materializados.
// Para no reescribir las pruebas de siempre, aquí se materializan al vuelo con el
// horario dado, que es exactamente lo que hace el generador en producción.
function esperadas(desde: string, hasta: string, horario: any, opts: {
  festivos?: Date[]; permisos?: any[]; politica?: Set<string>; jornada?: (f: Date) => number;
  dias?: any[];
} = {}) {
  const { desdeF, finExclusivo } = rangoReporte(desde, hasta);
  const dias = opts.dias ?? calcularDiasEsperados(desdeF, finExclusivo, horario);
  return calcularHorasEsperadas(
    desdeF, finExclusivo, dias,
    opts.festivos ?? [], opts.permisos ?? [],
    opts.politica ?? new Set(), opts.jornada ?? sinTope,
  );
}

describe('duracionFranjaMin', () => {
  it('calcula una franja normal', () => {
    expect(duracionFranjaMin('08:00', '16:00')).toBe(480);
  });
  it('calcula una franja que cruza medianoche', () => {
    expect(duracionFranjaMin('21:00', '05:00')).toBe(480);
  });
});

describe('calcularHorasEsperadas — qué días cuenta', () => {
  // Regresión del bug del 2026-08-11: el rango se corría un día por la zona
  // horaria y el 1 de julio (miércoles) se contaba como martes.
  it('el 1 de julio de 2026 cuenta como MIÉRCOLES, no como martes', () => {
    const soloMiercoles = esperadas('2026-07-01', '2026-07-01', horarioDe(['MIERCOLES'], '08:00', '09:00'));
    const soloMartes = esperadas('2026-07-01', '2026-07-01', horarioDe(['MARTES'], '08:00', '09:00'));
    expect(soloMiercoles.minutosEsperados).toBe(60);
    expect(soloMartes.minutosEsperados).toBe(0);
  });

  it('un rango de dos días no arrastra el tercero', () => {
    // 1 y 2 de julio de 2026 son miércoles y jueves; el 3 es viernes.
    const conViernes = esperadas('2026-07-01', '2026-07-02', horarioDe(['VIERNES'], '08:00', '09:00'));
    expect(conViernes.minutosEsperados).toBe(0);
  });

  it('cuenta exactamente los días del rango', () => {
    const r = esperadas('2026-07-01', '2026-07-31', horarioDe(TODOS, '08:00', '09:00'));
    expect(r.minutosEsperados / 60).toBe(31);
  });

  it('no exige días sin franja asignada', () => {
    // Julio 2026 tiene 4 domingos: 5, 12, 19 y 26.
    const r = esperadas('2026-07-01', '2026-07-31', horarioDe(['DOMINGO'], '08:00', '09:00'));
    expect(r.minutosEsperados / 60).toBe(4);
  });

  it('no exige los festivos', () => {
    const festivo = new Date('2026-07-01T05:00:00.000Z');
    const r = esperadas('2026-07-01', '2026-07-01', horarioDe(TODOS, '08:00', '09:00'), { festivos: [festivo] });
    expect(r.minutosEsperados).toBe(0);
  });

  it('descuenta el almuerzo de la jornada esperada', () => {
    const r = esperadas('2026-07-01', '2026-07-01', horarioDe(['MIERCOLES'], '08:00', '17:00', 60));
    expect(r.minutosEsperados).toBe(480); // 9h de franja − 1h de almuerzo
  });

  it('no exige más que la jornada legal de la semana', () => {
    // Horario de 7 días × 10h = 70h, pero la ley permite 42h.
    const r = esperadas('2026-07-06', '2026-07-12', horarioDe(TODOS, '08:00', '18:00'), { jornada: () => 42 });
    expect(r.minutosEsperados).toBe(42 * 60);
  });

  it('sin horario activo no exige nada', () => {
    const r = esperadas('2026-07-01', '2026-07-31', { ...horarioDe(TODOS), activo: false });
    expect(r.minutosEsperados).toBe(0);
  });
});

// La razón de ser de todo esto: el dueño cambió la entrada de 08:00 a 07:00 el 17
// de julio de 2026 y los reportes de meses anteriores empezaron a mostrar
// tardanzas y deudas falsas. Mientras el cálculo leía el horario ACTUAL no había
// forma de evitarlo; leyendo los días materializados, el pasado queda quieto.
describe('calcularHorasEsperadas — el pasado ya no se reescribe', () => {
  it('editar el horario después NO cambia lo que se exigía en un día ya materializado', () => {
    const { desdeF, finExclusivo } = rangoReporte('2026-07-01', '2026-07-31');
    const original = horarioDe(TODOS, '08:00', '16:00');
    const yaMaterializado = calcularDiasEsperados(desdeF, finExclusivo, original);

    // El admin adelanta la entrada una hora: el horario vigente pide 9h diarias.
    const editado = horarioDe(TODOS, '07:00', '16:00');

    const conLoCongelado = esperadas('2026-07-01', '2026-07-31', editado, { dias: yaMaterializado });
    const conElHorarioNuevo = esperadas('2026-07-01', '2026-07-31', editado);

    expect(conLoCongelado.minutosEsperados).toBe(31 * 8 * 60);
    expect(conElHorarioNuevo.minutosEsperados).toBe(31 * 9 * 60); // lo que pasaba antes
  });

  it('un día ajustado a mano (turno rotativo) manda sobre el horario', () => {
    const { desdeF, finExclusivo } = rangoReporte('2026-07-01', '2026-07-01');
    const dias = calcularDiasEsperados(desdeF, finExclusivo, horarioDe(['MIERCOLES'], '08:00', '16:00'));
    dias[0] = { ...dias[0], horaEntrada: '14:00', horaSalida: '22:00', minutosEsperados: 300 };

    const r = esperadas('2026-07-01', '2026-07-01', null, { dias });
    expect(r.minutosEsperados).toBe(300);
  });

  it('un día sin materializar no exige nada', () => {
    // Colaborador que entró a mitad de mes: los días anteriores no tienen fila.
    const r = esperadas('2026-07-01', '2026-07-31', null, { dias: [] });
    expect(r.minutosEsperados).toBe(0);
  });

  it('ignora las filas que caen fuera del rango pedido', () => {
    const { desdeF, finExclusivo } = rangoReporte('2026-07-01', '2026-07-31');
    const mesCompleto = calcularDiasEsperados(desdeF, finExclusivo, horarioDe(TODOS, '08:00', '16:00'));
    // Se piden solo los tres primeros días, pero llegan los 31.
    const r = esperadas('2026-07-01', '2026-07-03', null, { dias: mesCompleto });
    expect(r.minutosEsperados).toBe(3 * 8 * 60);
  });
});

describe('calcularHorasEsperadas — permisos', () => {
  const unDia = (fecha: string, tipo: string) => ({
    fechaInicio: new Date(`${fecha}T05:00:00.000Z`),
    fechaFin: new Date(`${fecha}T05:00:00.000Z`),
    tipo,
  });

  it('un permiso remunerado no se exige y se contabiliza aparte', () => {
    const r = esperadas('2026-07-01', '2026-07-01', horarioDe(TODOS), {
      permisos: [unDia('2026-07-01', 'VACACIONES')],
    });
    expect(r.minutosEsperados).toBe(0);
    expect(r.minutosPermisoRemunerado).toBe(480);
    expect(r.minutosPermisoNoRemunerado).toBe(0);
  });

  it('un permiso NO remunerado sí se exige (queda como deuda)', () => {
    const r = esperadas('2026-07-01', '2026-07-01', horarioDe(TODOS), {
      permisos: [unDia('2026-07-01', 'NO_REMUNERADO')],
    });
    expect(r.minutosEsperados).toBe(480);
    expect(r.minutosPermisoNoRemunerado).toBe(480);
  });

  it('un tipo configurable sigue la política de la empresa', () => {
    const permisos = [unDia('2026-07-01', 'PERSONAL')];
    const conPago = esperadas('2026-07-01', '2026-07-01', horarioDe(TODOS), {
      permisos, politica: new Set(['PERSONAL']),
    });
    const sinPago = esperadas('2026-07-01', '2026-07-01', horarioDe(TODOS), {
      permisos, politica: new Set(),
    });
    expect(conPago.minutosEsperados).toBe(0);
    expect(sinPago.minutosEsperados).toBe(480);
  });

  it('un permiso sobre un festivo no suma horas (ese día no se trabajaba)', () => {
    const r = esperadas('2026-07-01', '2026-07-01', horarioDe(TODOS), {
      festivos: [new Date('2026-07-01T05:00:00.000Z')],
      permisos: [unDia('2026-07-01', 'VACACIONES')],
    });
    expect(r.minutosPermisoRemunerado).toBe(0);
  });
});

describe('armarSaldo', () => {
  const base = { minutosEsperados: 480, minutosPermisoRemunerado: 0, minutosPermisoNoRemunerado: 0 };

  it('cobra solo lo que quedó sin reponer', () => {
    const s = armarSaldo(base, 420, 10000, false); // debía 8h, trabajó 7h
    expect(s.minutosSaldo).toBe(60);
    expect(s.montoSaldo).toBe(10000);
  });

  it('trabajar de más NO genera pago por esta vía (eso es hora extra)', () => {
    const s = armarSaldo(base, 600, 10000, false);
    expect(s.minutosSaldo).toBe(-120);
    expect(s.montoSaldo).toBe(0);
  });

  it('sin horario no calcula saldo', () => {
    const s = armarSaldo(base, 0, 10000, true);
    expect(s.minutosSaldo).toBe(0);
    expect(s.montoSaldo).toBe(0);
    expect(s.sinHorario).toBe(true);
  });
});

describe('política de permisos remunerados', () => {
  it('los definidos por ley se pagan siempre, sin importar la política', () => {
    const vacia = new Set<string>();
    for (const t of ['VACACIONES', 'INCAPACIDAD_EPS', 'INCAPACIDAD_ARL',
      'LICENCIA_MATERNIDAD', 'LICENCIA_PATERNIDAD', 'LICENCIA_LUTO']) {
      expect(esPermisoRemunerado(t, vacia)).toBe(true);
    }
  });

  it('el no remunerado nunca se paga, aunque lo metan en la política', () => {
    expect(esPermisoRemunerado('NO_REMUNERADO', new Set(['NO_REMUNERADO']))).toBe(false);
  });

  it('sin configurar, los 4 configurables se pagan (default conservador)', () => {
    const politica = parsearPoliticaPermisos(null);
    for (const t of PERMISOS_CONFIGURABLES) expect(politica.has(t)).toBe(true);
  });

  it('una fila vacía significa "el admin los desmarcó todos", no "sin configurar"', () => {
    expect(parsearPoliticaPermisos('').size).toBe(0);
  });

  it('normalizar descarta cualquier tipo que no sea configurable', () => {
    const r = normalizarPoliticaPermisos(['PERSONAL', 'VACACIONES', 'NO_REMUNERADO', 'INVENTADO']);
    expect(r).toEqual(['PERSONAL']);
  });
});
