import { describe, it, expect, vi } from 'vitest';
import { esDataUrlDe, codificarPreferirWebp, JPEG, WEBP } from './imagenes';

// La decisión de en qué formato sale una foto.
//
// Vive aparte del canvas porque el canvas NO se puede probar aquí: en jsdom,
// getContext('2d') devuelve null y toDataURL devuelve null para cualquier tipo,
// sin lanzar. Comprobado ejecutando una sonda, no supuesto. Si esta decisión
// viviera dentro de foto.ts o de evidencia.ts, el cambio entero sería invisible
// para la suite: pasarlos a WebP deja las 352 pruebas en verde porque esas
// líneas nunca se ejecutan.

const webp = 'data:image/webp;base64,UklGRg';
const jpeg = 'data:image/jpeg;base64,/9j/4AAQ';
const png = 'data:image/png;base64,iVBORw0KGgo';

describe('reconocer en qué formato salió', () => {
  it('un data URL del formato pedido', () => {
    expect(esDataUrlDe(webp, WEBP)).toBe(true);
    expect(esDataUrlDe(jpeg, JPEG)).toBe(true);
  });

  it('la caída silenciosa a PNG se detecta', () => {
    // El estándar HTML obliga a que toDataURL devuelva PNG, sin avisar, cuando
    // el navegador no sabe codificar el formato pedido. Es el caso entero por
    // el que existe esta función.
    expect(esDataUrlDe(png, WEBP)).toBe(false);
    expect(esDataUrlDe(png, JPEG)).toBe(false);
  });

  it('null no revienta, que es lo que devuelve el canvas en las pruebas', () => {
    expect(esDataUrlDe(null, WEBP)).toBe(false);
    expect(esDataUrlDe(undefined, WEBP)).toBe(false);
    expect(esDataUrlDe('', WEBP)).toBe(false);
    expect(esDataUrlDe(42, WEBP)).toBe(false);
  });

  it('compara hasta el punto y coma, no solo el principio', () => {
    // Sin el punto y coma, un tipo más largo que empiece igual pasaría por el
    // corto: 'image/webp2' contiene 'image/webp'.
    expect(esDataUrlDe('data:image/webp2;base64,AAA', WEBP)).toBe(false);
    expect(esDataUrlDe('data:image/webpx;base64,AAA', WEBP)).toBe(false);
  });
});

describe('pedir WebP y caer a JPEG si no se puede', () => {
  it('cuando el navegador sabe WebP, sale WebP y no se codifica dos veces', () => {
    const codificar = vi.fn((tipo: string) => `data:${tipo};base64,AAA`);
    expect(codificarPreferirWebp(codificar, 0.82)).toEqual({ data: 'data:image/webp;base64,AAA', tipo: WEBP });
    // Codificar dos veces una foto de 1600 px no es gratis.
    expect(codificar).toHaveBeenCalledTimes(1);
    expect(codificar).toHaveBeenCalledWith(WEBP, 0.82);
  });

  it('LA GUARDA: si el canvas devuelve PNG en silencio, se cae a JPEG', () => {
    // Un PNG fotográfico de 512 px mide sobre 1.000.000 de caracteres contra el
    // tope de 700.000 del backend, así que sin esto la foto se rechazaría
    // después, lejos de aquí y sin que nadie relacione una cosa con la otra.
    const codificar = vi.fn((tipo: string) =>
      tipo === WEBP ? png : `data:${tipo};base64,AAA`);
    expect(codificarPreferirWebp(codificar, 0.7)).toEqual({ data: 'data:image/jpeg;base64,AAA', tipo: JPEG });
    expect(codificar).toHaveBeenNthCalledWith(2, JPEG, 0.7);
  });

  it('un null en el intento de WebP también cae a JPEG', () => {
    const codificar = (tipo: string) => (tipo === WEBP ? null : jpeg);
    expect(codificarPreferirWebp(codificar, 0.82)).toEqual({ data: jpeg, tipo: JPEG });
  });

  it('si no sale nada usable devuelve null, NO lanza', () => {
    // Esto no es un detalle de estilo. Quien llama está dentro de un
    // img.onload, y una excepción ahí no la recoge nadie: la promesa de
    // comprimirImagen no se resuelve ni se rechaza nunca, y la caja de subir se
    // queda en "Procesando..." para siempre, sin error y sin poder reintentar.
    expect(codificarPreferirWebp(() => null, 0.82)).toBeNull();
    expect(codificarPreferirWebp(() => '', 0.82)).toBeNull();
    expect(codificarPreferirWebp(() => 'data:,', 0.82)).toBeNull();
  });

  it('la calidad que se pide es la que se pasa a los dos intentos', () => {
    const codificar = vi.fn(() => null);
    codificarPreferirWebp(codificar, 0.55);
    expect(codificar).toHaveBeenNthCalledWith(1, WEBP, 0.55);
    expect(codificar).toHaveBeenNthCalledWith(2, JPEG, 0.55);
  });
});
