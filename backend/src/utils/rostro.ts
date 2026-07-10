// Reconocimiento facial: solo comparamos descriptores matemáticos (128 floats
// que produce face-api.js en el navegador). La imagen nunca llega al servidor.

// Distancia recomendada por face-api.js para considerar "misma persona".
// Por debajo de este umbral se acepta la coincidencia.
export const UMBRAL_COINCIDENCIA = 0.5;

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

// Busca la mejor coincidencia entre un descriptor entrante y los colaboradores
// enrolados de la empresa. Devuelve null si nadie cae dentro del umbral.
export function mejorCoincidencia<T extends { id: string; rostroDescriptor: unknown }>(
  entrante: number[],
  candidatos: T[]
): { colaborador: T; distancia: number } | null {
  let mejor: { colaborador: T; distancia: number } | null = null;
  for (const c of candidatos) {
    if (!esDescriptorValido(c.rostroDescriptor)) continue;
    const distancia = distanciaEuclidiana(entrante, c.rostroDescriptor);
    if (distancia <= UMBRAL_COINCIDENCIA && (!mejor || distancia < mejor.distancia)) {
      mejor = { colaborador: c, distancia };
    }
  }
  return mejor;
}
