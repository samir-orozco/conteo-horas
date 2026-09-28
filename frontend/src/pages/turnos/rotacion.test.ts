import { describe, it, expect } from 'vitest';
import { ROTACIONES, accionDelDia, planDeRotacion, semanasSinDescanso } from './rotacion';
import { diasDeLaSemana, sumarDias } from './semana';

// EL MOTOR DE ROTACIONES (28 de septiembre de 2026).
//
// Nadie pinta el mismo turno treinta días seguidos: rota. Pintar día a día sirve para una semana y
// se vuelve inviable para un mes con veinte personas, que es cuando el planificador tiene que
// ayudar de verdad.
//
// UNA ROTACIÓN ES UN CICLO: tantos días de trabajo, tantos de descanso, y vuelta a empezar. Lo que
// lo decide todo es si el ciclo CUADRA con la semana:
//
//   6x1 y 5x2 duran 7 días, así que el descanso cae SIEMPRE el mismo día de la semana.
//   4x2 dura 6 y 2x2 dura 4: no cuadran, así que el descanso SE CORRE cada semana.
//
// Ese corrimiento es la razón de ser del tipo ROTATIVO en la ley, y también el riesgo que hay que
// vigilar: una semana entera trabajada no es legal. Por eso `semanasSinDescanso` vive aquí, al lado
// del motor que podría producirla.
//
// TODO SOBRE CADENAS "YYYY-MM-DD", nunca sobre `Date`: las fechas las mueve `semana.ts`, que ancla
// a mediodía UTC por la razón de CLAUDE.md §7. Reimplementar aquí el manejo de fechas sería tener
// la misma regla de zona horaria en dos sitios (§9.3).

const LUNES = '2026-09-28'; // lunes de verdad, comprobado contra el calendario de la aplicación

describe('el catálogo de rotaciones', () => {
  it('el ciclo de cada patrón es exactamente trabaja + descansa', () => {
    // La invariante que sostiene toda la aritmética de abajo. Si alguien agrega un patrón con el
    // ciclo mal puesto, el reparto se desalinea en silencio y nadie lo nota hasta ver el calendario.
    for (const [nombre, r] of Object.entries(ROTACIONES)) {
      expect(`${nombre}: ${r.ciclo}`).toBe(`${nombre}: ${r.trabaja + r.descansa}`);
    }
  });

  it('todos tienen al menos un día de trabajo y uno de descanso', () => {
    for (const [nombre, r] of Object.entries(ROTACIONES)) {
      expect(`${nombre} trabaja ${r.trabaja > 0}`).toBe(`${nombre} trabaja true`);
      expect(`${nombre} descansa ${r.descansa > 0}`).toBe(`${nombre} descansa true`);
    }
  });
});

describe('qué le toca a cada día del ciclo', () => {
  const patron = (p: Parameters<typeof accionDelDia>[0], desfase: number, dias: number) =>
    Array.from({ length: dias }, (_, i) => (accionDelDia(p, desfase, i) === 'TURNO' ? 'T' : '.')).join('');

  it('6x1 trabaja seis y descansa uno', () => {
    expect(patron('6x1', 0, 14)).toBe('TTTTTT.TTTTTT.');
  });

  it('5x2 deja dos días seguidos, como un lunes a viernes', () => {
    expect(patron('5x2', 0, 14)).toBe('TTTTT..TTTTT..');
  });

  it('4x2 NO cuadra con la semana, y por eso el descanso se corre', () => {
    // Catorce días son dos semanas, pero el ciclo dura seis: el patrón no se repite igual.
    expect(patron('4x2', 0, 14)).toBe('TTTT..TTTT..TT');
  });

  it('2x2 se corre todavía más rápido', () => {
    expect(patron('2x2', 0, 12)).toBe('TT..TT..TT..');
  });

  it('el desfase corre el ciclo sin cambiarlo', () => {
    // Con desfase 6 el primer día ya es el descanso del 6x1.
    expect(patron('6x1', 6, 7)).toBe('.TTTTTT');
  });

  it('un desfase mayor que el ciclo da lo mismo que su resto', () => {
    expect(patron('6x1', 7, 7)).toBe(patron('6x1', 0, 7));
    expect(patron('4x2', 6, 12)).toBe(patron('4x2', 0, 12));
  });

  it('un desfase NEGATIVO también se normaliza, no rompe', () => {
    // Un `%` a secas en JavaScript devuelve negativo, y ahí el índice se sale del ciclo.
    expect(patron('6x1', -1, 7)).toBe(patron('6x1', 6, 7));
  });
});

describe('el plan que se va a escribir', () => {
  it('devuelve una entrada por fecha, en el mismo orden', () => {
    const fechas = diasDeLaSemana(LUNES);
    const plan = planDeRotacion('6x1', 0, fechas);
    expect(plan.map(p => p.fecha)).toEqual(fechas);
    expect(plan.map(p => p.accion)).toEqual([
      'TURNO', 'TURNO', 'TURNO', 'TURNO', 'TURNO', 'TURNO', 'DESCANSO',
    ]);
  });

  it('la posición en el ciclo se cuenta desde la PRIMERA fecha de la lista', () => {
    // Y no desde cada celda suelta: así dos personas con el mismo desfase quedan alineadas entre
    // sí, que es de lo que vive una rotación en un equipo.
    const plan = planDeRotacion('6x1', 0, [LUNES, sumarDias(LUNES, 6)]);
    expect(plan[0].accion).toBe('TURNO');
    expect(plan[1].accion).toBe('DESCANSO');
  });

  it('sin fechas devuelve un plan vacío y no revienta', () => {
    expect(planDeRotacion('6x1', 0, [])).toEqual([]);
  });
});

describe('las semanas que se quedarían sin descanso', () => {
  // Octubre de 2026: el 1 cae jueves, así que la primera semana ENTERA dentro del mes es la del
  // lunes 5. La del 28 de septiembre queda partida por el borde y no se juzga.
  const MES = '2026-10';
  const SEMANA_ENTERA = '2026-10-05';

  const trabajados = (lunes: string, cuantos: number) =>
    Object.fromEntries(diasDeLaSemana(lunes).slice(0, cuantos).map(f => [f, true]));

  it('una semana completa trabajada dentro del mes SE MARCA', () => {
    expect(semanasSinDescanso(trabajados(SEMANA_ENTERA, 7), MES)).toEqual([SEMANA_ENTERA]);
  });

  it('con un solo día de descanso NO se marca', () => {
    expect(semanasSinDescanso(trabajados(SEMANA_ENTERA, 6), MES)).toEqual([]);
  });

  it('una semana SIN NADA programado tampoco se marca', () => {
    // Cero descansos y cero trabajo no es una infracción: es una semana vacía. Sin esta distinción,
    // un mes recién abierto se encendería entero en rojo, que es como se enseña a ignorar un aviso.
    expect(semanasSinDescanso({}, MES)).toEqual([]);
  });

  it('una semana partida por el borde del mes NO se juzga', () => {
    // Le faltan días que viven en otro mes: juzgarla sería juzgarla a medias.
    const partida = trabajados('2026-09-28', 7);
    expect(semanasSinDescanso(partida, MES)).toEqual([]);
  });

  it('marca varias semanas cuando hay varias', () => {
    const dos = { ...trabajados('2026-10-05', 7), ...trabajados('2026-10-12', 7) };
    expect(semanasSinDescanso(dos, MES)).toEqual(['2026-10-05', '2026-10-12']);
  });

  // EL HALLAZGO QUE JUSTIFICA DÓNDE VIVE ESTA COMPROBACIÓN.
  //
  // Ninguno de los cuatro patrones puede dejar una semana sin descanso, y no es opinión: un ciclo
  // de siete días o menos con al menos un día de descanso deja siempre uno dentro de cualquier
  // ventana de siete días seguidos. O sea que las rotaciones son legales por construcción, y esta
  // comprobación existe para el OTRO camino: pintar un mismo turno sobre una semana entera a mano.
  it('ninguna rotación del catálogo puede producir una semana sin descanso', () => {
    const fechas = Array.from({ length: 28 }, (_, i) => sumarDias('2026-10-05', i));
    for (const patron of Object.keys(ROTACIONES) as (keyof typeof ROTACIONES)[]) {
      for (let desfase = 0; desfase < ROTACIONES[patron].ciclo; desfase++) {
        const plan = planDeRotacion(patron, desfase, fechas);
        const mapa = Object.fromEntries(plan.map(p => [p.fecha, p.accion === 'TURNO']));
        expect(`${patron}+${desfase}: ${semanasSinDescanso(mapa, MES).length}`).toBe(`${patron}+${desfase}: 0`);
      }
    }
  });
});
