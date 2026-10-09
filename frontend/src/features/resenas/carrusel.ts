// Cómo se reparte el carrusel de reseñas de la landing (docs/RESENAS.md, R36, R37 y R39).
//
// Computador: tres a la vista y la fila deslizándose sola hacia la derecha, muy despacio y sin fin,
// con flechas que corren una tarjeta. Celular: de a una, con «2 / 15» debajo. Con las que caben en una
// sola página no se mueve (R39: tres o menos en computador).
//
// Son funciones sin estado para que el componente solo tenga que guardar dónde va la fila. Son las
// cuentas que, mal hechas, dejan una fila que salta al dar la vuelta o que desaparece, y en pantalla
// eso no se nota hasta que alguien la mira un minuto entero.

export type Paginacion = {
  paginas: number;
  // Si hay más de una página: con flechas y movimiento. Si no, las tarjetas se quedan quietas.
  rota: boolean;
};

// Un tamaño de página de cero o negativo dividiría por cero; se trata como de a una.
const tamano = (porPagina: number) => Math.max(1, Math.floor(porPagina));

export function paginar(total: number, porPagina: number): Paginacion {
  const n = tamano(porPagina);
  // Un grupo incompleto al final también es un grupo: con 7 de a tres son tres puntos, no dos.
  const paginas = total > 0 ? Math.ceil(total / n) : 0;
  return { paginas, rota: paginas > 1 };
}

// Lo más que se cuenta de un cuadro al siguiente. Al volver de otra pestaña, el primer cuadro trae
// segundos de diferencia, y moverse todo eso de golpe se vería como un salto.
const MAX_MS_POR_CUADRO = 250;

// R36: dónde queda la fila después de `ms` milisegundos a `pxPorSegundo`. Las tarjetas viajan hacia la
// derecha, o sea que la fila se desplaza hacia atrás.
export function derivar(posicion: number, ms: number, pxPorSegundo: number): number {
  const tiempo = Math.min(Math.max(ms, 0), MAX_MS_POR_CUADRO);
  return posicion - (pxPorSegundo * tiempo) / 1000;
}

// La fila lleva tres copias de las reseñas, cada una de `anchoDeCopia`, y se mantiene en la del medio:
// entre media copia y una y media. Al salirse por un lado se la corre una copia entera, que se ve
// idéntica, así que la vuelta no tiene fin ni salto. Sin ancho medido (antes de que el navegador
// dibuje) no se toca: dividir por cero dejaría NaN y la fila desaparecería.
export function envolver(posicion: number, anchoDeCopia: number): number {
  if (!(anchoDeCopia > 0)) return posicion;
  const desde = anchoDeCopia / 2;
  return ((((posicion - desde) % anchoDeCopia) + anchoDeCopia) % anchoDeCopia) + desde;
}

// La curva de las flechas: arranca y frena suave. `t` va de 0 a 1 a lo largo del movimiento.
export function suavizar(t: number): number {
  const x = Math.min(Math.max(t, 0), 1);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

// R37: la posición en el celular, contada desde uno como la cuenta una persona.
export function etiquetaDePosicion(indice: number, total: number): string {
  if (total <= 0) return '';
  const posicion = Math.min(Math.max(indice, 0), total - 1) + 1;
  return `${posicion} / ${total}`;
}
