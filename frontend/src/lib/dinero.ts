// Miles y millones tal como los escribe y los lee alguien en Colombia.
//
// Vivían dentro de la página de colaboradores. Al necesitarlos también en la
// carga masiva se suben aquí: importar una página desde un componente es tener
// la dependencia al revés.

// 1750905 -> "1.750.905". El cero devuelve vacío a propósito: en un campo de
// formulario, un "0" precargado hay que borrarlo antes de escribir.
export const formatearMiles = (n: number) => (n ? new Intl.NumberFormat('es-CO').format(n) : '');

// "1.750.905", "$ 1.750.905" o "1750905" -> 1750905. Se quita todo lo que no
// sea dígito: la gente escribe el punto, el signo, y a veces los dos.
export const parsearMiles = (s: string) => Number(s.replace(/\D/g, '')) || 0;

// Lo que se muestra mientras alguien escribe en un campo de dinero.
export const alEscribirMiles = (s: string) => formatearMiles(parsearMiles(s));

// Lo mismo, pero en un campo donde el cero es una respuesta y no «no escribió
// nada». El auxilio de transporte es el caso: vacío significa «el del decreto
// si su salario da derecho» y cero significa «esta empresa no lo paga». Con el
// de arriba, teclear el cero vacía el campo, así que escribir «no lo pagamos»
// guarda «páguenle lo del decreto»: lo contrario, y en silencio.
//
// Se mira si quedó algún dígito ANTES de convertir: `parsearMiles` devuelve 0
// tanto para "0" como para "hola", y hacer un cero de una letra mal tecleada
// dejaría puesto que no se le paga.
export const alEscribirMilesConCero = (s: string) => {
  const digitos = s.replace(/\D/g, '');
  if (digitos === '') return '';
  const n = parsearMiles(digitos);
  return n === 0 ? '0' : formatearMiles(n);
};
