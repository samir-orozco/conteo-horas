import * as faceapi from 'face-api.js';

// Carga de los modelos de reconocimiento facial, optimizada para el "primera vez"
// en cada teléfono:
//   - Livianos (detector + landmarks, ~0.5MB) primero → la cámara enciende ya.
//   - Reconocimiento (~6.1MB) en segundo plano → solo hace falta al capturar.
//   - Progreso real de descarga: los bajamos nosotros mismos (prefetch) midiendo
//     bytes; el service worker (public/sw.js) los guarda en Cache Storage y
//     face-api luego los lee de ahí sin volver a tocar la red.
// (No se toca el entorno de face-api: parchear su fetch rompe su canvas interno.)
//
// Antes aquí se forzaba `cache: 'reload'` en desarrollo, como banco de pruebas
// para medir siempre el "primera vez". Con el service worker eso ya no sirve —él
// responde desde su caché antes de llegar a la red— y encima escondía el
// comportamiento real. Para simular un teléfono nuevo está `borrarCacheModelos`.

const BASE = '/models';
const CACHE_MODELOS = 'horapro-modelos-v1'; // debe coincidir con public/sw.js

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

const TODOS = [...LIGEROS, ...PESADOS];

// ¿Este dispositivo ya tiene los modelos guardados? Sirve para no prometerle al
// trabajador una espera que no va a ocurrir (y al revés: para avisarle cuando sí).
export async function modelosEnCache(): Promise<boolean> {
  if (!('caches' in window)) return false;
  try {
    const cache = await caches.open(CACHE_MODELOS);
    const encontrados = await Promise.all(
      TODOS.map(a => cache.match(`${BASE}/${a.f}`, { ignoreVary: true })),
    );
    return encontrados.every(Boolean);
  } catch {
    return false;
  }
}

// Vacía la caché de modelos: simula un teléfono nuevo sin borrar los datos del
// sitio a mano. Es el banco de pruebas para medir la primera descarga.
export async function borrarCacheModelos(): Promise<void> {
  try { await caches.delete(CACHE_MODELOS); } catch { /* sin caché, nada que borrar */ }
  navigator.serviceWorker?.controller?.postMessage('borrar-modelos');
}

// Descarga los archivos midiendo el progreso real (0..1). El service worker se
// queda con una copia, así que la próxima vez esto no toca la red.
async function prefetch(archivos: { f: string; b: number }[], onProgress?: (p: number) => void) {
  const total = archivos.reduce((s, a) => s + a.b, 0);
  let leidos = 0;
  for (const { f } of archivos) {
    let res: Response;
    try { res = await fetch(`${BASE}/${f}`); }
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
