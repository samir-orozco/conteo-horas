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

// EL ANCHO, EN TRES CASOS (24 de septiembre de 2026). Los mismos tres que el alto y por la misma
// razón: el lado preferido, el contrario, y pegarse dentro de la ventana como último recurso.
//
// ABRE A LA DERECHA, alineado al borde izquierdo de la celda. Si no cabe, ABRE A LA IZQUIERDA,
// alineado a su borde derecho.
//
// POR QUÉ VOLTEAR Y NO SOLO CORRER HACIA ADENTRO, que es lo único que hacía antes: corrido, el
// panel entra en la pantalla pero se DESPEGA de la celda. En el calendario, el del domingo
// terminaba encima del miércoles y ya no se veía de qué día hablaba. Volteado sigue tocando la
// celda que se abrió.
//
// Y POR QUÉ CONDICIONAL Y NO SIEMPRE AL REVÉS, que fue la primera idea: una rejilla de siete días
// tiene DOS extremos. Abrir siempre hacia la izquierda arregla el domingo y rompe el lunes.
//
// AQUÍ SE COMPRUEBAN LOS DOS BORDES en cada caso y el alto solo comprueba uno. No es un descuido
// de allá: `debajo` sale de SUMARLE algo a `ancla.y`, así que nunca cae por encima del margen
// superior, mientras que `ancla.x` sí puede venir pegado al borde izquierdo de la ventana.
function posicionHorizontal(ancla: Rect, panel: Tamano, ventana: Tamano): number {
  const cabe = (x: number) =>
    x >= MARGEN_DE_PANTALLA && x + panel.ancho <= ventana.ancho - MARGEN_DE_PANTALLA;

  const haciaLaDerecha = ancla.x;
  if (cabe(haciaLaDerecha)) return haciaLaDerecha;

  const haciaLaIzquierda = ancla.x + ancla.ancho - panel.ancho;
  if (cabe(haciaLaIzquierda)) return haciaLaIzquierda;

  return dentroDeLaVentana(haciaLaDerecha, panel.ancho, ventana.ancho);
}

export function posicionDePanel(ancla: Rect, panel: Tamano, ventana: Tamano): { x: number; y: number } {
  const x = posicionHorizontal(ancla, panel, ventana);

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
