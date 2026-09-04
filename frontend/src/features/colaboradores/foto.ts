import { codificarPreferirWebp } from '../../lib/imagenes';

// Lado máximo de la foto de perfil ya guardada.
//
// Se ve en un círculo de 96 píxeles, así que 512 alcanza de sobra incluso en
// una pantalla al triple de densidad. El motivo de recortarla no es el ancho de
// banda de quien la sube: es que la foto vive dentro de la fila del colaborador
// en la base, y una foto de celular sin tocar son varios megabytes por persona.
export const LADO_MAX = 512;

// Lado de la miniatura que viaja en las listas.
//
// La lista pinta un círculo de 36 píxeles. Mandar la foto de la ficha por cada
// persona son cientos de kilobytes por carga, y en un plan de 150 colaboradores
// son megas. 64 alcanza incluso al doble de densidad de pantalla.
export const LADO_MINI = 64;

export function dimensionesDeFoto(ancho: number, alto: number, max = LADO_MAX) {
  if (!(ancho > 0) || !(alto > 0)) return { ancho: 1, alto: 1 };
  // Una foto más pequeña que el tope se deja como está: agrandarla no agrega
  // información, solo peso.
  const escala = Math.min(1, max / Math.max(ancho, alto));
  return {
    ancho: Math.max(1, Math.round(ancho * escala)),
    alto: Math.max(1, Math.round(alto * escala)),
  };
}

// Dibuja la imagen ya cargada al tamaño pedido y la devuelve como data URL.
//
// Sale en WebP, con caída a JPEG si el navegador no sabe codificarlo. La
// decisión de cuál de los dos salió vive en lib/imagenes.ts y no aquí, porque
// el canvas no se puede probar en jsdom: dejarla en esta línea haría que el
// cambio entero fuera invisible para la suite.
//
// Redibujar también desinfecta: lo que se guarda son los píxeles dibujados, no
// los bytes que llegaron, así que lo que viniera en los metadatos EXIF no
// sobrevive.
const recortar = (img: HTMLImageElement, lado: number, calidad: number) => {
  const { ancho, alto } = dimensionesDeFoto(img.naturalWidth, img.naturalHeight, lado);
  const canvas = document.createElement('canvas');
  canvas.width = ancho;
  canvas.height = alto;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No pudimos procesar la imagen.');
  ctx.drawImage(img, 0, 0, ancho, alto);
  const salida = codificarPreferirWebp((tipo, q) => canvas.toDataURL(tipo, q), calidad);
  if (!salida) throw new Error('No pudimos procesar la imagen.');
  return salida.data;
};

const cargar = (src: string, alTerminar: () => void): Promise<HTMLImageElement> =>
  new Promise((resolver, rechazar) => {
    const img = new Image();
    img.onload = () => { alTerminar(); resolver(img); };
    // Este mensaje importa desde que entra cualquier formato de foto: un HEIC
    // de iPhone lo decodifica Safari pero no Chrome en escritorio, y ahi lo
    // util es decir que hacer, no solo que no se pudo.
    img.onerror = () => { alTerminar(); rechazar(new Error('Tu navegador no puede leer ese formato de foto. Guárdala como JPG o PNG.')); };
    img.src = src;
  });

// Las dos versiones que se guardan: la de la ficha y la de las listas.
//
// El canvas no se puede probar en jsdom, así que estas funciones se quedan lo
// más delgadas posible: toda la aritmética vive en dimensionesDeFoto, que sí se
// prueba.
export type DosFotos = { foto: string; mini: string };

export async function aFotoDePerfil(archivo: File): Promise<DosFotos> {
  const url = URL.createObjectURL(archivo);
  const img = await cargar(url, () => URL.revokeObjectURL(url));
  return { foto: recortar(img, LADO_MAX, 0.82), mini: recortar(img, LADO_MINI, 0.7) };
}

// La miniatura de una foto que ya es un data URL, como la del escaneo facial.
export async function miniaturaDe(dataUrl: string): Promise<string> {
  const img = await cargar(dataUrl, () => {});
  return recortar(img, LADO_MINI, 0.7);
}
