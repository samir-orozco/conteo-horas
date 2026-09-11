import { describe, it, expect } from 'vitest';
import { avisoDeFotosPorBorrar } from './fotosPorBorrar';

// Las pruebas corren en Los Ángeles a propósito (vite.config.ts). La hora del
// aviso tiene que salir en hora de Bogotá: con la del navegador, el administrador
// leería las 10:00 y buscaría en la jornada una foto que no existe.
const bog = (h: number, m = 0) => new Date(Date.UTC(2026, 8, 1, h + 5, m)).toISOString();

describe('avisoDeFotosPorBorrar', () => {
  it('nombra cada foto como la muestra la pantalla de fotos, con su hora de Bogotá', () => {
    expect(avisoDeFotosPorBorrar([
      { momento: 'SALIDA_ALMUERZO', hora: bog(12) },
      { momento: 'REGRESO_ALMUERZO', hora: bog(13, 5) },
    ])).toBe(
      'Estas 2 fotos del kiosco ya no pertenecen a ninguna marca de la jornada y se borran al guardar: '
      + 'Salida a almorzar · 12:00 y Regreso del almuerzo · 13:05. No se pueden recuperar.',
    );
  });

  it('las del descanso no remunerado se nombran distinto que las del almuerzo', () => {
    expect(avisoDeFotosPorBorrar([
      { momento: 'SALIDA_DESCANSO', hora: bog(9) },
      { momento: 'REGRESO_DESCANSO', hora: bog(9, 15) },
    ])).toContain('Salida al descanso · 09:00 y Regreso del descanso · 09:15.');
  });

  it('con una sola foto habla en singular', () => {
    expect(avisoDeFotosPorBorrar([{ momento: 'SALIDA', hora: bog(17) }])).toBe(
      'Esta foto del kiosco ya no pertenece a ninguna marca de la jornada y se borra al guardar: '
      + 'Salida · 17:00. No se puede recuperar.',
    );
  });

  it('con tres las separa con comas, y una foto sin hora lo dice en vez de inventarla', () => {
    expect(avisoDeFotosPorBorrar([
      { momento: 'REGRESO_ALMUERZO', hora: bog(13) },
      { momento: 'SALIDA', hora: bog(17) },
      { momento: 'SALIDA', hora: null },
    ])).toContain('Regreso del almuerzo · 13:00, Salida · 17:00 y Salida · sin hora.');
  });
});
