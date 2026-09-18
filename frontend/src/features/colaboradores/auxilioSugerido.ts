// Qué auxilio de transporte propone la ficha de una persona (17 de septiembre de 2026).
//
// El campo nace vacío, y vacío significa «el que fije el decreto si su salario da derecho». Pero el
// administrador no tiene por qué saberse de memoria ni el valor ni el tope, así que la ficha se lo
// dice: propone el número y explica por qué es ese.
//
// Esto solo PROPONE. Lo que se guarda sigue siendo lo que quede escrito en el campo: por encima del
// tope se propone cero y se avisa, pero no se fuerza. La ley fija una obligación, no una
// prohibición: pagar auxilio a quien gana más de dos mínimos es voluntario y perfectamente legal, y
// un sistema que lo impidiera dejaría ese pago fuera del archivo de nómina.

export type VigenciaDelAuxilio = { valor: number; tope: number };

export type MotivoDelAuxilio =
  // Le corresponde el del decreto.
  | 'DECRETO'
  // Gana más de dos mínimos: la ley no obliga, pero la empresa puede pagarlo igual.
  | 'SUPERA_TOPE'
  // No hay ninguna vigencia sembrada todavía.
  | 'SIN_VIGENCIA'
  // Todavía no se sabe cuánto gana, así que no se puede decir si tiene derecho.
  | 'SIN_SALARIO';

export type AuxilioSugerido = { valor: number | null; motivo: MotivoDelAuxilio };

export function auxilioSugerido(salarioBasico: number, vigencia: VigenciaDelAuxilio | null): AuxilioSugerido {
  // Sin dato del decreto no se propone nada: inventar una cifra de plata es peor que no proponer.
  if (!vigencia) return { valor: null, motivo: 'SIN_VIGENCIA' };

  // Al abrir la ficha de alguien nuevo el salario está en cero. Proponerle el auxilio ahí sería
  // afirmar que tiene derecho antes de saber cuánto gana.
  if (!salarioBasico || salarioBasico <= 0) return { valor: null, motivo: 'SIN_SALARIO' };

  if (salarioBasico > vigencia.tope) return { valor: 0, motivo: 'SUPERA_TOPE' };
  return { valor: vigencia.valor, motivo: 'DECRETO' };
}
