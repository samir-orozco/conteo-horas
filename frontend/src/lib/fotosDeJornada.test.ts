import { describe, it, expect } from 'vitest';
import { agruparPorJornada, sedesDelTurno } from './fotosDeJornada';
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

  it('la salida a descanso no es el cierre del turno', () => {
    const r = sedesDelTurno([
      f({ sede: POBLADO }),
      f({ momento: 'SALIDA_ALMUERZO', sede: LAURELES }),
    ]);
    expect(r.cerro).toBeNull();
    expect(r.distintas).toBe(false);
  });
});
