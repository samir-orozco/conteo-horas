import { describe, it, expect } from 'vitest';
import { liquidarRegistros } from './liquidarRegistros';
import { construirExtraConfig } from './tardanzas';
import type { DiaEsperadoCalculado } from './diasEsperados';
import type { FuenteDelDescanso } from './descansoDelHorario';

// LA COSTURA ENTRE EL DÍA CONGELADO Y EL MOTOR DE HORAS (20 de septiembre de 2026).
//
// `horasColombiana.descanso.test.ts` ya prueba que el MOTOR respeta `DescansoConfig`. Lo que no
// existía hasta hoy es el cable: `liquidarRegistros` recibe los días materializados y nunca le
// contó al motor cuál de ellos era el descanso de la persona, así que el motor seguía cayendo a su
// respaldo (el domingo) para todo el mundo.
//
// Estas pruebas son sobre ESE cable. Si se rompe, el síntoma no es una pantalla rota: es un
// domingo que sigue cobrando el 90% cuando ya estaba pactado como día de trabajo, o al revés.
//
// Las horas van en UTC explícito (CLAUDE.md §8.1).

const SIEMPRE = new Date(Date.UTC(2000, 0, 1, 5));
const TIPOS = [
  { codigo: 'HOD', nombre: 'Hora Ordinaria Diurna', recargo: 1.0 },
  { codigo: 'HON', nombre: 'Hora Ordinaria Nocturna', recargo: 1.35 },
  { codigo: 'HED', nombre: 'Hora Extra Diurna', recargo: 1.25 },
  { codigo: 'HEN', nombre: 'Hora Extra Nocturna', recargo: 1.75 },
  { codigo: 'HDD', nombre: 'Hora Dominical/Festiva Diurna', recargo: 1.9 },
  { codigo: 'HND', nombre: 'Hora Dominical/Festiva Nocturna', recargo: 2.25 },
  { codigo: 'HEDD', nombre: 'Extra Dominical Diurna', recargo: 2.15 },
  { codigo: 'HEND', nombre: 'Extra Dominical Nocturna', recargo: 2.65 },
].map(t => ({ ...t, horaInicio: 6, horaFin: 21, activo: true, vigenteDesde: SIEMPRE, vigenteHasta: null }));
const JORNADAS = [{ vigenteDesde: SIEMPRE, horasSemanales: 42 }];

// Septiembre de 2026: el 7 es lunes, así que el 13 es DOMINGO y el 9 es MIÉRCOLES.
const enBogota = (dia: number, h: number) => new Date(Date.UTC(2026, 8, dia, h + 5, 0, 0));
const DOMINGO_13 = enBogota(13, 0);
const MIERCOLES_9 = enBogota(9, 0);

// Un día materializado cualquiera, sin nada raro: 08:00 a 16:00 sin almuerzo que descontar.
const diaDe = (fecha: Date, esDescanso?: boolean | null): DiaEsperadoCalculado => ({
  fecha, programado: true, horaEntrada: '08:00', horaSalida: '16:00', toleranciaMin: 0,
  almuerzoMin: 0, minutosEsperados: 480, toleranciaSalidaMin: 0, ajustaEntrada: false,
  almuerzoInicio: null, almuerzoFin: null, descansos: null,
  ...(esDescanso === undefined ? {} : { esDescanso }),
});

const marcaDe = (fecha: Date, dia: number) => ({
  id: `r-${dia}`, fecha, entrada: enBogota(dia, 8), salida: enBogota(dia, 16),
});

const liquidar = (
  fecha: Date, dia: number, dias: DiaEsperadoCalculado[], fuente?: FuenteDelDescanso,
) => liquidarRegistros(
  [marcaDe(fecha, dia)], null, construirExtraConfig('SEMANAL', null, []), [],
  TIPOS, JORNADAS, 1_500_000, 210, false, dias, fuente,
);

const minutosDe = (r: ReturnType<typeof liquidar>, codigo: string) =>
  Math.round((r.liquidacion.find(l => l.codigo === codigo)?.horas ?? 0) * 60);

describe('sin fuente: la liquidación no se mueve', () => {
  it('un domingo trabajado sigue siendo dominical', () => {
    // La red de seguridad del cambio entero: quien no pasa el parámetro sigue liquidando contra la
    // presunción legal, o sea el domingo, así que ningún número se mueve por el camino de siempre.
    const r = liquidar(DOMINGO_13, 13, [diaDe(DOMINGO_13)]);
    expect(minutosDe(r, 'HDD')).toBe(480);
    expect(minutosDe(r, 'HOD')).toBe(0);
  });

  it('un miércoles trabajado sigue siendo ordinario', () => {
    const r = liquidar(MIERCOLES_9, 9, [diaDe(MIERCOLES_9)]);
    expect(minutosDe(r, 'HOD')).toBe(480);
    expect(minutosDe(r, 'HDD')).toBe(0);
  });
});

// EL CABLE LLEVA AL MOTOR EL HORARIO DE LA PERSONA (30 de septiembre de 2026). Antes llevaba una
// declaración por persona; esas columnas se borraron y ahora el día sale de las FRANJAS. El cable es
// el mismo y lo que se afirma aquí también: lo único que cambió es de dónde viene el dato.
describe('con un horario que libra el miércoles, el cable lo lleva al motor', () => {
  const LIBRA_MIERCOLES: FuenteDelDescanso = {
    de: 'HORARIO', diasQueTrabaja: ['LUNES', 'MARTES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'],
  };

  it('el domingo deja de cobrar recargo dominical', () => {
    // El caso del cliente que tiene gente trabajando domingos con acuerdo escrito: hoy le cobra
    // el 90% de un día que estaba pactado como ordinario.
    const r = liquidar(DOMINGO_13, 13, [diaDe(DOMINGO_13)], LIBRA_MIERCOLES);
    expect(minutosDe(r, 'HOD')).toBe(480);
    expect(minutosDe(r, 'HDD')).toBe(0);
  });

  it('y el miércoles pasa a cobrarlo', () => {
    // La otra mitad, y la que impide que esto sea solo un descuento: mover el descanso no lo
    // borra, lo cambia de día.
    const r = liquidar(MIERCOLES_9, 9, [diaDe(MIERCOLES_9)], LIBRA_MIERCOLES);
    expect(minutosDe(r, 'HDD')).toBe(480);
    expect(minutosDe(r, 'HOD')).toBe(0);
  });
});

describe('lo congelado en el día manda sobre el horario de hoy', () => {
  const LIBRA_MIERCOLES: FuenteDelDescanso = {
    de: 'HORARIO', diasQueTrabaja: ['LUNES', 'MARTES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'],
  };

  it('un domingo congelado como descanso cobra recargo aunque hoy su horario libre el miércoles', () => {
    // Es la razón de ser de `DiaEsperado`: cambiarle el horario hoy no puede reescribir lo que ya se
    // liquidó. La fila vieja gana.
    const r = liquidar(DOMINGO_13, 13, [diaDe(DOMINGO_13, true)], LIBRA_MIERCOLES);
    expect(minutosDe(r, 'HDD')).toBe(480);
  });

  it('un domingo congelado como día de trabajo NO cobra recargo, ni sin fuente', () => {
    // El `false` congelado tiene que distinguirse del `null`. Si el cable usara `??` en vez de
    // preguntar si la fecha está, este caso caería al respaldo y volvería a ser dominical.
    const r = liquidar(DOMINGO_13, 13, [diaDe(DOMINGO_13, false)]);
    expect(minutosDe(r, 'HOD')).toBe(480);
    expect(minutosDe(r, 'HDD')).toBe(0);
  });

  it('un día con esDescanso en null cae al respaldo y no altera nada', () => {
    // Las filas anteriores a la columna. Son la inmensa mayoría de lo que hay en producción.
    const r = liquidar(DOMINGO_13, 13, [diaDe(DOMINGO_13, null)]);
    expect(minutosDe(r, 'HDD')).toBe(480);
  });
});
