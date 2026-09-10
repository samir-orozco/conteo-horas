// La costura entre la foto que se pinta en Revisión y el detector puro de
// `deteccionPantalla.ts`. Aquí vive todo lo que toca el DOM y face-api; la
// aritmética vive allá y está probada con imágenes de respuesta conocida.
//
// POR QUÉ CORRE AQUÍ Y NO AL MARCAR. Si corriera en el kiosco haría falta una
// columna nueva, un despliegue de base y un veredicto guardado por cada
// marcación. Corriendo al PINTAR la foto: no hay esquema, no hay backend, no
// queda ninguna etiqueta acusando a nadie, y el día que el umbral resulte malo
// se cambia un número y se acabó. Es reversible de verdad.
import type { Rasgos } from './deteccionPantalla';
import { rasgosDe } from './deteccionPantalla';

export type Pista = { hay: boolean; paralelas: number; caras: number; rasgos: Rasgos } | null;

// EL UMBRAL ES PROVISIONAL Y HAY QUE RECALIBRARLO. De dónde sale:
//
// Se midieron dos grabaciones del kiosco reescaladas al formato exacto que
// guarda `capturarFoto` (320 de ancho, JPEG 0.7): 31 fotogramas de una foto
// mostrada en la pantalla de un celular y 15 de una cara real. De cinco rasgos
// probados, el par de rectas paralelas alrededor del rostro fue el único que
// separó (AUC 1.000); el brillo quemado, que era la sospecha intuitiva, no
// separó nada (AUC 0.548).
//
//   celular: 0.494 a 1.393    cara real: 0.278 a 0.473
//
// A 0.70 salen 27 de 31 del celular y 0 falsas alarmas de 15. PERO son dos
// videos, una persona, un cuarto y un teléfono: los 15 fotogramas de la clase
// "real" no permiten estimar CADA CUÁNTO se equivoca esto con gente honesta en
// una bodega con un marco de puerta detrás. El número está elegido alto a
// propósito, muy por encima del máximo real visto, porque el daño es asimétrico:
// una pista que falta no cuesta nada (la persona está mirando la foto igual) y
// una pista de más señala a un trabajador honesto.
export const UMBRAL_PISTA = 0.70;

let cargando: Promise<typeof import('face-api.js')> | null = null;

async function modelos() {
  if (!cargando) {
    cargando = (async () => {
      const faceapi = await import('face-api.js');
      await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
      return faceapi;
    })();
  }
  return cargando;
}

/**
 * Mira una foto ya cargada y dice si tiene rasgos de un aparato sostenido
 * frente a la cámara. Devuelve null si no hay rostro o si algo falla: esto es
 * una ayuda, y una ayuda que revienta no debe tumbar la pantalla.
 */
export async function pistaDePantalla(img: HTMLImageElement): Promise<Pista> {
  try {
    if (!img.naturalWidth) return null;
    const faceapi = await modelos();
    // TODAS las caras, no la mejor. `detectSingleFace` devuelve solo la de mayor
    // puntaje, y en el ataque real eso es justo la equivocada: quien sostiene el
    // celular sale TAMBIÉN en el cuadro, más cerca y más nítido que la cara de la
    // pantalla. Con una sola cara se buscaba el bisel alrededor de la persona de
    // verdad, pegada al borde del cuadro, donde no hay ninguno, y la foto salía
    // «limpia» con el teléfono a la vista. Pasó en producción el 10 de septiembre
    // de 2026 y es lo que hizo cambiar esto.
    const dets = await faceapi.detectAllFaces(
      img, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.4 })
    );
    if (!dets.length) return null;

    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const cx = c.getContext('2d', { willReadFrequently: true });
    if (!cx) return null;
    cx.drawImage(img, 0, 0);
    const d = cx.getImageData(0, 0, c.width, c.height);

    // Se mide alrededor de CADA cara y manda la peor: basta con que una de ellas
    // esté metida en un marco para que haya que mirar la foto.
    let peor: Rasgos | null = null;
    for (const det of dets) {
      const b = det.box;
      const r = rasgosDe(d.data, c.width, c.height, { x: b.x, y: b.y, ancho: b.width, alto: b.height });
      if (!peor || r.paralelas > peor.paralelas) peor = r;
    }
    if (!peor) return null;
    // El número de caras se reporta pero NO dispara por sí solo. En un kiosco con
    // fila hay gente esperando detrás todo el tiempo, así que «hay dos caras»
    // señalaría a media empresa.
    return { hay: peor.paralelas > UMBRAL_PISTA, paralelas: peor.paralelas, caras: dets.length, rasgos: peor };
  } catch {
    return null;
  }
}

/**
 * Lo mismo, partiendo de la URL en vez de un <img> ya pintado. Lo usa el barrido
 * del día, que mira fotos que NO están en pantalla.
 *
 * La imagen se crea, se mide y se suelta: no se guarda en ningún lado y no queda
 * en el DOM. Es la diferencia entre pedir una foto para mirarla y precargar el
 * listado entero, que es lo que la política publicada dice que no se hace.
 */
export async function pistaDeUrl(url: string): Promise<Pista> {
  const img = new Image();
  img.src = url;
  const cargo = await new Promise<boolean>(r => { img.onload = () => r(true); img.onerror = () => r(false); });
  if (!cargo) return null;
  return pistaDePantalla(img);
}
