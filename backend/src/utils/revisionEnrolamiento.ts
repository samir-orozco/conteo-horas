import { distanciaEuclidiana, muestrasDe, mejorDistancia } from './rostro';

// LO QUE SE REVISA ANTES DE GUARDAR UN ROSTRO (2 de octubre de 2026).
//
// Hasta hoy el servidor solo miraba la forma de las tomas. Una con la cara de
// OTRA persona —alguien al lado, el teléfono pasado de mano— quedaba dentro del
// registro, y como el cotejo del kiosco se queda con la MEJOR muestra de cada
// persona, esa otra persona pasaba a marcar como la dueña del registro para
// siempre, con distancias que no levantan ninguna sospecha.
//
// LOS DOS NÚMEROS SON PROVISIONALES y lo dicen en voz alta. Se eligieron antes de
// medir cuánto se separan de verdad las tomas de una misma persona en producción
// (frente contra perfil) y cuánto se parecen entre sí las fichas de personas
// distintas. Se fijan con esa medición antes de desplegar.

// Más que esto entre dos tomas de un mismo registro, y alguna no es de la misma
// persona. 0,6 es la línea que face-api.js usa por defecto para «otra persona».
export const MAX_ENTRE_TOMAS = 0.6;

// Un rostro nuevo a esta distancia o menos de la ficha de otra persona de la
// empresa merece que el administrador mire las dos. No se bloquea: entre
// hermanos pasa, y en esta empresa los hay.
export const UMBRAL_PARECIDO_AL_REGISTRAR = 0.45;

// La distancia más grande entre la toma de FRENTE y cada una de las demás.
//
// Contra la de frente y no todas contra todas: el registro guiado empieza por el
// frente (pasosEnrolar.ts) y después gira a un lado y al otro. Cada giro puede
// quedar a 0,43 del frente y a más de 0,6 del giro opuesto, y esa persona es
// honesta; comparándolos entre sí se la rechazaba sin forma de registrarse. Una
// toma ajena se caza igual: en cualquier lugar que esté, queda lejos del frente, o
// el frente queda lejos de todas las demás.
export function tomasCoherentes(tomas: number[][]): { coherentes: boolean; maxima: number } {
  let maxima = 0;
  for (let i = 1; i < tomas.length; i++) {
    maxima = Math.max(maxima, distanciaEuclidiana(tomas[0], tomas[i]));
  }
  return { coherentes: maxima <= MAX_ENTRE_TOMAS, maxima };
}

// Las personas de la empresa a las que se parece el rostro que se va a guardar, la
// más parecida primero. Cada una cuenta por su mejor par (toma nueva × muestra
// guardada), igual que en el kiosco: es la comparación que va a ocurrir allí.
export function parecidosAlRegistrar<T extends { id: string; rostroDescriptor: unknown }>(
  tomas: number[][],
  otras: T[],
  propioId: string,
): (T & { distancia: number })[] {
  const parecidas: (T & { distancia: number })[] = [];
  for (const otra of otras) {
    if (otra.id === propioId) continue;
    const muestras = muestrasDe(otra.rostroDescriptor);
    let mejor = Infinity;
    for (const toma of tomas) {
      const d = mejorDistancia(toma, muestras);
      if (d !== null && d < mejor) mejor = d;
    }
    if (mejor <= UMBRAL_PARECIDO_AL_REGISTRAR) parecidas.push({ ...otra, distancia: mejor });
  }
  return parecidas.sort((a, b) => a.distancia - b.distancia);
}
