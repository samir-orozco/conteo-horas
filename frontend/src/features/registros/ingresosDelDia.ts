import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { TZ } from '../../lib/fechas';

// QUÉ NÚMERO DE INGRESO ES CADA JORNADA DENTRO DE SU DÍA (4 de octubre de 2026).
//
// Con esto la tabla de registros marca «2.º ingreso» en la segunda jornada de
// una persona el mismo día. Es lo que pidió el dueño para ver de un golpe la
// diferencia entre un turno partido legítimo y una marcación duplicada.
//
// La etiqueta NO dice cuál de las dos está mal, y eso es a propósito: llamarla
// «duplicado» afirmaría un error que la mitad de las veces no existe. Dice
// cuántas hay y en qué orden; decidir es de quien mira.

export type JornadaDelDia = {
  id: string;
  colaboradorId: string;
  // La fecha del día de trabajo, anclada a medianoche de Bogotá.
  fecha: string;
  entrada: string | null;
};

export type Ingreso = { orden: number; total: number };

// El día de BOGOTÁ, el mismo con el que la fila pinta su columna de fecha. No se
// recortan los diez primeros caracteres del ISO: una fecha que llegue a otra
// hora caería en el día equivocado y la etiqueta contradiría a la fila.
const diaBogota = (iso: string) => format(toZonedTime(new Date(iso), TZ), 'yyyy-MM-dd');

export function ingresosDelDia(jornadas: JornadaDelDia[]): Map<string, Ingreso> {
  const porDia = new Map<string, JornadaDelDia[]>();
  for (const j of jornadas) {
    const clave = `${j.colaboradorId}|${diaBogota(j.fecha)}`;
    const grupo = porDia.get(clave);
    if (grupo) grupo.push(j); else porDia.set(clave, [j]);
  }

  const numeradas = new Map<string, Ingreso>();
  for (const grupo of porDia.values()) {
    // Un día con una sola jornada no se numera: la etiqueta solo existe para
    // avisar de que hay más de una, y ponerla en todas sería ruido en el 95% de
    // las filas.
    if (grupo.length < 2) continue;
    // Por hora de entrada, que es el orden del día y no el que trae el arreglo
    // (el servidor manda lo más reciente primero). Sin hora va al final, y el
    // id desempata para que el número no baile entre dos renders.
    const ordenadas = [...grupo].sort((a, b) => {
      if (a.entrada && b.entrada) return a.entrada < b.entrada ? -1 : a.entrada > b.entrada ? 1 : a.id.localeCompare(b.id);
      if (a.entrada) return -1;
      if (b.entrada) return 1;
      return a.id.localeCompare(b.id);
    });
    ordenadas.forEach((j, i) => numeradas.set(j.id, { orden: i + 1, total: grupo.length }));
  }
  return numeradas;
}
