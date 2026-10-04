import { describe, it, expect } from 'vitest';
import { WHATSAPP, enlaceWhatsApp } from './whatsapp';

describe('el WhatsApp por el que nos escriben', () => {
  it('es un celular colombiano en el formato que pide wa.me', () => {
    // Sin esto, un dedazo (un dígito de más, un + o un espacio colado) da un
    // enlace que abre WhatsApp y dice que el número no existe. No se compara
    // contra el número escrito a mano a propósito: eso no probaría nada, solo
    // obligaría a cambiarlo en dos sitios.
    expect(WHATSAPP).toMatch(/^573\d{9}$/);
  });

  it('arma el enlace con el número y el mensaje', () => {
    expect(enlaceWhatsApp('Hola')).toBe(`https://wa.me/${WHATSAPP}?text=Hola`);
  });

  it('codifica el mensaje, que si no se corta en el primer espacio', () => {
    const url = enlaceWhatsApp('Hola, ¿me ayudan con el plan?');
    expect(url).toContain('%C2%BF');
    expect(url).not.toMatch(/text=.*[ ]/);
  });

  it('sin mensaje, el enlace es solo el número', () => {
    expect(enlaceWhatsApp()).toBe(`https://wa.me/${WHATSAPP}`);
    expect(enlaceWhatsApp('')).toBe(`https://wa.me/${WHATSAPP}`);
  });
});
