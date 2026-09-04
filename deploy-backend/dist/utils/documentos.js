"use strict";
// Validación de los documentos que la empresa adjunta: contratos, otrosíes,
// soportes de retiro y evidencia de novedades.
//
// Vivía duplicada dentro de las rutas. Al necesitarla en un tercer sitio se
// sacó aquí: es una regla de seguridad (qué formatos se aceptan y hasta qué
// tamaño) y tenerla en varios archivos significa que subir el tope o cerrar un
// formato hay que acordarse de hacerlo en todos.
Object.defineProperty(exports, "__esModule", { value: true });
exports.MOTIVO_RECHAZO = exports.MIME_DOCX = exports.MAX_DOC = void 0;
exports.firmaCoincide = firmaCoincide;
exports.documentoValido = documentoValido;
exports.tipoDeDocumento = tipoDeDocumento;
exports.nombreDeDocumento = nombreDeDocumento;
exports.nombreParaDescargar = nombreParaDescargar;
exports.cambioDeDocumento = cambioDeDocumento;
// Tope de tamaño del data URI ya codificado en base64. Base64 infla un 33%, así
// que esto son unos 3 MB de archivo real.
exports.MAX_DOC = 4200000;
// El único Word que entra. Se nombra porque las rutas y el frontend lo repiten
// y es una cadena de 71 caracteres que nadie escribe bien de memoria.
exports.MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
// Cada formato aceptado, con el prefijo en base64 de los bytes con los que
// empieza ese tipo de archivo.
//
// POR QUÉ MIRAR LOS BYTES Y NO SOLO LA ETIQUETA: el tipo del data URI lo
// escribe quien sube. Antes bastaba con poner "application/pdf" delante de
// cualquier cosa para que entrara.
//
// HASTA DÓNDE LLEGA, QUE ES POCO Y CONVIENE SABERLO: esto detecta el mal
// etiquetado y nada más. Todo .docx es un zip, así que un .xlsx o un .apk
// renombrados pasan; y un .docx auténtico con contenido malicioso es un zip
// perfectamente válido y también pasa. Lo que de verdad protege es lo otro:
// que .doc y .docm queden fuera, porque son los dos formatos de Word que
// pueden llevar macros.
//
// EL LARGO DE CADA PREFIJO NO ES ARBITRARIO. Base64 codifica de a 3 bytes en 4
// caracteres, así que de una firma de n bytes solo los primeros
// floor(n × 8 / 6) caracteres no dependen de lo que venga después. Alargar uno
// de estos valores creyendo que lo hace más estricto rechaza archivos buenos.
// Está comprobado sobre los 256 valores posibles del byte siguiente en
// documentos.test.ts, y ese es el sitio para volver a comprobarlo.
const FIRMAS = new Map([
    ['application/pdf', 'JVBERi'], // %PDF-                     5 bytes
    [exports.MIME_DOCX, 'UEsDB'], // 50 4B 03 04 (zip)         4 bytes
    ['image/jpeg', '/9j/'], // FF D8 FF                  3 bytes
    ['image/png', 'iVBORw0KGg'], // 89 50 4E 47 0D 0A 1A 0A   8 bytes
    ['image/webp', 'UklGR'], // RIFF                      4 bytes
]);
const SEPARADOR = ';base64,';
// Que un data URI declare uno de los tipos permitidos Y traiga de verdad los
// bytes de ese tipo.
//
// `permitidos` acota la lista: los documentos aceptan Word y PDF, las fotos de
// perfil no. Se comparte para que no vuelva a pasar lo de permisos.ts, que
// tenía su propia copia del regex y se quedó atrás.
function firmaCoincide(v, permitidos) {
    if (typeof v !== 'string' || !v.startsWith('data:'))
        return false;
    const corte = v.indexOf(SEPARADOR);
    if (corte <= 5)
        return false;
    const mime = v.slice(5, corte);
    if (permitidos && !permitidos.has(mime))
        return false;
    const firma = FIRMAS.get(mime);
    return firma !== undefined && v.startsWith(firma, corte + SEPARADOR.length);
}
function documentoValido(v) {
    if (typeof v !== 'string' || v.length >= exports.MAX_DOC)
        return false;
    return firmaCoincide(v);
}
// El tipo MIME que viene dentro del propio data URI. Se lee de ahí y no de lo
// que diga el cliente, que puede mandar cualquier cosa en el nombre.
function tipoDeDocumento(dataUri) {
    return dataUri.slice(5, dataUri.indexOf(';'));
}
// Los caracteres con los que un nombre deja de ser un nombre: separadores de
// ruta, comillas, punto y coma y caracteres de control.
//
// No es defensa contra un ataque, y decirlo importa: el archivo nunca se
// escribe en disco, así que aquí no hay ningún path traversal que evitar. Es
// que este texto termina en el atributo download de un enlace y en la pantalla,
// y ahí una barra o un salto de línea no significan nada bueno.
// Se incluyen los caracteres de control de dirección (U+200B a U+200F, U+202A a
// U+202E, U+2066 a U+2069): no se ven, y hacen que el texto que sigue se pinte
// al revés. Un nombre puede verse como "factura.pdf" en pantalla y ser otra
// cosa. Con la extensión ya forzada desde el MIME el daño es menor, pero un
// nombre que no se lee como es no tiene por qué llegar a la pantalla.
// eslint-disable-next-line no-control-regex
const PELIGROSOS = /[/\\:*?"<>|;\x00-\x1f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g;
// El nombre de archivo, limpio y recortado. Es texto libre del usuario y
// termina en la base y en pantalla.
function nombreDeDocumento(v) {
    if (typeof v !== 'string')
        return null;
    const limpio = v
        .replace(PELIGROSOS, '_')
        .replace(/\.{2,}/g, '.')
        .replace(/^[.\s]+/, '')
        .trim();
    return limpio ? limpio.slice(0, 120) : null;
}
// La extensión que le corresponde a cada tipo ya comprobado.
const EXTENSION = {
    'application/pdf': '.pdf',
    [exports.MIME_DOCX]: '.docx',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
};
// Del nombre solo se quita lo que de verdad parece una extensión. Quitar todo
// lo que va después del último punto convierte "Contrato v1.2" en "Contrato v1".
const EXTENSION_ESCRITA = /\.(pdf|docx?|docm|jpe?g|png|webp|gif|bmp|heic|heif|tiff?|avif|exe|zip)$/i;
// Con qué nombre se baja el archivo.
//
// La extensión sale del tipo que ya se comprobó contra los bytes, no de la que
// venía escrita en el nombre. Importa desde que entra Word: un .docx no se
// puede previsualizar, así que descargarlo es la única forma de abrirlo, y
// hasta ahora quien subía elegía con qué extensión lo recibía quien descarga.
function nombreParaDescargar(nombre, mime) {
    const base = (nombre ?? '').replace(EXTENSION_ESCRITA, '').trim();
    return (base || 'documento') + (EXTENSION[mime] ?? '');
}
exports.MOTIVO_RECHAZO = 'Ese archivo no se puede adjuntar. Solo aceptamos PDF, Word (.docx) y fotos en JPG o PNG. ' +
    'Si tienes un .doc antiguo, ábrelo en Word y usa Guardar como para dejarlo en .docx.';
function cambioDeDocumento(documento, nombre) {
    if (documento === null)
        return { accion: 'quitar' };
    if (documento === undefined)
        return { accion: 'dejar' };
    if (!documentoValido(documento))
        return { accion: 'rechazar', motivo: exports.MOTIVO_RECHAZO };
    const tipo = tipoDeDocumento(documento);
    return {
        accion: 'guardar',
        documento,
        tipo,
        // El nombre queda ya normalizado en la columna, con la extensión que le
        // corresponde a los bytes que se acaban de comprobar. Si esto solo se
        // hiciera al descargar, la base guardaría "contrato.exe" para siempre y
        // cualquier consumidor que no pase por el visor lo entregaría así.
        nombre: nombreParaDescargar(nombreDeDocumento(nombre), tipo),
    };
}
