// El WhatsApp por el que se nos escribe desde el producto (4 de octubre de 2026).
//
// Vivía copiado en cuatro archivos, cada uno armando la URL por su cuenta. Al
// cambiar de número hubo que cazarlo a mano por todo el repositorio y decidir
// sitio por sitio, que es justo lo que se olvida a medias: basta con que una
// pantalla se quede atrás para que un cliente le escriba a un número que ya no
// atiende, y nadie se entera porque del otro lado simplemente no llega nada.
//
// OJO, y no es un descuido: `POLITICA-PRIVACIDAD-para-abogado.md` sigue con el
// número ANTERIOR (+57 316 643 5723), por decisión del dueño. Esa línea sigue
// atendiendo y pasó a ser de uso interno, así que el canal que la política le da
// a una persona para pedir sus datos sigue siendo válido. No se "arregla"
// igualándolo a este sin preguntar: cambiar un canal de contacto declarado en
// una política de privacidad no es un detalle de código.
export const WHATSAPP = '573137397652';

// El enlace para abrir una conversación, con el mensaje ya escrito.
//
// El `encodeURIComponent` es lo que de verdad hace falta compartir: sin él, el
// mensaje se corta en el primer espacio y al otro lado llega una palabra suelta.
export function enlaceWhatsApp(mensaje?: string): string {
  const base = `https://wa.me/${WHATSAPP}`;
  return mensaje ? `${base}?text=${encodeURIComponent(mensaje)}` : base;
}
