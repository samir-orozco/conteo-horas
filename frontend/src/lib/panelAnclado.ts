// Dónde cae un panel colgado de un botón del menú lateral (4 de octubre de 2026).
//
// Lo usan el menú de Reportes y el de Notificaciones, que son dos paneles
// `position: fixed` montados en el body y anclados a su botón. Vivía copiado en
// los dos, y en uno de ellos —el de Reportes— le faltaba la mitad: en una
// ventana de 620 px de alto el panel empezaba en 504 y terminaba en 858, o sea
// 238 px por debajo del borde. Al ser fixed no hay scroll que lo alcance, así
// que de las cuatro opciones solo se podía tocar la primera.
//
// `MenuAcciones` resuelve algo parecido con otra aritmética, y se queda aparte a
// propósito: ese se abre DEBAJO de su botón y se voltea hacia arriba cuando no
// cabe. Esto de aquí se abre AL LADO y se desliza. Son dos colocaciones
// distintas, no dos copias de la misma.

// Aire que se le deja a los bordes de la ventana.
export const MARGEN = 16;
// Lo que se separa del botón que lo abre.
export const SEPARACION = 10;

export type PanelAnclado = { top: number; left: number; maxHeight: number };

export function posicionDelPanel({ anclaTop, anclaRight, altoPanel, altoVentana }: {
  anclaTop: number;
  anclaRight: number;
  // Lo que mide el panel ya pintado. Hay que medirlo: depende de cuántas
  // opciones tenga y de cuánto texto traiga cada una.
  altoPanel: number;
  altoVentana: number;
}): PanelAnclado {
  // Lo más alto que puede ser sin tocar ningún borde. Si el panel pide más, se
  // desplaza por dentro en vez de salirse. Nunca negativo: una ventana
  // diminuta (el instante de rotar el teléfono) colapsaría el panel a nada.
  const maxHeight = Math.max(0, altoVentana - MARGEN * 2);

  // Lo que va a ocupar de verdad, que es lo que decide cuánto hay que subirlo.
  const alto = Math.min(altoPanel, maxHeight);

  // A la altura del botón si cabe; si no, lo justo para que el borde de abajo
  // quede dentro. El Math.max de afuera manda cuando ni subiéndolo cabe: ahí se
  // pega arriba y el maxHeight se encarga del resto.
  const top = Math.max(MARGEN, Math.min(anclaTop, altoVentana - MARGEN - alto));

  return { top, left: anclaRight + SEPARACION, maxHeight };
}
