import { describe, it, expect } from 'vitest';
import { normalizarAuxilio, AUXILIO_INVALIDO } from './auxilioDeLaFicha';

// QUÉ AUXILIO SE GUARDA EN LA FICHA (17 de septiembre de 2026).
//
// `normalizar()` en routes/colaboradores.ts no filtra campos: muta el cuerpo que llega y lo
// devuelve, así que lo que venga entra derecho a Prisma. Los guardas que ya hay ahí (modalidad,
// permiso de otra sede, texto largo) existen porque un valor crudo salía como un 500 sin explicar
// nada. Este es el del auxilio.
//
// Lo que lo hace distinto de los otros guardas: aquí `null` es un valor VÁLIDO y quiere decir «el
// del decreto, si su básico da derecho». Por eso no sirve usar null como señal de error.

describe('normalizarAuxilio: los tres estados que puede tener', () => {
  it('lo que no viene en el cuerpo no se toca', () => {
    // Guardar el teléfono de alguien no puede borrarle el auxilio.
    expect(normalizarAuxilio(undefined)).toBeUndefined();
  });

  it('null es «el del decreto», no un error', () => {
    expect(normalizarAuxilio(null)).toBeNull();
  });

  it('el campo borrado en pantalla también es «el del decreto»', () => {
    // El formulario manda la cadena vacía cuando alguien borra la caja.
    expect(normalizarAuxilio('')).toBeNull();
  });

  it('un cero es «esta empresa no lo paga», y no se confunde con vacío', () => {
    expect(normalizarAuxilio(0)).toBe(0);
    expect(normalizarAuxilio('0')).toBe(0);
  });

  it('un valor pactado se guarda tal cual, venga como número o como texto', () => {
    expect(normalizarAuxilio(249_095)).toBe(249_095);
    expect(normalizarAuxilio('249095')).toBe(249_095);
  });
});

describe('normalizarAuxilio: lo que no puede llegar a la base', () => {
  it('un texto que no es un número se rechaza, en vez de salir como un 500', () => {
    expect(normalizarAuxilio('doscientos mil')).toBe(AUXILIO_INVALIDO);
  });

  it('un negativo se rechaza: un auxilio no le resta plata a nadie', () => {
    expect(normalizarAuxilio(-1)).toBe(AUXILIO_INVALIDO);
    expect(normalizarAuxilio('-249095')).toBe(AUXILIO_INVALIDO);
  });

  it('infinito y NaN se rechazan', () => {
    expect(normalizarAuxilio(Infinity)).toBe(AUXILIO_INVALIDO);
    expect(normalizarAuxilio(NaN)).toBe(AUXILIO_INVALIDO);
  });
});
