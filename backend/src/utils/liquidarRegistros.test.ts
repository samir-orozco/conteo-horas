import { describe, it, expect } from 'vitest';
import { liquidarRegistros, cobroDePausas } from './liquidarRegistros';
import { construirExtraConfig, type HorarioConFranjas } from './tardanzas';
import type { DiaEsperadoCalculado } from './diasEsperados';

// LAS PAUSAS DE UN DÍA NO PUEDEN DEPENDER DE QUÉ FILA LLEGA PRIMERO (12 de septiembre de 2026).
//
// La liquidación le cobraba el almuerzo y los descansos del día entero a la primera fila
// que pudiera pagar algo, y daba el día por cobrado aunque esa fila solo alcanzara a pagar
// diez minutos. Darío, con una marca de 06:50 a 07:00 creada antes que la de 07:00 a 16:00,
// quedaba liquidado con 515 minutos mientras la tabla de Registros le contaba 465: la
// empresa le pagaba 50 minutos que no trabajó. Lo encontró la costura de varios descansos
// (prisma/verificar-descanso.ts, parte 3b).
//
// Las horas van en UTC explícito (CLAUDE.md 8.1).

const SIEMPRE = new Date(Date.UTC(2000, 0, 1, 5));
// Recargos colombianos vigentes en 2026. La franja diurna es 06:00–21:00.
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

// Un instante del lunes 7 de septiembre de 2026 en hora de Bogotá (UTC-5 fijo).
const lunes = (h: number, min = 0) => new Date(Date.UTC(2026, 8, 7, h + 5, min, 0));
const LUNES = lunes(0);
// Una marcación del lunes. `pausa` dice a qué salió al terminarla.
const fila = (id: string, desde: [number, number], hasta: [number, number], pausa: { salidaAlmuerzo?: boolean; salidaDescanso?: boolean } = {}) =>
  ({ id, fecha: LUNES, entrada: lunes(...desde), salida: lunes(...hasta), ...pausa });

// El día del dueño: de 07:00 a 16:00, almuerzo de 12:00 a 13:00 y dos descansos que suman 25.
const DIA: DiaEsperadoCalculado = {
  fecha: LUNES, programado: true, horaEntrada: '07:00', horaSalida: '16:00', toleranciaMin: 0,
  almuerzoMin: 60, minutosEsperados: 455, toleranciaSalidaMin: 0, ajustaEntrada: false,
  almuerzoInicio: '12:00', almuerzoFin: '13:00', descansos: '09:00-09:15,15:00-15:10',
};

const liquidar = (registros: ReturnType<typeof fila>[], dias: DiaEsperadoCalculado[], horario: HorarioConFranjas | null = null) =>
  liquidarRegistros(registros, horario, construirExtraConfig('SEMANAL', null, []), [], TIPOS, JORNADAS, 1_500_000, 210, false, dias);
const minutosDe = (r: ReturnType<typeof liquidar>, codigo: string) =>
  Math.round((r.liquidacion.find(l => l.codigo === codigo)?.horas ?? 0) * 60);

describe('liquidarRegistros: las pausas de un día se cobran enteras, llegue primero la fila que llegue', () => {
  const corta = fila('corta', [6, 50], [7, 0]);
  const larga = fila('larga', [7, 0], [16, 0]);

  it('Darío: la marca corta creada primero no deja sin cobrar el resto del almuerzo ni los descansos', () => {
    // A mano: 10 + 540 = 550 trabajados; 60 dentro del almuerzo y 25 dentro de los descansos → 465.
    expect(liquidar([corta, larga], [DIA]).minutosOrdinarios).toBe(465);
  });

  it('y da lo mismo con las filas al revés', () => {
    expect(liquidar([larga, corta], [DIA]).minutosOrdinarios).toBe(465);
  });

  it('volvió antes del almuerzo: se completa hasta la hora fijada, sin cobrarla dos veces', () => {
    // Salió a almorzar a las 12:30 y volvió a las 12:45: tomó 15 de sus 60 minutos, así que
    // se descuentan los 45 que faltan. 330 + 195 = 525, menos 45 y 25 de descansos → 455.
    expect(liquidar([fila('m', [7, 0], [12, 30], { salidaAlmuerzo: true }), fila('t', [12, 45], [16, 0])], [DIA]).minutosOrdinarios).toBe(455);
  });

  it('el almuerzo fijo sin ventana también se cobra entero, aunque la primera fila solo tenga diez minutos', () => {
    const sinVentana = { ...DIA, almuerzoInicio: null, almuerzoFin: null, descansos: null };
    expect(liquidar([corta, larga], [sinVentana]).minutosOrdinarios).toBe(490);
  });

  it('sin día congelado, el almuerzo del horario también se cobra entero', () => {
    const horario = {
      activo: true, almuerzoMin: 60,
      franjas: [{ dias: ['LUNES'], horaEntrada: '07:00', horaSalida: '16:00', tieneAlmuerzo: true }],
    } as unknown as HorarioConFranjas;
    expect(liquidar([corta, larga], [], horario).minutosOrdinarios).toBe(490);
  });
});

describe('liquidarRegistros: cada pausa se le cobra a la fila donde pasó', () => {
  const madrugada = { ...DIA, horaEntrada: '06:00', horaSalida: '15:00', descansos: null };

  it('diez minutos nocturnos antes de las 06:00 no pagan el almuerzo del mediodía', () => {
    // Antes la fila de las 05:50 pagaba diez minutos del almuerzo con horas nocturnas y
    // los otros cincuenta no se cobraban.
    const r = liquidar([fila('noche', [5, 50], [6, 0]), fila('dia', [6, 0], [15, 0])], [madrugada]);
    expect([minutosDe(r, 'HON'), minutosDe(r, 'HOD'), r.minutosOrdinarios]).toEqual([10, 480, 490]);
  });

  it('un descanso que cruza las 06:00 cobra su parte nocturna de la fila nocturna, aunque esa fila llegue de segunda', () => {
    const cruzado = { ...madrugada, almuerzoInicio: null, almuerzoFin: null, almuerzoMin: 0, descansos: '05:55-06:05' };
    const r = liquidar([fila('dia', [6, 0], [15, 0]), fila('noche', [5, 50], [6, 0])], [cruzado]);
    expect([minutosDe(r, 'HON'), minutosDe(r, 'HOD')]).toEqual([5, 535]);
  });
});

describe('liquidarRegistros: la pausa cuesta siempre el tiempo fijado (12 de septiembre de 2026)', () => {
  // De 07:00 a 16:00 con almuerzo de 12:00 a 13:00 y sin descansos: el día exige 480.
  const soloAlmuerzo = { ...DIA, descansos: null, minutosEsperados: 480 };

  it('almorzó a otra hora, de 11:00 a 12:00: cuenta 8 h, no 7 h', () => {
    const r = liquidar([fila('m', [7, 0], [11, 0], { salidaAlmuerzo: true }), fila('t', [12, 0], [16, 0])], [soloAlmuerzo]);
    expect(r.minutosOrdinarios).toBe(480);
  });

  it('salió 10 minutos antes y volvió a la hora: cuenta 8 h, no 7 h 50 min', () => {
    const r = liquidar([fila('m', [7, 0], [11, 50], { salidaAlmuerzo: true }), fila('t', [12, 50], [16, 0])], [soloAlmuerzo]);
    expect(r.minutosOrdinarios).toBe(480);
  });

  it('se demoró, de 12:00 a 13:30: cuenta 7 h 30 min', () => {
    const r = liquidar([fila('m', [7, 0], [12, 0], { salidaAlmuerzo: true }), fila('t', [13, 30], [16, 0])], [soloAlmuerzo]);
    expect(r.minutosOrdinarios).toBe(450);
  });

  it('se fue a las 11:00: se descuenta igual la hora del almuerzo', () => {
    expect(liquidar([fila('m', [7, 0], [11, 0])], [soloAlmuerzo]).minutosOrdinarios).toBe(180);
  });

  it('una jornada nocturna se cuenta por su fecha: el regreso de la madrugada es del mismo día', () => {
    // Del lunes a las 22:00 al martes a las 06:00, con almuerzo de 01:00 a 01:30 marcado
    // completo. El regreso entra el martes pero su fila es del lunes: contado por el día de
    // la entrada, el almuerzo quedaba sin regreso y se cobraba entero.
    const noche = { ...DIA, horaEntrada: '22:00', horaSalida: '06:00', almuerzoMin: 30, almuerzoInicio: '01:00', almuerzoFin: '01:30', descansos: null, minutosEsperados: 450 };
    const r = liquidar([fila('antes', [22, 0], [25, 0], { salidaAlmuerzo: true }), fila('despues', [25, 30], [30, 0])], [noche]);
    expect(r.minutosOrdinarios).toBe(450);
  });
});

describe('liquidarRegistros: dice lo mismo que la tabla de Registros', () => {
  it('volvió del descanso y sigue trabajando: su regreso está en una marcación todavía abierta', () => {
    // La tabla lo ve y no le descuenta nada; la liquidación, sin la marcación abierta, lo daba
    // por no vuelto y le cobraba el descanso entero mientras seguía en su turno.
    const soloDescanso = { ...DIA, almuerzoMin: 0, almuerzoInicio: null, almuerzoFin: null, descansos: '09:00-09:15', minutosEsperados: 525 };
    const abierta = { id: 'abierta', fecha: LUNES, entrada: lunes(9, 15), salida: null };
    const r = liquidar([fila('m', [7, 0], [9, 0], { salidaDescanso: true }), abierta], [soloDescanso]);
    expect([r.minutosOrdinarios, r.registrosCont]).toEqual([120, 1]);
  });

  it('dos marcas de segundos con una hora de almuerzo: cero, como en la tabla', () => {
    // Pedro Salazar el 17 de julio en la base local: de 14:29:50 a 14:29:58 y de 14:30:05 a
    // 14:31:52. La tabla cuenta 0. Redondeando lo que le toca a cada fila, la primera quedaba
    // debiendo cero y sus ocho segundos se pagaban.
    const sinVentana = { ...DIA, almuerzoInicio: null, almuerzoFin: null, descansos: null };
    const conSegundos = (id: string, h: number, m: number, s: number) => new Date(lunes(h, m).getTime() + s * 1000);
    const marcas = [
      { id: 'a', fecha: LUNES, entrada: conSegundos('a', 14, 29, 50), salida: conSegundos('a', 14, 29, 58) },
      { id: 'b', fecha: LUNES, entrada: conSegundos('b', 14, 30, 5), salida: conSegundos('b', 14, 31, 52) },
    ];
    expect(liquidar(marcas, [sinVentana]).minutosOrdinarios).toBe(0);
  });
});

describe('cobroDePausas', () => {
  const pagaHasta = (tope: number) => (m: number) => ({ descontado: Math.min(m, tope) });

  it('lo que una fila no alcanza a pagar lo paga la siguiente del mismo día', () => {
    const cobrar = cobroDePausas();
    expect(cobrar('lunes', 60, pagaHasta(10))).toBe(10);
    expect(cobrar('lunes', 60, pagaHasta(500))).toBe(50);
    expect(cobrar('lunes', 60, pagaHasta(500))).toBe(0);
  });

  it('cada día lleva su propia cuenta', () => {
    const cobrar = cobroDePausas();
    cobrar('lunes', 60, pagaHasta(500));
    expect(cobrar('martes', 60, pagaHasta(500))).toBe(60);
  });

  it('con lo debido creciendo fila a fila, cada fila paga solo lo suyo', () => {
    const cobrar = cobroDePausas();
    expect(cobrar('lunes', 5, pagaHasta(500))).toBe(5);
    expect(cobrar('lunes', 10, pagaHasta(500))).toBe(5);
  });

  it('una fila que ya no debe nada no toca sus horas', () => {
    const cobrar = cobroDePausas();
    cobrar('lunes', 60, pagaHasta(500));
    let tocada = false;
    cobrar('lunes', 60, m => { tocada = true; return { descontado: m }; });
    expect(tocada).toBe(false);
  });
});
