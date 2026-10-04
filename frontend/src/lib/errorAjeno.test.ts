import { describe, it, expect } from 'vitest';
import { esErrorAjeno } from './errorAjeno';

// LA PANTALLA NEGRA, SOLO PARA LO NUESTRO (4 de octubre de 2026, pedido del dueño). El registro
// mostró «Error invoking postMessage: Java object is gone» en la página de inicio, 4 veces: lo lanza
// el navegador interno de apps de Android (Facebook, Instagram…) y no hay nada que arreglar en
// HoraPro. Pero CapturadorErrores tapaba la página entera con el error a ese visitante.

const ORIGEN = 'https://horapro.co';

describe('qué error es ajeno', () => {
  it('el del navegador interno de Android, venga de donde venga', () => {
    expect(esErrorAjeno({ mensaje: 'Uncaught Error: Error invoking postMessage: Java object is gone', archivo: '' }, ORIGEN)).toBe(true);
    expect(esErrorAjeno({ mensaje: 'Uncaught Error: Error invoking postMessage: Java object is gone', archivo: `${ORIGEN}/assets/index-CwDZyCET.js` }, ORIGEN)).toBe(true);
  });

  it('uno sin archivo: los nuestros siempre dicen de qué archivo vienen', () => {
    expect(esErrorAjeno({ mensaje: 'algo', archivo: '' }, ORIGEN)).toBe(true);
  });

  it('uno de un script de otro sitio o de una extensión', () => {
    expect(esErrorAjeno({ mensaje: 'algo', archivo: 'https://www.youtube.com/s/player/base.js' }, ORIGEN)).toBe(true);
    expect(esErrorAjeno({ mensaje: 'algo', archivo: 'chrome-extension://abc/contenido.js' }, ORIGEN)).toBe(true);
  });

  // Lo que inyecta una app en la página queda a nombre de la página misma, no de un archivo.
  it('uno a nombre de la página y no de un script', () => {
    expect(esErrorAjeno({ mensaje: 'algo', archivo: `${ORIGEN}/` }, ORIGEN)).toBe(true);
    expect(esErrorAjeno({ mensaje: 'algo', archivo: `${ORIGEN}/marcador/cmreivbqd0002m4wukmwn0cu9` }, ORIGEN)).toBe(true);
  });

  it('NO es ajeno uno de nuestro paquete, en producción o en desarrollo', () => {
    expect(esErrorAjeno({ mensaje: 'TypeError: x is not a function', archivo: `${ORIGEN}/assets/index-CwDZyCET.js` }, ORIGEN)).toBe(false);
    expect(esErrorAjeno({ mensaje: 'TypeError: x', archivo: 'http://localhost:5174/src/pages/Marcador.tsx?t=1' }, 'http://localhost:5174')).toBe(false);
  });

  it('una promesa rechazada es nuestra si su rastro pasa por nuestro paquete', () => {
    const rastro = `Error: algo\n    at f (${ORIGEN}/assets/index-CwDZyCET.js:12:34)`;
    expect(esErrorAjeno({ mensaje: 'Promesa rechazada: algo', rastro }, ORIGEN)).toBe(false);
  });

  it('y ajena si el rastro solo pasa por código de otros', () => {
    const rastro = 'Error: algo\n    at f (chrome-extension://abc/contenido.js:1:1)';
    expect(esErrorAjeno({ mensaje: 'Promesa rechazada: algo', rastro }, ORIGEN)).toBe(true);
  });

  // Sin rastro no se sabe de dónde vino: se sigue mostrando, como hasta hoy.
  it('una promesa rechazada sin rastro no se da por ajena', () => {
    expect(esErrorAjeno({ mensaje: 'Promesa rechazada: algo' }, ORIGEN)).toBe(false);
  });
});
