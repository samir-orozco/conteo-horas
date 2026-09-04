import * as faceapi from 'face-api.js';

// Helpers puros y constantes del reconocimiento facial en el cliente. Se sacaron de
// CamaraRostro.tsx para poder ajustar/probar umbrales sin montar el componente.

export type Modo = 'login' | 'enrolar';
export type Estado = 'cargando' | 'calibrando' | 'guiando' | 'preview' | 'exito' | 'error';
export type TipoPose = 'frontal' | 'derecha' | 'izquierda';
export type PasoEnrolar = { id: string; etiqueta: string; texto: string; tipo: TipoPose };
export type Encuadre = 'CENTRA' | 'ACERCATE' | 'ALEJATE' | 'OK';

// Segundos antes de ofrecer el respaldo "marcar con cédula" en el login.
export const SEG_FALLBACK_CEDULA = 8;

// Detección continua para el encuadre en vivo (barata, rápida en celulares).
export const opcionesDeteccion = () => new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 });
// Captura del descriptor: inputSize mayor = landmarks y descriptor más nítidos.
export const opcionesCaptura = () => new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.4 });

// Tiempo que la persona debe quedarse quieta antes de tomar la muestra.
export const MS_QUIETO_ENROLAR = 2000;
export const MS_QUIETO_LOGIN = 1000;
// Mínimo de cuadros nítidos a promediar por muestra.
export const MIN_MUESTRAS_POSE = 3;
// Piso de tiempo entre detecciones cuando NO se está capturando (evita calentar la tablet).
export const MS_MIN_CUADRO = 120;

// Signo del yaw que tratamos como "derecha". Si en pruebas los lados salen
// invertidos, cambia este valor a -1 (es lo único que hay que tocar).
export const SIGNO_DERECHA = 1;

// Giro de cabeza (yaw): posición de la nariz relativa a los ojos.
// ~0 de frente; el signo indica el lado del giro.
export function desviacionYaw(landmarks: faceapi.FaceLandmarks68): number {
  const nariz = landmarks.getNose()[3];
  const ojoIzq = landmarks.getLeftEye()[0];
  const ojoDer = landmarks.getRightEye()[3];
  return (nariz.x - ojoIzq.x) / (ojoDer.x - ojoIzq.x) - 0.5;
}

// Promedio elemento a elemento de varios descriptores de 128 floats: reduce el
// ruido y deja una muestra más estable que un solo cuadro.
export function promediarDescriptores(lista: number[][]): number[] {
  const out = new Array(128).fill(0);
  for (const d of lista) for (let i = 0; i < 128; i++) out[i] += d[i];
  for (let i = 0; i < 128; i++) out[i] /= lista.length;
  return out;
}

// ESTO TIENE QUE SEGUIR SALIENDO EN JPEG. No es una preferencia.
//
// El resto del producto pasó a guardar las fotos en WebP. Esta no, porque del
// otro lado hay un contrato duro que nadie ve desde aquí:
// backend/src/routes/worker.ts:72-81 exige el prefijo `data:image/jpeg` Y los
// bytes FF D8 FF, con su propio tope de 300.000. Y worker.ts:432 descarta la
// foto que no pasa SIN devolver error.
//
// O sea que cambiar esta línea a WebP no rompería nada visible: las marcaciones
// seguirían registrándose y simplemente perderían la foto de verificación, en
// todas las empresas a la vez, sin un solo mensaje en ninguna parte.
//
// Además esta foto alimenta DOS caminos: el marcador (PantallaLogin.tsx, que es
// el que valida JPEG) y el enrolamiento del rostro desde la ficha
// (ColaboradorDetalle.tsx), que valida distinto. Quien lea solo el segundo va a
// concluir que cambiarlo es inofensivo.
//
// Y no es un punto de subida: aquí no hay ningún archivo que la persona haya
// elegido, se sintetiza un cuadro del video. No hay nada que convertir.
export function capturarFoto(video: HTMLVideoElement): string {
  const ancho = 320;
  const alto = Math.round((video.videoHeight / video.videoWidth) * ancho) || 240;
  const canvas = document.createElement('canvas');
  canvas.width = ancho;
  canvas.height = alto;
  canvas.getContext('2d')!.drawImage(video, 0, 0, ancho, alto);
  return canvas.toDataURL('image/jpeg', 0.7);
}

// Guía de encuadre: qué le decimos al usuario para que el rostro llene el óvalo.
export function evaluarEncuadre(box: faceapi.Box, vw: number, vh: number): Encuadre {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  if (Math.abs(cx - vw / 2) > vw * 0.28 || Math.abs(cy - vh / 2) > vh * 0.3) return 'CENTRA';
  const proporcion = box.width / vw;
  // Umbrales holgados: el rostro no tiene que llenar el óvalo (evita estirar el brazo)
  if (proporcion < 0.16) return 'ACERCATE';
  if (proporcion > 0.8) return 'ALEJATE';
  return 'OK';
}
export const MSG_ENCUADRE: Record<Exclude<Encuadre, 'OK'>, string> = {
  CENTRA: 'Centra tu rostro en el óvalo',
  ACERCATE: 'Acércate un poco',
  ALEJATE: 'Aléjate un poco',
};

// ===== Arranque estable de la cámara =====
//
// Al encender, muchos teléfonos entregan un primer cuadro con una resolución y a
// los pocos cientos de milisegundos renegocian a otra. Con `object-cover` eso
// cambia el recorte y se ve como si la imagen se acercara y se alejara sola. No
// es un bug de nuestro dibujo: es el track cambiando debajo.
//
// La solución es no enseñar el video hasta que su tamaño real deje de moverse.

export const MS_CALIBRACION_MAX = 2500;   // techo: nunca dejar la pantalla pegada
const MS_MUESTREO_TAMANO = 80;
const MUESTRAS_ESTABLES = 4;              // ~320ms sin cambios

// Restricciones de captura. La relación de aspecto se pide EXPLÍCITA: sin ella
// el navegador puede entregar 4:3 y luego 16:9, y ahí es donde salta el recorte.
export const RESTRICCIONES_VIDEO: MediaStreamConstraints = {
  video: {
    facingMode: 'user',
    width: { ideal: 640 },
    height: { ideal: 480 },
    aspectRatio: { ideal: 4 / 3 },
    frameRate: { ideal: 24, max: 30 },
  },
};

// Algunos Android exponen zoom digital y arrancan con un valor > 1. Se baja al
// mínimo para que el encuadre sea el que el sensor ve de verdad.
export async function fijarZoomMinimo(stream: MediaStream): Promise<void> {
  const track = stream.getVideoTracks()[0];
  if (!track?.getCapabilities) return;
  try {
    // `zoom` es una extensión (Image Capture) que TypeScript no conoce todavía.
    const caps = track.getCapabilities() as MediaTrackCapabilities & { zoom?: { min: number } };
    if (caps.zoom?.min === undefined) return;
    await track.applyConstraints({ advanced: [{ zoom: caps.zoom.min }] } as unknown as MediaTrackConstraints);
  } catch {
    // El dispositivo no deja fijarlo: se sigue igual, solo se pierde la mejora.
  }
}

// Espera a que `videoWidth`/`videoHeight` se repitan varias veces seguidas.
// Devuelve las dimensiones con las que quedó, o null si nunca dio una imagen.
export async function esperarVideoEstable(
  video: HTMLVideoElement,
  ahora: () => number = () => performance.now(),
): Promise<{ ancho: number; alto: number } | null> {
  const inicio = ahora();
  let ultimo = '';
  let estables = 0;

  while (ahora() - inicio < MS_CALIBRACION_MAX) {
    const actual = `${video.videoWidth}x${video.videoHeight}`;
    if (video.videoWidth > 0 && actual === ultimo) {
      if (++estables >= MUESTRAS_ESTABLES) break;
    } else {
      estables = 0;
      ultimo = actual;
    }
    await new Promise(r => setTimeout(r, MS_MUESTREO_TAMANO));
  }

  return video.videoWidth > 0 ? { ancho: video.videoWidth, alto: video.videoHeight } : null;
}

// ===== Guía de encuadre estable =====
//
// El cuadro de detección tiembla de un fotograma a otro y cerca de un umbral el
// mensaje salta entre estados.
//
// Se amortigua la MEDICIÓN, no el veredicto. Amortiguar el veredicto —exigir que
// el nuevo se repita N veces— parece equivalente pero deja el mensaje pegado en
// uno viejo mientras la lectura oscila: se le diría "centra tu rostro" a alguien
// cuyo problema es la distancia. Promediando la posición y el tamaño no hay
// estado obsoleto posible, y de paso la oscilación desaparece en el origen.
const MUESTRAS_SUAVIZADO = 4;
// Ya encuadrado se tolera un poco más antes de volver a molestar: evita entrar y
// salir del "OK" por unos píxeles de temblor.
const HOLGURA_HISTERESIS = 0.03;

export function crearEstabilizadorEncuadre(muestras = MUESTRAS_SUAVIZADO) {
  const proporciones: number[] = [];
  const centrosX: number[] = [];
  const centrosY: number[] = [];
  let enOk = false;

  const agregar = (arr: number[], v: number) => { arr.push(v); if (arr.length > muestras) arr.shift(); };
  const media = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;

  return {
    siguiente(box: faceapi.Box, vw: number, vh: number): Encuadre {
      agregar(proporciones, box.width / vw);
      agregar(centrosX, (box.x + box.width / 2) / vw);
      agregar(centrosY, (box.y + box.height / 2) / vh);

      const h = enOk ? HOLGURA_HISTERESIS : 0;
      const prop = media(proporciones);
      const desviacionX = Math.abs(media(centrosX) - 0.5);
      const desviacionY = Math.abs(media(centrosY) - 0.5);

      let veredicto: Encuadre;
      if (desviacionX > 0.28 + h || desviacionY > 0.3 + h) veredicto = 'CENTRA';
      else if (prop < 0.16 - h) veredicto = 'ACERCATE';
      else if (prop > 0.8 + h) veredicto = 'ALEJATE';
      else veredicto = 'OK';

      enOk = veredicto === 'OK';
      return veredicto;
    },
    reiniciar() {
      proporciones.length = 0; centrosX.length = 0; centrosY.length = 0;
      enOk = false;
    },
  };
}

// ¿La pose actual (según el yaw) cumple lo que pide el paso?
export function poseCumple(tipo: TipoPose, dev: number): boolean {
  if (tipo === 'frontal') return Math.abs(dev) < 0.1;
  const magnitud = Math.abs(dev) > 0.13 && Math.abs(dev) < 0.42;
  if (tipo === 'derecha') return magnitud && Math.sign(dev) === SIGNO_DERECHA;
  return magnitud && Math.sign(dev) === -SIGNO_DERECHA;
}
