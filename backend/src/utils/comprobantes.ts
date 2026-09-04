// El comprobante de un pago manual de empresa y el del retiro de un afiliado.
//
// Son las dos únicas columnas de archivo del producto que no se validaban: lo
// que llegara se guardaba tal cual. Quien las escribe es el super admin, así
// que no era una puerta por la que entrara un cliente, pero el archivo SALE
// hacia terceros (el afiliado ve el soporte de su retiro, el admin de la
// empresa ve el de su pago) y era la única regla distinta de las otras seis.
//
// Va aparte de `documentos.ts` porque la regla no es la misma: aquí Word no
// entra. Un soporte de pago es algo que emite el banco, no algo que se redacta,
// y aceptar .docx solo agregaría otra forma de subir un zip cualquiera.

import { documentoValido, tipoDeDocumento, MIME_DOCX } from './documentos';

export const MOTIVO_COMPROBANTE =
  'El comprobante tiene que ser un PDF o una foto en JPG o PNG.';

export type ComprobanteGuardado =
  | { ok: true; comprobante: string | null }
  | { ok: false; motivo: string };

// Qué comprobante queda en la fila después de esta petición.
//
// Tres caminos, y confundir dos de ellos borra el soporte de un pago que ya se
// hizo:
//
//   llega uno válido        se guarda
//   no llega ninguno        se conserva el que estuviera (sin volver a validarlo)
//   llega uno que no vale   se RECHAZA, y el anterior no se toca
//
// Lo de "sin volver a validarlo" es deliberado. Estas columnas nunca se
// validaron, así que en producción puede haber cualquier cosa guardada. Si el
// valor viejo tuviera que pasar la regla nueva, un admin no podría cerrar un
// retiro por culpa de un archivo que subió otra persona hace meses.
//
// Y una cadena vacía cuenta como "no llega ninguno", no como "bórralo". La ruta
// hacía `entrante ?? actual`, y '' ?? actual devuelve '': bastaba con que un
// formulario mandara el campo vacío para perder el comprobante.
export function comprobanteAGuardar(entrante: unknown, actual: string | null): ComprobanteGuardado {
  if (entrante === undefined || entrante === null) return { ok: true, comprobante: actual };
  if (typeof entrante === 'string' && entrante.trim() === '') {
    return { ok: true, comprobante: actual };
  }
  if (!documentoValido(entrante)) return { ok: false, motivo: MOTIVO_COMPROBANTE };
  if (tipoDeDocumento(entrante) === MIME_DOCX) return { ok: false, motivo: MOTIVO_COMPROBANTE };
  return { ok: true, comprobante: entrante };
}
