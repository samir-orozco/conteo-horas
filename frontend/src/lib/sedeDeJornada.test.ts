import { describe, it, expect } from 'vitest';
import { cruzoDeSede, cumpleSede, cumpleCruce, opcionesDeSede, CRUCE_DISTINTAS } from './sedeDeJornada';

const POBLADO = { id: 's1', nombre: 'El Poblado' };
const LAURELES = { id: 's2', nombre: 'Laureles' };

describe('cruzoDeSede', () => {
  it('abrió y cerró en la misma: no cruzó', () => {
    expect(cruzoDeSede({ sede: POBLADO, sedeSalida: POBLADO })).toBe(false);
  });
  it('abrió en una y cerró en otra: cruzó', () => {
    expect(cruzoDeSede({ sede: POBLADO, sedeSalida: LAURELES })).toBe(true);
  });
  it('se compara por id: dos sedes con el mismo nombre son dos sitios', () => {
    expect(cruzoDeSede({ sede: { id: 's1', nombre: 'Principal' }, sedeSalida: { id: 's9', nombre: 'Principal' } })).toBe(true);
  });
  it('sin la sede de cierre no se sabe, y NO cuenta como cruce', () => {
    expect(cruzoDeSede({ sede: POBLADO, sedeSalida: null })).toBe(false);
    expect(cruzoDeSede({ sede: POBLADO })).toBe(false);
  });
});

describe('cumpleSede', () => {
  it('sin elegir nada, pasa todo', () => {
    expect(cumpleSede({}, [])).toBe(true);
  });
  it('pasa si ABRIÓ en la elegida', () => {
    expect(cumpleSede({ sede: POBLADO, sedeSalida: LAURELES }, ['s1'])).toBe(true);
  });
  it('pasa si CERRÓ en la elegida: un supervisor que terminó ahí también estuvo ahí', () => {
    expect(cumpleSede({ sede: POBLADO, sedeSalida: LAURELES }, ['s2'])).toBe(true);
  });
  it('no pasa si no tocó ninguna de las elegidas', () => {
    expect(cumpleSede({ sede: POBLADO, sedeSalida: POBLADO }, ['s2'])).toBe(false);
    expect(cumpleSede({}, ['s1'])).toBe(false);
  });
});

describe('cumpleCruce', () => {
  it('sin elegirlo, pasa todo', () => {
    expect(cumpleCruce({ sede: POBLADO, sedeSalida: POBLADO }, [])).toBe(true);
  });
  it('elegido, deja solo las que cruzaron', () => {
    expect(cumpleCruce({ sede: POBLADO, sedeSalida: LAURELES }, [CRUCE_DISTINTAS])).toBe(true);
    expect(cumpleCruce({ sede: POBLADO, sedeSalida: POBLADO }, [CRUCE_DISTINTAS])).toBe(false);
    expect(cumpleCruce({ sede: POBLADO }, [CRUCE_DISTINTAS])).toBe(false);
  });
});

describe('opcionesDeSede', () => {
  const BELEN = { id: 's3', nombre: 'Belén' };

  it('sin filas, son las sedes activas', () => {
    expect(opcionesDeSede([POBLADO, LAURELES], [])).toEqual([
      { ...POBLADO, activa: true }, { ...LAURELES, activa: true },
    ]);
  });
  it('una sede desactivada que aparece en las filas se sigue ofreciendo, marcada como tal', () => {
    // El servidor solo lista las activas, pero los registros viejos conservan su
    // sede: sin esto no habría forma de aislar las jornadas de una sede cerrada.
    expect(opcionesDeSede([POBLADO], [{ sede: POBLADO, sedeSalida: LAURELES }])).toEqual([
      { ...POBLADO, activa: true }, { ...LAURELES, activa: false },
    ]);
  });
  it('también si solo aparece como sede de apertura', () => {
    expect(opcionesDeSede([POBLADO], [{ sede: BELEN }]).map(s => s.id)).toEqual(['s3', 's1']);
  });
  it('no repite la que está activa y además en las filas', () => {
    expect(opcionesDeSede([POBLADO], [{ sede: POBLADO, sedeSalida: POBLADO }])).toHaveLength(1);
  });
  it('van en orden alfabético, con las tildes en su sitio', () => {
    expect(opcionesDeSede([LAURELES, POBLADO], [{ sede: BELEN }]).map(s => s.nombre))
      .toEqual(['Belén', 'El Poblado', 'Laureles']);
  });
});
