// ¿Guardar esta sede pone o cambia una geocerca? (15 de septiembre de 2026)
//
// Una sede con coordenadas activa la geocerca en el kiosco, y hasta hoy cualquier plan podía
// ponérsela aunque no incluyera la marcación por GPS: el permiso solo frenaba la geocerca vieja de
// Configuración (GEO_*). Ponerle ubicación a una sede, moverla o cambiarle el radio exige el permiso.
// Quitarla o guardarla como estaba, no, para que una empresa sin GPS pueda renombrar la sede que ya
// la tenía. Las sedes que ya tenían ubicación siguen exigiéndola en el kiosco, igual que la geocerca
// vieja: el permiso se revisa al guardar, no al marcar.
export type UbicacionDeSede = { lat: number | null; lng: number | null; radio: number };

export function cambiaLaGeocerca(antes: UbicacionDeSede | null, despues: UbicacionDeSede): boolean {
  if (despues.lat === null || despues.lng === null) return false;
  if (!antes || antes.lat === null || antes.lng === null) return true;
  return antes.lat !== despues.lat || antes.lng !== despues.lng || antes.radio !== despues.radio;
}
