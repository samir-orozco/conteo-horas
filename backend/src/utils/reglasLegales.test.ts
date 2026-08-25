import { describe, it, expect } from 'vitest';
import {
  JORNADAS, PERIODOS, tiposDelPeriodo, jornadaVigente, periodoVigente,
  horasMes, valorHora, reglasEn,
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
