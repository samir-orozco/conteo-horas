import { diaValido } from './diasDeLaSemana';

// LA DECLARACIÓN DEL DESCANSO DESDE EL FORMULARIO DEL HORARIO. El bloque de la prueba tiene el
// porqué de cada caso; aquí el resumen.
//
// NO SE REUSA `limpiarRespuestasDeDescanso`, que es la del modal, y no es un descuido: aquella
// RECHAZA `PRESUMIDO` a propósito, porque responder «lo presumido» en una revisión que se hace una
// sola vez no es declarar nada. Para un formulario que se puede EDITAR sí hace falta: si alguien
// declaró «miércoles» por error, o el acuerdo se rompió, tiene que poder volver al domingo por ley.

export type Declaracion = {
  tipo: 'PRESUMIDO' | 'FIJO' | 'ROTATIVO';
  dia: string | null;
  // Si al guardar hay que afirmar que existe un acuerdo escrito. `false` la BORRA.
  //
  // `descansoAcuerdoEn` no es una marca de «cuándo se tocó esto»: es la afirmación de que existe un
  // papel firmado con el trabajador, y es lo único que autoriza a mover el descanso fuera del
  // domingo. Volviendo a PRESUMIDO hay que borrarla, o quedaría un acuerdo afirmado sobre una
  // declaración que ya no lo necesita, y el día que alguien vuelva a poner «miércoles» la guarda
  // legal lo daría por firmado sin que nadie firmara.
  acuerdo: boolean;
};

export type DeclaracionLimpia =
  | { ok: true; datos: Declaracion }
  | { ok: false; motivo: string; datos?: undefined };

// UN CASO POR VALOR Y RECHAZO EXPLÍCITO DE TODO LO DEMÁS (§9.4). Un tipo que no se reconoce no se
// interpreta: mover el descanso de una plantilla entera por un valor raro es como se deja de pagar un
// recargo sin que nadie lo decida.
export function limpiarDeclaracionDeDescanso(cuerpo: unknown): DeclaracionLimpia {
  const fila = (cuerpo ?? {}) as Record<string, unknown>;
  const tipo = typeof fila.tipo === 'string' ? fila.tipo.trim().toUpperCase() : '';

  // El día NO se guarda ni en PRESUMIDO ni en ROTATIVO aunque llegue: la pantalla esconde el selector
  // en esos dos, así que lo que venga es residuo de lo que se había elegido antes de cambiar de idea.
  // Guardarlo dejaría una declaración que dice dos cosas a la vez.
  if (tipo === 'PRESUMIDO') return { ok: true, datos: { tipo: 'PRESUMIDO', dia: null, acuerdo: false } };
  if (tipo === 'ROTATIVO') return { ok: true, datos: { tipo: 'ROTATIVO', dia: null, acuerdo: true } };

  if (tipo === 'FIJO') {
    const dia = diaValido(fila.dia);
    if (dia === null) return { ok: false, motivo: 'Un descanso fijo necesita un día de la semana válido.' };
    return { ok: true, datos: { tipo: 'FIJO', dia, acuerdo: true } };
  }

  return { ok: false, motivo: 'El descanso tiene que ser el domingo por ley, fijo con un día, o rotativo.' };
}
