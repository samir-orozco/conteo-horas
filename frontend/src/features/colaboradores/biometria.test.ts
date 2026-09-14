import { describe, it, expect } from 'vitest';
import { estadoBiometrico, ETIQUETA_BIOMETRICA, mensajeDelEnlace } from './biometria';

// Lo que se ve del registro facial en la ficha y en la tabla, y el mensaje que copia el administrador
// para mandarle el enlace a la persona (14 de septiembre de 2026).

describe('estadoBiometrico', () => {
  it('con rostro registrado, aunque antes no hubiera autorizado', () => {
    expect(estadoBiometrico({ rostroEnroladoEn: '2026-09-10T15:00:00.000Z', rostroRechazadoEn: '2026-09-01T15:00:00.000Z' })).toBe('REGISTRADO');
  });

  it('no autorizó', () => {
    expect(estadoBiometrico({ rostroEnroladoEn: null, rostroRechazadoEn: '2026-09-01T15:00:00.000Z' })).toBe('NO_AUTORIZO');
  });

  it('sin registro, también cuando la respuesta no trae los campos', () => {
    expect(estadoBiometrico({ rostroEnroladoEn: null, rostroRechazadoEn: null })).toBe('SIN_REGISTRO');
    expect(estadoBiometrico({})).toBe('SIN_REGISTRO');
  });

  it('las etiquetas: verde el registrado, gris quien no autorizó, y nada sin registro', () => {
    expect(ETIQUETA_BIOMETRICA.REGISTRADO).toEqual({ texto: 'Rostro registrado', tono: 'verde' });
    expect(ETIQUETA_BIOMETRICA.NO_AUTORIZO).toEqual({ texto: 'No autorizó', tono: 'gris' });
    expect(ETIQUETA_BIOMETRICA.SIN_REGISTRO).toBeNull();
  });
});

describe('mensajeDelEnlace', () => {
  it('saluda por el nombre, nombra la empresa y dice cuánto dura y a qué hora vence, en hora de Bogotá', () => {
    // 20:45 UTC son las 3:45 p. m. en Bogotá. Estas pruebas corren en Los Ángeles a propósito.
    expect(mensajeDelEnlace({
      nombre: 'Ana María', empresa: 'Rosa de Castro SAS',
      url: 'https://horapro.co/registro-facial/abc', venceEn: '2026-09-14T20:45:00.000Z',
    })).toBe('Hola, Ana María: con este enlace registras tu rostro para marcar asistencia en Rosa de Castro SAS. '
      + 'El enlace dura 1 hora y vence a las 3:45 p. m.\nhttps://horapro.co/registro-facial/abc');
  });

  // Node formatea «a. m.» con espacios normales, pero un navegador puede poner espacios que no se cortan
  // (U+202F, U+00A0). Se simulan, para que la guarda se pruebe de verdad y no pase sola.
  it('cambia por espacios normales los que no se cortan, que en WhatsApp se ven como cuadritos', () => {
    const conEspaciosRaros = `9:05${String.fromCharCode(0x202f)}a.${String.fromCharCode(0x00a0)}m.`;
    const original = Object.getOwnPropertyDescriptor(Intl.DateTimeFormat.prototype, 'format');
    if (!original) throw new Error('Intl.DateTimeFormat sin format');
    Object.defineProperty(Intl.DateTimeFormat.prototype, 'format', { configurable: true, get: () => () => conEspaciosRaros });
    try {
      const texto = mensajeDelEnlace({ nombre: 'Luis', empresa: 'Demo', url: 'u', venceEn: '2026-09-14T14:05:00.000Z' });
      expect(texto).toContain('vence a las 9:05 a. m.\nu');
    } finally {
      Object.defineProperty(Intl.DateTimeFormat.prototype, 'format', original);
    }
  });

  it('en la mañana dice a. m., con espacios normales que se pegan bien en WhatsApp', () => {
    const texto = mensajeDelEnlace({ nombre: 'Luis', empresa: 'Demo', url: 'u', venceEn: '2026-09-14T14:05:00.000Z' });
    expect(texto).toContain('vence a las 9:05 a. m.');
    expect(texto).not.toMatch(/[\u00a0\u202f]/);
  });
});
