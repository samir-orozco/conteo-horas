import * as faceapi from 'face-api.js';

// Carga de los modelos de reconocimiento facial, optimizada para el "primera vez"
// en cada teléfono:
//   - Livianos (detector + landmarks, ~0.5MB) primero → la cámara enciende ya.
//   - Reconocimiento (~6.1MB) en segundo plano → solo hace falta al capturar.
//   - Progreso real de descarga: los bajamos nosotros mismos (prefetch) midiendo
//     bytes y calentando la caché del navegador; face-api luego los lee de ahí.
//   - EN DESARROLLO se re-descarga en cada carga (banco de pruebas para medir el
//     "primera vez"); en producción se usa la caché del navegador.
// (No se toca el entorno de face-api: parchear su fetch rompe su canvas interno.)

const BASE = '/models';

// Archivos por grupo (manifest + shards) con su peso conocido en bytes.
const LIGEROS = [
  { f: 'tiny_face_detector_model-weights_manifest.json', b: 2900 },
  { f: 'tiny_face_detector_model-shard1', b: 193321 },
  { f: 'face_landmark_68_model-weights_manifest.json', b: 7700 },
  { f: 'face_landmark_68_model-shard1', b: 356840 },
];
const PESADOS = [
  { f: 'face_recognition_model-weights_manifest.json', b: 18000 },
  { f: 'face_recognition_model-shard1', b: 4194304 },
  { f: 'face_recognition_model-shard2', b: 2249728 },
];

// En desarrollo forzamos re-descarga (cada recarga simula un teléfono nuevo).
const MODO_CACHE: RequestCache = import.meta.env.DEV ? 'reload' : 'default';

// Descarga los archivos midiendo el progreso real (0..1) y deja la respuesta en la
// caché del navegador para que face-api la reuse sin volver a bajarla.
async function prefetch(archivos: { f: string; b: number }[], onProgress?: (p: number) => void) {
  const total = archivos.reduce((s, a) => s + a.b, 0);
  let leidos = 0;
  for (const { f } of archivos) {
    let res: Response;
    try { res = await fetch(`${BASE}/${f}`, { cache: MODO_CACHE }); }
    catch { continue; } // si un archivo falla, face-api lo reintentará al cargar
    if (!res.body) continue;
    const reader = res.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      leidos += value.byteLength;
      onProgress?.(Math.min(1, leidos / total));
    }
  }
  onProgress?.(1);
}

let promLigeros: Promise<void> | null = null;
let promRostro: Promise<void> | null = null;

// Detector + landmarks (~0.5MB): con esto ya se enciende la cámara y se guía el
// encuadre. onProgress recibe 0..1.
export function cargarModelosLigeros(onProgress?: (p: number) => void): Promise<void> {
  if (!promLigeros) {
    promLigeros = (async () => {
      await prefetch(LIGEROS, onProgress);
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(BASE),
        faceapi.nets.faceLandmark68Net.loadFromUri(BASE),
      ]);
    })();
  } else {
    promLigeros.then(() => onProgress?.(1));
  }
  return promLigeros;
}

// Modelo de reconocimiento (~6.1MB): solo se necesita al capturar el descriptor;
// se descarga en segundo plano mientras la persona se acomoda. onProgress recibe 0..1.
export function cargarModeloRostro(onProgress?: (p: number) => void): Promise<void> {
  if (!promRostro) {
    promRostro = (async () => {
      await prefetch(PESADOS, onProgress);
      await faceapi.nets.faceRecognitionNet.loadFromUri(BASE);
    })();
  } else {
    promRostro.then(() => onProgress?.(1));
  }
  return promRostro;
}

// Compat: carga todo de una (por si algún consumidor viejo lo llama).
export function cargarModelosFaceApi(): Promise<void> {
  return Promise.all([cargarModelosLigeros(), cargarModeloRostro()]).then(() => undefined);
}
