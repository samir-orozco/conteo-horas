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

// Lo que llega del servidor puede ser de una versión anterior de la paleta, o de un turno cuyo color
// se retiró. Pintar «nada» dejaría una celda invisible en el calendario, así que se cae al neutro,
// igual que `normalizarModalidad` cae a PRESENCIAL.
export function normalizarColor(v: unknown): ColorDeTurno {
  return (COLORES_DE_TURNO as readonly unknown[]).includes(v) ? (v as ColorDeTurno) : COLOR_POR_DEFECTO;
}
