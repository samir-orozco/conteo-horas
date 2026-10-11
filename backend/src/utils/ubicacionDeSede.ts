// ¿Guardar esta sede pone o cambia una geocerca? (15 de septiembre de 2026)
//
// Una sede con coordenadas activa la geocerca en el kiosco, y hasta hoy cualquier plan podía
// ponérsela aunque no incluyera la marcación por GPS: el permiso solo frenaba la geocerca vieja de
// Configuración (GEO_*). Ponerle ubicación a una sede, moverla o cambiarle el radio exige el permiso.
// Quitarla o guardarla como estaba, no, para que una empresa sin GPS pueda renombrar la sede que ya
// la tenía. Las sedes que ya tenían ubicación siguen exigiéndola en el kiosco, igual que la geocerca
// vieja: el permiso se revisa al guardar, no al marcar.
// `margenFuera` (11 de octubre de 2026) agranda la geocerca para marcar con alerta: cambiarlo cuenta igual que el radio.
export type UbicacionDeSede = { lat: number | null; lng: number | null; radio: number; margenFuera: number };

export function cambiaLaGeocerca(antes: UbicacionDeSede | null, despues: UbicacionDeSede): boolean {
  if (despues.lat === null || despues.lng === null) return false;
  if (!antes || antes.lat === null || antes.lng === null) return true;
  return antes.lat !== despues.lat || antes.lng !== despues.lng || antes.radio !== despues.radio
    || antes.margenFuera !== despues.margenFuera;
}

// Metros más allá del radio en los que un presencial todavía puede marcar, con alerta (11 de octubre
// de 2026). Lo que llega del cuerpo, sin validar:
//   - ausente: undefined, «no tocar». Un formulario anterior a este campo no lo manda, y leerlo como 0
//     apagaría en silencio el margen que otra persona ya había puesto.
//   - vacío o null: 0, apagado.
//   - lo que no es un número de metros entre 0 y el tope: null, y la ruta responde 400. No se adivina.
export const MARGEN_FUERA_MAXIMO = 1000;

export function leerMargenFuera(v: unknown): number | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === '') return 0;
  if (typeof v !== 'number' && typeof v !== 'string') return null;
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= 0 && n <= MARGEN_FUERA_MAXIMO ? n : null;
}
