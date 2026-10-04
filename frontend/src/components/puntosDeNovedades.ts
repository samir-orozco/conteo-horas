// CUATRO PUNTOS Y NO QUINCE (3 de octubre de 2026, pedido del dueño). Con quince novedades la fila
// de puntos no cabía en un celular y bajaba a dos renglones.
export const PUNTOS_VISIBLES = 4;

// Qué novedades llevan punto: una ventana de cuatro que se corre al avanzar. El activo va a lo sumo
// en el tercer lugar, para que después de él quede un gris que diga «hay más»; solo en la última
// novedad llega al cuarto.
export function puntosVisibles(actual: number, total: number): number[] {
  const cuantos = Math.min(PUNTOS_VISIBLES, total);
  const desde = Math.max(0, Math.min(actual - (PUNTOS_VISIBLES - 2), total - cuantos));
  return Array.from({ length: cuantos }, (_, k) => desde + k);
}
