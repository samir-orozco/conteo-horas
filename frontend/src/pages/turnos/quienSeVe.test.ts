import { describe, it, expect } from 'vitest';
import { quienSeVe, type PersonaParaFiltrar } from './quienSeVe';

// A QUIÉN SE VE EN LA REJILLA (28 de septiembre de 2026).
//
// La maqueta tiene buscador, filtro de sede y filtro de cargo, y la vista no tenía ninguno. Con doce
// personas se puede vivir sin ellos; con ciento cincuenta, programar a una sola obliga a recorrer la
// lista entera.
//
// POR QUÉ ES UNA DECISIÓN PURA Y NO UN `filter` DENTRO DEL JSX: de esta lista sale QUÉ SE PUEDE
// SELECCIONAR, y por lo tanto a quién se le escribe cuando se aplica un bloque. Una persona que se
// cuela en la lista filtrada recibe jornadas que nadie quiso ponerle.
//
// LA SEDE ES EN PLURAL, y ahí la maqueta se queda corta a propósito: allí cada persona tiene una sola
// sede (`p.s !== sede`). En la aplicación, `ColaboradorSede` es una tabla puente y un supervisor puede
// recorrer dos. Copiar la maqueta al pie de la letra lo escondería del filtro de una de las dos
// estando asignado a las dos.

const persona = (extra: Partial<PersonaParaFiltrar> = {}): PersonaParaFiltrar => ({
  id: 'c1',
  nombre: 'Julián',
  apellido: 'Torres',
  cargo: 'Guarda',
  sedes: [{ id: 's1', nombre: 'Norte' }],
  ...extra,
});

const SIN_FILTROS = { texto: '', cargo: '', sedeId: '' };

describe('sin filtros se ve todo', () => {
  it('devuelve la lista tal cual, en su orden', () => {
    const lista = [persona({ id: 'a' }), persona({ id: 'b' }), persona({ id: 'c' })];
    expect(quienSeVe(lista, SIN_FILTROS).map(p => p.id)).toEqual(['a', 'b', 'c']);
  });

  it('una lista vacía no revienta', () => {
    expect(quienSeVe([], SIN_FILTROS)).toEqual([]);
  });
});

describe('el buscador', () => {
  it('encuentra por nombre y por apellido', () => {
    const lista = [persona({ id: 'a', nombre: 'Julián' }), persona({ id: 'b', nombre: 'María', apellido: 'Gómez' })];
    expect(quienSeVe(lista, { ...SIN_FILTROS, texto: 'gómez' }).map(p => p.id)).toEqual(['b']);
  });

  it('IGNORA LAS TILDES, en los dos sentidos', () => {
    // Nadie escribe «Julián» con tilde en un buscador, y quien sí la escriba tampoco puede quedarse
    // sin resultados. Sin esto, la mitad de los nombres colombianos no se encuentran.
    const lista = [persona({ id: 'a', nombre: 'Julián' })];
    expect(quienSeVe(lista, { ...SIN_FILTROS, texto: 'julian' }).map(p => p.id)).toEqual(['a']);
    expect(quienSeVe(lista, { ...SIN_FILTROS, texto: 'Julián' }).map(p => p.id)).toEqual(['a']);
  });

  it('ignora mayúsculas y espacios de los extremos', () => {
    const lista = [persona({ id: 'a', nombre: 'Julián' })];
    expect(quienSeVe(lista, { ...SIN_FILTROS, texto: '  JULIAN  ' }).map(p => p.id)).toEqual(['a']);
  });

  it('también busca en el CARGO, como la maqueta', () => {
    // Es lo que permite escribir «super» y ver a los supervisores sin abrir el otro filtro.
    const lista = [persona({ id: 'a', cargo: 'Guarda' }), persona({ id: 'b', cargo: 'Supervisor' })];
    expect(quienSeVe(lista, { ...SIN_FILTROS, texto: 'super' }).map(p => p.id)).toEqual(['b']);
  });

  it('encuentra por el nombre COMPLETO, con el apellido detrás', () => {
    // «julian torres» tiene que encontrar a Julián Torres: se busca sobre el nombre armado, no campo
    // por campo suelto.
    const lista = [persona({ id: 'a', nombre: 'Julián', apellido: 'Torres' })];
    expect(quienSeVe(lista, { ...SIN_FILTROS, texto: 'julian torres' }).map(p => p.id)).toEqual(['a']);
  });

  it('lo que no coincide no sale', () => {
    expect(quienSeVe([persona()], { ...SIN_FILTROS, texto: 'zzz' })).toEqual([]);
  });

  it('un cargo vacío no rompe la búsqueda', () => {
    // `cargo` es opcional en la respuesta: hay gente sin cargo puesto.
    const lista = [persona({ id: 'a', cargo: null })];
    expect(quienSeVe(lista, { ...SIN_FILTROS, texto: 'julian' }).map(p => p.id)).toEqual(['a']);
  });
});

describe('el filtro de cargo', () => {
  it('deja solo ese cargo, comparado exacto', () => {
    const lista = [persona({ id: 'a', cargo: 'Guarda' }), persona({ id: 'b', cargo: 'Supervisor' })];
    expect(quienSeVe(lista, { ...SIN_FILTROS, cargo: 'Supervisor' }).map(p => p.id)).toEqual(['b']);
  });

  it('quien no tiene cargo NO aparece al filtrar por uno', () => {
    // Filtrar por «Guarda» y que salga alguien sin cargo sería decir que lo tiene.
    const lista = [persona({ id: 'a', cargo: null })];
    expect(quienSeVe(lista, { ...SIN_FILTROS, cargo: 'Guarda' })).toEqual([]);
  });
});

describe('el filtro de sede', () => {
  it('deja a quien TIENE esa sede entre las suyas', () => {
    // EL CASO QUE LA MAQUETA NO PUEDE TENER: allí cada persona tiene una sola sede. Aquí un supervisor
    // recorre dos, y filtrando por cualquiera de las dos tiene que aparecer.
    const lista = [
      persona({ id: 'a', sedes: [{ id: 's1', nombre: 'Norte' }] }),
      persona({ id: 'b', sedes: [{ id: 's1', nombre: 'Norte' }, { id: 's2', nombre: 'Centro' }] }),
      persona({ id: 'c', sedes: [{ id: 's2', nombre: 'Centro' }] }),
    ];
    expect(quienSeVe(lista, { ...SIN_FILTROS, sedeId: 's2' }).map(p => p.id)).toEqual(['b', 'c']);
  });

  it('quien no tiene ninguna sede NO aparece al filtrar por una', () => {
    const lista = [persona({ id: 'a', sedes: [] })];
    expect(quienSeVe(lista, { ...SIN_FILTROS, sedeId: 's1' })).toEqual([]);
  });

  it('pero sin filtro de sede sí se ve, aunque no tenga ninguna', () => {
    // Un remoto o un híbrido puede no tener sede asignada, y no por eso desaparece de la rejilla.
    const lista = [persona({ id: 'a', sedes: [] })];
    expect(quienSeVe(lista, SIN_FILTROS).map(p => p.id)).toEqual(['a']);
  });
});

describe('los tres a la vez', () => {
  it('se acumulan: hay que cumplirlos todos', () => {
    const lista = [
      persona({ id: 'a', nombre: 'Ana', cargo: 'Guarda', sedes: [{ id: 's1', nombre: 'Norte' }] }),
      persona({ id: 'b', nombre: 'Ana', cargo: 'Supervisor', sedes: [{ id: 's1', nombre: 'Norte' }] }),
      persona({ id: 'c', nombre: 'Ana', cargo: 'Guarda', sedes: [{ id: 's2', nombre: 'Centro' }] }),
    ];
    const r = quienSeVe(lista, { texto: 'ana', cargo: 'Guarda', sedeId: 's1' });
    expect(r.map(p => p.id)).toEqual(['a']);
  });

  it('si ninguno cumple los tres, no sale nadie', () => {
    const lista = [persona({ id: 'a', cargo: 'Guarda' })];
    expect(quienSeVe(lista, { texto: 'julian', cargo: 'Supervisor', sedeId: 's1' })).toEqual([]);
  });
});
