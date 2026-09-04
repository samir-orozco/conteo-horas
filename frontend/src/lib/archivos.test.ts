import { describe, it, expect } from 'vitest';
import {
  claseDeArchivo, seVeEnLinea, rotuloDeArchivo, nombreParaDescargar,
  destinoDeArchivo, tipoDeDataUri, MIME_DOCX, ACEPTA_DOCUMENTO, ACEPTA_FOTO,
} from './archivos';

// Qué es cada adjunto, en un solo sitio.
//
// Hasta ahora esta decisión estaba escrita nueve veces, siempre igual:
// `tipo === 'application/pdf' ? PDF : imagen`. Con dos formatos funcionaba. Con
// Word entrando, cada uno de esos nueve `else` pinta un .docx como si fuera una
// foto: tres visores lo meterían en un <img> roto y seis chips lo rotularían
// "Imagen".

describe('de qué clase es un adjunto', () => {
  it('los tres que existen', () => {
    expect(claseDeArchivo('application/pdf')).toBe('pdf');
    expect(claseDeArchivo(MIME_DOCX)).toBe('word');
    expect(claseDeArchivo('image/jpeg')).toBe('imagen');
    expect(claseDeArchivo('image/webp')).toBe('imagen');
  });

  it('lo desconocido no se hace pasar por una foto', () => {
    // Es el defecto que se viene a arreglar: el `else` de hoy asume que todo lo
    // que no es PDF es una imagen.
    expect(claseDeArchivo('application/zip')).toBe('otro');
    expect(claseDeArchivo(null)).toBe('otro');
    expect(claseDeArchivo(undefined)).toBe('otro');
    expect(claseDeArchivo('')).toBe('otro');
  });

  it('un tipo con parámetros detrás se reconoce igual', () => {
    // Un data URI puede traer 'text/plain;charset=utf-8'. Los nuestros no, pero
    // el tipo también llega desde la base, donde lleva años guardándose crudo.
    expect(claseDeArchivo('application/pdf;charset=binary')).toBe('pdf');
  });
});

describe('qué se puede ver sin descargarlo', () => {
  it('el PDF y las fotos sí, Word no', () => {
    // Un .docx no se puede previsualizar en un iframe. Sin esto cae en el
    // <img> de los tres visores y se ve un recuadro roto sobre un archivo que
    // en realidad se guardó bien.
    expect(seVeEnLinea('application/pdf')).toBe(true);
    expect(seVeEnLinea('image/png')).toBe(true);
    expect(seVeEnLinea(MIME_DOCX)).toBe(false);
    expect(seVeEnLinea('application/zip')).toBe(false);
  });
});

describe('cómo se le dice a la persona', () => {
  it('los rótulos que ya se muestran no cambian', () => {
    // LineaDeTiempo.test.tsx busca estos dos textos por pantalla. Cambiarlos
    // rompe pruebas que hoy están en verde.
    expect(rotuloDeArchivo('application/pdf')).toBe('PDF');
    expect(rotuloDeArchivo('image/jpeg')).toBe('Imagen');
  });

  it('Word tiene el suyo', () => {
    expect(rotuloDeArchivo(MIME_DOCX)).toBe('Word');
    expect(rotuloDeArchivo('application/zip')).toBe('Archivo');
  });
});

describe('con qué nombre se baja', () => {
  it('la extensión sale del tipo, no de lo que escribió quien subió', () => {
    expect(nombreParaDescargar('contrato.exe', MIME_DOCX)).toBe('contrato.docx');
    expect(nombreParaDescargar('carta.docx', 'application/pdf')).toBe('carta.pdf');
    expect(nombreParaDescargar('foto.jpeg', 'image/webp')).toBe('foto.webp');
  });

  it('sin nombre, uno que se pueda guardar', () => {
    expect(nombreParaDescargar(null, 'application/pdf')).toBe('documento.pdf');
    expect(nombreParaDescargar('', MIME_DOCX)).toBe('documento.docx');
  });

  it('no corta lo que no es una extensión', () => {
    // El defecto que ya estaba en evidencia.ts: quitar todo lo que va tras el
    // último punto convierte 'Incapacidad 12.5' en 'Incapacidad 12'.
    expect(nombreParaDescargar('Incapacidad 12.5', 'image/webp')).toBe('Incapacidad 12.5.webp');
  });

  it('un tipo que no conocemos se queda sin extensión antes que con una inventada', () => {
    // Puede llegar de una fila vieja: estas columnas llevan años guardando lo
    // que el cliente mandara.
    expect(nombreParaDescargar('cosa.bin', 'application/octet-stream')).toBe('cosa.bin');
  });

  it('da el mismo resultado que el backend, que es de donde viene el nombre', () => {
    // Las dos reglas tienen que coincidir o el archivo se baja con un nombre
    // distinto según por dónde se abra.
    expect(nombreParaDescargar('carta-renuncia.pdf', 'application/pdf')).toBe('carta-renuncia.pdf');
  });
});

describe('qué se hace con el archivo que la persona eligió', () => {
  it('una foto se convierte, sea cual sea el formato que traiga', () => {
    // Esto es literalmente lo que pidió el dueño: "si es otro formato de foto
    // que el sistema pueda convertirlas siempre en Webp". El canvas normaliza
    // todo lo que el navegador sepa decodificar, así que lo que se GUARDA
    // termina siendo siempre WebP (o JPEG si el navegador no sabe hacer WebP).
    expect(destinoDeArchivo('image/jpeg')).toBe('convertir');
    expect(destinoDeArchivo('image/png')).toBe('convertir');
    expect(destinoDeArchivo('image/heic')).toBe('convertir');
    expect(destinoDeArchivo('image/gif')).toBe('convertir');
    expect(destinoDeArchivo('image/avif')).toBe('convertir');
  });

  it('rasterizar es lo que de verdad desinfecta una foto', () => {
    // Lo que se guarda son los píxeles que se dibujaron, no los bytes que
    // llegaron: lo que viniera escondido en los metadatos EXIF no sobrevive al
    // canvas. Por eso convertir vale más que filtrar por extensión.
    expect(destinoDeArchivo('image/tiff')).toBe('convertir');
  });

  it('el SVG se rechaza aunque el navegador lo llame imagen', () => {
    // Un SVG es un documento que puede traer scripts. Es la única imagen que
    // no pasa, y por eso no basta con mirar si el tipo empieza por "image/".
    expect(destinoDeArchivo('image/svg+xml')).toBe('rechazar');
  });

  it('el PDF y Word pasan tal cual, sin tocarlos', () => {
    expect(destinoDeArchivo('application/pdf')).toBe('pdf');
    expect(destinoDeArchivo(MIME_DOCX)).toBe('word');
  });

  it('el Word viejo y el de macros se rechazan aquí también', () => {
    // La misma regla que el backend, para que la persona lo sepa antes de
    // esperar la subida entera y recibir un 400.
    expect(destinoDeArchivo('application/msword')).toBe('rechazar');
    expect(destinoDeArchivo('application/vnd.ms-word.document.macroEnabled.12')).toBe('rechazar');
  });

  it('lo demás se rechaza', () => {
    expect(destinoDeArchivo('application/zip')).toBe('rechazar');
    expect(destinoDeArchivo('text/html')).toBe('rechazar');
    expect(destinoDeArchivo('')).toBe('rechazar');
  });
});

describe('lo que ofrece el selector de archivos', () => {
  it('el de documentos deja elegir foto, PDF y Word', () => {
    // El accept no valida nada: es una comodidad del diálogo, y se salta
    // eligiendo "todos los archivos". Quien valida es destinoDeArchivo y,
    // detrás, el backend. Pero image/* se deja a propósito: cerrarlo a tres
    // MIME esconde el HEIC del iPhone, que es el caso típico de la foto de una
    // incapacidad, y además el arrastrar-y-soltar no respeta el accept, así que
    // el mismo archivo entraría de una forma y no de la otra.
    expect(ACEPTA_DOCUMENTO).toContain('image/*');
    expect(ACEPTA_DOCUMENTO).toContain('application/pdf');
    expect(ACEPTA_DOCUMENTO).toContain(MIME_DOCX);
  });

  it('el de fotos no ofrece documentos', () => {
    expect(ACEPTA_FOTO).toContain('image/*');
    expect(ACEPTA_FOTO).not.toContain('application/pdf');
  });
});

describe('el tipo que trae el propio dato', () => {
  it('se lee del data URI', () => {
    // Los dos comprobantes se guardan sin columna de tipo al lado, así que
    // esta es la única forma de saber qué son al volverlos a pintar.
    expect(tipoDeDataUri('data:application/pdf;base64,JVBERi')).toBe('application/pdf');
    expect(tipoDeDataUri('data:image/webp;base64,UklGRg')).toBe('image/webp');
  });

  it('lo que no es un data URI queda sin tipo, y eso lo vuelve "otro"', () => {
    // En esas columnas puede haber cualquier cosa, porque nunca tuvieron regla.
    // Sin tipo se ofrece la descarga, que es mejor que un <img> roto.
    expect(tipoDeDataUri(null)).toBe('');
    expect(tipoDeDataUri(undefined)).toBe('');
    expect(tipoDeDataUri('https://ejemplo.co/x.png')).toBe('');
    expect(tipoDeDataUri('data:')).toBe('');
    expect(tipoDeDataUri('data:application/pdf')).toBe('');
    expect(claseDeArchivo(tipoDeDataUri('basura'))).toBe('otro');
  });
});
