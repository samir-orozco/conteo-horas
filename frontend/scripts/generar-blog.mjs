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
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ARTICULOS, SITIO } from '../blog/articulos/index.mjs';
import { paginaIndice, paginaArticulo } from '../blog/plantilla.mjs';

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

console.log('\nBlog estático:');
await escribir('blog/index.html', paginaIndice(ARTICULOS));
for (const a of ARTICULOS) {
  await escribir(`blog/${a.slug}/index.html`, paginaArticulo(a, ARTICULOS));
}

// El sitemap se reescribe entero para que las entradas del blog no se queden
// atrás cada vez que se publica una. Las rutas fijas viven aquí.
const fijas = [
  { loc: '/', prioridad: '1.0', frec: 'weekly', lastmod: hoy },
  { loc: '/blog/', prioridad: '0.9', frec: 'weekly', lastmod: hoy },
  { loc: '/registro', prioridad: '0.6', frec: 'monthly' },
];
const urls = [
  ...fijas,
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
console.log(`\n${ARTICULOS.length} artículos publicados.\n`);
