import { formatInTimeZone } from 'date-fns-tz';

// El formulario de una JORNADA: sus horas sueltas "HH:MM", armadas desde las
// marcaciones que la componen, y el cuerpo que se le manda al servidor.
//
// Vive fuera de la pantalla para poder probarlo. Una jornada son hasta cinco
// marcaciones: la de la entrada y una más por cada pausa, el almuerzo y hasta tres
// descansos no remunerados (12 de septiembre de 2026). Cuál pausa es cuál lo dice la
// marca de cada salida: leer aquí el almuerzo como descanso es guardarlo después como
// tiempo no pagado.

const TZ = 'America/Bogota';

export type MarcacionDeJornada = {
  entrada: string | null; salida: string | null;
  salidaAlmuerzo: boolean; salidaDescanso?: boolean;
};

// Una pausa del formulario: a qué hora salió y a qué hora regresó.
export type PausaDelFormulario = { salida: string; regreso: string };

export type HorasDelFormulario = {
  entrada: string; salida: string;
  almuerzoSalida: string; almuerzoRegreso: string;
  // Los descansos, en el orden de la jornada. Hasta el 12 de septiembre de 2026 era uno
  // solo, y un segundo descanso se escribía encima del primero.
  descansos: PausaDelFormulario[];
};

export const HORAS_VACIAS: HorasDelFormulario = {
  entrada: '', salida: '', almuerzoSalida: '', almuerzoRegreso: '', descansos: [],
};

const hhmm = (s: string | null | undefined) => (s ? formatInTimeZone(new Date(s), TZ, 'HH:mm') : '');

// `salidaDeLaJornada` es la de la fila de la tabla, no la de la última marcación:
// quien salió a una pausa y no ha vuelto no ha terminado de trabajar, y su salida
// va vacía.
export function horasDeLaJornada(marcas: MarcacionDeJornada[], salidaDeLaJornada: string | null): HorasDelFormulario {
  // Una lista nueva en cada formulario: la de HORAS_VACIAS es compartida.
  const horas: HorasDelFormulario = {
    ...HORAS_VACIAS, entrada: hhmm(marcas[0]?.entrada), salida: hhmm(salidaDeLaJornada), descansos: [],
  };
  marcas.forEach((m, i) => {
    // El regreso de una pausa es la entrada de la marcación siguiente.
    const regreso = hhmm(marcas[i + 1]?.entrada);
    if (m.salidaAlmuerzo) { horas.almuerzoSalida = hhmm(m.salida); horas.almuerzoRegreso = regreso; }
    // Cada descanso se AGREGA en su orden. Con un solo descanso se sobrescribía, y abrir
    // y guardar una jornada con dos le quitaba el primero.
    else if (m.salidaDescanso) horas.descansos.push({ salida: hhmm(m.salida), regreso });
  });
  return horas;
}

// Cada pausa viaja con su nombre y sus horas. El almuerzo vacío no viaja; con solo el
// regreso sí viaja, para que el servidor diga qué hora falta.
//
// Los descansos van en `descansos`, una lista en el orden del formulario con TODAS sus
// filas, también las que quedaron sin ninguna hora. El servidor ignora las vacías pero
// cuenta su posición para decir «descanso N», que así es el mismo «Descanso N» de la
// pantalla. Quitándolas aquí, el regreso sin salida del Descanso 2 llegaba primero y el
// mensaje decía «descanso 1» (12 de septiembre de 2026). Sin ninguna fila la clave no
// viaja: en el editor de jornadas eso quiere decir «sin descansos».
//
// Nunca con las claves de antes (`descansoSalida`, `descansoRegreso`), que eran las del
// almuerzo y el servidor rechaza, ni con `descanso` en singular, que el servidor ignora:
// mandarlo así le quitaría el descanso a la jornada sin avisar.
export function cuerpoDeLaJornada(h: HorasDelFormulario) {
  const pausa = (salida: string, regreso: string) => (salida || regreso ? { salida, regreso } : undefined);
  const descansos = h.descansos.map(d => ({ salida: d.salida, regreso: d.regreso }));
  return {
    entrada: h.entrada,
    salida: h.salida,
    almuerzo: pausa(h.almuerzoSalida, h.almuerzoRegreso),
    ...(descansos.length > 0 ? { descansos } : {}),
  };
}
