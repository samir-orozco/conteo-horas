// Qué es cada marca dentro de un día.
//
// El backend lo decide (`momentosDelDia` en utils/jornada.ts) y aquí solo se
// traduce a algo legible. Que el rótulo viva en un solo archivo es la mitad del
// arreglo: la otra mitad fue que dejaran de deducirlo cuatro pantallas por su
// cuenta, que es como la foto de la salida a almorzar terminó diciendo "Salida".

export type Momento =
  | 'ENTRADA'
  | 'SALIDA_ALMUERZO' | 'REGRESO_ALMUERZO'
  | 'SALIDA_DESCANSO' | 'REGRESO_DESCANSO'
  | 'SALIDA';

export const MOMENTO_LABEL: Record<Momento, string> = {
  ENTRADA: 'Entrada',
  SALIDA_ALMUERZO: 'Salida a almorzar',
  REGRESO_ALMUERZO: 'Regreso del almuerzo',
  SALIDA_DESCANSO: 'Salida al descanso',
  REGRESO_DESCANSO: 'Regreso del descanso',
  SALIDA: 'Salida',
};

// Las pausas van en color, como el chip de la lista de marcaciones: de un vistazo
// se distingue la jornada de sus pausas sin tener que leer. El almuerzo en ámbar
// y el descanso no remunerado en azul, para no confundir una con otra.
export const MOMENTO_TONO: Record<Momento, string> = {
  ENTRADA: 'text-muted',
  SALIDA_ALMUERZO: 'text-amber-700',
  REGRESO_ALMUERZO: 'text-amber-700',
  SALIDA_DESCANSO: 'text-sky-700',
  REGRESO_DESCANSO: 'text-sky-700',
  SALIDA: 'text-muted',
};

export type FotoDeJornada = {
  registroId: string;
  momento: Momento;
  hora: string | null;
  foto: string | null;
  // La hora la puso el auto-cierre, no la persona. La foto entonces no existe, y
  // el hueco necesita decir por qué.
  estimada: boolean;
  // A qué turno del día pertenece, desde 0. Lo decide el backend con la misma
  // regla que parte el día en la tabla: volver de una pausa es el mismo turno;
  // volver por la tarde a hacer extras es otro.
  //
  // OPCIONAL A PROPÓSITO. Un backend anterior a este cambio no lo manda, y
  // entonces la pantalla cae a una sola lista sin títulos, que es como se veía
  // antes. Agrupar a medias pondría fotos bajo el turno equivocado.
  jornada?: number;
  // Dónde se tomó. `null`: no se sabe, que es lo que pasa con toda salida de
  // antes de que se guardara la sede de la salida. Nunca se rellena con la sede
  // de la entrada: eso sería afirmar un lugar que nadie registró.
  sede?: { id: string; nombre: string } | null;
};
