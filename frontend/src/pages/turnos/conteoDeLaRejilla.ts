// LAS TARJETAS DE RESUMEN DE LA REJILLA (28 de septiembre de 2026).
//
// La maqueta cuenta cuatro cosas y la vista solo tenía dos. Las que faltaban son «turnos programados»
// y «descansos marcados».
//
// POR QUÉ ES PURO Y NO DOS BUCLES EN EL JSX: la cuenta lleva dentro una regla que no se ve venir —solo
// cuentan los días DEL MES— y equivocarse ahí no rompe nada: da un número más grande, plausible, que
// nadie contrasta. Es la forma exacta en que este producto se rompe según su propio CLAUDE.md.

export type DiaParaContar = {
  fecha: string;
  estado: 'TRABAJA' | 'DESCANSO' | 'DESCANSO_TRABAJADO' | 'SIN_TURNO';
};

// `mes` es el del título, en formato `YYYY-MM`, o `null` cuando no hay que descartar nada.
//
// `null` NO ES «cualquier mes» POR PEREZA: es lo que corresponde fuera de la vista de mes. La maqueta
// lo escribe en una línea —`VISTA !== 'MES' || f.getMonth() === ancla.getMonth()`— y la razón es que
// una semana puede cruzar de mes legítimamente: la del 28 de septiembre llega al 4 de octubre, y esos
// siete días SON la semana que se está viendo.
export function conteoDeLaRejilla(
  diasPorPersona: readonly (readonly DiaParaContar[])[],
  mes: string | null,
): { turnos: number; descansos: number } {
  let turnos = 0;
  let descansos = 0;

  for (const dias of diasPorPersona) {
    for (const dia of dias) {
      // SE COMPARA EL PREFIJO `YYYY-MM` Y NO EL NÚMERO DE MES, por lo mismo que en `esDeOtroMes`:
      // con el número suelto, septiembre del año que viene pasaría por septiembre de este.
      if (mes !== null && dia.fecha.slice(0, 7) !== mes) continue;

      // UN DESCANSO TRABAJADO CUENTA COMO TURNO, no como descanso: tiene un turno encima y esa persona
      // trabaja ese día. Contarlo del otro lado diría que descansó justo el día que la ley obliga a
      // pagarle recargo.
      if (dia.estado === 'TRABAJA' || dia.estado === 'DESCANSO_TRABAJADO') turnos++;
      // Y `SIN_TURNO` NO ES NINGUNA DE LAS DOS. Es «todavía no se programó»; contarlo como descanso
      // diría que esa persona tiene libre un día que en realidad está sin decidir.
      else if (dia.estado === 'DESCANSO') descansos++;
    }
  }

  return { turnos, descansos };
}
