import * as faceapi from 'face-api.js';

// Helpers puros y constantes del reconocimiento facial en el cliente. Se sacaron de
// CamaraRostro.tsx para poder ajustar/probar umbrales sin montar el componente.

export type Modo = 'login' | 'enrolar';
export type Estado = 'cargando' | 'guiando' | 'preview' | 'exito' | 'error';
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

// ¿La pose actual (según el yaw) cumple lo que pide el paso?
export function poseCumple(tipo: TipoPose, dev: number): boolean {
  if (tipo === 'frontal') return Math.abs(dev) < 0.1;
  const magnitud = Math.abs(dev) > 0.13 && Math.abs(dev) < 0.42;
  if (tipo === 'derecha') return magnitud && Math.sign(dev) === SIGNO_DERECHA;
  return magnitud && Math.sign(dev) === -SIGNO_DERECHA;
}
