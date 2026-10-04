import { describe, it, expect } from 'vitest';
import { textoDeLaMarca, ultimasMarcas, MARCAS_VISIBLES } from './marcasDeHoy';

// LO QUE YA MARCÓ HOY, DICHO EN LA PANTALLA DE MARCAR (3 de octubre de 2026, diseño del dueño).
// Cada marca con su nombre y su hora; los nombres son los mismos del panel.
describe('el texto de cada marca del día', () => {
  const h = '2026-10-02T23:00:00Z'; // 6:00 p. m. en Bogotá
  const ahora = '2026-10-03T01:00:00Z'; // 8:00 p. m. del mismo día en Bogotá
  it('entrada y salida', () => {
    expect(textoDeLaMarca('ENTRADA', h, ahora)).toBe('Entrada registrada a las 6:00 p. m.');
    expect(textoDeLaMarca('SALIDA', h, ahora)).toBe('Salida registrada a las 6:00 p. m.');
  });
  it('las pausas: la salida es «registrada» y el regreso «registrado»', () => {
    expect(textoDeLaMarca('SALIDA_ALMUERZO', h, ahora)).toBe('Salida a almorzar registrada a las 6:00 p. m.');
    expect(textoDeLaMarca('REGRESO_ALMUERZO', h, ahora)).toBe('Regreso del almuerzo registrado a las 6:00 p. m.');
    expect(textoDeLaMarca('SALIDA_DESCANSO', h, ahora)).toBe('Salida al descanso registrada a las 6:00 p. m.');
    expect(textoDeLaMarca('REGRESO_DESCANSO', h, ahora)).toBe('Regreso del descanso registrado a las 6:00 p. m.');
  });
});

// EL TURNO NOCTURNO (3 de octubre de 2026). Luis entra el viernes a las 7:00 p. m. y el sábado a las
// 6:00 a. m. llega a marcar su salida: su entrada sale en la lista, y tiene que decir que fue ayer.
// El día se cuenta en Bogotá. Estas pruebas corren en Los Ángeles a propósito (CLAUDE.md §7).
describe('el día de cada marca', () => {
  const seisDeLaMananaDelSabado = '2026-10-03T11:00:00Z';

  it('lo de ayer dice «ayer»', () => {
    // 7:00 p. m. del viernes en Bogotá, que en UTC ya es sábado: contar el día en UTC lo daría por hoy.
    expect(textoDeLaMarca('ENTRADA', '2026-10-03T00:00:00Z', seisDeLaMananaDelSabado))
      .toBe('Entrada registrada ayer a las 7:00 p. m.');
  });

  it('la madrugada de hoy es hoy, aunque en Los Ángeles todavía sea ayer', () => {
    // 12:30 a. m. del sábado en Bogotá, que en Los Ángeles son las 10:30 p. m. del viernes.
    expect(textoDeLaMarca('SALIDA_ALMUERZO', '2026-10-03T05:30:00Z', seisDeLaMananaDelSabado))
      .toBe('Salida a almorzar registrada a las 12:30 a. m.');
  });

  // No debería llegar: la lista solo arranca antes de hoy por una jornada en curso, que dura menos
  // de un día. Pero si llega, decir «ayer» de algo de anteayer sería mentirle a quien lo lee.
  it('lo de antes de ayer va con su fecha', () => {
    // 12:30 a. m. del 1 de octubre en Bogotá, que en Los Ángeles todavía es el 30 de septiembre.
    expect(textoDeLaMarca('ENTRADA', '2026-10-01T05:30:00Z', seisDeLaMananaDelSabado))
      .toBe('Entrada registrada el 1 de octubre a las 12:30 a. m.');
  });

  // El rango de la lista lo decide el reloj del servidor y la etiqueta el del aparato. Con el aparato
  // atrasado unos minutos, una marca de las 12:30 a. m. puede llegarle antes de su medianoche: no
  // puede salir con una fecha que para la pantalla todavía no ha llegado.
  it('una marca posterior a la hora del aparato se toma como de hoy', () => {
    expect(textoDeLaMarca('ENTRADA', '2026-10-04T05:30:00Z', '2026-10-04T04:59:00Z'))
      .toBe('Entrada registrada a las 12:30 a. m.');
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
