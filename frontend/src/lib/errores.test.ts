import { describe, it, expect } from 'vitest';
import { mensajeDeError } from './errores';
import { MENSAJE_BLOQUEO } from './bloqueoDelHosting';

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

// Un servidor apagado NO es una contraseña equivocada (23 de septiembre de 2026).
//
// El formulario de login decía "Email o contraseña incorrectos" ante cualquier fallo, incluido que
// no hubiera nadie al otro lado. Con el backend local caído, eso manda a buscar el problema en la
// contraseña —que estaba bien— en vez de en el servidor. Es la misma forma de fallo de la que
// avisa CLAUDE.md §12.2: un error disfrazado de otro cuesta media hora de hipótesis falsas.
describe('mensajeDeError cuando el servidor no contestó', () => {
  const errorDeRed = () => Object.assign(new Error('Network Error'), { isAxiosError: true, code: 'ERR_NETWORK', config: {} });

  it('lo dice en castellano, no "Network Error"', () => {
    const m = mensajeDeError(errorDeRed(), 'Email o contraseña incorrectos');
    expect(m).toMatch(/conexión|servidor/i);
    expect(m).not.toBe('Network Error');
    expect(m).not.toBe('Email o contraseña incorrectos');
  });

  it('una petición cancelada tampoco se confunde con un rechazo del servidor', () => {
    const cancelada = Object.assign(new Error('canceled'), { isAxiosError: true, code: 'ERR_CANCELED', config: {} });
    expect(mensajeDeError(cancelada, 'algo')).toMatch(/conexión|servidor/i);
  });

  it('si el servidor SÍ contestó, manda lo que dijo, como siempre', () => {
    const rechazo = Object.assign(new Error('Request failed with status code 401'), {
      isAxiosError: true, config: {}, response: { status: 401, data: { error: 'Credenciales inválidas' } },
    });
    expect(mensajeDeError(rechazo, 'respaldo')).toBe('Credenciales inválidas');
  });

  it('un error del propio navegador sigue saliendo con su mensaje', () => {
    expect(mensajeDeError(new Error('No se pudo leer el archivo'), 'respaldo')).toBe('No se pudo leer el archivo');
  });
});

// UN 403 QUE NO ES DE LA APP (6 de octubre de 2026): ver `bloqueoDelHosting.ts`. Antes salía el texto
// genérico de axios, «Request failed with status code 403», que no le dice nada a nadie.
describe('un 403 que no es de la app', () => {
  const ajeno = { isAxiosError: true, config: {}, message: 'Request failed with status code 403',
    response: { status: 403, data: '<html>One moment, please...</html>' } };

  it('dice que el servicio de seguridad detuvo la solicitud, no el texto de axios', () => {
    expect(mensajeDeError(ajeno, 'Email o contraseña incorrectos')).toBe(MENSAJE_BLOQUEO);
  });

  it('también sin cuerpo', () => {
    expect(mensajeDeError({ ...ajeno, response: { status: 403, data: '' } }, 'x')).toBe(MENSAJE_BLOQUEO);
  });

  // Lo que NO puede pasar: tapar la razón de un 403 de la app con un mensaje de seguridad.
  it('un 403 de la app sigue diciendo lo que la app dijo', () => {
    const suyo = { ...ajeno, response: { status: 403, data: { error: 'Empresa inactiva. Contacta a HoraPro.' } } };
    expect(mensajeDeError(suyo, 'x')).toBe('Empresa inactiva. Contacta a HoraPro.');
  });

  it('otros códigos con HTML conservan su comportamiento de siempre', () => {
    const quinientos = { isAxiosError: true, config: {}, message: 'Request failed with status code 502',
      response: { status: 502, data: '<html></html>' } };
    expect(mensajeDeError(quinientos, 'x')).toBe('Request failed with status code 502');
  });
});
