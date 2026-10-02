import { SIGNO_DERECHA, UMBRAL_GIRO_MIN, UMBRAL_GIRO_MAX, type TipoPose } from './rostroCliente';

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

// CUÁNTO FALTA PARA EL GIRO (2 de octubre de 2026, pedido del dueño a partir de una
// app de verificación que vio ese día).
//
// La flecha decía hacia dónde, pero no cuánto: quien giraba poco se quedaba
// esperando sin saber por qué, y quien giraba de más se pasaba del tope y el reto
// tampoco avanzaba. Esto alimenta una regla de marcas al lado del óvalo que se
// llena a medida que se gira, y el texto que dice si falta, si sobra o si va al
// otro lado.
//
// Sale de los MISMOS límites que `poseCumple` (rostroCliente.ts): LISTO es
// exactamente «la detección lo da por cumplido». Una prueba lo comprueba en todo
// el recorrido, porque una regla llena con el reto sin avanzar sería otra flecha
// que se contradice con la detección.
export const MARCAS_DEL_MEDIDOR = 12;

export type EstadoDelGiro = 'FALTA' | 'LISTO' | 'DE_MAS' | 'AL_REVES';
export type LecturaDelGiro = { estado: EstadoDelGiro; avance: number; encendidas: number };

export function lecturaDelGiro(lado: TipoPose, yaw: number): LecturaDelGiro {
  // El giro medido en la dirección pedida: positivo si va hacia donde toca.
  const hacia = yaw * (lado === 'derecha' ? SIGNO_DERECHA : -SIGNO_DERECHA);
  const lectura = (estado: EstadoDelGiro, avance: number): LecturaDelGiro =>
    ({ estado, avance, encendidas: Math.round(avance * MARCAS_DEL_MEDIDOR) });
  // «Al revés» solo cuando gira hacia el otro lado tanto como un giro de verdad:
  // un temblor alrededor del frente no merece que se le corrija.
  if (hacia < -UMBRAL_GIRO_MIN) return lectura('AL_REVES', 0);
  if (hacia >= UMBRAL_GIRO_MAX) return lectura('DE_MAS', 1);
  if (hacia > UMBRAL_GIRO_MIN) return lectura('LISTO', 1);
  return lectura('FALTA', Math.max(0, hacia) / UMBRAL_GIRO_MIN);
}

// QUÉ DICE LA PANTALLA EN CADA MOMENTO DEL RETO: una cosa a la vez y en grande. Pedir
// dos a la vez es lo que hizo fracasar el intento del parpadeo. Un caso por estado y
// un `default` que no compila si llega uno nuevo sin su texto (CLAUDE.md §9.4).
export function textoDelReto(fase: FaseDelReto, giro: EstadoDelGiro): { titulo: string; detalle: string } {
  if (fase === 'VOLVER') return { titulo: 'Ahora vuelva a mirar al frente', detalle: 'Ya casi, no se mueva' };
  switch (giro) {
    case 'FALTA': return { titulo: 'Gire la cabeza hacia la flecha', detalle: 'Un giro suave, sin exagerar' };
    case 'LISTO': return { titulo: '¡Así! No se mueva', detalle: 'Ya casi' };
    case 'DE_MAS': return { titulo: 'Un poco menos', detalle: 'Devuelva un poco la cabeza' };
    case 'AL_REVES': return { titulo: 'Hacia el otro lado', detalle: 'Siga la flecha' };
    default: {
      const nuevo: never = giro;
      return nuevo;
    }
  }
}
