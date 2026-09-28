import { describe, it, expect } from 'vitest';
import { bloquesDe, planDeEscritura } from './aplicacionPorBloques';
import type { Celda } from './seleccionEnBloque';

// EL GUARDADO POR BLOQUES (28 de septiembre de 2026).
//
// Nada que toque cientos de filas puede ir en una sola petición. El tamaño real: 150 personas por
// 31 días son 4.650 jornadas, y cada una NO es un `INSERT` suelto, porque escribir un día recalcula
// la semana entera de esa persona. El hosting es compartido y ya se le ha visto atragantarse.
//
// Por eso lo seleccionado se parte en bloques y se manda de a poco, con una pantalla que dice por
// dónde va. Y por eso esta decisión es pura: cuántos bloques salen, qué entra en cada uno y qué NO
// se va a escribir se puede comprobar sin red y sin servidor.
//
// LO QUE NO SE ESCRIBE TAMBIÉN ES UNA RESPUESTA. Un día ya pasado no se toca, porque reescribiría lo
// que ese día exigía y de ahí salen la tardanza y las extras de un período que quizá ya se liquidó.
// La regla es la misma `sePuedePintar` que usa la rejilla, no una copia: si aquí se decidiera
// distinto, la pantalla ofrecería pintar algo que el envío descartaría en silencio.

const celda = (colaboradorId: string, fecha: string): Celda => ({ colaboradorId, fecha });
const TURNO = { tipo: 'TURNO', plantillaId: 'p1' } as const;

describe('partir en bloques', () => {
  it('cuando la cuenta es exacta', () => {
    expect(bloquesDe([1, 2, 3, 4], 2)).toEqual([[1, 2], [3, 4]]);
  });

  it('el último bloque queda corto y eso está bien', () => {
    expect(bloquesDe([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('una lista vacía no produce ningún bloque', () => {
    // Importa: con un bloque vacío la pantalla de progreso mostraría «bloque 1 de 1» sobre cero
    // jornadas, que es anunciar trabajo que no existe.
    expect(bloquesDe([], 40)).toEqual([]);
  });

  it('de a uno', () => {
    expect(bloquesDe([1, 2, 3], 1)).toEqual([[1], [2], [3]]);
  });

  it('un tamaño mayor que la lista da un solo bloque', () => {
    expect(bloquesDe([1, 2], 40)).toEqual([[1, 2]]);
  });

  it('un tamaño de cero o negativo NO se cuelga: devuelve un solo bloque', () => {
    // La guarda que evita un bucle infinito. Un tamaño así solo puede venir de un error de quien
    // llama, y colgar la pestaña es la peor forma de avisarlo.
    expect(bloquesDe([1, 2, 3], 0)).toEqual([[1, 2, 3]]);
    expect(bloquesDe([1, 2, 3], -5)).toEqual([[1, 2, 3]]);
  });
});

describe('qué se va a escribir de verdad', () => {
  const HOY = '2026-09-28';

  it('los días pasados NO se escriben, y se cuentan aparte', () => {
    const celdas = [celda('c1', '2026-09-26'), celda('c1', '2026-09-29')];
    const plan = planDeEscritura(celdas, () => TURNO, HOY);
    expect(plan.escribe.map(e => e.fecha)).toEqual(['2026-09-29']);
    expect(plan.bloqueadas).toBe(1);
  });

  it('HOY sí se escribe', () => {
    // Misma regla que la rejilla: puede que la persona todavía no haya marcado. Si ya marcó, el
    // backend contesta 400 y el motivo se muestra; la pantalla no puede saberlo sola.
    const plan = planDeEscritura([celda('c1', HOY)], () => TURNO, HOY);
    expect(plan.escribe).toHaveLength(1);
    expect(plan.bloqueadas).toBe(0);
  });

  it('conserva el orden en que venían las celdas', () => {
    const celdas = [celda('c1', '2026-09-29'), celda('c2', '2026-09-29'), celda('c1', '2026-09-30')];
    const plan = planDeEscritura(celdas, () => TURNO, HOY);
    expect(plan.escribe.map(e => `${e.colaboradorId}|${e.fecha}`)).toEqual([
      'c1|2026-09-29', 'c2|2026-09-29', 'c1|2026-09-30',
    ]);
  });

  it('la acción la decide quien llama, celda por celda', () => {
    // Es lo que permite que una ROTACIÓN mande turno unos días y descanso otros con la misma
    // función: si la acción fuera única para todo el envío, haría falta un segundo camino de
    // escritura solo para las rotaciones.
    const celdas = [celda('c1', '2026-09-29'), celda('c1', '2026-09-30')];
    const plan = planDeEscritura(
      celdas,
      c => (c.fecha === '2026-09-30' ? { tipo: 'DESCANSO' } : TURNO),
      HOY,
    );
    expect(plan.escribe.map(e => e.accion.tipo)).toEqual(['TURNO', 'DESCANSO']);
  });

  it('sin celdas no hay nada que escribir ni nada bloqueado', () => {
    expect(planDeEscritura([], () => TURNO, HOY)).toEqual({ escribe: [], bloqueadas: 0 });
  });

  it('todo en el pasado deja el envío vacío, y lo dice', () => {
    // El caso que la pantalla tiene que distinguir de «no seleccionaste nada»: aquí sí hubo
    // selección, y la respuesta honesta es que no se puede escribir ninguna.
    const celdas = [celda('c1', '2026-09-01'), celda('c2', '2026-09-02')];
    const plan = planDeEscritura(celdas, () => TURNO, HOY);
    expect(plan.escribe).toEqual([]);
    expect(plan.bloqueadas).toBe(2);
  });
});
