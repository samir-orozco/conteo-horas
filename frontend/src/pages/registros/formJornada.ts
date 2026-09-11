import { formatInTimeZone } from 'date-fns-tz';

// El formulario de una JORNADA: sus horas sueltas "HH:MM", armadas desde las
// marcaciones que la componen, y el cuerpo que se le manda al servidor.
//
// Vive fuera de la pantalla para poder probarlo. Una jornada con sus dos pausas
// son tres marcaciones, y cuál pausa es cuál lo dice la marca de cada salida:
// leer aquí el almuerzo como descanso es guardarlo después como tiempo no pagado.

const TZ = 'America/Bogota';

export type MarcacionDeJornada = {
  entrada: string | null; salida: string | null;
  salidaAlmuerzo: boolean; salidaDescanso?: boolean;
};

export type HorasDelFormulario = {
  entrada: string; salida: string;
  almuerzoSalida: string; almuerzoRegreso: string;
  descansoSalida: string; descansoRegreso: string;
};

export const HORAS_VACIAS: HorasDelFormulario = {
  entrada: '', salida: '', almuerzoSalida: '', almuerzoRegreso: '', descansoSalida: '', descansoRegreso: '',
};

const hhmm = (s: string | null | undefined) => (s ? formatInTimeZone(new Date(s), TZ, 'HH:mm') : '');

// `salidaDeLaJornada` es la de la fila de la tabla, no la de la última marcación:
// quien salió a una pausa y no ha vuelto no ha terminado de trabajar, y su salida
// va vacía.
export function horasDeLaJornada(marcas: MarcacionDeJornada[], salidaDeLaJornada: string | null): HorasDelFormulario {
  const horas = { ...HORAS_VACIAS, entrada: hhmm(marcas[0]?.entrada), salida: hhmm(salidaDeLaJornada) };
  marcas.forEach((m, i) => {
    // El regreso de una pausa es la entrada de la marcación siguiente.
    const regreso = hhmm(marcas[i + 1]?.entrada);
    if (m.salidaAlmuerzo) { horas.almuerzoSalida = hhmm(m.salida); horas.almuerzoRegreso = regreso; }
    else if (m.salidaDescanso) { horas.descansoSalida = hhmm(m.salida); horas.descansoRegreso = regreso; }
  });
  return horas;
}

// Cada pausa viaja con su nombre y sus dos horas; la que está vacía no viaja. Una
// con solo el regreso sí viaja, para que el servidor diga qué hora falta.
//
// Nunca con las claves de antes (`descansoSalida`, `descansoRegreso`), que eran
// las del almuerzo: el servidor las rechaza para no guardar un almuerzo como
// descanso no remunerado.
export function cuerpoDeLaJornada(h: HorasDelFormulario) {
  const pausa = (salida: string, regreso: string) => (salida || regreso ? { salida, regreso } : undefined);
  return {
    entrada: h.entrada,
    salida: h.salida,
    almuerzo: pausa(h.almuerzoSalida, h.almuerzoRegreso),
    descanso: pausa(h.descansoSalida, h.descansoRegreso),
  };
}
