import type { TipoPose } from './rostroCliente';

// EL RETO DE GIRO DEL INGRESO FACIAL.
//
// Sale de una prueba real, no de una teoría. El 9 de septiembre de 2026 se marcó
// una salida mostrando la foto de una cara en la pantalla de un celular, y el
// sistema la aceptó. Y lo peor del dato: esa marcación dio la MEJOR distancia del
// día, 0,2157 contra 0,28 y 0,41 de las legítimas. Tiene sentido y por eso el
// fraude es difícil de detectar por metadatos: una foto es una cara frontal,
// quieta y bien iluminada, mientras que una captura viva trae movimiento, ángulo
// y sombras. La trampa se parece MÁS al registro que la persona de verdad.
//
// Una foto fija no puede girar la cabeza cuando se le pide y volver al frente.
//
// LO QUE ESTO NO ES: no es un muro. Inclinando el celular se puede falsear parte
// del giro, porque una foto plana inclinada también desplaza la nariz aparente.
// Por eso el lado se SORTEA en cada intento: lo que no se puede ensayar es
// acertar la dirección que toca en el momento que toca. Sube el costo del
// oportunista, que es el caso reportado; no detiene a quien se lo proponga. Y
// nada de esto lo puede comprobar el servidor, porque el descriptor lo calcula el
// navegador (ver el comentario de `worker.ts:290`).

export type FaseDelReto = 'GIRAR' | 'VOLVER';

// Cuánto hay que sostener el giro. Corto a propósito: el giro solo comprueba que
// la cabeza se mueve, no toma descriptor. Alargarlo aquí es lo que convirtió el
// intento anterior, el del parpadeo, en algo que había que hacer «superfuerte».
export const MS_QUIETO_GIRO = 350;

// HACIA QUÉ LADO DE LA PANTALLA se ve moverse la nariz cuando alguien hace la
// pose 'derecha'.
//
// Depende de dos cosas que juntas son fáciles de razonar mal: el preview está
// espejado (`scaleX(-1)` en el <video>) y el yaw se calcula sobre los puntos
// CRUDOS del video, sin espejar. En vez de deducirlo, se mira UNA vez en una
// pantalla y se fija aquí.
//
// SI EN PRUEBAS LA FLECHA APUNTA AL LADO CONTRARIO DEL QUE HAY QUE GIRAR, se
// cambia este valor y ya. La detección no se toca: `flechaDelReto` sale de aquí,
// así que la flecha y lo que el sistema espera no pueden contradecirse.
export const LADO_PANTALLA_DERECHA: 'izq' | 'der' = 'izq';

// El lado se sortea en cada intento para que no se pueda ensayar. Recibe el
// número en vez de llamar a Math.random() para poder probarla.
export function sortearLado(r: number): TipoPose {
  return r < 0.5 ? 'derecha' : 'izquierda';
}

// Girar primero, volver al frente después. El frente no es decorativo: el
// descriptor enrolado se compara mejor de frente, y además obliga al movimiento
// COMPLETO. Una foto inclinada podría fingir el giro, pero entonces se queda
// inclinada y no pasa el segundo paso.
export function poseDelReto(fase: FaseDelReto, lado: TipoPose): TipoPose {
  return fase === 'GIRAR' ? lado : 'frontal';
}

// Dónde se dibuja la flecha. Sale de la constante de arriba, nunca de un valor
// escrito a mano en el componente: es lo que impide que la flecha y la detección
// se separen.
export function flechaDelReto(lado: TipoPose): 'izq' | 'der' {
  const contrario = LADO_PANTALLA_DERECHA === 'izq' ? 'der' : 'izq';
  return lado === 'derecha' ? LADO_PANTALLA_DERECHA : contrario;
}
