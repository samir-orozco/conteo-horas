import { sePuedePintar } from './semana';

// ELEGIR EL DÍA DE DESCANSO DE LA SEMANA, CON TARJETAS. El bloque de la prueba tiene el porqué de
// cada borde; aquí va el resumen.
//
// Antes esto era una píldora con una sola pregunta: «¿Descansa el jueves?». Sí o nada. Si la
// propuesta se equivocaba, o si el backend no proponía nada porque sobraban varios días, desde ahí
// no había forma de decir cuál era: había que ir a la celda y abrir su panel.
//
// AHORA SE OFRECEN LOS SIETE y la propuesta pasa a ser la que viene resaltada, que es lo que una
// propuesta debería haber sido siempre.

export type EstadoDeLaTarjeta =
  // Ese día ya pasó. No se puede escribir y por tanto tampoco elegir.
  | 'IDO'
  // El que el backend dedujo. Resaltado, NO preseleccionado: sigue haciendo falta un clic, porque
  // marcar el descanso de la semana mueve un recargo.
  | 'PROPUESTO'
  // Tiene un turno pintado encima. Se puede elegir, pero elegirlo LO REEMPLAZA.
  | 'CON_TURNO'
  // Libre y sin proponer. El caso normal cuando sobran varios.
  | 'ELEGIBLE';

export type TarjetaDeDescanso = { fecha: string; estado: EstadoDeLaTarjeta };

// UN CASO POR VALOR Y CON PRECEDENCIA EXPLÍCITA (§9.4). El orden no es alfabético ni casual:
//
//   `IDO` GANA A TODO, incluido al propuesto. El backend propone mirando la semana entera y no sabe
//   qué día es hoy; si propone el lunes de una semana que ya empezó, ofrecer ese botón sería ofrecer
//   una escritura que el servidor rechaza con «no se puede cambiar un día que ya pasó».
//
//   `PROPUESTO` GANA A `CON_TURNO`, y no porque no puedan darse juntos. Aquí había escrito que el
//   backend «solo propone días en blanco» y era FALSO: allí «en blanco» quiere decir «sin turno del
//   catálogo pintado», mientras que `trabajado` aquí incluye lo que el HORARIO exige. Un día sin
//   turno pintado pero con jornada del horario es las dos cosas a la vez, y es el caso común.
//
//   Gana el propuesto porque es la acción recomendada: marcar ese día como descanso es justamente lo
//   que arregla que el horario lo esté exigiendo. Pintarlo como «con turno» escondería la sugerencia
//   detrás del problema que la sugerencia viene a resolver. Se descubrió mutando el orden: no se puso
//   roja ninguna prueba, porque ninguna cubría la combinación.
//
// `sePuedePintar` y no una comparación propia: es la misma regla con la que la rejilla decide si
// deja marcar una celda, y tenerla en dos sitios es como se separan (§9.3).
export function tarjetasDeDescanso(
  dias: readonly string[],
  trabajado: Readonly<Record<string, boolean>>,
  // La fecha que el backend propone, o `null` cuando no pudo deducir ninguna. Una fecha que no esté
  // entre los días no resalta nada: pasa con una respuesta vieja en caché tras cambiar de período.
  propuesta: string | null,
  hoy: string,
): TarjetaDeDescanso[] {
  return dias.map(fecha => {
    if (!sePuedePintar(fecha, hoy)) return { fecha, estado: 'IDO' as const };
    if (fecha === propuesta) return { fecha, estado: 'PROPUESTO' as const };
    if (trabajado[fecha] === true) return { fecha, estado: 'CON_TURNO' as const };
    return { fecha, estado: 'ELEGIBLE' as const };
  });
}
