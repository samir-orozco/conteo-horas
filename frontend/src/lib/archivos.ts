// Qué es cada adjunto, decidido en un solo sitio.
//
// Esta decisión estaba escrita nueve veces a lo largo del frontend, siempre de
// la misma forma: `tipo === 'application/pdf' ? PDF : imagen`. Con dos formatos
// funcionaba. Al entrar Word, cada uno de esos nueve `else` pasa a pintar un
// .docx como si fuera una foto: los tres visores lo meten en un <img> que se ve
// roto, y los seis chips lo rotulan "Imagen".
//
// Las reglas de aquí son el espejo de backend/src/utils/documentos.ts. Si se
// cambia una hay que cambiar la otra, y por eso las dos tienen pruebas que
// comparan contra los mismos casos.

// El único Word que entra. Fuera quedan .doc (contenedor OLE binario, puede
// llevar macros y objetos incrustados) y .docm (que es este mismo formato con
// las macros habilitadas por diseño).
export const MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export type ClaseDeArchivo = 'pdf' | 'word' | 'imagen' | 'otro';

// El tipo llega a veces con parámetros detrás ('application/pdf;charset=binary'),
// sobre todo desde filas viejas de la base, donde se guardó crudo.
const soloTipo = (mime: string | null | undefined) =>
  (mime ?? '').split(';')[0].trim().toLowerCase();

export function claseDeArchivo(mime: string | null | undefined): ClaseDeArchivo {
  const t = soloTipo(mime);
  if (t === 'application/pdf') return 'pdf';
  if (t === MIME_DOCX) return 'word';
  if (t.startsWith('image/') && t !== 'image/svg+xml') return 'imagen';
  return 'otro';
}

// Si se puede mostrar sin descargarlo.
//
// Un .docx no: no hay forma de previsualizarlo en un iframe. Sin esta pregunta
// cae en el <img> de los visores y la persona ve un recuadro roto sobre un
// archivo que en realidad se guardó bien.
export function seVeEnLinea(mime: string | null | undefined): boolean {
  const c = claseDeArchivo(mime);
  return c === 'pdf' || c === 'imagen';
}

const ROTULOS: Record<ClaseDeArchivo, string> = {
  pdf: 'PDF', word: 'Word', imagen: 'Imagen', otro: 'Archivo',
};

export function rotuloDeArchivo(mime: string | null | undefined): string {
  return ROTULOS[claseDeArchivo(mime)];
}

const EXTENSION: Record<string, string> = {
  'application/pdf': '.pdf',
  [MIME_DOCX]: '.docx',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

// Solo se quita del nombre lo que de verdad parece una extensión. Quitar todo
// lo que va después del último punto convierte "Incapacidad 12.5" en
// "Incapacidad 12", que es el defecto que ya tenía evidencia.ts.
const EXTENSION_ESCRITA = /\.(pdf|docx?|docm|jpe?g|png|webp|gif|bmp|heic|heif|tiff?|avif|exe|zip)$/i;

// Con qué nombre se baja el archivo. Es el espejo de `nombreParaDescargar` del
// backend: si las dos reglas no coinciden, el mismo archivo se descarga con un
// nombre distinto según por dónde se abra.
export function nombreParaDescargar(nombre: string | null | undefined, mime: string): string {
  const base = (nombre ?? '').replace(EXTENSION_ESCRITA, '').trim();
  return (base || 'documento') + (EXTENSION[soloTipo(mime)] ?? '');
}

// Qué hacer con el archivo que la persona acaba de elegir.
//
//   convertir  es una foto: se rasteriza y sale en WebP
//   pdf, word  se guardan tal cual
//   rechazar   no entra, y se le dice antes de subir nada
//
// TODA foto se convierte, venga en el formato que venga. Es literalmente lo que
// se pidió, y además es lo que de verdad desinfecta: lo que se guarda son los
// píxeles que se dibujaron en el canvas, no los bytes que llegaron, así que lo
// que viniera escondido en los metadatos EXIF no sobrevive. Filtrar por
// extensión no consigue eso.
//
// El SVG es la única imagen que no pasa: es un documento que puede traer
// scripts, y por eso no basta con mirar si el tipo empieza por "image/".
export type DestinoDeArchivo = 'convertir' | 'pdf' | 'word' | 'rechazar';

export function destinoDeArchivo(mime: string | null | undefined): DestinoDeArchivo {
  switch (claseDeArchivo(mime)) {
    case 'imagen': return 'convertir';
    case 'pdf': return 'pdf';
    case 'word': return 'word';
    default: return 'rechazar';
  }
}

// Lo que ofrece el diálogo de archivos.
//
// El `accept` NO valida nada: es una comodidad del selector y se salta
// eligiendo "todos los archivos". Quien valida es `destinoDeArchivo` y, detrás,
// el backend.
//
// Se deja `image/*` en vez de cerrarlo a tres MIME por dos razones concretas:
// esconde el HEIC del iPhone, que es justo el caso típico de la foto de una
// incapacidad; y el arrastrar-y-soltar no respeta el accept, así que cerrarlo
// dejaría el mismo archivo entrando por una vía y no por la otra.
export const ACEPTA_DOCUMENTO = `image/*,application/pdf,${MIME_DOCX},.pdf,.docx`;
export const ACEPTA_FOTO = 'image/*';

// El comprobante de un pago: una foto del soporte o el PDF que da el banco.
// Word no, porque un soporte de pago se emite, no se redacta.
export const ACEPTA_COMPROBANTE = 'image/*,application/pdf,.pdf';

// El tipo que declara un data URI, leído del propio dato.
//
// Hace falta porque las dos columnas de comprobante se guardan sin una columna
// de tipo al lado: solo está el data URI. Al releerlo, quien lo pinta no tiene
// otra forma de saber si es una foto o el PDF del banco.
//
// Devuelve '' para cualquier cosa que no sea un data URI, con lo que
// `claseDeArchivo` lo trata como 'otro' y se ofrece la descarga en vez de un
// <img> roto. En esas columnas puede haber cualquier cosa: nunca tuvieron regla.
export function tipoDeDataUri(dataUri: string | null | undefined): string {
  if (typeof dataUri !== 'string' || !dataUri.startsWith('data:')) return '';
  const corte = dataUri.indexOf(';');
  return corte > 5 ? dataUri.slice(5, corte) : '';
}
