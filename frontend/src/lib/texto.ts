// Sin tildes y en minúscula.
//
// LAS DOS DIRECCIONES IMPORTAN: nadie escribe «Julián» con tilde en un buscador, y quien sí la escriba
// tampoco puede quedarse sin resultados. Sin esto, media lista de nombres colombianos no se encuentra.
//
// VIVE AQUÍ desde el 28 de septiembre de 2026, cuando el código corto de los turnos necesitó lo mismo.
// Estaba dentro de `quienSeVe.ts` y se movió con su único usuario en el mismo cambio: una regla
// compartida que deja una copia atrás es peor que no haberla extraído (CLAUDE.md §9.3).
export function sinTildes(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
