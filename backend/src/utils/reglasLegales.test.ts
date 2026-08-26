import { describe, it, expect } from 'vitest';
import {
  JORNADAS, PERIODOS, tiposDelPeriodo, jornadaVigente, periodoVigente,
  horasMes, valorHora, reglasEn,
  SEMANAS_MES, extrasSemanales, costoExtrasMes, TOPE_EXTRAS_SEMANA,
  SMLMV, AUXILIO_TRANSPORTE, TOPE_AUXILIO, tieneAuxilio, diasEntreFechas,
  inicioSemestre, prestaciones, indemnizacion, TOPE_SALARIO_ALTO, diasCalendario,
  // @ts-expect-error: el generador del blog es Node puro y este módulo es .mjs
} from '../../../frontend/blog/reglas-legales.mjs';

// El sitio público publica los factores de recargo y la jornada legal en sus
// calculadoras. Esos números tienen que ser EXACTAMENTE los que el producto le
// cobra a la gente, y viven en dos sitios que no se pueden importar entre sí:
// `prisma/seed.ts` (TypeScript, siembra la base) y `frontend/blog/
// reglas-legales.mjs` (Node puro, se ejecuta al compilar el blog).
//
// Esta prueba es el puente. Reproduce aquí la definición del seed y la compara
// contra la del sitio. Si alguien cambia la ley en un lado y olvida el otro, la
// suite falla antes de que salga publicado un número que no es el que se paga.
//
// Cuando cambie la ley hay que tocar tres sitios en este orden: el seed, el
// .mjs del blog, y las tres constantes de abajo.

// ===== Copia literal de lo que hace prisma/seed.ts =====
const SEMANA = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
const DOMFES = ['DOMINGO', 'FESTIVO'];

function tiposDelSeed(inicioNocturna: number, recargoDom: number) {
  const finNocturna = 6;
  return [
    { nombre: 'Hora Ordinaria Diurna', codigo: 'HOD', horaInicio: finNocturna, horaFin: inicioNocturna, recargo: 1.0, aplica: SEMANA },
    { nombre: 'Hora Ordinaria Nocturna', codigo: 'HON', horaInicio: inicioNocturna, horaFin: finNocturna, recargo: 1.35, aplica: SEMANA },
    { nombre: 'Hora Extra Diurna', codigo: 'HED', horaInicio: finNocturna, horaFin: inicioNocturna, recargo: 1.25, aplica: SEMANA },
    { nombre: 'Hora Extra Nocturna', codigo: 'HEN', horaInicio: inicioNocturna, horaFin: finNocturna, recargo: 1.75, aplica: SEMANA },
    { nombre: 'Hora Diurna Dominical/Festivo', codigo: 'HDD', horaInicio: finNocturna, horaFin: inicioNocturna, recargo: 1 + recargoDom, aplica: DOMFES },
    { nombre: 'Hora Nocturna Dominical/Festivo', codigo: 'HND', horaInicio: inicioNocturna, horaFin: finNocturna, recargo: 1 + recargoDom + 0.35, aplica: DOMFES },
    { nombre: 'Hora Extra Diurna Dominical/Festivo', codigo: 'HEDD', horaInicio: finNocturna, horaFin: inicioNocturna, recargo: 1 + recargoDom + 0.25, aplica: DOMFES },
    { nombre: 'Hora Extra Nocturna Dominical/Festivo', codigo: 'HEND', horaInicio: inicioNocturna, horaFin: finNocturna, recargo: 1 + recargoDom + 0.75, aplica: DOMFES },
  ];
}

const JORNADAS_SEED = [
  { desde: '2023-07-15', horas: 47 },
  { desde: '2024-07-15', horas: 46 },
  { desde: '2025-07-15', horas: 44 },
  { desde: '2026-07-15', horas: 42 },
];

const PERIODOS_SEED = [
  { desde: '2025-07-01', hasta: '2025-12-25', inicioNocturna: 21, recargoDom: 0.8 },
  { desde: '2025-12-25', hasta: '2026-07-01', inicioNocturna: 19, recargoDom: 0.8 },
  { desde: '2026-07-01', hasta: '2027-07-01', inicioNocturna: 19, recargoDom: 0.9 },
  { desde: '2027-07-01', hasta: null, inicioNocturna: 19, recargoDom: 1.0 },
];

type Tipo = { codigo: string; nombre: string; horaInicio: number; horaFin: number; recargo: number };

describe('las reglas que publica el sitio son las que cobra el producto', () => {
  it('la tabla de jornadas es la misma', () => {
    expect(JORNADAS).toEqual(JORNADAS_SEED);
  });

  it('los períodos de recargo son los mismos', () => {
    expect(PERIODOS.map((p: { desde: string; hasta: string | null; inicioNocturna: number; recargoDom: number }) => ({
      desde: p.desde, hasta: p.hasta, inicioNocturna: p.inicioNocturna, recargoDom: p.recargoDom,
    }))).toEqual(PERIODOS_SEED);
  });

  for (const p of PERIODOS_SEED) {
    it(`los 8 factores del período que arranca el ${p.desde} coinciden`, () => {
      const sitio: Tipo[] = tiposDelPeriodo(p);
      const seed = tiposDelSeed(p.inicioNocturna, p.recargoDom);
      expect(sitio).toHaveLength(seed.length);
      sitio.forEach((t, i) => {
        expect(t.codigo).toBe(seed[i].codigo);
        expect(t.nombre).toBe(seed[i].nombre);
        expect(t.horaInicio).toBe(seed[i].horaInicio);
        expect(t.horaFin).toBe(seed[i].horaFin);
        // Los factores se comparan con tolerancia porque salen de sumas de
        // decimales: 1 + 0.9 + 0.35 no da 2.25 exacto en coma flotante.
        expect(t.recargo).toBeCloseTo(seed[i].recargo, 10);
      });
    });
  }
});

describe('consultas por fecha', () => {
  it('la jornada cambia el mismo día que dice la ley, no el siguiente', () => {
    expect(jornadaVigente('2026-07-14')).toBe(44);
    expect(jornadaVigente('2026-07-15')).toBe(42);
  });

  it('antes de la primera vigencia cae al valor conservador', () => {
    expect(jornadaVigente('2020-01-01')).toBe(42);
  });

  it('el dominical sube al 90% el 1 de julio de 2026', () => {
    expect(periodoVigente('2026-06-30').recargoDom).toBe(0.8);
    expect(periodoVigente('2026-07-01').recargoDom).toBe(0.9);
  });

  it('la nocturna arranca a las 7 p.m. desde el 25 de diciembre de 2025', () => {
    expect(periodoVigente('2025-12-24').inicioNocturna).toBe(21);
    expect(periodoVigente('2025-12-25').inicioNocturna).toBe(19);
  });

  it('el último período no tiene fecha de cierre', () => {
    expect(periodoVigente('2030-01-01').recargoDom).toBe(1.0);
  });
});

describe('valor de la hora', () => {
  it('el divisor es la jornada por cinco, no 240', () => {
    expect(horasMes(44)).toBe(220);
    expect(horasMes(42)).toBe(210);
  });

  it('dos millones con jornada de 42 horas dan 9.524 por hora', () => {
    expect(Math.round(valorHora(2_000_000, 42))).toBe(9524);
  });

  it('el mismo salario con el divisor viejo daba 8.333, y esa es la fuga', () => {
    expect(Math.round(2_000_000 / 240)).toBe(8333);
  });
});

describe('la foto de una fecha', () => {
  it('en julio de 2026 conviven la jornada de 42 y el dominical al 90%', () => {
    const r = reglasEn('2026-08-25');
    expect(r.jornada).toBe(42);
    expect(r.horasMes).toBe(210);
    expect(r.inicioNocturna).toBe(19);
    expect(r.recargoDom).toBe(0.9);
    expect(r.tipos.find((t: Tipo) => t.codigo === 'HDD')!.recargo).toBeCloseTo(1.9, 10);
    expect(r.tipos.find((t: Tipo) => t.codigo === 'HEND')!.recargo).toBeCloseTo(2.65, 10);
  });

  it('entre el 1 y el 14 de julio de 2026 la jornada seguía en 44 con dominical al 90%', () => {
    const r = reglasEn('2026-07-10');
    expect(r.jornada).toBe(44);
    expect(r.horasMes).toBe(220);
    expect(r.recargoDom).toBe(0.9);
  });
});

describe('costo de las horas extra, que es lo que alimenta la calculadora de jornada', () => {
  it('el mes tiene 5 semanas en la convención de nómina, no 4,33', () => {
    // Sale de mes de 30 días entre semana de 6 días laborales. Es la misma
    // cuenta del divisor de horas mensuales, y por eso son coherentes:
    // jornada × SEMANAS_MES tiene que dar el divisor.
    expect(SEMANAS_MES).toBe(5);
    expect(42 * SEMANAS_MES).toBe(horasMes(42));
    expect(44 * SEMANAS_MES).toBe(horasMes(44));
  });

  it('quien trabaja 48 horas con jornada de 42 genera 6 extras a la semana', () => {
    expect(extrasSemanales(48, 42)).toBe(6);
  });

  it('quien trabaja menos de la jornada no genera extras negativas', () => {
    expect(extrasSemanales(38, 42)).toBe(0);
  });

  it('seis extras diurnas al mes sobre dos millones con jornada de 42', () => {
    // 6 extras × 5 semanas = 30 horas al mes.
    // Hora = 2.000.000 / 210 = 9.523,81 · con factor 1,25 = 11.904,76
    // 30 × 11.904,76 = 357.142,86
    const c = costoExtrasMes({ salario: 2_000_000, jornada: 42, horasSemana: 48, factor: 1.25 });
    expect(Math.round(c)).toBe(357_143);
  });

  it('la misma persona bajo la jornada anterior de 44 costaba menos', () => {
    // 4 extras × 5 = 20 horas · hora = 2.000.000/220 = 9.090,91 · ×1,25 = 11.363,64
    // 20 × 11.363,64 = 227.272,73
    const c = costoExtrasMes({ salario: 2_000_000, jornada: 44, horasSemana: 48, factor: 1.25 });
    expect(Math.round(c)).toBe(227_273);
  });

  it('bajar de 44 a 42 horas encarece a esa persona unos 130 mil al mes', () => {
    const antes = costoExtrasMes({ salario: 2_000_000, jornada: 44, horasSemana: 48, factor: 1.25 });
    const ahora = costoExtrasMes({ salario: 2_000_000, jornada: 42, horasSemana: 48, factor: 1.25 });
    expect(Math.round(ahora - antes)).toBe(129_870);
  });

  it('el tope legal de extras sigue siendo 12 a la semana', () => {
    expect(TOPE_EXTRAS_SEMANA).toBe(12);
  });
});

describe('cifras de 2026 fijadas por decreto', () => {
  it('el salario mínimo y el auxilio de transporte son los del decreto', () => {
    // Decreto 1469 de 2025 (salario) y 1470 de 2025 (auxilio). Juntos dan
    // exactamente dos millones, que es como se anunció.
    expect(SMLMV).toBe(1_750_905);
    expect(AUXILIO_TRANSPORTE).toBe(249_095);
    expect(SMLMV + AUXILIO_TRANSPORTE).toBe(2_000_000);
  });

  it('el auxilio se pierde justo por encima de dos salarios mínimos', () => {
    expect(TOPE_AUXILIO).toBe(3_501_810);
    expect(tieneAuxilio(TOPE_AUXILIO)).toBe(true);
    expect(tieneAuxilio(TOPE_AUXILIO + 1)).toBe(false);
  });
});

describe('días de la liquidación, en año comercial', () => {
  it('cuenta los dos extremos', () => {
    expect(diasEntreFechas('2026-01-01', '2026-01-01')).toBe(1);
  });

  it('un mes es 30 días aunque el mes tenga 31', () => {
    expect(diasEntreFechas('2026-01-01', '2026-01-31')).toBe(30);
  });

  it('un año exacto son 360, no 365, y de ahí sale un mes redondo de cesantías', () => {
    expect(diasEntreFechas('2025-01-01', '2025-12-31')).toBe(360);
    // El calendario sí cuenta 365: la diferencia es la convención, no un error.
    expect(diasCalendario('2025-01-01', '2025-12-31')).toBe(365);
  });

  it('del 1 de marzo de 2025 al 25 de agosto de 2026: 1 año, 5 meses y 25 días', () => {
    expect(diasEntreFechas('2025-03-01', '2026-08-25')).toBe(535);
    expect(360 + 5 * 30 + 25).toBe(535);
  });

  it('el semestre de prima arranca el 1 de enero o el 1 de julio', () => {
    expect(inicioSemestre('2026-06-30')).toBe('2026-01-01');
    expect(inicioSemestre('2026-07-01')).toBe('2026-07-01');
    expect(inicioSemestre('2026-12-31')).toBe('2026-07-01');
  });
});

describe('prestaciones al terminar el contrato', () => {
  const caso = { salario: SMLMV, fechaInicio: '2025-03-01', fechaFin: '2026-08-25' };

  it('las cuatro cifras, cotejadas a mano', () => {
    const p = prestaciones(caso);
    // Base con auxilio: 1.750.905 + 249.095 = 2.000.000 · 535 días comerciales
    expect(p.dias).toBe(535);
    expect(p.auxilio).toBe(249_095);
    expect(Math.round(p.cesantias)).toBe(2_972_222);       // 2.000.000 × 535/360
    expect(Math.round(p.intereses)).toBe(530_046);         // cesantías × 535 × 12%/360
    expect(p.diasPrima).toBe(55);                          // desde el 1 de julio
    expect(Math.round(p.prima)).toBe(305_556);             // 2.000.000 × 55/360
    expect(Math.round(p.vacaciones)).toBe(1_301_020);      // SIN auxilio: 1.750.905 × 535/720
    expect(Math.round(p.total)).toBe(5_108_844);
  });

  it('las vacaciones no llevan auxilio de transporte y las cesantías sí', () => {
    const p = prestaciones({ salario: SMLMV, fechaInicio: '2025-01-01', fechaFin: '2025-12-31' });
    // Un año: cesantías = un mes CON auxilio, vacaciones = medio mes SIN auxilio.
    expect(Math.round(p.cesantias)).toBe(SMLMV + AUXILIO_TRANSPORTE);
    expect(Math.round(p.vacaciones)).toBe(Math.round(SMLMV / 2));
  });

  it('quien gana por encima del tope no recibe auxilio', () => {
    const p = prestaciones({ salario: 5_000_000, fechaInicio: '2026-01-01', fechaFin: '2026-12-31' });
    expect(p.auxilio).toBe(0);
    expect(Math.round(p.cesantias)).toBe(5_000_000);
  });

  it('si ya consignaron las cesantías, solo se deben las del año en curso', () => {
    const completo = prestaciones(caso);
    const desdeEnero = prestaciones({ ...caso, desdeCesantias: '2026-01-01' });
    expect(desdeEnero.diasCesantias).toBe(235);
    expect(Math.round(desdeEnero.cesantias)).toBe(1_305_556);
    // Las vacaciones NO se recortan: se acumulan hasta que se toman o se pagan.
    expect(desdeEnero.vacaciones).toBe(completo.vacaciones);
  });
});

describe('indemnización por despido sin justa causa, artículo 64', () => {
  it('en término fijo se pagan los salarios que faltaban del plazo', () => {
    // Sale el 25 de agosto de un contrato que iba hasta el 31 de diciembre.
    // En año comercial faltan 125 días: los 5 que quedaban de agosto más los
    // cuatro meses completos de septiembre a diciembre.
    const i = indemnizacion({ tipo: 'FIJO', salario: 3_000_000,
      fechaInicio: '2026-01-01', fechaFin: '2026-08-25', fechaFinPactada: '2026-12-31' });
    expect(i.dias).toBe(125);
    expect(5 + 4 * 30).toBe(125);
    expect(Math.round(i.valor)).toBe(Math.round(125 * 3_000_000 / 30));
  });

  it('el término fijo nunca baja de quince días, aunque falte menos', () => {
    const i = indemnizacion({ tipo: 'FIJO', salario: 3_000_000,
      fechaInicio: '2026-01-01', fechaFin: '2026-08-25', fechaFinPactada: '2026-08-31' });
    expect(i.dias).toBe(15);
  });

  it('el primer año del indefinido son 30 días completos, sin prorratear', () => {
    const i = indemnizacion({ tipo: 'INDEFINIDO', salario: 3_000_000,
      fechaInicio: '2026-01-01', fechaFin: '2026-04-30' });
    expect(i.dias).toBe(30);
  });

  it('pasado el año son 30 más 20 por cada año adicional, proporcional', () => {
    const i = indemnizacion({ tipo: 'INDEFINIDO', salario: SMLMV,
      fechaInicio: '2025-03-01', fechaFin: '2026-08-25' });
    // 535 días son 1,48611 años: 30 + 20 × 0,48611
    expect(i.dias).toBeCloseTo(39.7222, 3);
    expect(Math.round(i.valor)).toBe(2_318_328);
    expect(i.regla).toBe('INDEFINIDO');
  });

  it('con diez salarios mínimos o más son 20 y 15, no 30 y 20', () => {
    expect(TOPE_SALARIO_ALTO).toBe(17_509_050);
    const debajo = indemnizacion({ tipo: 'INDEFINIDO', salario: TOPE_SALARIO_ALTO - 1,
      fechaInicio: '2024-01-01', fechaFin: '2026-08-25' });
    const encima = indemnizacion({ tipo: 'INDEFINIDO', salario: TOPE_SALARIO_ALTO,
      fechaInicio: '2024-01-01', fechaFin: '2026-08-25' });
    expect(debajo.regla).toBe('INDEFINIDO');
    expect(encima.regla).toBe('INDEFINIDO_ALTO');
    expect(debajo.dias).toBeGreaterThan(encima.dias);
  });
});
