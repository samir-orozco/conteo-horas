// Prepara el archivo que alguien adjunta, para guardarlo como base64.
//
//  - Foto: se reescala (máx 1600 px) y se vuelve a dibujar en un canvas, de
//    donde sale en WebP. Cualquier formato que el navegador sepa decodificar
//    entra y sale convertido, que es lo que se pidió.
//  - PDF y Word: se usan tal cual, con tope de tamaño. No hay nada que
//    convertir en ellos.
//  - Lo demás se rechaza aquí, antes de subir nada.
//
// Devuelve un data URI listo para enviar, o lanza un error legible.
//
// REDIBUJAR LA FOTO NO ES SOLO AHORRAR PESO: lo que se guarda son los píxeles
// que se dibujaron, no los bytes que llegaron. Lo que viniera escondido en los
// metadatos EXIF, o un archivo que fuera dos cosas a la vez, no sobrevive al
// canvas. Es la desinfección de verdad; filtrar por extensión no consigue eso.

import {
  destinoDeArchivo, nombreParaDescargar, claseDeArchivo, MIME_DOCX,
} from './archivos';
import { codificarPreferirWebp } from './imagenes';

// Tope en bytes REALES del archivo, antes de codificarlo. base64 infla un
// tercio, así que esto son unos 4 MB de texto, por debajo de los 4.200.000 que
// acepta el backend. Los dos números están atados por una prueba: si alguien
// sube este sin mirar el otro, un archivo que aquí pasa se convierte allá en un
// 400 sin causa visible.
export const MAX_ARCHIVO_BYTES = 3_000_000;
const MAX_LADO = 1600;

const CALIDAD = 0.82;

export type Evidencia = { data: string; nombre: string; tipo: string };

function leerComoDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error('No pudimos leer el archivo.'));
    r.readAsDataURL(file);
  });
}

function comprimirImagen(dataUrl: string, nombre: string): Promise<Evidencia> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const escala = Math.min(1, MAX_LADO / Math.max(img.width, img.height));
      const w = Math.round(img.width * escala);
      const h = Math.round(img.height * escala);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('No pudimos procesar la imagen.'));
      ctx.drawImage(img, 0, 0, w, h);

      // `reject` y no `throw`: esto corre dentro de un onload, y una excepción
      // aquí no la recoge nadie. La promesa se quedaría sin resolver ni
      // rechazar, y la caja de subir en "Procesando..." para siempre.
      const salida = codificarPreferirWebp((tipo, q) => canvas.toDataURL(tipo, q), CALIDAD);
      if (!salida) return reject(new Error('No pudimos procesar la imagen.'));

      resolve({
        data: salida.data,
        nombre: nombreParaDescargar(nombre, salida.tipo),
        tipo: salida.tipo,
      });
    };
    img.onerror = () => reject(new Error('Tu navegador no puede leer ese formato de foto. Guárdala como JPG o PNG.'));
    img.src = dataUrl;
  });
}

const MOTIVO_RECHAZO =
  'Ese archivo no se puede adjuntar. Solo aceptamos PDF, Word (.docx) y fotos. ' +
  'Si tienes un .doc antiguo, ábrelo en Word y usa Guardar como para dejarlo en .docx.';

export async function procesarEvidencia(file: File): Promise<Evidencia> {
  const destino = destinoDeArchivo(file.type);

  if (destino === 'rechazar') throw new Error(MOTIVO_RECHAZO);

  if (destino === 'convertir') {
    const dataUrl = await leerComoDataURL(file);
    return comprimirImagen(dataUrl, file.name);
  }

  // PDF y Word: se guardan como llegaron. Aquí el tope sí se comprueba antes,
  // porque no hay recompresión que los achique.
  if (file.size > MAX_ARCHIVO_BYTES) {
    throw new Error(destino === 'word'
      ? 'El documento supera los 3 MB. Quítale las imágenes o guárdalo como PDF.'
      : 'El PDF supera los 3 MB. Comprímelo o toma una foto en su lugar.');
  }
  const data = await leerComoDataURL(file);
  const tipo = destino === 'word' ? MIME_DOCX : 'application/pdf';
  return { data, nombre: nombreParaDescargar(file.name.slice(0, 120), tipo), tipo };
}

// Reexportado para que quien ya importaba de aquí no tenga que cambiar el
// import solo por saber de qué clase es un adjunto.
export { claseDeArchivo };
