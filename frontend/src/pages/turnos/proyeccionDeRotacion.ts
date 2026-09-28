import { sePuedePintar, diasEntre } from './semana';
import { accionDelDia, type PatronDeRotacion } from './rotacion';

// QUÉ DÍAS QUEDARÍAN TRABAJADOS SI SE APLICA ESTA ROTACIÓN (28 de septiembre de 2026).
//
// Es la pieza que le falta al veredicto del mes, el que pidió el dueño con estas palabras: «que el
// sistema lea todo el mes y me diga que por norma no le estás dando el día de descanso». Ese veredicto
// lo calcula `semanasSinDescanso`, que necesita de comer un mapa de «esta fecha se trabaja, sí o no»
// para el mes COMPLETO de una persona. Esto lo arma.
//
// POR QUÉ ES PURO Y NO DOS BUCLES DENTRO DEL MODAL: aquí se mezclan tres fuentes —lo que el mes ya
// tiene, lo que está marcado y lo que la rotación mandaría— y equivocarse en la mezcla produce un
// veredicto plausible y falso. Un aviso que no salta cuando debe es peor que no tenerlo: enseña a
// confiar en él.
//
// NO CONSTRUYE NI UN SOLO `Date`: las fechas son cadenas y quien las mueve es `semana.ts`, que las
// ancla a mediodía UTC por la razón de CLAUDE.md §7. Una segunda copia de esa regla es como se separan.

export type DiaDelMes = { fecha: string; trabajado: boolean };

export type RotacionElegida = {
  patron: PatronDeRotacion;
  desfase: number;
  // EL ANCLA DEL CICLO, y es el primer día del PERÍODO que se está viendo, no la primera fecha que la
  // persona tenga marcada. La diferencia importa en un equipo: con el mismo desfase, dos personas
  // quedan alineadas entre sí solo si las dos cuentan desde el mismo día. Anclando en «su primera
  // marcada», quien empiece un día después arrancaría su ciclo un día después sin pedirlo.
  primerDia: string;
};

// LAS TRES REGLAS DE LA MEZCLA, y la tercera es la que hace ganar el sueldo al veredicto:
//
//   · una fecha MARCADA y futura recibe lo que diga la rotación;
//   · una fecha marcada pero YA PASADA conserva lo que tiene, porque no se va a escribir. Proyectarle
//     la rotación mentiría sobre el estado del mes y podría apagar un aviso que sí corresponde;
//   · una fecha NO marcada conserva lo que tiene. Aplicar la rotación a media semana deja los otros
//     días con su turno de antes, y entre los dos pueden completar los siete sin que ninguna celda
//     «pisada» lo delate. Ese es justo el incumplimiento que ningún aviso por celda encuentra.
//
// SOLO SALEN LAS FECHAS QUE ENTRARON. `semanasSinDescanso` trata una fecha ausente como NO trabajada a
// propósito —para que un mes todavía sin programar no se encienda entero en rojo—, así que devolver un
// mapa con fechas de más o de menos cambiaría su veredicto. Una fecha marcada que no está en el mes
// (la selección cruza el borde entre dos meses) no se inventa.
export function proyeccionDelMes({ diasDelMes, marcadas, rotacion, hoy }: {
  diasDelMes: readonly DiaDelMes[];
  marcadas: readonly string[];
  rotacion: RotacionElegida;
  hoy: string;
}): Record<string, boolean> {
  // Un conjunto y no un `includes`: esto corre por persona y en cada dibujado del modal, y una
  // selección de un mes para veinte personas son 600 fechas contra 30 días de mes.
  const estaMarcada = new Set(marcadas);
  const salida: Record<string, boolean> = {};

  for (const dia of diasDelMes) {
    // La MISMA `sePuedePintar` que usan la rejilla y el plan de escritura, no una copia: si aquí se
    // decidiera distinto, el veredicto juzgaría un mes que no es el que se va a escribir.
    const laToca = estaMarcada.has(dia.fecha) && sePuedePintar(dia.fecha, hoy);
    salida[dia.fecha] = laToca
      ? accionDelDia(rotacion.patron, rotacion.desfase, diasEntre(rotacion.primerDia, dia.fecha)) === 'TURNO'
      : dia.trabajado;
  }
  return salida;
}
