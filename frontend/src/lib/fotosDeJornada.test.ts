import { describe, it, expect } from 'vitest';
import { agruparPorJornada, sedesDelTurno, partesDeLaJornada, avisosDelTurno } from './fotosDeJornada';
import type { FotoDeJornada } from '../constants/momentos';

const f = (p: Partial<FotoDeJornada>): FotoDeJornada => ({
  registroId: 'r1', momento: 'ENTRADA', hora: null, foto: null, estimada: false, ...p,
});
const POBLADO = { id: 's1', nombre: 'El Poblado' };
const LAURELES = { id: 's2', nombre: 'Laureles' };

describe('agruparPorJornada', () => {
  it('agrupa por turno respetando el orden de llegada dentro de cada uno', () => {
    const fotos = [
      f({ registroId: 'a', momento: 'ENTRADA', jornada: 0 }),
      f({ registroId: 'a', momento: 'SALIDA', jornada: 0 }),
      f({ registroId: 'b', momento: 'ENTRADA', jornada: 1 }),
    ];
    expect(agruparPorJornada(fotos).map(g => g.map(x => `${x.registroId}:${x.momento}`)))
      .toEqual([['a:ENTRADA', 'a:SALIDA'], ['b:ENTRADA']]);
  });

  it('ordena los turnos aunque lleguen desordenados', () => {
    const fotos = [f({ registroId: 'b', jornada: 1 }), f({ registroId: 'a', jornada: 0 })];
    expect(agruparPorJornada(fotos).map(g => g[0].registroId)).toEqual(['a', 'b']);
  });

  it('si UNA sola foto no trae turno, no agrupa nada: una lista, como antes', () => {
    const fotos = [f({ jornada: 0 }), f({ momento: 'SALIDA' })];
    expect(agruparPorJornada(fotos)).toEqual([fotos]);
  });

  it('sin fotos no hay grupos', () => {
    expect(agruparPorJornada([])).toEqual([]);
  });
});

describe('sedesDelTurno', () => {
  it('abrió y cerró en la misma sede', () => {
    const r = sedesDelTurno([f({ sede: POBLADO }), f({ momento: 'SALIDA', sede: POBLADO })]);
    expect(r.distintas).toBe(false);
    expect(r.abrio?.nombre).toBe('El Poblado');
  });

  it('abrió en una y cerró en otra', () => {
    const r = sedesDelTurno([f({ sede: POBLADO }), f({ momento: 'SALIDA', sede: LAURELES })]);
    expect(r.distintas).toBe(true);
    expect([r.abrio?.nombre, r.cerro?.nombre]).toEqual(['El Poblado', 'Laureles']);
  });

  it('se compara por id: dos sedes con el mismo nombre son dos sitios', () => {
    const r = sedesDelTurno([
      f({ sede: { id: 's1', nombre: 'Principal' } }),
      f({ momento: 'SALIDA', sede: { id: 's9', nombre: 'Principal' } }),
    ]);
    expect(r.distintas).toBe(true);
  });

  it('una salida sin sede registrada NO cuenta como «otra sede»', () => {
    expect(sedesDelTurno([f({ sede: POBLADO }), f({ momento: 'SALIDA', sede: null })]).distintas).toBe(false);
    expect(sedesDelTurno([f({ sede: POBLADO }), f({ momento: 'SALIDA' })]).distintas).toBe(false);
  });

  it('la sede que se le atribuye a una entrada no es una apertura probada: no hay «sedes distintas»', () => {
    // 12 de septiembre de 2026: el servidor manda `sedeAtribuida` en las entradas de
    // un presencial sin ubicación. Solo sirve para mostrarla con «por defecto».
    const r = sedesDelTurno([
      f({ sede: null, sedeAtribuida: { ...POBLADO, activa: true, porDefecto: true } }),
      f({ momento: 'SALIDA', sede: LAURELES }),
    ]);
    expect(r.abrio).toBeNull();
    expect(r.distintas).toBe(false);
  });

  it('la salida a almorzar no es el cierre del turno', () => {
    const r = sedesDelTurno([
      f({ sede: POBLADO }),
      f({ momento: 'SALIDA_ALMUERZO', sede: LAURELES }),
    ]);
    expect(r.cerro).toBeNull();
    expect(r.distintas).toBe(false);
  });

  it('la salida al descanso tampoco es el cierre, y la sede atribuida a su regreso no abre el turno', () => {
    // Unión con el descanso no remunerado (12 de septiembre de 2026): el servidor le
    // atribuye sede a la foto del regreso de una pausa. Con el cierre leído como
    // «cualquier salida», este turno diría que cerró en Laureles.
    const r = sedesDelTurno([
      f({ sede: POBLADO }),
      f({ momento: 'SALIDA_DESCANSO', sede: LAURELES }),
      f({ momento: 'REGRESO_DESCANSO', sede: null, sedeAtribuida: { ...LAURELES, activa: true, porDefecto: true } }),
    ]);
    expect(r.abrio?.nombre).toBe('El Poblado');
    expect(r.cerro).toBeNull();
    expect(r.distintas).toBe(false);
  });
});

// LAS FOTOS DE UN TURNO, POR PARTES (13 de septiembre de 2026, pedido del dueño): la entrada y la
// salida, el almuerzo y el descanso, siempre en ese orden. En el orden en que se marcaron, las
// pausas quedaban revueltas con la jornada. Cada fila junta lo que abre y lo que cierra.
describe('partesDeLaJornada', () => {
  const clave = (partes: ReturnType<typeof partesDeLaJornada>) => partes.map(p =>
    `${p.parte}: ${p.filas.map(fila => `${fila.abre?.registroId ?? '-'}/${fila.cierra?.registroId ?? '-'}`).join(' ')}`);

  it('tres partes en orden fijo, aunque se marcaran intercaladas', () => {
    const fotos = [
      f({ registroId: 'e', momento: 'ENTRADA' }),
      f({ registroId: 'd1', momento: 'SALIDA_DESCANSO' }),
      f({ registroId: 'd2', momento: 'REGRESO_DESCANSO' }),
      f({ registroId: 'a1', momento: 'SALIDA_ALMUERZO' }),
      f({ registroId: 'a2', momento: 'REGRESO_ALMUERZO' }),
      f({ registroId: 's', momento: 'SALIDA' }),
    ];
    expect(clave(partesDeLaJornada(fotos))).toEqual(['ENTRADA_Y_SALIDA: e/s', 'ALMUERZO: a1/a2', 'DESCANSO: d1/d2']);
  });

  it('cada salida a una pausa va con su regreso, y la que no volvió queda con el hueco', () => {
    const fotos = [
      f({ registroId: 'x1', momento: 'SALIDA_DESCANSO' }),
      f({ registroId: 'y1', momento: 'SALIDA_DESCANSO' }),
      f({ registroId: 'y2', momento: 'REGRESO_DESCANSO' }),
    ];
    expect(clave(partesDeLaJornada(fotos))).toEqual(['DESCANSO: x1/- y1/y2']);
  });

  it('un regreso sin su salida no se pega a la pausa anterior', () => {
    const fotos = [
      f({ registroId: 'x1', momento: 'SALIDA_ALMUERZO' }),
      f({ registroId: 'x2', momento: 'REGRESO_ALMUERZO' }),
      f({ registroId: 'z', momento: 'REGRESO_ALMUERZO' }),
    ];
    expect(clave(partesDeLaJornada(fotos))).toEqual(['ALMUERZO: x1/x2 -/z']);
  });

  it('sin pausas solo está la entrada y la salida, y sin fotos no hay partes', () => {
    expect(clave(partesDeLaJornada([f({ registroId: 'e' })]))).toEqual(['ENTRADA_Y_SALIDA: e/-']);
    expect(partesDeLaJornada([])).toEqual([]);
  });
});

// LO QUE NO CUADRA EN UN DÍA, DICHO DONDE SE MIRAN LAS FOTOS (2 de octubre de 2026).
//
// El 1 de octubre el modal mostraba la cara de una persona en la entrada y la de
// otra en la salida, tres minutos después, y nada lo señalaba. Un turno de tres
// minutos y volver a entrar a los cuatro son la huella de dos personas tomadas
// por una; las pausas no cuentan, porque volver de un descanso a los diez minutos
// es lo normal.
describe('avisosDelTurno', () => {
  const entrada = (hora: string, p: Partial<FotoDeJornada> = {}) => f({ momento: 'ENTRADA', hora, ...p });
  const salida = (hora: string, p: Partial<FotoDeJornada> = {}) => f({ momento: 'SALIDA', hora, ...p });

  it('EL CASO DEL 1 DE OCTUBRE: un turno de 3 minutos', () => {
    expect(avisosDelTurno([entrada('2026-10-01T13:49:21Z'), salida('2026-10-01T13:52:39Z')], null))
      .toEqual(['Turno de 3 minutos']);
  });

  it('y volver a entrar a los 4 minutos de esa salida', () => {
    const anterior = [entrada('2026-10-01T13:49:21Z'), salida('2026-10-01T13:52:39Z')];
    expect(avisosDelTurno([entrada('2026-10-01T13:56:53Z'), salida('2026-10-01T23:34:45Z')], anterior))
      .toEqual(['Volvió a entrar a los 4 minutos']);
  });

  it('un turno normal no dice nada', () => {
    expect(avisosDelTurno([entrada('2026-10-01T13:00:00Z'), salida('2026-10-01T22:00:00Z')], null)).toEqual([]);
  });

  it('a los 15 minutos ya no es corto', () => {
    expect(avisosDelTurno([entrada('2026-10-01T13:00:00Z'), salida('2026-10-01T13:15:00Z')], null)).toEqual([]);
  });

  it('una salida que puso el sistema no es una marca de nadie', () => {
    expect(avisosDelTurno([entrada('2026-10-01T13:00:00Z'), salida('2026-10-01T13:05:00Z', { estimada: true })], null)).toEqual([]);
  });

  it('salir a una pausa a los pocos minutos no es un turno corto: el turno es la entrada contra su SALIDA', () => {
    const grupo = [
      entrada('2026-10-01T13:00:00Z'),
      f({ momento: 'SALIDA_DESCANSO', hora: '2026-10-01T13:05:00Z' }),
      f({ momento: 'REGRESO_DESCANSO', hora: '2026-10-01T13:15:00Z' }),
      salida('2026-10-01T22:00:00Z'),
    ];
    expect(avisosDelTurno(grupo, null)).toEqual([]);
  });

  it('un turno sin salida todavía no es corto', () => {
    expect(avisosDelTurno([entrada('2026-10-01T13:00:00Z')], null)).toEqual([]);
  });

  it('con menos de un minuto lo dice así, y no «0 minutos»', () => {
    const anterior = [entrada('2026-10-01T13:00:00Z'), salida('2026-10-01T13:00:30Z')];
    expect(avisosDelTurno(anterior, null)).toEqual(['Turno de menos de un minuto']);
    expect(avisosDelTurno([entrada('2026-10-01T13:00:50Z')], anterior)).toEqual(['Volvió a entrar en menos de un minuto']);
  });

  it('un minuto, en singular', () => {
    const anterior = [entrada('2026-10-01T13:00:00Z'), salida('2026-10-01T13:01:10Z')];
    expect(avisosDelTurno(anterior, null)).toEqual(['Turno de 1 minuto']);
    expect(avisosDelTurno([entrada('2026-10-01T13:02:20Z')], anterior)).toEqual(['Volvió a entrar al minuto']);
  });

  it('volver a entrar mucho después es otro turno, sin aviso', () => {
    const anterior = [entrada('2026-10-01T13:00:00Z'), salida('2026-10-01T17:00:00Z')];
    expect(avisosDelTurno([entrada('2026-10-01T19:00:00Z')], anterior)).toEqual([]);
  });
});
