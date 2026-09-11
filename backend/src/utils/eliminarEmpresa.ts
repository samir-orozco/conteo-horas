// Decide si una empresa se puede borrar. Es la única parte de la operación que
// no habla con la base de datos, y por eso la única que se puede probar de
// verdad: la costura contra MySQL se verifica a mano (CLAUDE.md 8.6).
//
// DECISIÓN DEL DUEÑO (10 de septiembre de 2026): se puede borrar CUALQUIER
// empresa. Antes esta función bloqueaba las que tenían pagos aprobados o
// comisiones de afiliado; ya no. El modal advierte qué se pierde, incluida la
// plata, y lo único que se exige es escribir el NIT a mano.

export type Veredicto = { permitido: true } | { permitido: false; mensaje: string };

const MENSAJE = 'Escribe el NIT de la empresa, exactamente como aparece, para confirmar.';

export function decidirEliminacion(nit: string, confirmacion: unknown): Veredicto {
  // El cuerpo de la petición lo arma quien llama, no la pantalla: un número o un
  // null llegaban a `.trim()` y la ruta respondía 500.
  if (typeof confirmacion !== 'string') return { permitido: false, mensaje: MENSAJE };
  // Se compara el NIT tal como está guardado, sin interpretar guiones ni ceros:
  // el punto de escribirlo a mano es que no se pueda hacer de memoria. Lo único
  // que se perdona son los espacios de copiar y pegar.
  // Un NIT en blanco no coincide con nada: si no, con el campo vacío se confirmaba
  // sin escribir nada.
  const escrito = confirmacion.trim();
  if (!escrito || escrito !== nit.trim()) return { permitido: false, mensaje: MENSAJE };
  return { permitido: true };
}
