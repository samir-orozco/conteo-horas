import { describe, it, expect } from 'vitest';
import { auxilioSugerido } from './auxilioSugerido';

// QUÉ AUXILIO PROPONE LA FICHA (17 de septiembre de 2026).
//
// El campo del auxilio nace vacío, y vacío significa «el que fije el decreto si su salario da
// derecho». Pero el administrador no tiene por qué saberse de memoria ni el valor ni el tope, así
// que la ficha se lo dice: propone el número y explica por qué es ese.
//
// Decisión del dueño: por encima del tope se propone 0 y se avisa, pero NO se fuerza. La ley fija
// una obligación, no una prohibición: pagarlo por encima de dos mínimos es voluntario y legal, y un
// sistema que lo impida deja fuera un pago real del archivo de nómina.

const VIGENCIA = { valor: 249_095, tope: 3_501_810 }; // Decretos 1469 y 1470 de 2025, para 2026

describe('auxilioSugerido', () => {
  it('con salario mínimo propone el del decreto', () => {
    expect(auxilioSugerido(1_750_905, VIGENCIA)).toEqual({ valor: 249_095, motivo: 'DECRETO' });
  });

  it('justo en el tope todavía da derecho', () => {
    expect(auxilioSugerido(3_501_810, VIGENCIA)).toEqual({ valor: 249_095, motivo: 'DECRETO' });
  });

  it('un peso por encima del tope propone cero, pero como propuesta', () => {
    expect(auxilioSugerido(3_501_811, VIGENCIA)).toEqual({ valor: 0, motivo: 'SUPERA_TOPE' });
  });

  it('sin vigencia sembrada no propone nada: no se inventa plata', () => {
    expect(auxilioSugerido(1_750_905, null)).toEqual({ valor: null, motivo: 'SIN_VIGENCIA' });
  });

  it('sin salario todavía escrito tampoco propone', () => {
    // Al abrir la ficha de alguien nuevo el salario está en cero: proponerle el auxilio del decreto
    // sería afirmar que da derecho antes de saber cuánto gana.
    expect(auxilioSugerido(0, VIGENCIA)).toEqual({ valor: null, motivo: 'SIN_SALARIO' });
  });
});
