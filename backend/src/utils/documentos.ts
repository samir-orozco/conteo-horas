// Validación de los documentos que la empresa adjunta: contratos, otrosíes,
// soportes de retiro y evidencia de novedades.
//
// Vivía duplicada dentro de las rutas. Al necesitarla en un tercer sitio se
// sacó aquí: es una regla de seguridad (qué formatos se aceptan y hasta qué
// tamaño) y tenerla en varios archivos significa que subir el tope o cerrar un
// formato hay que acordarse de hacerlo en todos.

// Tope de tamaño del data URI ya codificado en base64. Base64 infla un 33%, así
// que esto son unos 3 MB de archivo real.
export const MAX_DOC = 4_200_000;

const PATRON = /^data:(image\/(jpeg|png|webp)|application\/pdf);base64,/;

export function documentoValido(v: unknown): v is string {
  return typeof v === 'string' && PATRON.test(v) && v.length < MAX_DOC;
}

// El tipo MIME que viene dentro del propio data URI. Se lee de ahí y no de lo
// que diga el cliente, que puede mandar cualquier cosa en el nombre.
export function tipoDeDocumento(dataUri: string): string {
  return dataUri.slice(5, dataUri.indexOf(';'));
}

// El nombre de archivo, recortado. Es texto libre del usuario y termina en la
// base y en pantalla.
export function nombreDeDocumento(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim().slice(0, 120) : null;
}
