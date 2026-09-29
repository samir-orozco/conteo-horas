// EL COLOR DEL CÍRCULO DE CADA PERSONA. Ver el bloque de la prueba para el porqué.
//
// El resumen: en una rejilla de veinte filas, veinte círculos del mismo amarillo no ayudan a nada.
// Con un color por persona, la fila se reconoce antes de leerla.
//
// NO SIGNIFICA NADA, a propósito: es una ayuda para el ojo y no un dato. Por eso no hay ningún mapa
// de color a cargo, a sede ni a nada, solo un reparto estable.

// Pastel de fondo y tinta oscura del mismo tono: encima van dos iniciales y tienen que leerse.
// Literales por la misma razón que los mapas de `coloresDeTurno`: Tailwind purga lo que no encuentra
// escrito, y una clase armada sale sin color en producción.
export const COLORES_DE_AVATAR = [
  'bg-rose-100 text-rose-700',
  'bg-amber-100 text-amber-700',
  'bg-sky-100 text-sky-700',
  'bg-emerald-100 text-emerald-700',
  'bg-violet-100 text-violet-700',
  'bg-orange-100 text-orange-700',
  'bg-indigo-100 text-indigo-700',
  'bg-teal-100 text-teal-700',
] as const;

export function colorDeAvatar(clave: string): string {
  // Suma de códigos con un multiplicador impar: reparte por toda la paleta incluso con claves muy
  // parecidas entre sí, que es exactamente lo que son los `id` de una misma empresa. Sumarlos a secas
  // dejaría «colaborador-10» y «colaborador-01» en el mismo sitio.
  let suma = 0;
  for (let i = 0; i < clave.length; i++) suma = (suma * 31 + clave.charCodeAt(i)) % 100003;
  return COLORES_DE_AVATAR[suma % COLORES_DE_AVATAR.length];
}
