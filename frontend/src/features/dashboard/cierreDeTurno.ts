import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { TZ } from './helpers';

// Qué se le manda al servidor al cerrar un turno que quedó sin salida.
//
// El caso que lo rompió (8 de octubre de 2026): la persona había marcado salida a las 16:42:40 y,
// 14 segundos después, una entrada a las 16:42:54. El formulario trabaja en minutos, así que
// reenviaba esa entrada como «16:42» —54 segundos antes de lo real— y el tramo caía dentro del
// anterior: el servidor lo rechazaba por cruce de marcaciones. Por eso la entrada solo viaja si
// la persona la corrigió; si no, la que está guardada no se toca.

// Bogotá no tiene horario de verano: la hora de pared es UTC-5 todo el año.
const PARED_BOGOTA = '-05:00';
const UN_DIA_MS = 24 * 60 * 60 * 1000;

const instante = (fecha: string, hhmm: string) => new Date(`${fecha}T${hhmm}:00${PARED_BOGOTA}`);

export type ValoresDelCierre = { fecha: string; entrada: string; salida: string };

export type Cierre =
  | { ok: true; cuerpo: { entrada?: Date; salida: Date }; salidaDiaSiguiente: boolean }
  | { ok: false; error: string };

// Lo que el formulario muestra al abrirse: la entrada guardada, en hora de Bogotá y sin segundos.
export function valoresIniciales(turnoEntrada: string): ValoresDelCierre {
  const z = toZonedTime(new Date(turnoEntrada), TZ);
  return { fecha: format(z, 'yyyy-MM-dd'), entrada: format(z, 'HH:mm'), salida: '' };
}

export function armarCierre(
  { turnoEntrada, fecha, entrada, salida }: ValoresDelCierre & { turnoEntrada: string },
): Cierre {
  if (!salida) return { ok: false, error: 'Indica la hora de salida.' };
  if (!fecha || !entrada) return { ok: false, error: 'Indica la fecha y la hora de entrada.' };
  // «HH:mm» con ceros a la izquierda se ordena como texto.
  if (salida === entrada) return { ok: false, error: 'La salida debe ser posterior a la entrada.' };

  // Una hora menor que la de entrada solo puede ser del día siguiente: el turno cruzó la medianoche.
  const salidaDiaSiguiente = salida < entrada;
  const horaDeSalida = new Date(instante(fecha, salida).getTime() + (salidaDiaSiguiente ? UN_DIA_MS : 0));

  const inicial = valoresIniciales(turnoEntrada);
  const entradaSinTocar = fecha === inicial.fecha && entrada === inicial.entrada;
  return {
    ok: true,
    cuerpo: entradaSinTocar
      ? { salida: horaDeSalida }
      : { entrada: instante(fecha, entrada), salida: horaDeSalida },
    salidaDiaSiguiente,
  };
}
