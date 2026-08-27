// Lado máximo de la foto de perfil ya guardada.
//
// Se ve en un círculo de 96 píxeles, así que 512 alcanza de sobra incluso en
// una pantalla al triple de densidad. El motivo de recortarla no es el ancho de
// banda de quien la sube: es que la foto vive dentro de la fila del colaborador
// en la base, y una foto de celular sin tocar son varios megabytes por persona.
export const LADO_MAX = 512;

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

// Pasa el archivo que eligió la persona a un data URL recortado y en JPEG.
//
// El canvas no se puede probar en jsdom, así que esta función se queda lo más
// delgada posible: toda la aritmética vive en dimensionesDeFoto, que sí se
// prueba.
export function aFotoDePerfil(archivo: File): Promise<string> {
  return new Promise((resolver, rechazar) => {
    const url = URL.createObjectURL(archivo);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const { ancho, alto } = dimensionesDeFoto(img.naturalWidth, img.naturalHeight);
      const canvas = document.createElement('canvas');
      canvas.width = ancho;
      canvas.height = alto;
      const ctx = canvas.getContext('2d');
      if (!ctx) return rechazar(new Error('No pudimos procesar la imagen.'));
      ctx.drawImage(img, 0, 0, ancho, alto);
      resolver(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      rechazar(new Error('No pudimos leer esa imagen.'));
    };
    img.src = url;
  });
}
