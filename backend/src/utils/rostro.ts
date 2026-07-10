// Reconocimiento facial: solo comparamos descriptores matemáticos (128 floats
// que produce face-api.js en el navegador). La imagen nunca llega al servidor.

// Distancia recomendada por face-api.js para considerar "misma persona".
// Por debajo de este umbral se acepta la coincidencia.
export const UMBRAL_COINCIDENCIA = 0.5;

// Cada colaborador guarda varias muestras (frente, perfiles, con/sin gafas)
const MAX_MUESTRAS = 6;

function distanciaEuclidiana(a: number[], b: number[]): number {
  let suma = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    suma += diff * diff;
  }
  return Math.sqrt(suma);
}

export function esDescriptorValido(d: unknown): d is number[] {
  return Array.isArray(d) && d.length === 128 && d.every(n => typeof n === 'number' && Number.isFinite(n));
}

// Lista de muestras del enrolamiento guiado (1 a MAX_MUESTRAS descriptores)
export function esListaDescriptoresValida(l: unknown): l is number[][] {
  return Array.isArray(l) && l.length >= 1 && l.length <= MAX_MUESTRAS && l.every(esDescriptorValido);
}

// Lo guardado puede ser un descriptor suelto (enrolamientos viejos) o una lista
// de muestras (enrolamiento guiado multi-ángulo). Siempre devolvemos lista.
function muestrasDe(guardado: unknown): number[][] {
  if (esDescriptorValido(guardado)) return [guardado];
  if (esListaDescriptoresValida(guardado)) return guardado;
  return [];
}

// Busca la mejor coincidencia entre un descriptor entrante y los colaboradores
// enrolados de la empresa. Compara contra TODAS las muestras de cada uno y se
// queda con la distancia mínima. Devuelve null si nadie cae dentro del umbral.
export function mejorCoincidencia<T extends { id: string; rostroDescriptor: unknown }>(
  entrante: number[],
  candidatos: T[]
): { colaborador: T; distancia: number } | null {
  let mejor: { colaborador: T; distancia: number } | null = null;
  for (const c of candidatos) {
    for (const muestra of muestrasDe(c.rostroDescriptor)) {
      const distancia = distanciaEuclidiana(entrante, muestra);
      if (distancia <= UMBRAL_COINCIDENCIA && (!mejor || distancia < mejor.distancia)) {
        mejor = { colaborador: c, distancia };
      }
    }
  }
  return mejor;
}
