import { UMBRAL_COINCIDENCIA } from './rostro';

// CON QUÉ SE AUTENTICÓ CADA MARCACIÓN.
//
// Hasta ahora el `Registro` no lo guardaba, así que era imposible responder
// «cuántas marcaciones del mes pasado entraron sin cámara». Sin ese número no se
// puede saber si el reconocimiento facial sirve de algo, ni medir si un cambio lo
// mejoró: es el primer paso de todo el trabajo de biometría y el único que no
// cuesta ningún riesgo.
//
// EL DATO SALE DEL JWT FIRMADO DEL LOGIN, NUNCA DEL CUERPO DE LA PETICIÓN. Es la
// diferencia entre medir y dejar que el medido escriba el número: si el kiosco
// mandara `metodo: 'ROSTRO'` en el body, cualquiera pondría eso desde el
// inspector y la estadística diría lo contrario de la realidad.

export type MetodoMarcacion = 'ROSTRO' | 'CEDULA';

// Lo que viaja en el token. Se tipa como `unknown` a propósito: son tokens
// firmados por nosotros, pero también los hay de ANTES de este cambio, que no
// traen estos campos.
export type SesionDeKiosco = { metodo?: unknown; distancia?: unknown };

// SOLO DOS, aunque el enum del esquema tenga tres. El tercero, MANUAL, significa
// «lo escribió un administrador desde el panel» y lo pone `routes/registros.ts`
// directamente. Una sesión del kiosco que se declarara MANUAL estaría
// disfrazando una marcación real de carga a mano, que es la categoría que un
// supervisor revisa menos.
const METODOS: readonly string[] = ['ROSTRO', 'CEDULA'];

function metodoValido(v: unknown): v is MetodoMarcacion {
  return typeof v === 'string' && METODOS.includes(v);
}

// Una distancia solo tiene sentido si pudo salir de una comparación real. El
// servidor no acepta coincidencias por encima de `UMBRAL_COINCIDENCIA`, así que
// cualquier cosa por fuera de [0, umbral] no vino de un match y contaminaría la
// estadística que estas columnas existen para alimentar.
//
// El cero se acepta a propósito, y es el caso más interesante: una distancia
// exactamente 0 significa que el descriptor entrante es idéntico a uno enrolado,
// cosa que no ocurre en una captura viva. Es la huella de un descriptor copiado
// del inspector y reenviado. Un `if (distancia)` la trataría como ausente y
// perderíamos justo la evidencia que buscamos.
function distanciaValida(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= UMBRAL_COINCIDENCIA;
}

// Los campos que hay que escribir en el `Registro` para una entrada o una salida.
// Devuelve un objeto vacío cuando no hay nada que decir, y eso es deliberado:
// esas columnas se quedan en null, y ese null significa «no se sabe», no
// «cédula». Rellenar por descarte falsearía el número que se vino a medir.
//
// Pasa con los tokens de antes de este cambio, que duran 12 horas: durante ese
// rato después de desplegar habrá marcaciones sin método, y así es como debe ser.
export function camposDeAutenticacion(
  sesion: SesionDeKiosco,
  momento: 'entrada' | 'salida',
): Record<string, unknown> {
  if (!metodoValido(sesion.metodo)) return {};

  const sufijo = momento === 'entrada' ? 'Entrada' : 'Salida';
  const campos: Record<string, unknown> = { [`metodo${sufijo}`]: sesion.metodo };

  // La distancia solo existe si hubo rostro que comparar. Junto a una marcación
  // por cédula sería un dato corrupto.
  if (sesion.metodo === 'ROSTRO' && distanciaValida(sesion.distancia)) {
    campos[`distancia${sufijo}`] = sesion.distancia;
  }
  return campos;
}
