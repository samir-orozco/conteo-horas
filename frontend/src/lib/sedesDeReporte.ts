// Cómo se lee la sede de una fila en los reportes de extras y de llegadas tarde.
//
// Quién es mixto lo decide el servidor (backend/src/utils/sedesDeReporte.ts), que
// además manda las sedes ya ordenadas. Aquí solo se escribe lo que llega.
//
// `porDefecto` (decisión del dueño del 12 de septiembre de 2026): la sede que el
// servidor le atribuye al leer a un presencial y que ninguna marca del período
// probó. Opcional porque las líneas del resumen no lo traen, y por la ventana del
// despliegue en la que el servidor todavía responde sin él. Desde el 13 de septiembre
// no cambia el texto: el dueño pidió quitar «por defecto», y la sede se escribe con su
// nombre, sea atribuida o probada.

export type SedeDeFila = { id: string | null; nombre: string | null; porDefecto?: boolean };

export function nombreDeLugar(sede: SedeDeFila): string {
  if (sede.nombre !== null) return sede.nombre;
  // Sin nombre hay dos casos, y no se escriben igual: el turno no guardó sede, o
  // guardó una que el servidor no encontró entre las de la empresa.
  return sede.id === null ? 'Sin sede' : 'Sede sin nombre';
}

export function textoDeSedes(sedes: SedeDeFila[]): { texto: string; mixto: boolean } {
  // No marcó en el período: no hay dónde.
  if (sedes.length === 0) return { texto: '—', mixto: false };
  return { texto: sedes.map(s => nombreDeLugar(s)).join(' · '), mixto: sedes.length > 1 };
}
