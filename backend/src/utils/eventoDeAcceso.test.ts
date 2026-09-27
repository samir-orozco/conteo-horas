import { describe, it, expect } from 'vitest';
import { eventoDeAcceso, motivoDeRespuesta } from './eventoDeAcceso';

// Los intentos de entrar que no debieron pasar. La pestaña de Accesos.

const base = { ip: '45.153.160.8', ruta: '/api/auth/login', navegador: 'Mozilla/5.0' };

describe('eventoDeAcceso', () => {
  it('un intento contra una cuenta REAL se cuenta por cuenta: se quiere ver a quién atacan', () => {
    const contraAna = eventoDeAcceso({ ...base, motivo: 'CREDENCIALES', email: 'ana@empresa.co', correoConocido: true });
    const contraLuis = eventoDeAcceso({ ...base, motivo: 'CREDENCIALES', email: 'luis@empresa.co', correoConocido: true });
    expect(contraAna.huella).not.toBe(contraLuis.huella);
    expect(contraAna.mensaje).toContain('ana@empresa.co');
  });

  it('un barrido de correos inventados se colapsa en UNA fila por IP', () => {
    const uno = eventoDeAcceso({ ...base, motivo: 'CREDENCIALES', email: 'aaa@inventado.com', correoConocido: false });
    const otro = eventoDeAcceso({ ...base, motivo: 'CREDENCIALES', email: 'bbb@inventado.com', correoConocido: false });
    expect(uno.huella).toBe(otro.huella);
    // Sin esto, un bot con diez mil correos al azar escribe diez mil filas en una noche.
    expect(uno.mensaje).not.toContain('aaa@inventado.com');
  });

  it('el correo probado sí queda a la vista en el detalle, aunque no exista', () => {
    const e = eventoDeAcceso({ ...base, motivo: 'CREDENCIALES', email: 'aaa@inventado.com', correoConocido: false });
    expect(e.detalle).toContain('aaa@inventado.com');
  });

  it('cada IP va por su lado', () => {
    const casa = eventoDeAcceso({ ...base, motivo: 'CREDENCIALES', email: 'ana@empresa.co', correoConocido: true });
    const otra = eventoDeAcceso({ ...base, ip: '190.24.1.1', motivo: 'CREDENCIALES', email: 'ana@empresa.co', correoConocido: true });
    expect(casa.huella).not.toBe(otra.huella);
  });

  it('cada motivo va por su lado y se lee en castellano', () => {
    const corte = eventoDeAcceso({ ...base, motivo: 'DEMASIADOS_INTENTOS' });
    const sesion = eventoDeAcceso({ ...base, motivo: 'TOKEN_INVALIDO' });
    const permiso = eventoDeAcceso({ ...base, motivo: 'SIN_PERMISO' });
    expect(corte.huella).not.toBe(sesion.huella);
    expect(corte.mensaje).toBe('Demasiados intentos seguidos');
    expect(sesion.mensaje).toBe('Sesión inválida o vencida');
    expect(permiso.mensaje).toBe('Intentó entrar donde no tiene permiso');
  });

  it('un motivo que nadie tradujo sale nombrado, no vacío', () => {
    const raro = eventoDeAcceso({ ...base, motivo: 'ALGO_NUEVO' as never });
    expect(raro.mensaje).toContain('ALGO_NUEVO');
  });

  it('sin IP no revienta y deja dicho que no se pudo determinar', () => {
    const e = eventoDeAcceso({ motivo: 'CREDENCIALES', ruta: '/api/auth/login' });
    expect(e.huella).toHaveLength(32);
    expect(e.ip).toBe('desconocida');
  });

  // Esta prueba nació mal: comprobaba que la salida no contuviera la palabra "contraseña", y el
  // mensaje legítimo es "Contraseña incorrecta", así que solo se cumplía por accidente. Lo que hay
  // que proteger es que el VALOR no sobreviva aunque quien llame lo pase de más: la salida se
  // construye campo por campo, nunca copiando la entrada.
  it('una contraseña que llegue de más no sale por ningún campo', () => {
    const e = eventoDeAcceso({
      ...base, motivo: 'CREDENCIALES', email: 'ana@empresa.co', correoConocido: true,
      password: 'LaClaveDeAna123',
    } as never);
    expect(JSON.stringify(e)).not.toContain('LaClaveDeAna123');
  });
});

// Qué respuesta del servidor cuenta como un intento de entrar donde no se debía. Lo usa el
// enganche global: así no hay que acordarse de registrar nada en cada ruta que rechaza.
describe('motivoDeRespuesta', () => {
  it('un corte por exceso de intentos es lo que se pidió ver: el login masivo', () => {
    expect(motivoDeRespuesta(429, '/api/registros')).toBe('DEMASIADOS_INTENTOS');
  });

  it('un rechazo por rol y uno por sesión son cosas distintas', () => {
    expect(motivoDeRespuesta(403, '/api/admin/empresas')).toBe('SIN_PERMISO');
    expect(motivoDeRespuesta(401, '/api/reportes/nomina')).toBe('TOKEN_INVALIDO');
  });

  it('lo que salió bien, y lo que falló por otra razón, no es un intento de acceso', () => {
    expect(motivoDeRespuesta(200, '/api/registros')).toBeNull();
    expect(motivoDeRespuesta(400, '/api/registros')).toBeNull();
    expect(motivoDeRespuesta(404, '/api/registros')).toBeNull();
    expect(motivoDeRespuesta(500, '/api/registros')).toBeNull();
  });

  // Esto se cazó verificando la costura contra la base, no con la suite: la primera versión
  // excluía las rutas de login ENTERAS para que su 401 no se registrara dos veces. Con eso, un
  // ataque de fuerza bruta cortado por el límite de intentos —que es exactamente lo que se pidió
  // ver— no dejaba ni una fila, porque un 429 no llega a la ruta que registra.
  //
  // La no-duplicación se resuelve ahora con lo que el llamador YA sabe: si esa petición se registró
  // por su cuenta. La ruta deja de importar.
  it('un login cortado por el límite de intentos SÍ se registra: es el ataque que se quiere ver', () => {
    expect(motivoDeRespuesta(429, '/api/auth/login', false)).toBe('DEMASIADOS_INTENTOS');
    expect(motivoDeRespuesta(429, '/api/worker/login', false)).toBe('DEMASIADOS_INTENTOS');
  });

  it('lo que la ruta ya registró no se registra otra vez', () => {
    expect(motivoDeRespuesta(401, '/api/auth/login', true)).toBeNull();
    expect(motivoDeRespuesta(403, '/api/admin/empresas', true)).toBeNull();
  });
});
