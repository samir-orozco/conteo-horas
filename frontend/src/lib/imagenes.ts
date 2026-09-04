// En qué formato sale una foto del canvas.
//
// Vive aparte del canvas a propósito, y no es una preferencia de estilo: el
// canvas NO se puede probar en este proyecto. En jsdom, getContext('2d')
// devuelve null y toDataURL devuelve null para cualquier tipo, sin lanzar
// (comprobado ejecutando una sonda, no supuesto). Con la decisión dentro de
// foto.ts o de evidencia.ts, pasar el producto a WebP sería un cambio invisible
// para la suite: las 352 pruebas siguen en verde porque esas líneas nunca se
// ejecutan. Aquí sí se prueba, que es lo que pide el punto 8.2 del CLAUDE.md.

export const WEBP = 'image/webp';
export const JPEG = 'image/jpeg';

// Si un data URL salió de verdad en el formato que se pidió.
//
// Hace falta porque `toDataURL` con un tipo que el navegador no sabe codificar
// NO lanza: el estándar HTML obliga a devolver un PNG, sin avisar. Un PNG
// fotográfico de 512 px mide sobre 1.000.000 de caracteres contra el tope de
// 700.000 que aplica el backend, así que sin comprobarlo la foto se rechazaría
// mucho después y en otro sitio.
//
// El punto y coma del final importa: sin él, 'image/webp2' pasaría por
// 'image/webp'.
export function esDataUrlDe(valor: unknown, mime: string): boolean {
  return typeof valor === 'string' && valor.startsWith(`data:${mime};`);
}

export type Codificador = (mime: string, calidad: number) => unknown;
export type SalidaDeImagen = { data: string; tipo: string };

// Pide WebP y cae a JPEG si el navegador no sabe producirlo.
//
// DEVUELVE null EN VEZ DE LANZAR, y esto no es un detalle: quien llama lo hace
// desde dentro de un `img.onload`, y una excepción ahí no la recoge nadie. La
// promesa que envuelve al onload no se resuelve ni se rechaza nunca, y la caja
// de subir archivo se queda en "Procesando..." para siempre, sin error y sin
// que se pueda reintentar. Por eso el que llama tiene que hacer `reject`, igual
// que ya hace con el contexto del canvas.
//
// En la práctica el respaldo casi no se usa: Chrome, Firefox, Edge y Safari 14+
// codifican WebP. Está porque es una línea y porque un fallo silencioso es el
// peor tipo de fallo.
export function codificarPreferirWebp(codificar: Codificador, calidad: number): SalidaDeImagen | null {
  const enWebp = codificar(WEBP, calidad);
  if (esDataUrlDe(enWebp, WEBP)) return { data: enWebp as string, tipo: WEBP };

  const enJpeg = codificar(JPEG, calidad);
  if (esDataUrlDe(enJpeg, JPEG)) return { data: enJpeg as string, tipo: JPEG };

  return null;
}
