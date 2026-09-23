import { deducirDiaDescanso, type OrigenDelDescanso } from './descansoObligatorio';
import { diaValido } from './diasDeLaSemana';

// A QUIÉN SE LE PREGUNTA QUÉ DÍA DESCANSA SU GENTE (21 de septiembre de 2026).
//
// Gemela de `revisionPendiente`, y sale a función pura por lo mismo (§8.2): la ruta que la usa no
// tiene pruebas de integración, así que una condición escrita dentro del `return` no la protegería.
//
// Dos diferencias con la revisión del auxilio, y las dos son deliberadas:
//
//   QUIÉN RESPONDE. El auxilio se revisa persona por persona porque la sospecha es sobre un salario.
//   Aquí se pregunta por HORARIO: quienes comparten horario comparten el patrón de días, y
//   preguntarle a cada persona sería pedir treinta y cinco veces la misma respuesta.
//
//   A CUÁNTOS SE PREGUNTA. El auxilio le pregunta a toda empresa con gente. Aquí no: la ley presume
//   el domingo, así que un horario que no cubre el domingo ya está respondido y el motor hace hoy
//   exactamente eso. Preguntar de más es lo que enseña a cerrar los avisos sin leerlos. Medido en la
//   base local el 21 de septiembre de 2026: de 10 horarios activos, 9 no se preguntan.

export type FranjaConDias = { dias: unknown };

export type HorarioParaRevisar = {
  id: string;
  nombre: string;
  franjas: readonly FranjaConDias[];
  personas: number;
};

// `PRESUNCION` no puede salir de aquí: es justo el caso que NO se pregunta. El tipo lo dice para
// que no haya que confiar en el comentario.
export type PreguntaDeDescanso = {
  id: string;
  nombre: string;
  personas: number;
  origen: Exclude<OrigenDelDescanso, 'PRESUNCION'>;
  // El día que se preselecciona en la pantalla, cuando se puede deducir uno. Es una SUGERENCIA:
  // mover el descanso fuera del domingo exige acuerdo escrito, y darlo por hecho sería dejar de
  // pagar un recargo por deducción propia.
  sugerido: string | null;
};

// Los días que cubre un horario, juntando todas sus franjas y sin repetir.
//
// La validación de cada nombre es `diaValido`, en `diasDeLaSemana`. Estaba ESCRITA A MANO aquí
// dentro, con su propio comentario repitiendo la misma justificación palabra por palabra, y por eso
// no apareció al buscar `diaValido`: era una copia sin nombre. La cazó el grep del PATRÓN, que es
// justo lo que pide CLAUDE.md §9.3 antes de dar una regla por extraída.
export function diasQueTrabaja(franjas: readonly FranjaConDias[]): string[] {
  const vistos = new Set<string>();
  for (const f of franjas) {
    if (!Array.isArray(f.dias)) continue;
    for (const d of f.dias) {
      const nombre = diaValido(d);
      if (nombre !== null) vistos.add(nombre);
    }
  }
  return [...vistos];
}

// Los horarios por los que hay que preguntar, en el orden en que llegan.
export function preguntasDeDescanso(horarios: readonly HorarioParaRevisar[]): PreguntaDeDescanso[] {
  const salida: PreguntaDeDescanso[] = [];
  for (const h of horarios) {
    // Un horario que nadie cumple no está liquidando mal el domingo de nadie, así que preguntarlo
    // es pedir que respondan por un conjunto vacío. Misma doctrina que `revisionPendiente`.
    //
    // OJO al llenar este número desde la ruta: `_count.colaboradores` de Prisma cuenta TAMBIÉN a
    // los retirados. Medido el 21 de septiembre de 2026, el horario «Turno diurno» daba _count=1
    // con 0 activos. Tiene que venir filtrado por `activo`.
    if (h.personas <= 0) continue;

    const deduccion = deducirDiaDescanso(diasQueTrabaja(h.franjas));
    // El domingo está libre: la ley lo responde sola y no hay nada que preguntar.
    if (deduccion.origen === 'PRESUNCION') continue;
    salida.push({
      id: h.id,
      nombre: h.nombre,
      personas: h.personas,
      origen: deduccion.origen,
      sugerido: deduccion.dia,
    });
  }
  return salida;
}

// Si a esta empresa se le bloquea el panel. La marca manda por encima del conteo: quien ya
// respondió no vuelve a ver el aviso, y un horario ambiguo que aparezca después se declara en su
// sitio, no con un bloqueo a toda la empresa.
export function revisionDescansoPendiente(revisadoEn: Date | null, horariosPorResolver: number): boolean {
  if (revisadoEn) return false;
  return horariosPorResolver > 0;
}
