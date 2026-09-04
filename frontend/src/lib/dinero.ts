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
