// Procesa el archivo de evidencia de una novedad para guardarlo como base64:
// - Imagen: la reescala (máx 1600px) y comprime a JPEG para que no pese de más.
// - PDF: se usa tal cual, con tope de tamaño.
// Devuelve un data URI listo para enviar, o lanza un error legible.

const MAX_PDF_BYTES = 3_000_000; // 3 MB de PDF (~4 MB en base64)
const MAX_LADO = 1600;

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
      const data = canvas.toDataURL('image/jpeg', 0.82);
      resolve({ data, nombre: nombre.replace(/\.[^.]+$/, '') + '.jpg', tipo: 'image/jpeg' });
    };
    img.onerror = () => reject(new Error('La imagen no es válida.'));
    img.src = dataUrl;
  });
}

export async function procesarEvidencia(file: File): Promise<Evidencia> {
  if (file.type.startsWith('image/')) {
    const dataUrl = await leerComoDataURL(file);
    return comprimirImagen(dataUrl, file.name);
  }
  if (file.type === 'application/pdf') {
    if (file.size > MAX_PDF_BYTES) {
      throw new Error('El PDF supera los 3 MB. Comprímelo o toma una foto en su lugar.');
    }
    const data = await leerComoDataURL(file);
    return { data, nombre: file.name.slice(0, 120), tipo: 'application/pdf' };
  }
  throw new Error('Solo se permiten imágenes o PDF.');
}
