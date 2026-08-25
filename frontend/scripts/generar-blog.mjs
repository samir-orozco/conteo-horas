// Genera el blog como HTML estático dentro de dist/, DESPUÉS de `vite build`.
//
// Por qué estático y no una ruta de React: los rastreadores de IA —GPTBot,
// PerplexityBot, ClaudeBot— por lo general no ejecutan JavaScript, así que un
// blog renderizado en el navegador sería invisible justo para quien queremos que
// nos cite. Estas páginas son HTML plano, sin bundle y sin JS.
//
// Un directorio por artículo (`/blog/<slug>/index.html`) en lugar de un archivo
// suelto: así la URL queda limpia y el .htaccess la sirve sin tocar nada, porque
// solo reescribe a la SPA cuando la ruta no existe como archivo NI como carpeta.
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ARTICULOS, SITIO } from '../blog/articulos/index.mjs';
import { paginaIndice, paginaArticulo, paginaCalculadora, paginaCalculadorasIndice } from '../blog/plantilla.mjs';
import calculadoraHorasExtra from '../blog/calculadoras/horas-extra.mjs';
import calculadoraJornada42 from '../blog/calculadoras/jornada-42-horas.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(raiz, 'dist');

const escribir = async (ruta, contenido) => {
  const destino = join(dist, ruta);
  await mkdir(dirname(destino), { recursive: true });
  await writeFile(destino, contenido, 'utf8');
  const kb = (Buffer.byteLength(contenido) / 1024).toFixed(1);
  console.log(`  ${ruta.padEnd(52)} ${kb.padStart(6)} kB`);
};

const hoy = new Date().toISOString().slice(0, 10);

// Una imagen declarada cuyo archivo todavía no existe se descarta aquí, y el
// artículo sale con el degradado de marca. Es la diferencia entre publicar una
// portada sobria y publicar el icono de imagen rota: el texto puede estar listo
// antes que la fotografía, y eso no debería impedir sacarlo. En cuanto el
// archivo aparezca en public/blog/img/, la siguiente compilación lo usa solo.
const conImagenReal = ARTICULOS.map(a => {
  if (!a.imagen || existsSync(join(raiz, 'public', a.imagen))) return a;
  console.log(`  (falta ${a.imagen}, va el degradado)`);
  return { ...a, imagen: null };
});

console.log('\nBlog estático:');
await escribir('blog/index.html', paginaIndice(conImagenReal));
for (const a of conImagenReal) {
  await escribir(`blog/${a.slug}/index.html`, paginaArticulo(a, conImagenReal));
}

// Calculadoras. Se generan con la fecha de hoy, así que cada publicación las
// deja con las reglas vigentes ese día sin que nadie tenga que acordarse: al
// cruzar el 1 de julio de 2027 el dominical pasa solo del 90 al 100%.
const CALCULADORAS = [calculadoraHorasExtra(hoy), calculadoraJornada42(hoy)];
await escribir('calculadoras/index.html', paginaCalculadorasIndice(CALCULADORAS));
for (const c of CALCULADORAS) {
  await escribir(`${c.ruta.replace(/^\/|\/$/g, '')}/index.html`, paginaCalculadora(c));
}

// El sitemap se reescribe entero para que las entradas del blog no se queden
// atrás cada vez que se publica una. Las rutas fijas viven aquí.
const fijas = [
  { loc: '/', prioridad: '1.0', frec: 'weekly', lastmod: hoy },
  { loc: '/blog/', prioridad: '0.9', frec: 'weekly', lastmod: hoy },
  { loc: '/calculadoras/', prioridad: '0.9', frec: 'weekly', lastmod: hoy },
  { loc: '/registro', prioridad: '0.6', frec: 'monthly' },
];
const urls = [
  ...fijas,
  // Las calculadoras van con prioridad alta y frecuencia mensual: cambian solas
  // cuando cambia la ley, y son páginas de intención de búsqueda muy alta.
  ...CALCULADORAS.map(c => ({ loc: c.ruta, prioridad: '0.9', frec: 'monthly', lastmod: c.actualizado })),
  ...ARTICULOS.map(a => ({ loc: `/blog/${a.slug}/`, prioridad: '0.8', frec: 'monthly', lastmod: a.actualizado })),
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${SITIO.url}${u.loc}</loc>${u.lastmod ? `
    <lastmod>${u.lastmod}</lastmod>` : ''}
    <changefreq>${u.frec}</changefreq>
    <priority>${u.prioridad}</priority>
  </url>`).join('\n')}
</urlset>
`;
await escribir('sitemap.xml', sitemap);
console.log(`\n${ARTICULOS.length} artículos y ${CALCULADORAS.length} calculadoras publicadas.\n`);
