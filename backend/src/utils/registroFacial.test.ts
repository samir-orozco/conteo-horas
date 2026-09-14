import { describe, it, expect } from 'vitest';
import {
  crearTokenDeEnlace, hashDeToken, estadoDelEnlace, cedulaCoincide, textoAutorizacionEnlace,
  respuestaDelEstado, mensajeCedulaEquivocada,
  DURACION_ENLACE_MS, MAX_INTENTOS_CEDULA, TEXTO_AUTORIZACION_ADMINISTRADOR, TEXTO_MAYOR_DE_EDAD,
} from './registroFacial';
import { cuantasMuestras } from './rostro';

// EL REGISTRO FACIAL QUE HACE LA PROPIA PERSONA, DESDE UN ENLACE (14 de septiembre de 2026).
//
// Decisiones del dueño: el enlace vence en una hora y sirve una sola vez; crear uno nuevo anula el
// anterior; antes de registrar se pide la cédula; autorizar es voluntario, y queda constancia de quién
// autorizó o no, cuándo y con qué texto. Las tomas NO se guardan: del rostro sigue quedando solo el
// cálculo, como hasta hoy.

describe('el token del enlace', () => {
  it('es largo, aleatorio y cabe en una dirección sin escaparlo', () => {
    const a = crearTokenDeEnlace();
    const b = crearTokenDeEnlace();
    expect(a.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a.token).not.toBe(b.token);
  });

  it('en la base queda su huella, no el token', () => {
    const { token, hash } = crearTokenDeEnlace();
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain(token);
    expect(hashDeToken(token)).toBe(hash);
  });

  it('la huella es SHA-256', () => {
    // Vector de prueba de la norma FIPS 180-2.
    expect(hashDeToken('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
});

describe('estadoDelEnlace', () => {
  const AHORA = new Date(Date.UTC(2026, 8, 14, 20, 0, 0));
  const vigente = { venceEn: new Date(AHORA.getTime() + 60_000), usadoEn: null, anuladoEn: null, intentosCedula: 0 };

  it('dura una hora y admite cuatro cédulas equivocadas', () => {
    expect(DURACION_ENLACE_MS).toBe(60 * 60 * 1000);
    expect(MAX_INTENTOS_CEDULA).toBe(5);
  });

  it('sin enlace', () => {
    expect(estadoDelEnlace(null, AHORA)).toBe('NO_EXISTE');
  });

  it('vigente hasta el último milisegundo', () => {
    expect(estadoDelEnlace(vigente, AHORA)).toBe('VIGENTE');
    expect(estadoDelEnlace({ ...vigente, venceEn: new Date(AHORA.getTime() + 1) }, AHORA)).toBe('VIGENTE');
  });

  it('vencido desde el instante en que vence', () => {
    expect(estadoDelEnlace({ ...vigente, venceEn: AHORA }, AHORA)).toBe('VENCIDO');
  });

  it('usado aunque todavía no venza; y a quien ya lo usó se le dice eso, no que venció', () => {
    expect(estadoDelEnlace({ ...vigente, usadoEn: AHORA }, AHORA)).toBe('USADO');
    expect(estadoDelEnlace({ ...vigente, usadoEn: AHORA, venceEn: new Date(0) }, AHORA)).toBe('USADO');
  });

  it('anulado por uno más nuevo, aunque también haya vencido', () => {
    expect(estadoDelEnlace({ ...vigente, anuladoEn: AHORA }, AHORA)).toBe('ANULADO');
    expect(estadoDelEnlace({ ...vigente, anuladoEn: AHORA, venceEn: new Date(0) }, AHORA)).toBe('ANULADO');
  });

  // Las rutas no dejan los dos juntos (crear otro solo anula los que no se usaron), pero si pasara, lo
  // que le sirve saber a la persona es que ya lo usó.
  it('usado gana a anulado', () => {
    expect(estadoDelEnlace({ ...vigente, usadoEn: AHORA, anuladoEn: AHORA }, AHORA)).toBe('USADO');
  });

  it('bloqueado al quinto intento de cédula equivocada', () => {
    expect(estadoDelEnlace({ ...vigente, intentosCedula: 4 }, AHORA)).toBe('VIGENTE');
    expect(estadoDelEnlace({ ...vigente, intentosCedula: 5 }, AHORA)).toBe('BLOQUEADO');
  });
});

describe('cedulaCoincide', () => {
  it('la misma cédula', () => {
    expect(cedulaCoincide('1020304050', '1020304050')).toBe(true);
  });

  it('escrita con puntos, espacios o guiones, como la escribe la gente', () => {
    expect(cedulaCoincide(' 1.020.304.050 ', '1020304050')).toBe(true);
    expect(cedulaCoincide('1020-304050', '1020304050')).toBe(true);
  });

  it('las de extranjería traen letras, y no importa si van en mayúscula', () => {
    expect(cedulaCoincide('ab123456', 'AB123456')).toBe(true);
  });

  it('una cifra de menos no coincide', () => {
    expect(cedulaCoincide('102030405', '1020304050')).toBe(false);
  });

  it('lo vacío nunca coincide, ni siquiera con otra vacía', () => {
    expect(cedulaCoincide('', '')).toBe(false);
    expect(cedulaCoincide(' . ', '')).toBe(false);
    expect(cedulaCoincide(1020304050 as unknown, '1020304050')).toBe(false);
  });
});

describe('el texto de la autorización', () => {
  it('nombra a la empresa, dice que es voluntaria y cómo marcar sin el rostro', () => {
    expect(textoAutorizacionEnlace('Rosa de Castro SAS', true)).toBe(
      'Autorizo a Rosa de Castro SAS a tratar mi rostro como dato biométrico para identificarme cuando marco mi asistencia. '
      + 'Sé que es voluntario, que puedo marcar con mi cédula y que puedo retirar esta autorización cuando quiera.');
  });

  it('si la empresa no deja marcar con cédula, no promete esa salida', () => {
    expect(textoAutorizacionEnlace('Rosa de Castro SAS', false)).toBe(
      'Autorizo a Rosa de Castro SAS a tratar mi rostro como dato biométrico para identificarme cuando marco mi asistencia. '
      + 'Sé que es voluntario y que puedo retirar esta autorización cuando quiera.');
  });

  it('la del administrador es la que ya mostraba la ficha', () => {
    expect(TEXTO_AUTORIZACION_ADMINISTRADOR).toBe('El colaborador autoriza el tratamiento de su rostro como dato biométrico, conforme a la Ley 1581 de 2012 (Habeas Data).');
    expect(TEXTO_MAYOR_DE_EDAD).toBe('Soy mayor de edad.');
  });
});

describe('cuantasMuestras', () => {
  const d = (x: number) => Array.from({ length: 128 }, () => x);

  it('cuenta las tomas guardadas, también las de un registro viejo de un solo descriptor', () => {
    expect(cuantasMuestras(null)).toBe(0);
    expect(cuantasMuestras(d(0.1))).toBe(1);
    expect(cuantasMuestras([d(0.1), d(0.2), d(0.3)])).toBe(3);
    expect(cuantasMuestras('basura')).toBe(0);
  });
});

// Lo que ve quien abre un enlace que ya no sirve. Cada caso dice qué hacer, porque la persona no
// tiene a quién preguntarle en ese momento: está sola con su teléfono.
describe('respuestaDelEstado', () => {
  it('un enlace vigente no tiene nada que responder', () => {
    expect(respuestaDelEstado('VIGENTE')).toBeNull();
  });

  it('cada estado con su código, su mensaje y qué hacer', () => {
    expect(respuestaDelEstado('NO_EXISTE')).toEqual({ status: 404, codigo: 'ENLACE_NO_EXISTE',
      error: 'Este enlace no existe. Revisa que esté completo o pide uno nuevo a tu empresa.' });
    expect(respuestaDelEstado('VENCIDO')).toEqual({ status: 410, codigo: 'ENLACE_VENCIDO',
      error: 'Este enlace venció: duraba una hora. Pide uno nuevo a tu empresa.' });
    expect(respuestaDelEstado('USADO')).toEqual({ status: 410, codigo: 'ENLACE_USADO',
      error: 'Este enlace ya se usó. Si necesitas cambiar algo, pide uno nuevo a tu empresa.' });
    expect(respuestaDelEstado('ANULADO')).toEqual({ status: 410, codigo: 'ENLACE_ANULADO',
      error: 'Este enlace ya no sirve porque tu empresa creó uno más nuevo. Usa el último que te enviaron.' });
    expect(respuestaDelEstado('BLOQUEADO')).toEqual({ status: 410, codigo: 'ENLACE_BLOQUEADO',
      error: 'Este enlace se bloqueó porque la cédula se escribió mal varias veces. Pide uno nuevo a tu empresa.' });
  });
});

describe('mensajeCedulaEquivocada', () => {
  it('dice cuántos intentos quedan, contando el que se acaba de gastar', () => {
    expect(mensajeCedulaEquivocada(1)).toBe('La cédula no coincide. Te quedan 4 intentos.');
    expect(mensajeCedulaEquivocada(4)).toBe('La cédula no coincide. Te queda 1 intento.');
  });
});
