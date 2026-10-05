import { describe, it, expect } from 'vitest';
import { cifrar, descifrar, leerClave } from './cifradoConfidencial';

const CLAVE = Buffer.alloc(32, 7);
const OTRA = Buffer.alloc(32, 9);

describe('cifradoConfidencial', () => {
  it('lo cifrado se descifra con la misma clave', () => {
    expect(descifrar(cifrar('colab_123', CLAVE), CLAVE)).toBe('colab_123');
  });

  it('el texto cifrado no contiene lo que cifra', () => {
    expect(cifrar('colab_123', CLAVE)).not.toContain('colab_123');
  });

  it('cifrar dos veces lo mismo da dos textos distintos', () => {
    // Si fueran iguales, dos notas de la misma persona se verían iguales en la base
    // y se podría saber que las escribió la misma, sin descifrar nada.
    expect(cifrar('colab_123', CLAVE)).not.toBe(cifrar('colab_123', CLAVE));
  });

  it('con otra clave no se descifra', () => {
    expect(() => descifrar(cifrar('colab_123', CLAVE), OTRA)).toThrow();
  });

  it('un texto alterado no se descifra', () => {
    const c = cifrar('colab_123', CLAVE);
    const partes = c.split(':');
    const datos = Buffer.from(partes[3], 'base64');
    datos[0] ^= 1;
    partes[3] = datos.toString('base64');
    expect(() => descifrar(partes.join(':'), CLAVE)).toThrow();
  });

  it('un formato desconocido no se descifra', () => {
    expect(() => descifrar('cualquier cosa', CLAVE)).toThrow('Formato de cifrado desconocido');
    // Una versión que este código no conoce no se intenta leer como si fuera la v1.
    expect(() => descifrar(cifrar('colab_123', CLAVE).replace(/^v1:/, 'v2:'), CLAVE)).toThrow('Formato de cifrado desconocido');
  });

  it('la clave se lee de 64 caracteres hexadecimales', () => {
    expect(leerClave('07'.repeat(32))).toEqual(CLAVE);
  });

  it('sin clave, o con una clave mal formada, no hay clave', () => {
    expect(leerClave(undefined)).toBeNull();
    expect(leerClave('')).toBeNull();
    expect(leerClave('07'.repeat(31))).toBeNull();
    expect(leerClave('zz'.repeat(32))).toBeNull();
  });
});
