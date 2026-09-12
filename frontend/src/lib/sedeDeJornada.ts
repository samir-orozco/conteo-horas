// Dónde se abrió y dónde se cerró una jornada, y los filtros de la tabla que
// dependen de eso. Fuera de la pantalla para poder probarlo sin montarla.

export type SedeCorta = { id: string; nombre: string };
// `sedeAtribuida` (decisión del dueño del 12 de septiembre de 2026, «mostrarla al
// leer»): la sede que el servidor le atribuye a la jornada de un presencial que no
// abrió en una sede probada. Sirve para mostrarla con «por defecto» y para el
// filtro de sede; nunca para decir que cruzó de sede, porque no la probó la ubicación.
export type ConSedes = { sede?: SedeCorta | null; sedeSalida?: SedeCorta | null; sedeAtribuida?: SedeCorta | null };

export const CRUCE_DISTINTAS = 'DISTINTAS';

/**
 * Abrió en una sede y cerró en otra.
 *
 * Solo es verdad cuando se conocen LAS DOS, y se comparan por id: dos sedes
 * pueden llamarse igual. Una salida sin sede registrada (todo lo anterior a que
 * se guardara) no es «cerró en otra parte», es «no se sabe». La sede atribuida
 * tampoco cuenta como apertura.
 */
export function cruzoDeSede(r: ConSedes): boolean {
  return !!r.sede && !!r.sedeSalida && r.sede.id !== r.sedeSalida.id;
}

/**
 * Basta con que haya abierto O cerrado en alguna de las elegidas, o con que sea la
 * sede que se le atribuye: quien filtra por una sede busca también a quien cuenta ahí.
 */
export function cumpleSede(r: ConSedes, elegidas: string[]): boolean {
  if (elegidas.length === 0) return true;
  return elegidas.some(id => r.sede?.id === id || r.sedeSalida?.id === id || r.sedeAtribuida?.id === id);
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
 * también «En sedes distintas» aunque hubiera filas que cruzaron. La sede
 * atribuida entra también: el filtro la incluye, y puede salir de una sede probada
 * del mismo día que ya se desactivó.
 */
export function opcionesDeSede(activas: SedeCorta[], filas: ConSedes[]): OpcionSede[] {
  const porId = new Map<string, OpcionSede>();
  for (const s of activas) porId.set(s.id, { id: s.id, nombre: s.nombre, activa: true });
  for (const r of filas) {
    for (const s of [r.sede, r.sedeSalida, r.sedeAtribuida]) {
      if (s && !porId.has(s.id)) porId.set(s.id, { id: s.id, nombre: s.nombre, activa: false });
    }
  }
  return [...porId.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

/**
 * Si la tabla pinta la columna de sede. `activas` son las sedes activas de la
 * empresa, las que lista GET /sedes.
 *
 * Con más de una sede activa, sí, igual que los reportes (`sedes.length > 1`).
 * Antes dependía de cuántas sedes distintas traían las filas, y filtrando a una
 * persona de una empresa con varias sedes, todas sus jornadas decían la misma sede
 * por defecto y la columna desaparecía justo ahí (revisión del 12 de septiembre de
 * 2026). Con una sola sede activa, o ninguna, solo si alguna fila tiene una sede
 * probada, que puede ser una ya desactivada: si no, sería la misma etiqueta
 * repetida en cada fila.
 */
export function muestraColumnaSede(filas: ConSedes[], activas: SedeCorta[]): boolean {
  if (activas.length > 1) return true;
  return filas.some(r => r.sede || r.sedeSalida);
}
