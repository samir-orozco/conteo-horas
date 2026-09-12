import { describe, it, expect } from 'vitest';
import { MAX_DESCANSOS_POR_FRANJA, MAX_MARCACIONES_POR_JORNADA, minutosEntre, minutosDeLosDescansos } from './descansos';

// Los descansos no remunerados, del lado de las pantallas (12 de septiembre de 2026).
// Quien valida y calcula es el servidor (backend/src/utils/descansos.ts). Aquí solo se
// dice cuánto dura cada uno, para el resumen del horario que se está editando, y
// cuántos caben, con los mismos topes.

describe('los topes', () => {
  it('hasta 3 descansos por franja, y 5 marcaciones por jornada: la de la entrada y una por pausa', () => {
    expect(MAX_DESCANSOS_POR_FRANJA).toBe(3);
    expect(MAX_MARCACIONES_POR_JORNADA).toBe(5);
  });
});

describe('minutosEntre', () => {
  it('lo que dura una ventana con sus dos horas', () => {
    expect(minutosEntre('09:00', '09:15')).toBe(15);
  });

  it('una ventana que cruza la medianoche', () => {
    expect(minutosEntre('23:55', '00:05')).toBe(10);
  });

  it('con una sola hora no dura nada', () => {
    expect(minutosEntre('09:00', '')).toBe(0);
    expect(minutosEntre(null, '09:15')).toBe(0);
  });
});

describe('minutosDeLosDescansos', () => {
  it('suma los descansos con sus dos horas y no cuenta los que están a medias', () => {
    expect(minutosDeLosDescansos([
      { inicio: '09:00', fin: '09:15' }, { inicio: '15:00', fin: '' }, { inicio: '15:00', fin: '15:10' },
    ])).toBe(25);
  });

  it('sin lista, cero', () => {
    expect(minutosDeLosDescansos(undefined)).toBe(0);
  });
});
