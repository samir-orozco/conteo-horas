import { describe, it, expect } from 'vitest';
import { decidirEliminacion, bloqueoDeEliminacion, ResumenEmpresa } from './eliminarEmpresa';

// Borrar una empresa es la única acción del super admin que no se puede
// deshacer: se lleva por delante colaboradores, marcaciones, contratos y la
// historia de vinculación de gente real. Esta función es la que decide si el
// borrado procede, y es lo único de la operación que se puede probar sin base
// de datos. La costura contra MySQL se verifica aparte (CLAUDE.md 8.6).
//
// Bloquea por dos razones distintas, y ninguna es de forma:
//
//   PAGOS       `/admin/ingresos` suma los pagos APROBADOS del año. Borrar una
//               empresa que pagó mueve hacia atrás el ingreso de un mes ya
//               cerrado, sin dejar rastro de por qué cambió.
//   COMISIONES  esa plata es de un tercero. La billetera del afiliado se
//               calcula desde `comisiones`: borrar la empresa le desaparece
//               una comisión ya causada.
//
// En los dos casos la salida no es borrar: es desactivar, que ya existe.

const limpia = (extra: Partial<ResumenEmpresa> = {}): ResumenEmpresa => ({
  nit: '901970430',
  pagosAprobados: 0,
  comisiones: 0,
  ...extra,
});

describe('cuándo se puede borrar una empresa', () => {
  it('una empresa de prueba que nunca pagó se borra, escribiendo su NIT', () => {
    expect(decidirEliminacion(limpia(), '901970430')).toEqual({ permitido: true });
  });

  it('los pagos APROBADOS la bloquean, aunque el NIT esté bien escrito', () => {
    const v = decidirEliminacion(limpia({ pagosAprobados: 1 }), '901970430');
    expect(v.permitido).toBe(false);
    expect(v).toMatchObject({ motivo: 'PAGOS' });
  });

  it('una comisión causada la bloquea: esa plata es del afiliado', () => {
    const v = decidirEliminacion(limpia({ comisiones: 1 }), '901970430');
    expect(v.permitido).toBe(false);
    expect(v).toMatchObject({ motivo: 'COMISIONES' });
  });

  it('el dinero se revisa ANTES que la confirmación', () => {
    // Si se revisara al revés, el super admin escribiría el NIT completo para
    // que recién entonces le dijeran que no se puede. El motivo tiene que ser
    // el de fondo, no el de forma.
    const v = decidirEliminacion(limpia({ pagosAprobados: 2 }), '');
    expect(v).toMatchObject({ permitido: false, motivo: 'PAGOS' });
  });

  it('con pagos Y comisiones manda el motivo de los pagos, siempre el mismo', () => {
    // Determinista a propósito: el mensaje que ve el super admin no puede
    // depender del orden en que se evaluaron dos condiciones verdaderas.
    const v = decidirEliminacion(limpia({ pagosAprobados: 3, comisiones: 1 }), '901970430');
    expect(v).toMatchObject({ permitido: false, motivo: 'PAGOS' });
  });

  it('los pagos RECHAZADOS o PENDIENTES no cuentan, porque no son ingreso', () => {
    // El campo se llama pagosAprobados justamente por esto: la ruta filtra por
    // estado APROBADO, igual que /admin/ingresos. Un intento fallido de Wompi
    // no puede dejar una empresa de prueba imposible de borrar para siempre.
    expect(decidirEliminacion(limpia({ pagosAprobados: 0 }), '901970430')).toEqual({ permitido: true });
  });
});

describe('la confirmación escrita a mano', () => {
  it('sin escribir nada, no se borra', () => {
    const v = decidirEliminacion(limpia(), '');
    expect(v).toMatchObject({ permitido: false, motivo: 'CONFIRMACION' });
  });

  it('el NIT de otra empresa no sirve', () => {
    // El caso real que esto ataja: en la lista hay tres empresas llamadas
    // "test" y dos llamadas "Test". Por eso se confirma con el NIT, que es
    // único en la tabla, y no con el nombre.
    const v = decidirEliminacion(limpia({ nit: '101010101' }), '1212121212');
    expect(v).toMatchObject({ permitido: false, motivo: 'CONFIRMACION' });
  });

  it('los espacios de sobra al copiar y pegar no estorban', () => {
    expect(decidirEliminacion(limpia(), '  901970430  ')).toEqual({ permitido: true });
    expect(decidirEliminacion(limpia({ nit: ' 901970430 ' }), '901970430')).toEqual({ permitido: true });
  });

  it('un NIT parecido pero incompleto no pasa', () => {
    // '90197043' es '901970430' sin el último dígito. Un `startsWith` o un
    // `includes` mal puesto lo dejaría pasar.
    expect(decidirEliminacion(limpia(), '90197043')).toMatchObject({ motivo: 'CONFIRMACION' });
    expect(decidirEliminacion(limpia(), '9019704300')).toMatchObject({ motivo: 'CONFIRMACION' });
  });

  it('el guión de verificación no es opcional: se escribe el NIT tal como está', () => {
    // Los NIT de las empresas reales vienen como '900123456-7'. Si se
    // ignoraran los guiones, '9001234567' borraría. Se compara lo que está
    // guardado, sin interpretar.
    const conGuion = limpia({ nit: '900123456-7' });
    expect(decidirEliminacion(conGuion, '9001234567')).toMatchObject({ motivo: 'CONFIRMACION' });
    expect(decidirEliminacion(conGuion, '900123456-7')).toEqual({ permitido: true });
  });
});

describe('el mensaje que ve el super admin', () => {
  it('el de los pagos dice cuántos son y ofrece desactivar', () => {
    const v = decidirEliminacion(limpia({ pagosAprobados: 4 }), '901970430');
    expect(v.permitido).toBe(false);
    if (v.permitido) return;
    expect(v.mensaje).toContain('4');
    expect(v.mensaje.toLowerCase()).toContain('desactívala');
  });

  it('el de las comisiones nombra al afiliado como el afectado', () => {
    const v = decidirEliminacion(limpia({ comisiones: 2 }), '901970430');
    expect(v.permitido).toBe(false);
    if (v.permitido) return;
    expect(v.mensaje).toContain('2');
    expect(v.mensaje.toLowerCase()).toContain('afiliado');
  });
});

// El modal de confirmación necesita saber si la empresa está bloqueada ANTES
// de que el super admin escriba nada: no tiene sentido pedirle que teclee un
// NIT para después decirle que no se podía. Eso es lo que responde esta otra
// función, y es la que consume la vista previa de la ruta.
describe('lo que bloquea sin importar lo que se escriba', () => {
  it('una empresa limpia no tiene bloqueo', () => {
    expect(bloqueoDeEliminacion(limpia())).toBeNull();
  });

  it('la falta de confirmación NO es un bloqueo: es lo que falta por hacer', () => {
    // Si esto devolviera CONFIRMACION, el modal abriría diciendo que la
    // empresa no se puede borrar, cuando lo único que pasa es que el campo
    // está vacío porque acaba de abrirse.
    expect(bloqueoDeEliminacion(limpia())).toBeNull();
  });

  it('los pagos y las comisiones sí bloquean, con el mismo mensaje que la ruta', () => {
    expect(bloqueoDeEliminacion(limpia({ pagosAprobados: 1 }))).toMatchObject({ motivo: 'PAGOS' });
    expect(bloqueoDeEliminacion(limpia({ comisiones: 1 }))).toMatchObject({ motivo: 'COMISIONES' });
  });

  it('el mensaje es exactamente el que devolvería el borrado, no una copia', () => {
    // Que sean el mismo texto no es cosmético: si se escribieran por separado,
    // el modal podría decir una razón y la ruta rechazar por otra.
    const conPagos = limpia({ pagosAprobados: 5 });
    const veredicto = decidirEliminacion(conPagos, conPagos.nit);
    expect(veredicto.permitido).toBe(false);
    if (veredicto.permitido) return;
    expect(bloqueoDeEliminacion(conPagos)?.mensaje).toBe(veredicto.mensaje);
  });
});
