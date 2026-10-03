import { describe, it, expect } from 'vitest';
import { textoDeLaMarca } from './marcasDeHoy';

// LO QUE YA MARCÓ HOY, DICHO EN LA PANTALLA DE MARCAR (3 de octubre de 2026, diseño del dueño).
// Cada marca con su nombre y su hora; los nombres son los mismos del panel.
describe('el texto de cada marca del día', () => {
  const h = '2026-10-02T23:00:00Z'; // 6:00 p. m. en Bogotá
  it('entrada y salida', () => {
    expect(textoDeLaMarca('ENTRADA', h)).toBe('Entrada registrada a las 6:00 p. m.');
    expect(textoDeLaMarca('SALIDA', h)).toBe('Salida registrada a las 6:00 p. m.');
  });
  it('las pausas: la salida es «registrada» y el regreso «registrado»', () => {
    expect(textoDeLaMarca('SALIDA_ALMUERZO', h)).toBe('Salida a almorzar registrada a las 6:00 p. m.');
    expect(textoDeLaMarca('REGRESO_ALMUERZO', h)).toBe('Regreso del almuerzo registrado a las 6:00 p. m.');
    expect(textoDeLaMarca('SALIDA_DESCANSO', h)).toBe('Salida al descanso registrada a las 6:00 p. m.');
    expect(textoDeLaMarca('REGRESO_DESCANSO', h)).toBe('Regreso del descanso registrado a las 6:00 p. m.');
  });
});
