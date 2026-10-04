import { horaDoce, TZ } from '../../lib/fechas';
import type { Momento } from '../../constants/momentos';

// CÓMO SE DICE CADA MARCA QUE LA PERSONA YA TIENE HOY (3 de octubre de 2026, diseño del dueño). El
// nombre del momento lo decide el servidor con la misma regla del panel; aquí solo se dice. Un caso
// por momento y un `default` que no compila si llega uno nuevo sin su texto (CLAUDE.md §9.4).
export function textoDeLaMarca(momento: Momento, hora: string | Date, ahora: string | Date): string {
  const a = `${cuandoFue(hora, ahora)}a las ${horaDoce(hora)}`;
  switch (momento) {
    case 'ENTRADA': return `Entrada registrada ${a}`;
    case 'SALIDA': return `Salida registrada ${a}`;
    case 'SALIDA_ALMUERZO': return `Salida a almorzar registrada ${a}`;
    case 'REGRESO_ALMUERZO': return `Regreso del almuerzo registrado ${a}`;
    case 'SALIDA_DESCANSO': return `Salida al descanso registrada ${a}`;
    case 'REGRESO_DESCANSO': return `Regreso del descanso registrado ${a}`;
    default: {
      const nuevo: never = momento;
      return nuevo;
    }
  }
}

// EN QUÉ DÍA FUE (3 de octubre de 2026, el turno nocturno). Quien entra a las 7:00 p. m. y sale a
// las 6:00 a. m. ve su entrada en la lista de la mañana, y sin el día parecería de esa misma
// mañana. Lo de hoy va sin día; lo de ayer, «ayer»; lo más viejo, con su fecha. El día se cuenta en
// Bogotá, nunca en la zona del aparato ni en UTC.
//
// Como número de día y no como texto, para poder ordenarlo: Bogotá está en UTC−5 todo el año, sin
// horario de verano, así que basta correr el instante cinco horas y contar días enteros.
const UN_DIA = 24 * 60 * 60 * 1000;
const diaEnBogota = (d: string | Date) => Math.floor((new Date(d).getTime() - 5 * 60 * 60 * 1000) / UN_DIA);

export function cuandoFue(hora: string | Date, ahora: string | Date): string {
  const diasAtras = diaEnBogota(ahora) - diaEnBogota(hora);
  // Lo de hoy va sin día, y también lo que todavía no le llega a un aparato con el reloj atrasado:
  // el rango de la lista lo decide el reloj del servidor.
  if (diasAtras <= 0) return '';
  if (diasAtras === 1) return 'ayer ';
  return `el ${new Date(hora).toLocaleDateString('es-CO', { timeZone: TZ, day: 'numeric', month: 'long' })} `;
}

// SOLO LAS ÚLTIMAS TRES (3 de octubre de 2026, decisión del dueño). Con siete marcas, en un celular
// la lista empujaba el botón de marcar fuera de la pantalla. Lo que delata un error casi siempre es
// lo más reciente; las anteriores se cuentan («y 4 más»), y tocando ese texto se ven todas.
// Llegan en orden, la más vieja primero.
export const MARCAS_VISIBLES = 3;

export function ultimasMarcas<T>(marcas: T[]): { visibles: T[]; ocultas: number } {
  const ocultas = Math.max(0, marcas.length - MARCAS_VISIBLES);
  return { visibles: marcas.slice(ocultas), ocultas };
}
