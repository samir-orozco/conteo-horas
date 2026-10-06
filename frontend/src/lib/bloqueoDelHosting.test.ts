import { describe, it, expect } from 'vitest';
import {
  esBloqueoDelHosting, decidirRecarga, guardarRecarga, ultimaRecarga, recargaReciente, olvidarRecarga,
  MENSAJE_BLOQUEO, VENTANA_RECARGA_MS,
} from './bloqueoDelHosting';

// UN 403 QUE NO ES NUESTRO (6 de octubre de 2026).
//
// Al iniciar sesión, a veces salía «Request failed with status code 403» y solo recargando la página
// se podía volver a entrar. Se comprobó que ese 403 no lo produce la app: el único 403 del login es
// «Empresa inactiva», que lleva su mensaje; el registro de accesos no tiene ninguno del login; y desde
// la misma IP, una petición sin la cookie del navegador recibe una página de espera
// («One moment, please…») de otra capa, no de nuestra API.
//
// LO QUE DISTINGUE UN 403 NUESTRO DE UNO AJENO es el cuerpo: la API siempre contesta JSON con `error`,
// y quien está delante contesta HTML o nada. Es lo único que se puede leer desde el navegador sin
// adivinar, y por eso la regla es esa y no «cualquier 403».

const respuesta = (status: number, data: unknown) => ({ isAxiosError: true, config: {}, response: { status, data } });

describe('esBloqueoDelHosting', () => {
  it('un 403 con una página HTML es de otra capa', () => {
    expect(esBloqueoDelHosting(respuesta(403, '<!DOCTYPE html><html>One moment, please...</html>'))).toBe(true);
  });

  it('un 403 sin cuerpo también', () => {
    expect(esBloqueoDelHosting(respuesta(403, ''))).toBe(true);
    expect(esBloqueoDelHosting(respuesta(403, undefined))).toBe(true);
    expect(esBloqueoDelHosting(respuesta(403, null))).toBe(true);
  });

  // LA QUE IMPORTA: un 403 de la app dice por qué, y ese mensaje es el que hay que mostrar. Recargar la
  // página ante «Empresa inactiva» no arreglaría nada y taparía la razón.
  it('un 403 de la app, con su JSON, NO lo es', () => {
    expect(esBloqueoDelHosting(respuesta(403, { error: 'Empresa inactiva. Contacta a HoraPro.' }))).toBe(false);
    expect(esBloqueoDelHosting(respuesta(403, { error: 'Solo el administrador edita usuarios' }))).toBe(false);
  });

  // Un JSON sin `error` sigue siendo JSON: lo escribió alguien que habla como nuestra API. Ante la duda
  // no se recarga, porque recargar de más es lo que cuesta, y no recargar es lo que ya pasaba.
  it('un 403 con JSON sin «error» tampoco', () => {
    expect(esBloqueoDelHosting(respuesta(403, {}))).toBe(false);
    expect(esBloqueoDelHosting(respuesta(403, { codigo: 'X' }))).toBe(false);
  });

  it('otros códigos no son esto, aunque traigan HTML', () => {
    for (const s of [200, 401, 402, 404, 429, 500, 502, 503]) {
      expect(esBloqueoDelHosting(respuesta(s, '<html></html>'))).toBe(false);
    }
  });

  it('sin respuesta (el servidor no contestó) no es un bloqueo', () => {
    expect(esBloqueoDelHosting({ isAxiosError: true, config: {} })).toBe(false);
    expect(esBloqueoDelHosting(new Error('Network Error'))).toBe(false);
  });

  it('lo que no es un error no revienta', () => {
    for (const x of [null, undefined, 'texto', 403, {}, []]) expect(esBloqueoDelHosting(x)).toBe(false);
  });
});

describe('decidirRecarga', () => {
  const AHORA = 1_800_000_000_000;

  it('la primera vez recarga', () => {
    expect(decidirRecarga(AHORA, null)).toBe('RECARGAR');
  });

  // Si recargar no arregló nada, volver a recargar tampoco: se avisa y se para.
  it('si ya se recargó hace poco, solo avisa', () => {
    expect(decidirRecarga(AHORA, AHORA - 1_000)).toBe('SOLO_AVISAR');
    expect(decidirRecarga(AHORA, AHORA - (VENTANA_RECARGA_MS - 1))).toBe('SOLO_AVISAR');
  });

  it('pasada la ventana, vuelve a recargar', () => {
    expect(decidirRecarga(AHORA, AHORA - VENTANA_RECARGA_MS)).toBe('RECARGAR');
    expect(decidirRecarga(AHORA, AHORA - 10 * 60_000)).toBe('RECARGAR');
  });

  // Una marca del futuro no es de fiar (reloj movido): no puede dejar la puerta cerrada para siempre.
  it('una marca del futuro no cuenta', () => {
    expect(decidirRecarga(AHORA, AHORA + 5_000)).toBe('RECARGAR');
  });
});

// Un almacén de mentira con la misma forma que sessionStorage.
const almacen = (inicial: Record<string, string> = {}) => {
  const d = { ...inicial };
  return {
    d,
    getItem: (k: string) => (k in d ? d[k] : null),
    setItem: (k: string, v: string) => { d[k] = v; },
    removeItem: (k: string) => { delete d[k]; },
  };
};
// sessionStorage puede lanzar (modo privado, datos de sitio bloqueados): la pantalla tiene que seguir.
const roto = {
  getItem: () => { throw new Error('bloqueado'); },
  setItem: () => { throw new Error('bloqueado'); },
  removeItem: () => { throw new Error('bloqueado'); },
};

describe('lo que sobrevive a la recarga', () => {
  const AHORA = 1_800_000_000_000;

  it('guarda cuándo se recargó y con qué correo', () => {
    const a = almacen();
    guardarRecarga(a, AHORA, 'ana@empresa.co');
    expect(ultimaRecarga(a)).toBe(AHORA);
    expect(recargaReciente(a, AHORA + 3_000)).toEqual({ email: 'ana@empresa.co' });
  });

  // LA CONTRASEÑA NO SE GUARDA NUNCA, ni aquí ni en ninguna parte: ni en sessionStorage, que dura lo que
  // dura la pestaña. Por eso después de recargar hay que volver a escribirla.
  it('no hay ninguna contraseña en lo guardado', () => {
    const a = almacen();
    guardarRecarga(a, AHORA, 'ana@empresa.co');
    expect(JSON.stringify(a.d)).not.toMatch(/contrase|password|pass/i);
    expect(Object.keys(a.d)).toHaveLength(2);
  });

  it('una recarga vieja no precarga nada', () => {
    const a = almacen();
    guardarRecarga(a, AHORA, 'ana@empresa.co');
    expect(recargaReciente(a, AHORA + VENTANA_RECARGA_MS)).toBeNull();
    expect(recargaReciente(a, AHORA + 60 * 60_000)).toBeNull();
  });

  it('sin nada guardado no hay recarga ni correo', () => {
    expect(ultimaRecarga(almacen())).toBeNull();
    expect(recargaReciente(almacen(), AHORA)).toBeNull();
  });

  it('una marca que no es un número se ignora', () => {
    expect(ultimaRecarga(almacen({ 'hp:recarga-del-login': 'mañana' }))).toBeNull();
    expect(ultimaRecarga(almacen({ 'hp:recarga-del-login': '' }))).toBeNull();
  });

  it('con el almacén bloqueado nada lanza, y no recuerda nada', () => {
    expect(() => guardarRecarga(roto, AHORA, 'ana@empresa.co')).not.toThrow();
    expect(ultimaRecarga(roto)).toBeNull();
    expect(recargaReciente(roto, AHORA)).toBeNull();
  });
});

describe('olvidarRecarga', () => {
  const AHORA = 1_800_000_000_000;

  it('borra la marca y el correo', () => {
    const a = almacen();
    guardarRecarga(a, AHORA, 'ana@empresa.co');
    olvidarRecarga(a);
    expect(a.d).toEqual({});
    expect(ultimaRecarga(a)).toBeNull();
  });

  it('con el almacén bloqueado no lanza', () => {
    expect(() => olvidarRecarga(roto)).not.toThrow();
  });
});

describe('el mensaje', () => {
  it('dice qué pasó y qué hacer, sin hablar de códigos', () => {
    expect(MENSAJE_BLOQUEO).toMatch(/servicio de seguridad detuvo la solicitud/i);
    expect(MENSAJE_BLOQUEO).toMatch(/recarga la página/i);
    expect(MENSAJE_BLOQUEO).not.toMatch(/403|status code|request failed/i);
  });
});
