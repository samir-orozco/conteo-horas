import { sePuedePintar } from './semana';
import type { Celda } from './seleccionEnBloque';

// EL GUARDADO POR BLOQUES (28 de septiembre de 2026).
//
// Nada que toque cientos de filas puede ir en una sola petición. El tamaño real: 150 personas por
// 31 días son 4.650 jornadas, y cada una NO es un `INSERT` suelto, porque escribir un día recalcula
// la semana entera de esa persona. El hosting es compartido y ya se le ha visto atragantarse.
//
// Por eso lo seleccionado se parte y se manda de a poco. Aquí vive solo la DECISIÓN —cuántos
// bloques salen, qué entra en cada uno, qué no se va a escribir—, que se puede comprobar sin red y
// sin servidor. Mandarlos es plomería y vive en la pantalla.

export type AccionDeEscritura =
  | { tipo: 'TURNO'; plantillaId: string }
  | { tipo: 'DESCANSO' }
  | { tipo: 'QUITAR' };

export type Escritura = Celda & { accion: AccionDeEscritura };

// Parte una lista en trozos del tamaño pedido.
//
// EL GUARDA DEL TAMAÑO CERO NO ES PARANOIA: con `tamano <= 0` el bucle no avanzaría nunca y la
// pestaña se cuelga. Un tamaño así solo puede venir de un error de quien llama, y colgar el
// navegador es la peor forma posible de avisarlo. Se devuelve todo en un bloque, que es el
// comportamiento menos sorprendente.
export function bloquesDe<T>(items: readonly T[], tamano: number): T[][] {
  if (items.length === 0) return [];
  if (tamano < 1) return [[...items]];
  const bloques: T[][] = [];
  for (let i = 0; i < items.length; i += tamano) {
    bloques.push(items.slice(i, i + tamano));
  }
  return bloques;
}

// Qué se va a escribir de verdad, y cuántas celdas quedan fuera.
//
// LO QUE NO SE ESCRIBE TAMBIÉN ES UNA RESPUESTA. Un día ya pasado no se toca, porque reescribiría lo
// que ese día exigía, y de ahí salen la tardanza y las horas extra de un período que quizá ya se
// liquidó. Contarlas aparte permite que la previa diga «de las 210 marcadas se escriben 180, y 30
// ya pasaron», en vez de escribir menos de lo que alguien creyó haber pedido sin decir nada.
//
// SE APOYA EN `sePuedePintar` Y NO REPITE LA COMPARACIÓN: es la misma regla con la que la rejilla
// decide si ofrece el «+», y tenerla en dos sitios es como se separan (CLAUDE.md §9.3). Si aquí se
// decidiera distinto, la pantalla ofrecería pintar algo que el envío descartaría en silencio.
//
// LA ACCIÓN LA DECIDE QUIEN LLAMA, celda por celda. Eso es lo que permite que una rotación mande
// turno unos días y descanso otros con esta misma función: con una acción única para todo el envío
// haría falta un segundo camino de escritura solo para las rotaciones, y entonces habría dos sitios
// donde equivocarse.
export function planDeEscritura(
  celdas: readonly Celda[],
  accionDe: (celda: Celda) => AccionDeEscritura,
  hoy: string,
): { escribe: Escritura[]; bloqueadas: number } {
  const escribe: Escritura[] = [];
  let bloqueadas = 0;

  for (const celda of celdas) {
    if (!sePuedePintar(celda.fecha, hoy)) {
      bloqueadas++;
      continue;
    }
    escribe.push({ ...celda, accion: accionDe(celda) });
  }
  return { escribe, bloqueadas };
}
