import { diasEntre, diasDeLaSemana, lunesDeLaSemana, sumarDias } from './semana';

// EL MOTOR DE ROTACIONES (28 de septiembre de 2026).
//
// Una rotación es un ciclo: tantos días de trabajo, tantos de descanso, y vuelta a empezar. Lo que
// decide su comportamiento es si el ciclo CUADRA con la semana:
//
//   6x1 y 5x2 duran 7 días  -> el descanso cae siempre el mismo día de la semana.
//   4x2 dura 6 y 2x2 dura 4 -> no cuadran, así que el descanso SE CORRE cada semana.
//
// Ese corrimiento es la razón de ser del tipo ROTATIVO en la ley: el día de descanso no es fijo, y
// por eso el motor de descansos lo busca en la semana planificada en vez de darlo por sabido.
//
// TODO PASA POR `semana.ts`. Aquí no se construye ni un solo `Date`: las fechas son cadenas
// "YYYY-MM-DD" y quien las mueve es ese módulo, que las ancla a mediodía UTC por la razón de
// CLAUDE.md §7. Una segunda copia de esa regla es como se separan (§9.3).

export type PatronDeRotacion = '6x1' | '5x2' | '4x2' | '2x2';
export type AccionDelDia = 'TURNO' | 'DESCANSO';

export type Rotacion = {
  trabaja: number;
  descansa: number;
  // Redundante a propósito: es `trabaja + descansa`, pero tenerlo escrito permite que una prueba
  // compruebe la invariante en vez de confiar en que quien agregue un patrón haga bien la suma.
  ciclo: number;
  nota: string;
};

export const ROTACIONES: Record<PatronDeRotacion, Rotacion> = {
  '6x1': { trabaja: 6, descansa: 1, ciclo: 7, nota: 'el descanso cae siempre el mismo día' },
  '5x2': { trabaja: 5, descansa: 2, ciclo: 7, nota: 'dos días fijos, tipo lunes a viernes' },
  '4x2': { trabaja: 4, descansa: 2, ciclo: 6, nota: 'el descanso se corre un día cada semana' },
  '2x2': { trabaja: 2, descansa: 2, ciclo: 4, nota: 'el descanso se corre tres días cada semana' },
};

// Qué le toca al día que está a `diasDesdeElInicio` del arranque de la rotación.
//
// El doble `%` no es un adorno: en JavaScript `-1 % 7` es `-1`, y con un desfase negativo el índice
// se saldría del ciclo por abajo. Normalizarlo aquí, una vez, evita que cada sitio que llame a esto
// tenga que acordarse.
export function accionDelDia(
  patron: PatronDeRotacion,
  desfase: number,
  diasDesdeElInicio: number,
): AccionDelDia {
  const { ciclo, trabaja } = ROTACIONES[patron];
  const posicion = (((diasDesdeElInicio + desfase) % ciclo) + ciclo) % ciclo;
  return posicion < trabaja ? 'TURNO' : 'DESCANSO';
}

// El plan completo: qué le toca a cada fecha de la lista.
//
// LA POSICIÓN SE CUENTA EN DÍAS DESDE LA PRIMERA FECHA, no por el índice del arreglo. La diferencia
// importa cuando la lista tiene huecos (una selección parcial, por ejemplo): por índice, dos días
// separados por una semana quedarían en posiciones contiguas del ciclo y la rotación se desalinearía
// sin que nadie lo note. Contando días, dos personas con el mismo desfase quedan además alineadas
// entre sí, que es de lo que vive una rotación en un equipo.
export function planDeRotacion(
  patron: PatronDeRotacion,
  desfase: number,
  fechas: readonly string[],
): { fecha: string; accion: AccionDelDia }[] {
  if (fechas.length === 0) return [];
  const inicio = fechas[0];
  return fechas.map(fecha => ({
    fecha,
    accion: accionDelDia(patron, desfase, diasEntre(inicio, fecha)),
  }));
}

// El primer día del mes siguiente, para saber dónde termina el que se está mirando. Se arma con
// aritmética de cadenas y `sumarDias`, sin `Date`, por lo mismo que todo lo demás de este archivo.
function primeroDelMesSiguiente(mes: string): string {
  const [anio, numero] = mes.split('-').map(Number);
  return numero === 12
    ? `${anio + 1}-01-01`
    : `${anio}-${String(numero + 1).padStart(2, '0')}-01`;
}

// LAS SEMANAS DEL MES QUE QUEDARÍAN SIN NINGÚN DESCANSO.
//
// Es la comprobación que hace legal a una programación, y por eso vive junto al motor que podría
// producirla. Recibe un mapa de "qué días se trabajan" y devuelve los LUNES de las semanas que
// incumplen.
//
// TRES CONDICIONES, y la tercera es la que evita una alarma falsa:
//
//   · la semana tiene que caber ENTERA dentro del mes. Una partida por el borde se juzgaría a
//     medias, con días que viven en otro mes y que aquí no se ven.
//   · los siete días tienen que estar trabajados.
//   · un día ausente del mapa NO cuenta como trabajado. Sin esto, un mes recién abierto y todavía
//     sin programar se encendería entero en rojo, que es como se enseña a ignorar un aviso.
//
// La infracción es trabajar los siete, y no «no tener ningún día marcado como descanso»: un día sin
// turno es un día que no se trabaja, o sea descanso de hecho, aunque nadie le haya puesto etiqueta.
export function semanasSinDescanso(
  trabajadoPorFecha: Readonly<Record<string, boolean>>,
  mes: string,
): string[] {
  const primero = `${mes}-01`;
  const ultimo = sumarDias(primeroDelMesSiguiente(mes), -1);
  const malas: string[] = [];

  for (let lunes = lunesDeLaSemana(primero); lunes <= ultimo; lunes = sumarDias(lunes, 7)) {
    const dias = diasDeLaSemana(lunes);
    const delMes = dias.filter(f => f.slice(0, 7) === mes);
    if (delMes.length !== 7) continue;
    if (delMes.every(f => trabajadoPorFecha[f] === true)) malas.push(lunes);
  }
  return malas;
}
