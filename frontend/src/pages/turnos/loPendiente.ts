import { accionDelDia, type PatronDeRotacion } from './rotacion';
import { diasEntre } from './semana';
import type { AccionDeEscritura } from './aplicacionPorBloques';

// QUÉ SE LE ESCRIBE A CADA DÍA CON LO QUE ESTÁ PENDIENTE (28 de septiembre de 2026).
//
// Lo pendiente son DOS COSAS DISTINTAS: una acción igual para todas las celdas marcadas (un turno, un
// descanso, quitar), o una ROTACIÓN, que reparte turnos y descansos a lo largo del ciclo.
//
// LA UNIÓN ES LO QUE SOSTIENE UN SOLO CAMINO DE ESCRITURA. De aquí para abajo, la previa con sus
// avisos, el plan por bloques y la petición al servidor no se enteran de si vino de un turno suelto o
// de una rotación: piden la acción de cada celda y ya. Con una acción única para todo el envío haría
// falta un segundo plan y un segundo camino solo para las rotaciones, o sea dos sitios donde
// equivocarse sobre la tabla que alimenta la liquidación.
//
// VIVE EN SU PROPIO ARCHIVO Y NO DENTRO DE LA PANTALLA porque decide qué va a EXIGIR un día, y de eso
// salen la tardanza y las horas extra. Estuvo un rato dentro del componente y sin ninguna prueba
// propia —solo se ejercitaba de rebote— hasta que el linter se quejó por otra razón (Fast Refresh).
// Tenía razón sobre el sitio aunque no sobre el motivo.

export type LoPendiente =
  | { clase: 'IGUAL'; accion: AccionDeEscritura }
  | {
    clase: 'ROTACION';
    patron: PatronDeRotacion;
    desfase: number;
    plantillaId: string;
    // EL ANCLA DEL CICLO: el primer día del PERÍODO que se está viendo, no la primera fecha marcada.
    // Con el mismo desfase, dos personas quedan alineadas entre sí solo si las dos cuentan desde el
    // mismo día; anclando en «su primera marcada», quien empiece un día después arrancaría su ciclo
    // un día después sin haberlo pedido.
    primerDia: string;
  };

// LA POSICIÓN DEL CICLO SE CUENTA EN DÍAS, no por el orden de la celda dentro de la selección: una
// selección con huecos dejaría dos días separados por una semana en posiciones contiguas del ciclo, y
// la rotación se desalinearía sin que nadie lo note.
//
// El caso por valor lo resuelve la unión: `IGUAL` devuelve lo suyo tal cual y `ROTACION` pregunta al
// motor. La normalización del índice negativo (en JavaScript `-1 % 7` es `-1`) vive en `accionDelDia`,
// y aquí NO se repite: una segunda copia de esa cuenta es como se separan (CLAUDE.md §9.3).
export function accionDeLoPendiente(pendiente: LoPendiente, fecha: string): AccionDeEscritura {
  if (pendiente.clase === 'IGUAL') return pendiente.accion;
  const toca = accionDelDia(pendiente.patron, pendiente.desfase, diasEntre(pendiente.primerDia, fecha));
  return toca === 'TURNO'
    ? { tipo: 'TURNO', plantillaId: pendiente.plantillaId }
    : { tipo: 'DESCANSO' };
}
