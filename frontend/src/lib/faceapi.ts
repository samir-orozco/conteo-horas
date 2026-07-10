import * as faceapi from 'face-api.js';

let cargaPromise: Promise<void> | null = null;

// Carga perezosa de los modelos (una sola vez por sesión). Los pesos viven en
// /public/models y viajan con el propio frontend: nada se instala aparte.
export function cargarModelosFaceApi(): Promise<void> {
  if (!cargaPromise) {
    cargaPromise = Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
      faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
      faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
    ]).then(() => undefined);
  }
  return cargaPromise;
}
