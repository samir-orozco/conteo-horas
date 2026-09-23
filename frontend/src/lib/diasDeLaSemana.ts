// LOS DÍAS DE LA SEMANA, PARA MOSTRARLOS (21 de septiembre de 2026).
//
// Vive aquí porque iba por su segunda copia: los nombres completos estaban dentro de
// `pages/turnos/CalendarioDeTurnos.tsx` y el modal del día de descanso necesitaba los mismos. Que
// un modal importe una constante de una pantalla es acoplar dos cosas que no se conocen, y
// escribirla otra vez es como empezaron las cinco copias de `DIAS_SEMANA` en el backend (§9.3).
//
// CUIDADO CON EL ORDEN, que es la trampa de este archivo. Aquí abajo la semana empieza en LUNES
// porque es el orden en que una persona espera verla. El `DIAS_SEMANA` del backend empieza en
// DOMINGO porque su índice tiene que casar con `Date.getDay()`, y de ahí sale qué día es una fecha.
// Son dos listas con el mismo contenido y propósitos distintos: cambiar una por la otra convierte
// los lunes en domingos sin que nada falle.
//
// Las CLAVES son los valores que guarda la base, sin tildes, y los valores son lo que se pinta.

export const NOMBRE_DEL_DIA: Record<string, string> = {
  DOMINGO: 'Domingo', LUNES: 'Lunes', MARTES: 'Martes', MIERCOLES: 'Miércoles',
  JUEVES: 'Jueves', VIERNES: 'Viernes', SABADO: 'Sábado',
};

// Para los selectores: el orden en que se ofrecen los días a una persona. NO usar para traducir
// una fecha a un día, que es lo que hace el backend con su propia lista.
export const DIAS_EN_ORDEN_LABORAL = [
  'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO',
];

// Lo que llega del servidor puede ser un valor viejo o raro: se pinta tal cual en vez de dejar el
// hueco en blanco, igual que `normalizarColor` cae al neutro.
export const nombreDelDia = (clave: string | null | undefined): string =>
  (clave ? NOMBRE_DEL_DIA[clave] ?? clave : '');
