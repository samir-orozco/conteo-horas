import { describe, it, expect } from 'vitest';
import { claveDeCelda, celdasDelRectangulo } from './seleccionEnBloque';

// LA SELECCIÓN EN BLOQUE (28 de septiembre de 2026).
//
// Programar a veinte personas un mes entero pintando día por día son seiscientos clics. Lo que hace
// viable el planificador es marcar un RECTÁNGULO: clic en una esquina, clic en la otra, y queda
// seleccionado todo lo de en medio.
//
// POR QUÉ ES UNA DECISIÓN PURA Y NO UN PUÑADO DE `onClick`: el rectángulo depende del ORDEN de la
// rejilla, que es filas por columnas, y ese orden lo decide la respuesta del servidor, no el ratón.
// Con las dos esquinas y las dos listas, qué celdas caen dentro es aritmética, y se puede probar
// sin montar la pantalla.
//
// Las celdas se identifican por `colaboradorId` y `fecha`, que es la misma pareja con la que el
// backend escribe un día (`PUT /turnos/dia`). Así lo seleccionado se convierte en escrituras sin
// traducir nada por el camino.

const GENTE = ['c1', 'c2', 'c3', 'c4'];
const DIAS = ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02'];

const claves = (celdas: { colaboradorId: string; fecha: string }[]) => celdas.map(claveDeCelda);

describe('la clave de una celda', () => {
  it('junta persona y fecha, y es la misma pareja que usa el backend', () => {
    expect(claveDeCelda({ colaboradorId: 'c1', fecha: '2026-09-28' })).toBe('c1|2026-09-28');
  });

  it('dos celdas distintas nunca comparten clave', () => {
    const a = claveDeCelda({ colaboradorId: 'c1', fecha: '2026-09-28' });
    const b = claveDeCelda({ colaboradorId: 'c1', fecha: '2026-09-29' });
    const c = claveDeCelda({ colaboradorId: 'c2', fecha: '2026-09-28' });
    expect(new Set([a, b, c]).size).toBe(3);
  });
});

describe('el rectángulo entre dos esquinas', () => {
  it('una esquina consigo misma es una sola celda', () => {
    const a = { colaboradorId: 'c2', fecha: '2026-09-29' };
    expect(claves(celdasDelRectangulo(a, a, GENTE, DIAS))).toEqual(['c2|2026-09-29']);
  });

  it('en la misma fila toma los días de en medio', () => {
    const r = celdasDelRectangulo(
      { colaboradorId: 'c2', fecha: '2026-09-29' },
      { colaboradorId: 'c2', fecha: '2026-10-01' },
      GENTE, DIAS,
    );
    expect(claves(r)).toEqual(['c2|2026-09-29', 'c2|2026-09-30', 'c2|2026-10-01']);
  });

  it('en la misma columna toma las personas de en medio', () => {
    const r = celdasDelRectangulo(
      { colaboradorId: 'c2', fecha: '2026-09-29' },
      { colaboradorId: 'c4', fecha: '2026-09-29' },
      GENTE, DIAS,
    );
    expect(claves(r)).toEqual(['c2|2026-09-29', 'c3|2026-09-29', 'c4|2026-09-29']);
  });

  it('un rectángulo de verdad da el producto de las dos, por filas', () => {
    const r = celdasDelRectangulo(
      { colaboradorId: 'c1', fecha: '2026-09-29' },
      { colaboradorId: 'c2', fecha: '2026-09-30' },
      GENTE, DIAS,
    );
    // Por filas y no por columnas: es el orden en que se leen, y también el orden en que se van a
    // escribir, así que el progreso avanza persona por persona y no saltando entre ellas.
    expect(claves(r)).toEqual([
      'c1|2026-09-29', 'c1|2026-09-30',
      'c2|2026-09-29', 'c2|2026-09-30',
    ]);
  });

  it('da igual por qué esquina se empiece', () => {
    // Nadie arrastra siempre de arriba a la izquierda hacia abajo a la derecha. Las cuatro
    // direcciones tienen que dar el mismo rectángulo.
    const a = { colaboradorId: 'c1', fecha: '2026-09-29' };
    const b = { colaboradorId: 'c3', fecha: '2026-10-01' };
    const derecho = claves(celdasDelRectangulo(a, b, GENTE, DIAS));
    const alReves = claves(celdasDelRectangulo(b, a, GENTE, DIAS));
    const cruzado1 = claves(celdasDelRectangulo(
      { colaboradorId: 'c1', fecha: '2026-10-01' },
      { colaboradorId: 'c3', fecha: '2026-09-29' },
      GENTE, DIAS,
    ));
    expect(alReves).toEqual(derecho);
    expect(cruzado1).toEqual(derecho);
    expect(derecho).toHaveLength(9); // 3 personas x 3 días
  });

  it('una esquina que no está en la rejilla no selecciona nada', () => {
    // Puede pasar tras recargar: la selección guardaba a alguien que el filtro ya no muestra.
    // Devolver un rectángulo a medias sería peor que no devolver nada.
    const r = celdasDelRectangulo(
      { colaboradorId: 'fantasma', fecha: '2026-09-29' },
      { colaboradorId: 'c2', fecha: '2026-09-30' },
      GENTE, DIAS,
    );
    expect(r).toEqual([]);
  });

  it('una fecha que no está en la rejilla tampoco', () => {
    const r = celdasDelRectangulo(
      { colaboradorId: 'c1', fecha: '2026-09-29' },
      { colaboradorId: 'c2', fecha: '2025-01-01' },
      GENTE, DIAS,
    );
    expect(r).toEqual([]);
  });
});
