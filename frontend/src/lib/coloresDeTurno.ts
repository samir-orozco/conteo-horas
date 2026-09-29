// El color con el que se pinta un turno del catálogo en el calendario del planificador.
//
// ESPEJO de `COLORES_DE_PLANTILLA` en backend/src/utils/cuerpoDePlantilla.ts, con la misma
// convención que los demás espejos entre los dos lados (`modalidad.ts`, `sedesDeReporte.ts`,
// `sedePrincipal.ts`): no hay guarda automática, porque el frontend no importa nada del backend
// (su tsconfig incluye solo `src`). Si las dos listas se separan, un color que solo conozca este
// lado se guarda allá como el de por defecto, y uno que solo conozca el backend no se ofrece. Es
// visible al instante en la celda y no mueve ningún número.
//
// Se guarda la CLAVE y no el color, para poder retocar la paleta sin migrar datos.

export const COLORES_DE_TURNO = [
  'grafito', 'ambar', 'indigo', 'esmeralda', 'rubi', 'cobalto', 'violeta', 'ocre',
] as const;

export type ColorDeTurno = (typeof COLORES_DE_TURNO)[number];

// El neutro de la marca: el que toma un turno al que nadie le eligió color.
export const COLOR_POR_DEFECTO: ColorDeTurno = 'grafito';

export const ETIQUETA_COLOR: Record<ColorDeTurno, string> = {
  grafito: 'Grafito',
  ambar: 'Ámbar',
  indigo: 'Índigo',
  esmeralda: 'Esmeralda',
  rubi: 'Rubí',
  cobalto: 'Cobalto',
  violeta: 'Violeta',
  ocre: 'Ocre',
};

// Fondo claro con texto oscuro del mismo tono: la celda lleva el nombre del turno encima, así que
// el par tiene que garantizar contraste. Por eso la paleta es cerrada y no un selector libre.
//
// LAS CLASES VAN COMPLETAS Y LITERALES, nunca armadas como `bg-${color}-200`: Tailwind solo conserva
// las clases que encuentra escritas en el código, así que una construida se ve bien en desarrollo y
// sale SIN COLOR en el paquete de producción. `coloresDeTurno.test.ts` lo afirma.
export const CLASES_COLOR: Record<ColorDeTurno, string> = {
  grafito: 'bg-gray-200 text-gray-800',
  ambar: 'bg-amber-200 text-amber-900',
  indigo: 'bg-indigo-200 text-indigo-900',
  esmeralda: 'bg-emerald-200 text-emerald-900',
  rubi: 'bg-rose-200 text-rose-900',
  cobalto: 'bg-sky-200 text-sky-900',
  violeta: 'bg-violet-200 text-violet-900',
  ocre: 'bg-orange-200 text-orange-900',
};

// EL MISMO COLOR, RELLENO ENTERO, para el selector del modal (23 de septiembre de 2026): un círculo
// del color con su nombre debajo, como lo pidió el dueño.
//
// Es un mapa aparte y no una variante de `CLASES_COLOR` porque los dos resuelven cosas distintas.
// Aquel es un par fondo claro + texto oscuro, y el contraste lo da el NOMBRE DEL TURNO escrito
// encima; un círculo vacío no lleva nada encima, así que pintado con ese fondo claro los ocho
// colores se ven casi iguales, que es justo lo contrario de para lo que sirve elegir un color.
//
// Van literales por la misma razón que las de arriba: Tailwind purga lo que no encuentra escrito.
export const PUNTO_COLOR: Record<ColorDeTurno, string> = {
  grafito: 'bg-gray-500',
  ambar: 'bg-amber-400',
  indigo: 'bg-indigo-500',
  esmeralda: 'bg-emerald-500',
  rubi: 'bg-rose-500',
  cobalto: 'bg-sky-500',
  violeta: 'bg-violet-500',
  ocre: 'bg-orange-500',
};

// EL TERCER MAPA: LA CELDA DE LA REJILLA (28 de septiembre de 2026, para igualar la maqueta).
//
// Fondo muy claro, texto oscuro y BORDE del color. Los tres mapas resuelven contrastes distintos y
// por eso no se sustituyen; el bloque de la prueba lo cuenta entero.
//
// El resumen: una pastilla suelta se lee sobre blanco y aguanta un fondo medio; una celda vive
// pegada a otras treinta y encima lleva el anillo amarillo de la selección, que sobre un fondo `-200`
// compite con el relleno en vez de destacar. Con el fondo claro, el color lo sostienen el borde y el
// punto que va antes del nombre, y el amarillo de lo marcado manda.
//
// Literales por la misma razón que los otros dos: Tailwind purga lo que no encuentra escrito.
export const CELDA_COLOR: Record<ColorDeTurno, string> = {
  grafito: 'bg-gray-50 text-gray-800 border-gray-300',
  ambar: 'bg-amber-50 text-amber-900 border-amber-300',
  indigo: 'bg-indigo-50 text-indigo-900 border-indigo-300',
  esmeralda: 'bg-emerald-50 text-emerald-900 border-emerald-300',
  rubi: 'bg-rose-50 text-rose-900 border-rose-300',
  cobalto: 'bg-sky-50 text-sky-900 border-sky-300',
  violeta: 'bg-violet-50 text-violet-900 border-violet-300',
  ocre: 'bg-orange-50 text-orange-900 border-orange-300',
};

// Lo que llega del servidor puede ser de una versión anterior de la paleta, o de un turno cuyo color
// se retiró. Pintar «nada» dejaría una celda invisible en el calendario, así que se cae al neutro,
// igual que `normalizarModalidad` cae a PRESENCIAL.
export function normalizarColor(v: unknown): ColorDeTurno {
  return (COLORES_DE_TURNO as readonly unknown[]).includes(v) ? (v as ColorDeTurno) : COLOR_POR_DEFECTO;
}
