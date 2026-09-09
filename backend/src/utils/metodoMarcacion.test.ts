import { describe, it, expect } from 'vitest';
import { camposDeAutenticacion } from './metodoMarcacion';

// CON QUÉ SE AUTENTICÓ CADA MARCACIÓN, Y PARA QUÉ SIRVE SABERLO.
//
// Hoy es imposible responder «cuántas marcaciones del mes pasado entraron sin
// cámara», y sin eso no se puede saber si el reconocimiento facial sirve de algo
// ni medir si un cambio lo mejoró. Es el primer paso de todo el trabajo de
// biometría, y el único que no cuesta ningún riesgo.
//
// EL DATO VIENE DEL JWT FIRMADO DEL LOGIN, NO DEL CUERPO DE LA PETICIÓN. Es la
// diferencia entre un dato y un dato que el propio atacante escribe: si el
// kiosco mandara `metodo: 'ROSTRO'` en el body, cualquiera pondría eso desde el
// inspector y la medición diría exactamente lo contrario de la realidad.

describe('qué se guarda de la autenticación de una marcación', () => {
  it('con rostro guarda el método y la distancia del match', () => {
    expect(camposDeAutenticacion({ metodo: 'ROSTRO', distancia: 0.34 }, 'entrada'))
      .toEqual({ metodoEntrada: 'ROSTRO', distanciaEntrada: 0.34 });
  });

  it('con cédula guarda el método y NINGUNA distancia', () => {
    // Una distancia junto a una marcación por cédula sería un dato corrupto: no
    // hubo rostro que comparar. Si llega una, se descarta.
    expect(camposDeAutenticacion({ metodo: 'CEDULA' }, 'entrada'))
      .toEqual({ metodoEntrada: 'CEDULA' });
    expect(camposDeAutenticacion({ metodo: 'CEDULA', distancia: 0.4 }, 'entrada'))
      .toEqual({ metodoEntrada: 'CEDULA' });
  });

  it('la salida escribe sus propias columnas', () => {
    // Entrar con la cara y salir con la cédula es un caso normal, así que los dos
    // momentos se guardan por separado.
    expect(camposDeAutenticacion({ metodo: 'ROSTRO', distancia: 0.21 }, 'salida'))
      .toEqual({ metodoSalida: 'ROSTRO', distanciaSalida: 0.21 });
    expect(camposDeAutenticacion({ metodo: 'CEDULA' }, 'salida'))
      .toEqual({ metodoSalida: 'CEDULA' });
  });

  it('un token viejo, de antes de este cambio, no escribe nada', () => {
    // Los tokens duran 12 horas, así que después de desplegar habrá sesiones sin
    // `metodo`. Esas marcaciones tienen que quedar en null, y ese null significa
    // «no se sabe». Rellenarlas con CEDULA por descarte falsearía justo el número
    // que venimos a medir.
    expect(camposDeAutenticacion({}, 'entrada')).toEqual({});
    expect(camposDeAutenticacion({ metodo: undefined }, 'salida')).toEqual({});
  });

  it('un método que no reconocemos no se guarda', () => {
    for (const basura of ['ADMIN', 'rostro', '', 0, 1, null, {}, ['ROSTRO']]) {
      expect(camposDeAutenticacion({ metodo: basura }, 'entrada')).toEqual({});
    }
  });

  it('una sesión del kiosco NO puede declararse MANUAL', () => {
    // MANUAL existe en el enum del esquema, pero significa «lo escribió un
    // administrador desde el panel». Una sesión del kiosco que lo declarara
    // estaría disfrazando una marcación real de carga a mano, que es justo la
    // categoría que un supervisor revisa menos. El enum de la base tiene tres
    // valores y esta función acepta dos, y esa diferencia es deliberada.
    expect(camposDeAutenticacion({ metodo: 'MANUAL' }, 'entrada')).toEqual({});
    expect(camposDeAutenticacion({ metodo: 'MANUAL' }, 'salida')).toEqual({});
  });

  it('con rostro pero sin distancia usable, guarda el método solo', () => {
    // El método es el dato que se vino a medir; la distancia es un extra. Si la
    // distancia no sirve, perderla no puede costar también el método.
    for (const mala of [undefined, null, NaN, Infinity, -Infinity, -0.1, '0.3', {}]) {
      expect(camposDeAutenticacion({ metodo: 'ROSTRO', distancia: mala }, 'entrada'))
        .toEqual({ metodoEntrada: 'ROSTRO' });
    }
  });

  it('una distancia fuera del rango posible se descarta', () => {
    // El servidor solo acepta coincidencias por debajo de 0.5, así que una
    // distancia mayor no pudo salir de un match real. Guardarla contaminaría la
    // estadística que este campo existe para alimentar.
    expect(camposDeAutenticacion({ metodo: 'ROSTRO', distancia: 0.9 }, 'entrada'))
      .toEqual({ metodoEntrada: 'ROSTRO' });
    // El límite exacto sí es un match válido.
    expect(camposDeAutenticacion({ metodo: 'ROSTRO', distancia: 0.5 }, 'entrada'))
      .toEqual({ metodoEntrada: 'ROSTRO', distanciaEntrada: 0.5 });
  });

  it('un cero es una distancia válida y hay que guardarla, no descartarla', () => {
    // Es el caso más interesante de todos: una distancia exactamente 0 significa
    // que el descriptor entrante es idéntico a uno enrolado, cosa que no ocurre
    // en una captura viva. Es la huella de un descriptor copiado y reenviado.
    // Un `if (distancia)` la trataría como ausente y perderíamos justo la
    // evidencia que buscamos.
    expect(camposDeAutenticacion({ metodo: 'ROSTRO', distancia: 0 }, 'entrada'))
      .toEqual({ metodoEntrada: 'ROSTRO', distanciaEntrada: 0 });
  });
});
