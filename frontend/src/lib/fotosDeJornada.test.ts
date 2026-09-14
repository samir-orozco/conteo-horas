import { describe, it, expect } from 'vitest';
import { agruparPorJornada, sedesDelTurno, partesDeLaJornada } from './fotosDeJornada';
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
