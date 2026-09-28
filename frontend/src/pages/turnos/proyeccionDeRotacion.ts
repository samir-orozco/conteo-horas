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
// LA MEZCLA VIVE UNA SOLA VEZ, y las tres reglas de arriba son suyas. Lo único que distingue una
// rotación de un lote normal es qué queda trabajado en un día TOCADO; todo lo demás —qué día se toca,
// qué pasa con lo pasado, qué pasa con lo no marcado, qué fechas salen— es idéntico.
//
// Es el mismo reparto que ya hace `planDeEscritura`, que recibe la acción de quien llama en vez de
// decidirla: con una copia por caso habría dos sitios donde equivocarse, y el segundo se descubre
// cuando alguien cambia el primero y se olvida del otro (CLAUDE.md §9.3).
// GENÉRICA EN EL VALOR desde el 28 de septiembre de 2026, cuando entró el aviso de las 42 horas: ese
// necesita la misma mezcla produciendo MINUTOS en vez de un sí o un no. Las tres reglas son idénticas
// para los dos, así que lo que cambia es el tipo del valor y nada más.
function mezclaDelMes<D extends { fecha: string }, T>(
  diasDelMes: readonly D[],
  marcadas: readonly string[],
  hoy: string,
  valorDeHoy: (dia: D) => T,
  quedaTrabajado: (fecha: string) => T,
): Record<string, T> {
  // Un conjunto y no un `includes`: esto corre por persona y en cada dibujado del modal, y una
  // selección de un mes para veinte personas son 600 fechas contra 30 días de mes.
  const estaMarcada = new Set(marcadas);
  const salida: Record<string, T> = {};

  for (const dia of diasDelMes) {
    // La MISMA `sePuedePintar` que usan la rejilla y el plan de escritura, no una copia: si aquí se
    // decidiera distinto, el veredicto juzgaría un mes que no es el que se va a escribir.
    const laToca = estaMarcada.has(dia.fecha) && sePuedePintar(dia.fecha, hoy);
    salida[dia.fecha] = laToca ? quedaTrabajado(dia.fecha) : valorDeHoy(dia);
  }
  return salida;
}

export function proyeccionDelMes({ diasDelMes, marcadas, rotacion, hoy }: {
  diasDelMes: readonly DiaDelMes[];
  marcadas: readonly string[];
  rotacion: RotacionElegida;
  hoy: string;
}): Record<string, boolean> {
  return mezclaDelMes(diasDelMes, marcadas, hoy, d => d.trabajado, fecha =>
    accionDelDia(rotacion.patron, rotacion.desfase, diasEntre(rotacion.primerDia, fecha)) === 'TURNO');
}

// QUÉ DÍAS QUEDARÍAN TRABAJADOS CON UN LOTE NORMAL (28 de septiembre de 2026).
//
// El aviso de «semanas que quedarían sin descanso» solo existía dentro de la ventana de rotación, y
// eso es media foto: marcar siete días seguidos con un turno cualquiera deja la semana entera
// trabajada igual que un ciclo mal cuadrado, y nadie avisaba.
//
// NO ADMITE «QUITAR», Y ESO ES LA MITAD DE LA DECISIÓN. Borrar lo pintado a mano deja el día como lo
// diga el horario de esa persona, y eso el navegador no lo sabe: dar por hecho que queda igual sería
// afirmar que no cambió nada cuando sí cambió, y podría APAGAR un aviso que corresponde. Al no estar
// en el tipo, el compilador impide pedir un veredicto que no se puede dar, y con un borrado la
// pantalla se calla —que es lo que ya hace cuando el mes no ha llegado.
export type AccionDelBloque = { tipo: 'TURNO' } | { tipo: 'DESCANSO' };

export function proyeccionDelBloque({ diasDelMes, marcadas, accion, hoy }: {
  diasDelMes: readonly DiaDelMes[];
  marcadas: readonly string[];
  accion: AccionDelBloque;
  hoy: string;
}): Record<string, boolean> {
  return mezclaDelMes(diasDelMes, marcadas, hoy, d => d.trabajado, () => accion.tipo === 'TURNO');
}

// LOS MINUTOS EN QUE QUEDARÍA CADA DÍA (28 de septiembre de 2026).
//
// Lo que le falta al aviso de las 42 horas: el tope es SEMANAL, así que hay que poder sumar la semana
// entera CON lo pendiente puesto encima, y no solo mirar las celdas que se tocan. Una semana llega a
// 56 h entre lo que ya estaba programado y los dos días que se marcan.
//
// Las tres reglas de la mezcla son las mismas de arriba; lo único que cambia es que el valor es un
// número. Por eso `mezclaDelMes` es genérica y no hay una tercera copia del bucle.
//
// LOS MINUTOS DEL TURNO LOS DA EL SERVIDOR (`minutosPorTurno` de cada fila), no se calculan aquí:
// convertir una franja en minutos exigidos lleva dentro el cruce de medianoche, el almuerzo no pagado
// y los descansos no remunerados. Rehacerlo en el navegador pondría en dos sitios la regla de la que
// salen las horas extra (CLAUDE.md §9.3).
//
// CERO ES UN VALOR LEGÍTIMO y no un vacío: marcar descanso deja el día en cero minutos, y eso es lo
// que permite que este aviso se APAGUE al marcar un descanso.
// `minutosSiSePinta` ES UNA FUNCIÓN DE LA FECHA Y NO UN NÚMERO, y eso no es generalidad gratuita: una
// ROTACIÓN pone turno unos días y descanso otros, así que sus minutos cambian día a día. Con un solo
// número, el aviso no podría juzgar rotaciones — y son el caso más peligroso, no el menos: un 6x1 con
// turnos de nueve horas son 54 h semanales. La alarma callaría justo donde más falta hace.
//
// Es además la misma forma que ya usan `planDeEscritura` y la mezcla de aquí arriba: quien llama
// decide, celda por celda. Una unión «número o función» habría sido la otra opción, y es el `? :`
// sobre un conjunto abierto del que advierte CLAUDE.md §9.4.
export function minutosProyectados({ diasDelMes, marcadas, minutosSiSePinta, hoy }: {
  diasDelMes: readonly { fecha: string; minutos: number }[];
  marcadas: readonly string[];
  minutosSiSePinta: (fecha: string) => number;
  hoy: string;
}): Record<string, number> {
  return mezclaDelMes(diasDelMes, marcadas, hoy, d => d.minutos, minutosSiSePinta);
}
