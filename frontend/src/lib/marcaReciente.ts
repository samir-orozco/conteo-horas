// CUÁNDO DOS MARCAS ESTÁN DEMASIADO CERCA PARA SER DE LA MISMA PERSONA (2 de octubre de 2026).
//
// Salir a los pocos minutos de entrar, o volver a entrar a los pocos minutos de
// salir, es la huella de dos personas tomadas por una: el 1 de octubre fueron 3 y
// 4 minutos. Lo usan el kiosco (pide la confirmación reforzada) y el panel (lo
// señala junto a las fotos), y vive aquí para que no puedan discrepar.
export const MIN_MARCA_RECIENTE = 15;

// Minutos enteros entre dos instantes, hacia abajo: 3 min 18 s son 3.
export function minutosEntre(desde: string | Date, hasta: string | Date): number {
  return Math.floor((new Date(hasta).getTime() - new Date(desde).getTime()) / 60_000);
}
