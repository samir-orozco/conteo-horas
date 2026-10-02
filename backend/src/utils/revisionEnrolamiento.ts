import { distanciaEuclidiana, muestrasDe, mejorDistancia } from './rostro';

// LO QUE SE REVISA ANTES DE GUARDAR UN ROSTRO (2 de octubre de 2026).
//
// Hasta hoy el servidor solo miraba la forma de las tomas. Una con la cara de
// OTRA persona —alguien al lado, el teléfono pasado de mano— quedaba dentro del
// registro, y como el cotejo del kiosco se queda con la MEJOR muestra de cada
// persona, esa otra persona pasaba a marcar como la dueña del registro para
// siempre, con distancias que no levantan ninguna sospecha.
//
// Más que esto entre la toma de frente y otra del mismo registro, y alguna no es
// de la misma persona. 0,6 es la línea que face-api.js usa por defecto para «otra
// persona».
//
// MEDIDO, no supuesto (2 de octubre de 2026, `sql/tomas-contra-el-frente.sql` en
// producción, Grupo MSM): de 86 personas registradas, la toma más alejada del
// frente dio 0,537 y la siguiente 0,519; tres más entre 0,46 y 0,49, y las otras
// 81 por debajo de 0,43. Ninguna fila atípica, o sea ningún registro con la cara
// de otra persona. Se deja en 0,6: subirlo daría margen a costa de dejar pasar más
// fácil una toma ajena, que es el error que no se ve; un rechazo se arregla
// repitiendo el escaneo. Es una sola empresa: el log `revision-rostro` deja la
// máxima de cada registro nuevo, y con eso se vuelve a mirar.
export const MAX_ENTRE_TOMAS = 0.6;

// Un rostro nuevo a esta distancia o menos de la ficha de otra persona de la
// empresa merece que el administrador mire las dos. No se bloquea: entre
// hermanos pasa, y en esta empresa los hay.
//
// ESTE SÍ ES PROVISIONAL: medirlo pide comparar cada ficha con todas las demás,
// una consulta pesada que se corre fuera del horario del kiosco. Como solo avisa,
// equivocarse cuesta un aviso de más o de menos, no un registro bloqueado.
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
