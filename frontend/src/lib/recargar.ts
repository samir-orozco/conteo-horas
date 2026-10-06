// La recarga de la página, en un archivo aparte a propósito: `window.location.reload` no se puede
// sustituir en jsdom, así que una pantalla que lo llame directo no se puede probar sin intentar
// navegar de verdad. Las pruebas reemplazan este módulo; en producción es una sola línea.
export function recargarPagina(): void {
  window.location.reload();
}
