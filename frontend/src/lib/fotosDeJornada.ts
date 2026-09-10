import type { FotoDeJornada } from '../constants/momentos';

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
