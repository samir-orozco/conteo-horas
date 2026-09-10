// Dónde se abrió y dónde se cerró una jornada, y los filtros de la tabla que
// dependen de eso. Fuera de la pantalla para poder probarlo sin montarla.

export type SedeCorta = { id: string; nombre: string };
export type ConSedes = { sede?: SedeCorta | null; sedeSalida?: SedeCorta | null };

export const CRUCE_DISTINTAS = 'DISTINTAS';

/**
 * Abrió en una sede y cerró en otra.
 *
 * Solo es verdad cuando se conocen LAS DOS, y se comparan por id: dos sedes
 * pueden llamarse igual. Una salida sin sede registrada (todo lo anterior a que
 * se guardara) no es «cerró en otra parte», es «no se sabe».
 */
export function cruzoDeSede(r: ConSedes): boolean {
  return !!r.sede && !!r.sedeSalida && r.sede.id !== r.sedeSalida.id;
}

/** Basta con que haya abierto O cerrado en alguna de las elegidas. */
export function cumpleSede(r: ConSedes, elegidas: string[]): boolean {
  if (elegidas.length === 0) return true;
  return elegidas.some(id => r.sede?.id === id || r.sedeSalida?.id === id);
}

export function cumpleCruce(r: ConSedes, elegidas: string[]): boolean {
  if (!elegidas.includes(CRUCE_DISTINTAS)) return true;
  return cruzoDeSede(r);
}
