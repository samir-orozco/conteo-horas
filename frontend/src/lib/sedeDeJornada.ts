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

export type OpcionSede = SedeCorta & { activa: boolean };

/**
 * Las sedes que ofrece el filtro: las activas, más las que aparecen en las filas.
 *
 * El servidor solo lista las activas, pero desactivar una sede no borra sus
 * registros: el mes anterior sigue diciendo «Laureles» en la columna. Sin esto
 * no había forma de aislar esas jornadas, y con una sola sede activa desaparecía
 * también «En sedes distintas» aunque hubiera filas que cruzaron.
 */
export function opcionesDeSede(activas: SedeCorta[], filas: ConSedes[]): OpcionSede[] {
  const porId = new Map<string, OpcionSede>();
  for (const s of activas) porId.set(s.id, { id: s.id, nombre: s.nombre, activa: true });
  for (const r of filas) {
    for (const s of [r.sede, r.sedeSalida]) {
      if (s && !porId.has(s.id)) porId.set(s.id, { id: s.id, nombre: s.nombre, activa: false });
    }
  }
  return [...porId.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}
