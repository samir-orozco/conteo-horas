import { describe, it, expect } from 'vitest';
import { textoDeLaMarca, ultimasMarcas, MARCAS_VISIBLES } from './marcasDeHoy';

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

// SOLO LAS ÚLTIMAS TRES (3 de octubre de 2026, decisión del dueño). Con siete marcas, en un celular
// la lista empujaba el botón de marcar fuera de la pantalla. Lo que delata un error casi siempre es
// lo más reciente; las demás se cuentan.
describe('cuáles marcas se muestran', () => {
  const marca = (i: number) => ({ momento: 'ENTRADA' as const, hora: `2026-10-03T1${i}:00:00Z` });

  it('son tres', () => expect(MARCAS_VISIBLES).toBe(3));

  it('con siete, las tres últimas y las otras cuatro contadas', () => {
    const siete = [0, 1, 2, 3, 4, 5, 6].map(marca);
    const { visibles, ocultas } = ultimasMarcas(siete);
    expect(visibles).toEqual([marca(4), marca(5), marca(6)]);
    expect(ocultas).toBe(4);
  });

  it('con tres o menos, todas y nada oculto', () => {
    expect(ultimasMarcas([marca(0), marca(1), marca(2)])).toEqual({ visibles: [marca(0), marca(1), marca(2)], ocultas: 0 });
    expect(ultimasMarcas([])).toEqual({ visibles: [], ocultas: 0 });
  });
});
