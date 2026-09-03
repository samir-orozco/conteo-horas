// IndexNow: avisarle a Bing que algo se publicó, en vez de esperar a que pase.
//
// Sin esto, un artículo nuevo tarda de días a semanas en rastrearse. Con esto,
// horas. Y el índice de Bing es el que alimenta a ChatGPT y a Copilot, que es
// justo donde el blog quiere que lo citen.
//
// La decisión de QUÉ se anuncia vive aquí, en funciones puras y probadas,
// separada de la parte que habla por red. La especificación es explícita en que
// hay que anunciar solo lo que CAMBIÓ: mandar el sitemap entero en cada
// despliegue es lo que su documentación llama spam, y devuelve 429.
//
// Especificación: https://www.indexnow.org/documentation

export const PUNTO_FINAL = 'https://api.indexnow.org/indexnow';

// La clave NO es un secreto: la especificación exige publicarla en la raíz del
// sitio para probar que uno controla el dominio. Vive en public/<clave>.txt y
// viaja con el despliegue del frontend.
export const CLAVE = 'b7e4a91c3f6d24085ea1cd7f39b62504';

// Las URLs del sitemap que hay que anunciar.
//
//   { desde: 'YYYY-MM-DD' }  las que cambiaron ese día o después
//   { todas: true }          el sitemap entero, para el primer envío
//
// Sin opciones no devuelve nada. Es a propósito: el error caro sería que el
// comportamiento por defecto fuera mandarlo todo.
export function urlsParaAvisar(sitemapXml, opciones = {}) {
  const entradas = [...sitemapXml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(m => {
    const loc = /<loc>([\s\S]*?)<\/loc>/.exec(m[1])?.[1]?.trim();
    const lastmod = /<lastmod>([\s\S]*?)<\/lastmod>/.exec(m[1])?.[1]?.trim() ?? null;
    return { loc, lastmod };
  }).filter(e => e.loc);

  if (opciones.todas) return entradas.map(e => e.loc);
  if (!opciones.desde) return [];

  // Sin `lastmod` no se sabe si cambió, así que no se anuncia. Las fechas son
  // ISO, y en ISO comparar como texto es comparar cronológicamente.
  return entradas.filter(e => e.lastmod && e.lastmod >= opciones.desde).map(e => e.loc);
}

// El cuerpo del POST, tal como lo pide la especificación.
//
// El `host` sale de las propias URLs y no de una constante aparte: si no
// coinciden, IndexNow responde 422, y sacarlo de los datos hace imposible que se
// desincronicen el día que el dominio cambie.
export function cuerpoIndexNow(urls, clave = CLAVE) {
  if (urls.length === 0) return null;
  return {
    host: new URL(urls[0]).host,
    key: clave,
    keyLocation: `${new URL(urls[0]).origin}/${clave}.txt`,
    urlList: urls,
  };
}

// Qué significa cada respuesta, en palabras. La especificación devuelve códigos
// que no dicen nada por sí solos cuando algo sale mal a las once de la noche.
export function explicarRespuesta(codigo) {
  return {
    200: 'Recibido y aceptado.',
    202: 'Recibido. Bing va a comprobar la clave antes de rastrear.',
    400: 'Petición mal formada.',
    403: `Clave no válida o no encontrada. Comprueba que https://horapro.co/${CLAVE}.txt exista y contenga exactamente la clave.`,
    422: 'Las URLs no corresponden al host declarado, o la clave no coincide.',
    429: 'Demasiadas peticiones. Se está anunciando más de lo que cambió.',
  }[codigo] ?? `Respuesta inesperada (${codigo}).`;
}
