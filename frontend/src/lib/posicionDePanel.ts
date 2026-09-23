// DÓNDE CABE UN PANEL FLOTANTE SIN SALIRSE DE LA PANTALLA (22 de septiembre de 2026).
//
// Pedido del dueño, y dicho para TODA esta clase de elementos: «no deben de ocultarse con la
// pantalla, que se acomode al espacio». Por eso vive en `lib/` y no junto al calendario.
//
// POR QUÉ ES UNA DECISIÓN Y NO CSS: un panel anclado a un botón se sale por abajo cuando el botón
// está en la última fila, y por la derecha cuando está en la última columna. Las dos cosas pasan
// SIEMPRE en una rejilla de siete días: el domingo es la última columna y la última persona es la
// última fila. Es un defecto que no aparece en el caso de en medio, que es el que uno prueba a
// mano.

export const MARGEN_DE_PANTALLA = 8;

export type Rect = { x: number; y: number; ancho: number; alto: number };
export type Tamano = { ancho: number; alto: number };

// Mete una coordenada dentro de la ventana, dejando el margen a los dos lados.
//
// EL ORDEN IMPORTA Y ES LO ÚNICO DELICADO DE ESTE ARCHIVO: se ajusta primero contra el tope y
// DESPUÉS contra el margen. Al revés, un panel más grande que la ventana termina en negativo, o
// sea cortado por arriba y sin forma de llegar a su primer control. Así se sale por abajo, que al
// menos se puede desplazar.
function dentroDeLaVentana(preferido: number, tamanoPanel: number, tamanoVentana: number): number {
  const tope = tamanoVentana - tamanoPanel - MARGEN_DE_PANTALLA;
  return Math.max(MARGEN_DE_PANTALLA, Math.min(preferido, tope));
}

export function posicionDePanel(ancla: Rect, panel: Tamano, ventana: Tamano): { x: number; y: number } {
  // Horizontal: alineado a la izquierda del botón, corrido lo justo si se saldría por la derecha.
  const x = dentroDeLaVentana(ancla.x, panel.ancho, ventana.ancho);

  // Vertical: tres casos, y se escriben como tres casos y no como un ternario anidado, porque el
  // tercero no es «lo que sobra» sino una regla propia (CLAUDE.md §9.4).
  const debajo = ancla.y + ancla.alto + MARGEN_DE_PANTALLA;
  if (debajo + panel.alto <= ventana.alto - MARGEN_DE_PANTALLA) return { x, y: debajo };

  const encima = ancla.y - panel.alto - MARGEN_DE_PANTALLA;
  if (encima >= MARGEN_DE_PANTALLA) return { x, y: encima };

  // No cabe ni arriba ni abajo: se queda pegado dentro de la ventana, tapando el botón. Es peor que
  // las otras dos opciones y mejor que quedar fuera de la pantalla, que es donde no se puede usar.
  return { x, y: dentroDeLaVentana(debajo, panel.alto, ventana.alto) };
}
