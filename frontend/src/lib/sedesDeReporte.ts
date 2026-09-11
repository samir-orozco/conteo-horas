// Cómo se lee la sede de una fila en los reportes de extras y de llegadas tarde.
//
// Quién es mixto lo decide el servidor (backend/src/utils/sedesDeReporte.ts), que
// además manda las sedes ya ordenadas. Aquí solo se escribe lo que llega.

export type SedeDeFila = { id: string | null; nombre: string | null };

export function nombreDeLugar(sede: SedeDeFila): string {
  if (sede.nombre !== null) return sede.nombre;
  // Sin nombre hay dos casos, y no se escriben igual: el turno no guardó sede, o
  // guardó una que el servidor no encontró entre las de la empresa.
  return sede.id === null ? 'Sin sede' : 'Sede sin nombre';
}

export function textoDeSedes(sedes: SedeDeFila[]): { texto: string; mixto: boolean } {
  // No marcó en el período: no hay dónde.
  if (sedes.length === 0) return { texto: '—', mixto: false };
  return { texto: sedes.map(nombreDeLugar).join(' · '), mixto: sedes.length > 1 };
}
