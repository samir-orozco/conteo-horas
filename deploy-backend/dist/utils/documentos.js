"use strict";
// Validación de los documentos que la empresa adjunta: contratos, otrosíes,
// soportes de retiro y evidencia de novedades.
//
// Vivía duplicada dentro de las rutas. Al necesitarla en un tercer sitio se
// sacó aquí: es una regla de seguridad (qué formatos se aceptan y hasta qué
// tamaño) y tenerla en varios archivos significa que subir el tope o cerrar un
// formato hay que acordarse de hacerlo en todos.
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_DOC = void 0;
exports.documentoValido = documentoValido;
exports.tipoDeDocumento = tipoDeDocumento;
exports.nombreDeDocumento = nombreDeDocumento;
// Tope de tamaño del data URI ya codificado en base64. Base64 infla un 33%, así
// que esto son unos 3 MB de archivo real.
exports.MAX_DOC = 4200000;
const PATRON = /^data:(image\/(jpeg|png|webp)|application\/pdf);base64,/;
function documentoValido(v) {
    return typeof v === 'string' && PATRON.test(v) && v.length < exports.MAX_DOC;
}
// El tipo MIME que viene dentro del propio data URI. Se lee de ahí y no de lo
// que diga el cliente, que puede mandar cualquier cosa en el nombre.
function tipoDeDocumento(dataUri) {
    return dataUri.slice(5, dataUri.indexOf(';'));
}
// El nombre de archivo, recortado. Es texto libre del usuario y termina en la
// base y en pantalla.
function nombreDeDocumento(v) {
    return typeof v === 'string' && v.trim() ? v.trim().slice(0, 120) : null;
}
