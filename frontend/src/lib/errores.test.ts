import { describe, it, expect } from 'vitest';
import { mensajeDeError } from './errores';

describe('qué mensaje se le muestra a la persona', () => {
  it('el del servidor gana, porque es el que sabe por qué falló', () => {
    const e = { response: { data: { error: 'Ese archivo no se puede adjuntar.' } } };
    expect(mensajeDeError(e, 'algo salió mal')).toBe('Ese archivo no se puede adjuntar.');
  });

  it('si no hay respuesta del servidor, sirve el del propio error', () => {
    expect(mensajeDeError(new Error('El PDF supera los 3 MB.'), 'algo salió mal'))
      .toBe('El PDF supera los 3 MB.');
  });

  it('el respaldo cubre todo lo demás', () => {
    // Una caída de red no trae `response`, y un throw de una cadena tampoco
    // trae `message`. En los dos casos hay que decir algo.
    expect(mensajeDeError({ codigo: 'ERR_NETWORK' }, 'Sin conexión.')).toBe('Sin conexión.');
    expect(mensajeDeError(null, 'Sin conexión.')).toBe('Sin conexión.');
    expect(mensajeDeError(undefined, 'Sin conexión.')).toBe('Sin conexión.');
    expect(mensajeDeError('texto suelto', 'Sin conexión.')).toBe('Sin conexión.');
  });

  it('un mensaje vacío no deja el cartel en blanco', () => {
    expect(mensajeDeError({ response: { data: { error: '   ' } } }, 'Sin conexión.')).toBe('Sin conexión.');
    expect(mensajeDeError(new Error(''), 'Sin conexión.')).toBe('Sin conexión.');
  });

  it('un error del servidor que no sea texto no se pinta crudo', () => {
    expect(mensajeDeError({ response: { data: { error: { campo: 'x' } } } }, 'Sin conexión.')).toBe('Sin conexión.');
  });
});
