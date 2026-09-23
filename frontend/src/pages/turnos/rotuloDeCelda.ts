// QUÉ NOMBRE LLEVA LA CELDA DE UN DÍA, Y DE DÓNDE SALIÓ (21 de septiembre de 2026).
//
// Un día puede tener nombre por dos razones distintas, y la pantalla tiene que poder decir cuál:
//
//   CATALOGO  alguien PINTÓ un turno sobre ese día. Es una elección, y por eso lleva el color que
//             esa persona le puso en el catálogo.
//   HORARIO   nadie lo pintó, pero el horario programa ese día. Está asignado igual, solo que por
//             una regla y no por una elección. Va en tono neutro.
//   NINGUNO   ni lo uno ni lo otro. Es lo único que de verdad está «sin asignar».
//
// Son tres casos y no un booleano por CLAUDE.md §9.4: la pregunta «de dónde salió este nombre» se
// responde con un caso por valor. Ya hay un cuarto origen en el plan (la excepción marcada de un
// día para quien tiene horario fijo), y con un ternario ese `else` volvería a suponer.
//
// La precedencia es CATALOGO sobre HORARIO: lo que alguien eligió manda sobre lo que la regla
// impone. Al revés, pintar un turno no se vería.

export type OrigenDelRotulo = 'CATALOGO' | 'HORARIO' | 'NINGUNO';

export type RotuloDeCelda = { texto: string; origen: OrigenDelRotulo };

export const SIN_ASIGNAR = 'Sin asignar';

// `Horario.nombre` y `PlantillaTurno.nombre` son texto libre en la base. Uno en blanco dejaría la
// celda muda, que se lee como un error de la pantalla y no como «falta asignarlo». Se recorta para
// decidir si hay nombre, nunca para abreviarlo: abreviar es cosa del CSS, y hacerlo aquí haría que
// las pruebas de la pantalla afirmaran un nombre que no existe.
function nombreUtil(valor: string | null | undefined): string | null {
  if (typeof valor !== 'string') return null;
  const limpio = valor.trim();
  return limpio === '' ? null : limpio;
}

export function rotuloDeCelda(
  turno: { nombre: string; color: string } | null | undefined,
  horarioNombre: string | null | undefined,
): RotuloDeCelda {
  const delCatalogo = nombreUtil(turno?.nombre);
  if (delCatalogo !== null) return { texto: delCatalogo, origen: 'CATALOGO' };

  const delHorario = nombreUtil(horarioNombre);
  if (delHorario !== null) return { texto: delHorario, origen: 'HORARIO' };

  return { texto: SIN_ASIGNAR, origen: 'NINGUNO' };
}
