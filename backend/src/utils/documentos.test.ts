import { describe, it, expect } from 'vitest';
import {
  documentoValido, tipoDeDocumento, nombreDeDocumento, nombreParaDescargar,
  cambioDeDocumento,
  MAX_DOC, MIME_DOCX,
} from './documentos';

// Un data URI con bytes de verdad. El segundo argumento son los bytes que van
// al principio del archivo, que es lo que ahora se comprueba.
const uri = (mime: string, bytes: number[] | Buffer, cola = 'Hola') =>
  `data:${mime};base64,${Buffer.concat([Buffer.from(bytes as number[]), Buffer.from(cola)]).toString('base64')}`;

const PDF = [0x25, 0x50, 0x44, 0x46, 0x2d];             // %PDF-
const ZIP = [0x50, 0x4b, 0x03, 0x04];                    // PK\x03\x04, la cabecera de todo .docx
const JPEG = [0xff, 0xd8, 0xff];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const RIFF = [0x52, 0x49, 0x46, 0x46];                   // RIFF, cabecera de WebP
const MZ = [0x4d, 0x5a, 0x90];                           // un ejecutable de Windows
const HTML = [0x3c, 0x68, 0x74, 0x6d, 0x6c, 0x3e];       // <html>

const pdf = uri('application/pdf', PDF);
const jpg = uri('image/jpeg', JPEG);
const png = uri('image/png', PNG);
const docx = uri(MIME_DOCX, ZIP);

describe('qué documentos se aceptan', () => {
  it('PDF e imágenes de los formatos permitidos', () => {
    expect(documentoValido(pdf)).toBe(true);
    expect(documentoValido(jpg)).toBe(true);
    expect(documentoValido(png)).toBe(true);
    expect(documentoValido(uri('image/webp', RIFF))).toBe(true);
  });

  it('acepta Word, que es lo que se vino a agregar', () => {
    expect(documentoValido(docx)).toBe(true);
  });

  it('acepta el .docx sin importar qué versión de Word lo escribió', () => {
    // Word escribe la cabecera del zip con la bandera de compresión distinta
    // según la versión. Los cuatro primeros bytes son siempre los mismos.
    expect(documentoValido(uri(MIME_DOCX, [...ZIP, 0x14, 0x00]))).toBe(true);
    expect(documentoValido(uri(MIME_DOCX, [...ZIP, 0x14, 0x00, 0x00, 0x08]))).toBe(true);
    expect(documentoValido(uri(MIME_DOCX, [...ZIP, 0x00, 0x00]))).toBe(true);
  });

  it('rechaza el Word viejo y el Word con macros, que son los que sí ejecutan cosas', () => {
    // .doc es un binario compuesto OLE y puede llevar macros y objetos
    // incrustados. .docm es .docx con macros habilitadas por diseño. El .docx
    // moderno no puede tener macros, y por eso es el único que entra.
    expect(documentoValido(uri('application/msword', [0xd0, 0xcf, 0x11, 0xe0]))).toBe(false);
    expect(documentoValido(uri('application/vnd.ms-word.document.macroEnabled.12', ZIP))).toBe(false);
  });

  it('rechaza formatos que no están en la lista', () => {
    // Un SVG puede llevar scripts dentro, y por eso no entra.
    expect(documentoValido('data:image/svg+xml;base64,PHN2Zw')).toBe(false);
    expect(documentoValido('data:text/html;base64,PGh0bWw')).toBe(false);
    expect(documentoValido('data:application/x-msdownload;base64,TVo')).toBe(false);
  });

  it('rechaza un archivo que miente sobre lo que es', () => {
    // Este es el agujero que se viene a cerrar, y el único que la firma de
    // bytes cierra de verdad. Antes bastaba con poner la etiqueta correcta:
    // el contenido no se miraba.
    expect(documentoValido(uri('application/pdf', HTML))).toBe(false);
    expect(documentoValido(uri('application/pdf', MZ))).toBe(false);
    expect(documentoValido(uri(MIME_DOCX, MZ))).toBe(false);
    expect(documentoValido(uri(MIME_DOCX, HTML))).toBe(false);
    expect(documentoValido(uri('image/png', HTML))).toBe(false);
    expect(documentoValido(uri('image/jpeg', PNG))).toBe(false);
  });

  it('deja constancia de hasta dónde llega la firma: cualquier zip pasa por .docx', () => {
    // Un .xlsx, un .jar y un .apk son zips, así que renombrados pasan. Y un
    // .docx auténtico pero malicioso es un zip perfectamente válido y también
    // pasa. La firma detecta el MAL ETIQUETADO, no el contenido. Esto se prueba
    // para que quede escrito, no porque esté bien.
    expect(documentoValido(uri(MIME_DOCX, ZIP, 'esto es en realidad un .xlsx'))).toBe(true);
  });

  it('rechaza lo que no es un data URI', () => {
    expect(documentoValido('https://ejemplo.co/archivo.pdf')).toBe(false);
    expect(documentoValido('JVBERi0xLjQK')).toBe(false);
    expect(documentoValido('')).toBe(false);
    expect(documentoValido(null)).toBe(false);
    expect(documentoValido(undefined)).toBe(false);
    expect(documentoValido(12345)).toBe(false);
    expect(documentoValido({ documento: pdf })).toBe(false);
  });

  it('un data URI mal formado no revienta, falla cerrado', () => {
    expect(documentoValido('data:application/pdf;base64,')).toBe(false);
    expect(documentoValido('data:application/pdf,JVBERi')).toBe(false);
    expect(documentoValido('data:;base64,JVBERi')).toBe(false);
    expect(documentoValido('data:application/pdf;base64,\nJVBERi')).toBe(false);
    expect(documentoValido('data:')).toBe(false);
  });

  it('rechaza el que se pasa del tope', () => {
    const enorme = 'data:application/pdf;base64,JVBERi' + 'A'.repeat(MAX_DOC);
    expect(documentoValido(enorme)).toBe(false);
  });

  it('el tope deja pasar un archivo real de unos 3 MB', () => {
    // base64 infla un tercio, así que el tope en bytes reales es MAX_DOC × 3/4.
    expect(Math.round((MAX_DOC * 3) / 4 / 1_000_000)).toBe(3);
  });

  it('el prefijo de firma es estable pase lo que pase con el byte siguiente', () => {
    // Solo los primeros floor(bytes×8/6) caracteres del base64 no dependen de
    // lo que venga detrás. Si alguien alarga un prefijo del mapa creyendo que
    // lo hace más estricto, rompe archivos legítimos. Esto lo recorre entero
    // en vez de confiar en tres ejemplos elegidos a mano.
    for (let b = 0; b < 256; b++) {
      expect(documentoValido(uri('application/pdf', [...PDF, b]))).toBe(true);
      expect(documentoValido(uri(MIME_DOCX, [...ZIP, b]))).toBe(true);
      expect(documentoValido(uri('image/png', [...PNG, b]))).toBe(true);
    }
  });

  it('un byte de la firma cambiado ya no pasa, salvo los que base64 no distingue', () => {
    // Cuántos de los 255 valores posibles se detectan, por posición. No es 255
    // en la última: base64 empaqueta de a 6 bits, así que el carácter final del
    // prefijo comparte código con unos pocos vecinos. Medido, no supuesto:
    // en el zip 0x05, 0x06 y 0x07 caen en el mismo carácter que 0x04.
    const detectados = (bytes: number[], mime: string, pos: number) => {
      let n = 0;
      for (let b = 0; b < 256; b++) {
        if (b === bytes[pos]) continue;
        const roto = [...bytes]; roto[pos] = b;
        if (!documentoValido(uri(mime, roto))) n++;
      }
      return n;
    };
    expect(detectados(PDF, 'application/pdf', 0)).toBe(255);
    expect(detectados(PDF, 'application/pdf', 3)).toBe(255);
    expect(detectados(PDF, 'application/pdf', 4)).toBe(240);
    expect(detectados(ZIP, MIME_DOCX, 0)).toBe(255);
    expect(detectados(ZIP, MIME_DOCX, 2)).toBe(255);
    expect(detectados(ZIP, MIME_DOCX, 3)).toBe(252);
  });
});

describe('tipo y nombre', () => {
  it('el tipo se lee del propio data URI, no de lo que diga el cliente', () => {
    expect(tipoDeDocumento(pdf)).toBe('application/pdf');
    expect(tipoDeDocumento(jpg)).toBe('image/jpeg');
    expect(tipoDeDocumento(png)).toBe('image/png');
  });

  it('el tipo de Word entero cabe en la columna', () => {
    // documentoTipo es String? sin @db, o sea VARCHAR(191) en MySQL.
    expect(tipoDeDocumento(docx)).toBe(MIME_DOCX);
    expect(MIME_DOCX.length).toBeLessThan(191);
  });

  it('el nombre se recorta y se limpia', () => {
    expect(nombreDeDocumento('  carta-renuncia.pdf  ')).toBe('carta-renuncia.pdf');
    expect(nombreDeDocumento('x'.repeat(200))).toHaveLength(120);
  });

  it('un nombre vacío o ausente queda en null, no en cadena vacía', () => {
    expect(nombreDeDocumento('')).toBeNull();
    expect(nombreDeDocumento('   ')).toBeNull();
    expect(nombreDeDocumento(undefined)).toBeNull();
    expect(nombreDeDocumento(42)).toBeNull();
  });

  it('el nombre no puede traer separadores de ruta ni caracteres de control', () => {
    // No es defensa contra un ataque: el archivo nunca se escribe en disco. Es
    // que este nombre termina en el atributo download de un enlace y en la
    // pantalla, y ahí una barra o un salto de línea no significan nada bueno.
    expect(nombreDeDocumento('../../etc/passwd')).toBe('_._etc_passwd');
    expect(nombreDeDocumento('con\nsalto.docx')).toBe('con_salto.docx');
    expect(nombreDeDocumento('a"b;c<d>e|f.docx')).toBe('a_b_c_d_e_f.docx');
    expect(nombreDeDocumento('..')).toBeNull();
    expect(nombreDeDocumento('.oculto.docx')).toBe('oculto.docx');
  });
});

describe('el nombre con el que se descarga', () => {
  it('la extensión sale del tipo comprobado, no de lo que escribió quien subió', () => {
    // Con Word en juego la descarga pasa a ser la única forma de abrir el
    // archivo, así que la extensión no puede seguir siendo la que vino en el
    // nombre, sobre unos bytes que ahora sí se miraron.
    expect(nombreParaDescargar('contrato.exe', MIME_DOCX)).toBe('contrato.docx');
    expect(nombreParaDescargar('carta.docx', 'application/pdf')).toBe('carta.pdf');
    expect(nombreParaDescargar('foto.jpeg', 'image/webp')).toBe('foto.webp');
    expect(nombreParaDescargar('soporte', 'application/pdf')).toBe('soporte.pdf');
  });

  it('sin nombre, uno que se pueda guardar igual', () => {
    expect(nombreParaDescargar(null, MIME_DOCX)).toBe('documento.docx');
    expect(nombreParaDescargar('', 'application/pdf')).toBe('documento.pdf');
  });

  it('no corta lo que no es una extensión', () => {
    // El defecto que ya existía en el frontend: quitar todo lo que va después
    // del último punto convierte 'Contrato v1.2' en 'Contrato v1'.
    expect(nombreParaDescargar('Contrato v1.2', 'application/pdf')).toBe('Contrato v1.2.pdf');
    expect(nombreParaDescargar('Acta 3.1 final', MIME_DOCX)).toBe('Acta 3.1 final.docx');
  });

  it('un tipo que no conocemos se queda sin extensión antes que con una inventada', () => {
    expect(nombreParaDescargar('cosa.bin', 'application/octet-stream')).toBe('cosa.bin');
  });
});

describe('qué se hace con el documento que llegó', () => {
  it('null quita el adjunto, undefined lo deja como estaba', () => {
    // Son cosas distintas y confundirlas borra el contrato de alguien: null es
    // "quítamelo", undefined es "no vine a hablar de eso".
    expect(cambioDeDocumento(null, null)).toEqual({ accion: 'quitar' });
    expect(cambioDeDocumento(undefined, undefined)).toEqual({ accion: 'dejar' });
  });

  it('un documento bueno se guarda con su tipo y su nombre limpio', () => {
    expect(cambioDeDocumento(docx, '  Contrato Ana.docx  ')).toEqual({
      accion: 'guardar', documento: docx, tipo: MIME_DOCX, nombre: 'Contrato Ana.docx',
    });
  });

  it('sin nombre se guarda igual, con el nombre en null', () => {
    expect(cambioDeDocumento(pdf, undefined)).toEqual({
      accion: 'guardar', documento: pdf, tipo: 'application/pdf', nombre: null,
    });
  });

  it('uno malo se RECHAZA, no se descarta en silencio', () => {
    // Este es el cambio de comportamiento. Antes, adjuntar algo que no pasaba
    // la validación guardaba el contrato sin documento y devolvía 200: la
    // persona veía "guardado" y el archivo no estaba en ninguna parte.
    const r = cambioDeDocumento('data:text/html;base64,PGh0bWw', 'x.html');
    expect(r.accion).toBe('rechazar');
  });

  it('el motivo del rechazo dice qué sí se puede subir', () => {
    const r = cambioDeDocumento('data:application/msword;base64,0M8R', 'viejo.doc');
    if (r.accion !== 'rechazar') throw new Error('debía rechazar');
    // Que nombre .docx importa: quien tiene un .doc solo necesita saber que
    // "Guardar como" lo resuelve.
    expect(r.motivo).toMatch(/\.docx/);
    expect(r.motivo).toMatch(/PDF/i);
  });

  it('una cadena vacía no borra el adjunto guardado', () => {
    // '' no es null. Tratarlo como "quitar" borraría el archivo de alguien por
    // un campo de formulario que se envió vacío.
    expect(cambioDeDocumento('', null).accion).toBe('rechazar');
  });
});
