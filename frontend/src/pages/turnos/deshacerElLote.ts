import type { AccionDeEscritura } from './aplicacionPorBloques';
import type { CeldaParaPrevia } from './previaDeBloque';

// DESHACER UNA PROGRAMACIÓN EN BLOQUE (28 de septiembre de 2026).
//
// Pedido del dueño, con una condición suya que decide la forma de la solución: «teníamos una barra de
// progreso para no hacer en lote todo con el riesgo de colapsar el servidor, entonces en un proceso
// parcial, no de inmediato». Deshacer NO es una transacción atómica en el servidor: es un SEGUNDO
// ENVÍO por el mismo camino, en bloques y con la misma ventana de progreso. Trescientas filas de
// vuelta en una sola petición serían el mismo atragantamiento al revés.
//
// AQUÍ SOLO SE DECIDE QUÉ SE LE ESCRIBE A CADA CELDA para devolverla a como estaba. El navegador ya lo
// sabe: la previa leía esos mismos tres campos para contar lo que iba a cambiar.
//
// LO QUE ESTO NO PUEDE DEVOLVER, y va escrito donde se lee: al escribir un día, el servidor mueve el
// descanso obligatorio de esa semana. Revertir las celdas del envío no siempre devuelve ese
// movimiento, porque toca días que nadie seleccionó. Quien lo ofrezca en pantalla tiene que decirlo.

export function accionParaDeshacer(celda: CeldaParaPrevia): AccionDeEscritura {
  // EL TURNO MANDA, incluso cuando el día además contaba como descanso: un descanso TRABAJADO tiene
  // turno encima, y lo que estaba escrito en ese día es el turno.
  if (celda.plantillaIdActual !== null) return { tipo: 'TURNO', plantillaId: celda.plantillaIdActual };

  // EL DESCANSO, SOLO SI ALGUIEN LO PUSO A MANO. `esDescansoHoy` también es cierto para el descanso
  // que sale del horario y de la ley, y volver a marcarlo lo convertiría en un descanso PINTADO, que
  // es otra cosa: manda sobre la semana y puede mover el descanso de otro día.
  if (celda.pintadoAMano && celda.esDescansoHoy) return { tipo: 'DESCANSO' };

  // Y EL RESTO SE DESPINTA, que es el caso que se olvida: ese día lo resolvía el horario de la
  // persona. Devolverlo con un turno o con un descanso lo dejaría clavado a mano para siempre y
  // dejaría de seguir al horario, y eso no se ve el día que se deshace: se ve semanas después, cuando
  // alguien cambia el horario y ese día no cambia con él.
  return { tipo: 'QUITAR' };
}
