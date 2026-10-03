import { horaDoce } from '../../lib/fechas';
import type { Momento } from '../../constants/momentos';

// CÓMO SE DICE CADA MARCA QUE LA PERSONA YA TIENE HOY (3 de octubre de 2026, diseño del dueño). El
// nombre del momento lo decide el servidor con la misma regla del panel; aquí solo se dice. Un caso
// por momento y un `default` que no compila si llega uno nuevo sin su texto (CLAUDE.md §9.4).
export function textoDeLaMarca(momento: Momento, hora: string | Date): string {
  const a = `a las ${horaDoce(hora)}`;
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
