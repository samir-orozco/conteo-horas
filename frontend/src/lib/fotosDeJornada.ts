import type { FotoDeJornada, Momento } from '../constants/momentos';

// La lógica de cómo se ordenan las fotos de un día en la pantalla, fuera del
// componente para poder probarla sin montar nada.

/**
 * Las fotos agrupadas por turno, en el orden de los turnos.
 *
 * Si ALGUNA foto no trae `jornada` no se agrupa nada y sale una sola lista:
 * es lo que pasa con un backend anterior a este cambio, y agrupar a medias
 * pondría fotos bajo el turno equivocado.
 */
export function agruparPorJornada(fotos: FotoDeJornada[]): FotoDeJornada[][] {
  if (fotos.length === 0) return [];
  if (fotos.some(f => typeof f.jornada !== 'number')) return [fotos];
  const grupos = new Map<number, FotoDeJornada[]>();
  for (const f of fotos) {
    const j = f.jornada as number;
    if (!grupos.has(j)) grupos.set(j, []);
    grupos.get(j)!.push(f);
  }
  return [...grupos.entries()].sort((a, b) => a[0] - b[0]).map(([, g]) => g);
}

/**
 * Dónde abrió y dónde cerró un turno, y si fueron sitios distintos.
 *
 * Se compara por `id` y no por nombre: dos sedes pueden llamarse igual
 * («Principal» en dos ciudades) y serían, sin embargo, dos sitios.
 * `distintas` solo es verdad cuando se conocen LAS DOS: una salida sin sede
 * registrada no es «cerró en otra parte», es «no se sabe».
 */
export function sedesDelTurno(grupo: FotoDeJornada[]) {
  const abrio = grupo.find(f => f.momento === 'ENTRADA')?.sede ?? null;
  const cerro = [...grupo].reverse().find(f => f.momento === 'SALIDA')?.sede ?? null;
  return { abrio, cerro, distintas: !!abrio && !!cerro && abrio.id !== cerro.id };
}

export type ParteDeLaJornada = 'ENTRADA_Y_SALIDA' | 'ALMUERZO' | 'DESCANSO';

// Una fila de una parte: lo que abre (la entrada, la salida a una pausa) y lo que la cierra (la
// salida, el regreso). Null donde esa marca no existe.
export type FilaDeFotos = { abre: FotoDeJornada | null; cierra: FotoDeJornada | null };

// A qué parte pertenece cada marca y si la abre o la cierra. Un caso por momento, sin `else`
// (CLAUDE.md §9.4): un momento nuevo no compila hasta que alguien diga dónde va.
const PARTE_DEL_MOMENTO: Record<Momento, { parte: ParteDeLaJornada; abre: boolean }> = {
  ENTRADA: { parte: 'ENTRADA_Y_SALIDA', abre: true },
  SALIDA: { parte: 'ENTRADA_Y_SALIDA', abre: false },
  SALIDA_ALMUERZO: { parte: 'ALMUERZO', abre: true },
  REGRESO_ALMUERZO: { parte: 'ALMUERZO', abre: false },
  SALIDA_DESCANSO: { parte: 'DESCANSO', abre: true },
  REGRESO_DESCANSO: { parte: 'DESCANSO', abre: false },
};

const ORDEN_DE_LAS_PARTES: ParteDeLaJornada[] = ['ENTRADA_Y_SALIDA', 'ALMUERZO', 'DESCANSO'];

/**
 * Las fotos de un turno por partes (13 de septiembre de 2026, pedido del dueño): la entrada y
 * la salida, el almuerzo y el descanso, siempre en ese orden y sin las partes vacías. En el
 * orden en que se marcaron, las pausas quedaban revueltas con la jornada.
 *
 * Dentro de cada parte se respeta el orden de llegada: un cierre va con la última apertura que
 * sigue sin cerrar. Si no la hay va solo, y la pantalla dice qué marca falta.
 */
export function partesDeLaJornada(grupo: FotoDeJornada[]): { parte: ParteDeLaJornada; filas: FilaDeFotos[] }[] {
  const filas = new Map<ParteDeLaJornada, FilaDeFotos[]>(ORDEN_DE_LAS_PARTES.map(p => [p, []]));
  for (const foto of grupo) {
    const { parte, abre } = PARTE_DEL_MOMENTO[foto.momento];
    const lista = filas.get(parte)!;
    const ultima = lista[lista.length - 1];
    if (abre) lista.push({ abre: foto, cierra: null });
    else if (ultima && !ultima.cierra) ultima.cierra = foto;
    else lista.push({ abre: null, cierra: foto });
  }
  return ORDEN_DE_LAS_PARTES
    .filter(parte => filas.get(parte)!.length > 0)
    .map(parte => ({ parte, filas: filas.get(parte)! }));
}
