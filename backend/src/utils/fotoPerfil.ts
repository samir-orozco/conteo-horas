// Validación de la foto de perfil del colaborador.
//
// Va aparte de `documentos.ts` porque las reglas son distintas y más estrictas:
// un contrato puede ser un PDF de 3 MB, un avatar no. Mezclarlas significaría
// que subir el tope de los contratos afloja también el de las fotos.

// Tope del data URI ya en base64. Base64 infla un 33%, así que esto son unos
// 500 KB de imagen real: de sobra para un círculo de 96 píxeles, y muy por
// encima de los ~20 KB que produce el escaneo facial.
export const MAX_FOTO = 700_000;

// Solo los tres formatos que produce una cámara o un teléfono.
//
// SVG queda fuera a propósito, aunque sea una imagen: es un documento que puede
// traer scripts, y servido desde el propio origen del sitio esos scripts corren
// con sus permisos.
const PATRON = /^data:image\/(jpeg|png|webp);base64,.+/;

export function fotoPerfilValida(v: unknown): v is string {
  return typeof v === 'string' && PATRON.test(v) && v.length < MAX_FOTO;
}

// Qué foto debe quedar después de un enrolamiento facial, o null si ninguna.
//
// La regla que protege: el escaneo aporta una foto solo cuando NO hay una. Si
// alguien ya eligió la suya a mano, volver a enrolar el rostro (porque cambió
// de gafas, por ejemplo) no puede borrársela. Enrolar trata del rostro; la foto
// de perfil se cambia desde su propio control.
export function fotoParaEnrolar(fotoActual: string | null, fotoDelEscaneo: unknown): string | null {
  if (fotoActual) return null;
  return fotoPerfilValida(fotoDelEscaneo) ? fotoDelEscaneo : null;
}
