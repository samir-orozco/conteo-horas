import { describe, it, expect } from 'vitest';
import { decidirEliminacion } from './eliminarEmpresa';

// Borrar una empresa es la única acción del super admin que no se puede
// deshacer. DECISIÓN DEL DUEÑO (10 de septiembre de 2026): se puede borrar
// CUALQUIER empresa, tenga pagos aprobados, comisiones de afiliado o años de
// marcaciones. No hay bloqueos: el modal advierte qué se pierde, incluida la
// plata, y la única condición es escribir el NIT a mano.
//
// Por eso la decisión ya no recibe pagos ni comisiones: no dependen de ellos.
// Lo que queda es la confirmación, y es lo único de la operación que se prueba
// sin base de datos. La costura contra MySQL se verifica aparte (CLAUDE.md 8.6).

const NIT = '901970430';

describe('la confirmación escrita a mano', () => {
  it('el NIT bien escrito permite borrar', () => {
    expect(decidirEliminacion(NIT, NIT)).toEqual({ permitido: true });
  });

  it('sin escribir nada, no se borra', () => {
    expect(decidirEliminacion(NIT, '')).toMatchObject({ permitido: false });
  });

  it('el NIT de otra empresa no sirve', () => {
    // El caso real que esto ataja: en la lista hay tres empresas llamadas
    // "test" y dos llamadas "Test". Por eso se confirma con el NIT y no con el
    // nombre.
    expect(decidirEliminacion('101010101', '1212121212')).toMatchObject({ permitido: false });
  });

  it('los espacios de sobra al copiar y pegar no estorban, de ningún lado', () => {
    expect(decidirEliminacion(NIT, `  ${NIT}  `)).toEqual({ permitido: true });
    expect(decidirEliminacion(` ${NIT} `, NIT)).toEqual({ permitido: true });
  });

  it('un NIT parecido pero incompleto no pasa', () => {
    // Un `startsWith` o un `includes` mal puesto dejaría pasar cualquiera de los dos.
    expect(decidirEliminacion(NIT, '90197043')).toMatchObject({ permitido: false });
    expect(decidirEliminacion(NIT, '9019704300')).toMatchObject({ permitido: false });
  });

  it('el guion de verificación no es opcional: se escribe el NIT tal como está', () => {
    expect(decidirEliminacion('900123456-7', '9001234567')).toMatchObject({ permitido: false });
    expect(decidirEliminacion('900123456-7', '900123456-7')).toEqual({ permitido: true });
  });

  it('el mensaje dice qué hay que escribir', () => {
    const v = decidirEliminacion(NIT, 'otra cosa');
    expect(v.permitido).toBe(false);
    if (v.permitido) return;
    expect(v.mensaje).toMatch(/NIT/);
  });
});

describe('lo que llega del cuerpo de la petición no es de fiar', () => {
  it('si la confirmación no es texto, no se borra y no revienta', () => {
    // Antes, un número llegaba a `confirmacion.trim()` y la ruta respondía 500.
    // El cuerpo lo arma quien llama, no la pantalla: puede traer cualquier cosa.
    for (const raro of [901970430, null, undefined, {}, [NIT], true]) {
      expect(() => decidirEliminacion(NIT, raro)).not.toThrow();
      expect(decidirEliminacion(NIT, raro)).toMatchObject({ permitido: false });
    }
  });
});

describe('una empresa con el NIT en blanco', () => {
  it('no se confirma sin escribir nada: un NIT en blanco no coincide con nada', () => {
    // El registro deja pasar un NIT de puros espacios y el super admin puede
    // crear empresas sin NIT. Sin esto, con el campo vacío la comparación daba
    // igual y el borrado se confirmaba sin escribir nada.
    expect(decidirEliminacion('', '')).toMatchObject({ permitido: false });
    expect(decidirEliminacion('   ', '')).toMatchObject({ permitido: false });
    expect(decidirEliminacion('   ', '   ')).toMatchObject({ permitido: false });
  });
});
