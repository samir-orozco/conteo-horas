// Qué es cada marca dentro de un día.
//
// El backend lo decide (`momentosDelDia` en utils/jornada.ts) y aquí solo se
// traduce a algo legible. Que el rótulo viva en un solo archivo es la mitad del
// arreglo: la otra mitad fue que dejaran de deducirlo cuatro pantallas por su
// cuenta, que es como la foto de la salida a almorzar terminó diciendo "Salida".

export type Momento = 'ENTRADA' | 'SALIDA_ALMUERZO' | 'REGRESO_ALMUERZO' | 'SALIDA';

export const MOMENTO_LABEL: Record<Momento, string> = {
  ENTRADA: 'Entrada',
  SALIDA_ALMUERZO: 'Salida a descanso',
  REGRESO_ALMUERZO: 'Regreso del descanso',
  SALIDA: 'Salida',
};

// Las del descanso van en ámbar, como el chip de la lista de marcaciones: de un
// vistazo se distingue la jornada del almuerzo sin tener que leer.
export const MOMENTO_TONO: Record<Momento, string> = {
  ENTRADA: 'text-muted',
  SALIDA_ALMUERZO: 'text-amber-700',
  REGRESO_ALMUERZO: 'text-amber-700',
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
};
