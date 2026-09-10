// Decide si una empresa se puede borrar. Es la única parte de la operación que
// no habla con la base de datos, y por eso la única que se puede probar de
// verdad: la costura contra MySQL se verifica a mano (CLAUDE.md 8.6).
//
// Va aparte de la ruta a propósito. La ruta borra en veinte tablas en orden y
// esa plomería no llega al 80% de cobertura ni tiene por qué; esta decisión sí,
// porque es la que puede dejar sin comisión a un afiliado o mover un ingreso ya
// contabilizado.

export type ResumenEmpresa = {
  nit: string;
  // Solo los que están en estado APROBADO: son los que suma /admin/ingresos.
  pagosAprobados: number;
  // Comisiones causadas a un afiliado por los pagos de esta empresa.
  comisiones: number;
};

export type MotivoBloqueo = 'PAGOS' | 'COMISIONES' | 'CONFIRMACION';

export type Veredicto =
  | { permitido: true }
  | { permitido: false; motivo: MotivoBloqueo; mensaje: string };

export function decidirEliminacion(empresa: ResumenEmpresa, confirmacion: string): Veredicto {
  // El dinero se revisa antes que la confirmación: si el borrado no procede,
  // el motivo tiene que ser el de fondo y no el de forma. Al revés, el super
  // admin escribiría el NIT entero para que recién ahí le dijeran que no.
  if (empresa.pagosAprobados > 0) {
    return {
      permitido: false,
      motivo: 'PAGOS',
      mensaje:
        `Esta empresa tiene ${empresa.pagosAprobados} pago(s) aprobado(s). ` +
        'Borrarla cambiaría el reporte de ingresos de meses ya cerrados. ' +
        'Para dejarla sin acceso, desactívala.',
    };
  }

  if (empresa.comisiones > 0) {
    return {
      permitido: false,
      motivo: 'COMISIONES',
      mensaje:
        `Esta empresa generó ${empresa.comisiones} comisión(es) a un afiliado. ` +
        'Borrarla se las quitaría de la billetera. Para dejarla sin acceso, desactívala.',
    };
  }

  // Se compara el NIT tal como está guardado, sin interpretar guiones ni
  // ceros: el punto de escribirlo a mano es que no se pueda hacer de memoria.
  // Lo único que se perdona son los espacios de copiar y pegar.
  if (confirmacion.trim() !== empresa.nit.trim()) {
    return {
      permitido: false,
      motivo: 'CONFIRMACION',
      mensaje: 'Escribe el NIT de la empresa, exactamente como aparece, para confirmar.',
    };
  }

  return { permitido: true };
}

// Lo que impide borrar sin importar lo que se escriba, para la vista previa del
// modal. Se implementa pasándole la confirmación correcta a `decidirEliminacion`
// en vez de repetir las reglas: así el texto que muestra el modal es byte por
// byte el que devolvería el borrado, y no pueden desincronizarse.
export function bloqueoDeEliminacion(
  empresa: ResumenEmpresa,
): { motivo: MotivoBloqueo; mensaje: string } | null {
  const v = decidirEliminacion(empresa, empresa.nit);
  return v.permitido ? null : { motivo: v.motivo, mensaje: v.mensaje };
}
