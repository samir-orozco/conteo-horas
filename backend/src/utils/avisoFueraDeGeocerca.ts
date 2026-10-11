// El aviso de la campana cuando un PRESENCIAL marca fuera de la geocerca de su sede, dentro
// del margen que la sede permite (11 de octubre de 2026). Los híbridos no lo generan: para
// ellos marcar lejos es lo normal. Sin metros: guardar a cuánto estaba toca la política de datos.
export type Momento = 'ENTRADA' | 'SALIDA';

const MARCA: Record<Momento, string> = { ENTRADA: 'la entrada', SALIDA: 'la salida' };

export function avisoFueraDeGeocerca(
  persona: { nombre: string; apellido: string },
  momento: Momento,
  sede: string,
) {
  return {
    tipo: 'MARCO_FUERA_DE_GEOCERCA' as const,
    titulo: `${persona.nombre} ${persona.apellido} marcó fuera de la geocerca`,
    cuerpo: `Marcó ${MARCA[momento]} fuera de la geocerca de ${sede}, dentro del margen que permite la sede.`,
  };
}

// Si la jornada lleva la alerta en Registros: basta UNA de sus marcas hecha fuera, sea la
// entrada, la salida o el regreso de una pausa.
export function jornadaFueraDeGeocerca(marcaciones: { fueraGeocercaEntrada: boolean; fueraGeocercaSalida: boolean }[]): boolean {
  return marcaciones.some(m => m.fueraGeocercaEntrada || m.fueraGeocercaSalida);
}
