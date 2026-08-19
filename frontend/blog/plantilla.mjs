import { AUTOR, SITIO } from './articulos/index.mjs';

const esc = (s = '') => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export function fechaLarga(iso) {
  const [a, m, d] = iso.split('-').map(Number);
  return `${d} de ${MESES[m - 1]} de ${a}`;
}

// CSS propio y embebido: estas páginas no cargan el bundle de la aplicación.
// Son HTML plano, sin JavaScript, para que las lea cualquier rastreador —incluidos
// los de IA, que en general no ejecutan JS— y para que abran de inmediato.
const CSS = `
*,*::before,*::after{box-sizing:border-box}
body{margin:0;font-family:system-ui,'Segoe UI',Roboto,sans-serif;color:#303030;background:#fff;
  font-size:17px;line-height:1.7;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
html{scroll-behavior:smooth}
img{max-width:100%;height:auto;display:block}
a{color:#303030}
.env{max-width:1140px;margin:0 auto;padding:0 24px}

/* Cabecera */
.cab{border-bottom:1px solid #ececec;background:#fff;position:sticky;top:0;z-index:20}
.cab .env{display:flex;align-items:center;justify-content:space-between;height:68px;gap:16px}
.cab img{height:26px;width:auto}
.cab nav{display:flex;align-items:center;gap:22px}
.cab nav a{color:#898989;text-decoration:none;font-size:15px;font-weight:500}
.cab nav a:hover{color:#303030}
.cta{background:#FFD85E;color:#303030;font-weight:700;padding:9px 18px;border-radius:11px;
  text-decoration:none;font-size:15px;white-space:nowrap}
.cta:hover{background:#F0C63F}
@media(max-width:640px){.cab nav a.oculta-movil{display:none}}

/* Migas */
.migas{display:flex;align-items:center;gap:8px;font-size:14px;color:#898989;margin:36px 0 22px;flex-wrap:wrap}
.migas a{color:#898989;text-decoration:none}
.migas a:hover{color:#303030;text-decoration:underline}
.migas .sep{color:#c9c9c9}
.pastilla{background:#FFF6D9;color:#7a5c00;font-weight:600;font-size:13px;padding:3px 11px;border-radius:999px}

/* Índice del blog */
.portada h1{font-size:clamp(34px,5.2vw,56px);line-height:1.08;letter-spacing:-.022em;margin:0 0 18px;font-weight:800}
.portada .bajada{font-size:19px;color:#6b6b6b;max-width:720px;margin:0 0 44px;line-height:1.6}

.destacado{display:block;text-decoration:none;color:inherit;border-radius:20px;overflow:hidden;
  position:relative;margin-bottom:56px;background:#303030}
.destacado .lienzo{aspect-ratio:16/8}
.destacado .capa{position:absolute;inset:auto 0 0 0;padding:32px;
  background:linear-gradient(to top,rgba(0,0,0,.82) 0%,rgba(0,0,0,.45) 55%,rgba(0,0,0,0) 100%)}
.destacado h2{color:#fff;font-size:clamp(21px,2.7vw,31px);line-height:1.25;margin:0 0 14px;
  font-weight:800;letter-spacing:-.015em;max-width:820px}
.destacado .meta{display:flex;align-items:center;gap:18px;flex-wrap:wrap;color:rgba(255,255,255,.82);font-size:14px}
.destacado .meta b{color:#fff;font-weight:600}
@media(max-width:640px){.destacado .capa{padding:20px;position:static;background:#303030}
  .destacado .lienzo{aspect-ratio:16/10}}

.rejilla{display:grid;grid-template-columns:repeat(auto-fill,minmax(310px,1fr));gap:34px 30px;margin-bottom:72px}
.tarjeta{text-decoration:none;color:inherit;display:flex;flex-direction:column}
.tarjeta .lienzo{aspect-ratio:16/10;border-radius:14px;overflow:hidden;margin-bottom:18px}
.tarjeta h3{font-size:20px;line-height:1.32;margin:10px 0 8px;font-weight:700;letter-spacing:-.01em}
.tarjeta:hover h3{text-decoration:underline}
.tarjeta p{color:#6b6b6b;font-size:15px;margin:0 0 16px;line-height:1.6}
.tarjeta .meta{margin-top:auto;font-size:13.5px;color:#898989;display:flex;align-items:center;gap:10px}
.eti{font-size:12.5px;font-weight:700;color:#7a5c00;background:#FFF6D9;padding:3px 10px;border-radius:999px;
  display:inline-block;align-self:flex-start}

/* Marcador de posición mientras no hay fotografía */
.lienzo{background:linear-gradient(135deg,#FFD85E 0%,#F0C63F 42%,#303030 100%);position:relative}
.lienzo::after{content:'';position:absolute;inset:0;
  background-image:radial-gradient(circle at 22% 28%,rgba(255,255,255,.34) 0,transparent 42%),
  radial-gradient(circle at 78% 76%,rgba(0,0,0,.26) 0,transparent 46%)}
.lienzo img{width:100%;height:100%;object-fit:cover;position:relative;z-index:1}

/* Artículo */
.art-cab{background:#f6f6f4;border-bottom:1px solid #ececec;padding-bottom:52px}
.art-cab .rej{display:grid;grid-template-columns:1.08fr .92fr;gap:52px;align-items:center}
.art-cab h1{font-size:clamp(30px,4.3vw,47px);line-height:1.13;letter-spacing:-.02em;margin:0 0 26px;font-weight:800}
.firma{display:flex;align-items:center;gap:13px;font-size:15px;color:#6b6b6b}
.firma .avatar{width:44px;height:44px;border-radius:50%;background:#303030;color:#FFD85E;
  display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px;flex-shrink:0}
.firma .avatar img{width:100%;height:100%;border-radius:50%;object-fit:cover}
.firma b{color:#303030;font-weight:650}
.art-cab .lienzo{border-radius:18px;overflow:hidden;aspect-ratio:16/11}
@media(max-width:900px){.art-cab .rej{grid-template-columns:1fr;gap:30px}}

.cuerpo-rej{display:grid;grid-template-columns:272px 1fr;gap:64px;padding:52px 0 88px;align-items:start}
@media(max-width:900px){.cuerpo-rej{grid-template-columns:1fr;gap:34px;padding-top:34px}}

.lateral{position:sticky;top:96px}
@media(max-width:900px){.lateral{position:static}}
.lateral h4{font-size:14px;font-weight:700;margin:0 0 13px;letter-spacing:.01em}
.compartir{display:flex;gap:9px;margin-bottom:30px}
.compartir a{width:39px;height:39px;border-radius:50%;background:#f2f2f0;display:flex;align-items:center;
  justify-content:center;text-decoration:none;color:#303030;font-size:14px;font-weight:700}
.compartir a:hover{background:#FFD85E}
.indice{background:#f6f6f4;border-radius:16px;padding:22px}
.indice ol{list-style:none;margin:0;padding:0;counter-reset:i}
.indice li{counter-increment:i;margin-bottom:11px;line-height:1.42}
.indice li:last-child{margin-bottom:0}
.indice a{color:#6b6b6b;text-decoration:none;font-size:14.5px;display:flex;gap:9px}
.indice a::before{content:counter(i) '.';color:#b8b8b8;font-weight:700;flex-shrink:0}
.indice a:hover{color:#303030}

.cuerpo{max-width:720px;font-size:18px}
.cuerpo .entradilla{font-size:20.5px;line-height:1.62;color:#4a4a4a;margin:0 0 34px}
.cuerpo h2{font-size:28px;line-height:1.25;letter-spacing:-.014em;margin:52px 0 16px;font-weight:800;scroll-margin-top:92px}
.cuerpo h3{font-size:20.5px;line-height:1.35;margin:34px 0 10px;font-weight:700}
.cuerpo p{margin:0 0 20px}
.cuerpo ul,.cuerpo ol{margin:0 0 22px;padding-left:24px}
.cuerpo li{margin-bottom:11px}
.cuerpo strong{font-weight:680}
.cuerpo hr{border:0;border-top:1px solid #e6e6e6;margin:44px 0}
.cuerpo .cierre{font-size:15px;color:#898989;line-height:1.65}
.cuerpo table{width:100%;border-collapse:collapse;margin:0 0 26px;font-size:15.5px;display:block;overflow-x:auto}
.cuerpo th{text-align:left;background:#f6f6f4;font-weight:700;padding:11px 14px;border-bottom:2px solid #e6e6e6;white-space:nowrap}
.cuerpo td{padding:11px 14px;border-bottom:1px solid #efefef}
.cuerpo tbody tr:last-child td{border-bottom:0}
.nota{background:#FFF9E6;border-left:4px solid #FFD85E;border-radius:0 12px 12px 0;padding:18px 22px;margin:0 0 26px}
.nota p{margin:0;font-size:16.5px}

/* Preguntas frecuentes */
.faq{border-top:1px solid #ececec;padding-top:40px;margin-top:52px}
.faq h2{font-size:26px;margin:0 0 24px;font-weight:800;letter-spacing:-.014em}
.faq .par{margin-bottom:26px}
.faq .par h3{font-size:18px;margin:0 0 7px;font-weight:700}
.faq .par p{margin:0;color:#4a4a4a;font-size:16.5px}

/* Autor y cierre */
.bio{display:flex;gap:16px;background:#f6f6f4;border-radius:16px;padding:22px;margin:44px 0 0;align-items:flex-start}
.bio .avatar{width:54px;height:54px;flex-shrink:0}
.bio p{margin:5px 0 0;font-size:15px;color:#6b6b6b;line-height:1.6}
.bio b{font-size:16px}
.bio span{color:#898989;font-size:14px}

.remate{background:#303030;border-radius:20px;padding:40px;margin:52px 0 0;color:#fff}
.remate h2{color:#fff;font-size:26px;margin:0 0 12px;font-weight:800;letter-spacing:-.014em}
.remate p{color:rgba(255,255,255,.76);margin:0 0 24px;font-size:16.5px}

.siguiente{border-top:1px solid #ececec;padding:44px 0 0;margin-top:52px}
.siguiente h4{font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:#898989;margin:0 0 18px;font-weight:700}

/* Pie */
.pie{border-top:1px solid #ececec;padding:34px 0;margin-top:72px;color:#898989;font-size:14.5px}
.pie .env{display:flex;justify-content:space-between;gap:18px;flex-wrap:wrap;align-items:center}
.pie a{color:#898989;text-decoration:none}
.pie a:hover{color:#303030}
`;

function cabecera() {
  return `<header class="cab"><div class="env">
    <a href="/" aria-label="HoraPro"><img src="/logo.svg" alt="HoraPro" width="120" height="26" /></a>
    <nav>
      <a href="/" class="oculta-movil">Inicio</a>
      <a href="/#precios" class="oculta-movil">Precios</a>
      <a href="/blog/">Blog</a>
      <a href="/registro" class="cta">Prueba gratis</a>
    </nav>
  </div></header>`;
}

function pie() {
  const anio = new Date().getUTCFullYear();
  return `<footer class="pie"><div class="env">
    <span>© ${anio} HoraPro · Un producto de Krumlab</span>
    <span><a href="/">Inicio</a> · <a href="/#precios">Precios</a> · <a href="/blog/">Blog</a></span>
  </div></footer>`;
}

// Bloque de imagen. Mientras no haya fotografía, el degradado de marca queda como
// una portada intencionada en vez de un hueco roto.
function lienzo(src, alt, ancho, alto) {
  if (!src) return `<div class="lienzo" role="img" aria-label="${esc(alt)}"></div>`;
  return `<div class="lienzo"><img src="${esc(src)}" alt="${esc(alt)}" width="${ancho}" height="${alto}" loading="lazy" /></div>`;
}

function avatar() {
  if (AUTOR.foto) return `<span class="avatar"><img src="${esc(AUTOR.foto)}" alt="${esc(AUTOR.nombre)}" width="44" height="44" /></span>`;
  const iniciales = AUTOR.nombre.split(' ').map(p => p[0]).slice(0, 2).join('');
  return `<span class="avatar" aria-hidden="true">${esc(iniciales)}</span>`;
}

function documento({ titulo, descripcion, ruta, jsonLd, cuerpo, imagen }) {
  const url = `${SITIO.url}${ruta}`;
  const og = imagen ? `${SITIO.url}${imagen}` : `${SITIO.url}/og-image.png`;
  return `<!doctype html>
<html lang="es-CO">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(descripcion)}" />
<link rel="canonical" href="${url}" />
<meta name="robots" content="index, follow, max-image-preview:large" />
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<meta name="theme-color" content="#FFD85E" />
<meta property="og:type" content="${ruta === '/blog/' ? 'website' : 'article'}" />
<meta property="og:site_name" content="HoraPro" />
<meta property="og:locale" content="es_CO" />
<meta property="og:url" content="${url}" />
<meta property="og:title" content="${esc(titulo)}" />
<meta property="og:description" content="${esc(descripcion)}" />
<meta property="og:image" content="${og}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(titulo)}" />
<meta name="twitter:description" content="${esc(descripcion)}" />
<meta name="twitter:image" content="${og}" />
<style>${CSS}</style>
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body>
${cabecera()}
${cuerpo}
${pie()}
</body>
</html>`;
}

export function paginaIndice(articulos) {
  const [primero, ...resto] = articulos;

  const tarjeta = a => `<a class="tarjeta" href="/blog/${a.slug}/">
    ${lienzo(a.imagen, a.imagenAlt, 640, 400)}
    <span class="eti">${esc(a.categoria)}</span>
    <h3>${esc(a.titulo)}</h3>
    <p>${esc(a.descripcion)}</p>
    <span class="meta">${fechaLarga(a.fecha)} · ${a.lectura} min de lectura</span>
  </a>`;

  const cuerpo = `<main class="env portada">
  <nav class="migas" aria-label="Ruta"><a href="/">Inicio</a><span class="sep">›</span><span>Blog</span></nav>
  <h1>El blog de HoraPro</h1>
  <p class="bajada">${esc(SITIO.descripcionBlog)}</p>

  <a class="destacado" href="/blog/${primero.slug}/">
    ${lienzo(primero.imagen, primero.imagenAlt, 1200, 600)}
    <div class="capa">
      <h2>${esc(primero.titulo)}</h2>
      <div class="meta"><span>Por <b>${esc(AUTOR.nombre)}</b></span><span>${fechaLarga(primero.fecha)}</span><span>${primero.lectura} min de lectura</span></div>
    </div>
  </a>

  ${resto.length ? `<div class="rejilla">${resto.map(tarjeta).join('')}</div>` : ''}
</main>`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    '@id': `${SITIO.url}/blog/`,
    name: 'Blog de HoraPro',
    description: SITIO.descripcionBlog,
    inLanguage: 'es-CO',
    publisher: { '@type': 'Organization', name: 'HoraPro', url: SITIO.url, logo: `${SITIO.url}/logo.svg` },
    blogPost: articulos.map(a => ({
      '@type': 'BlogPosting',
      headline: a.titulo,
      url: `${SITIO.url}/blog/${a.slug}/`,
      datePublished: a.fecha,
      dateModified: a.actualizado,
      author: { '@type': 'Person', name: AUTOR.nombre },
    })),
  };

  return documento({
    titulo: 'Blog de HoraPro | Normativa laboral y control de horarios en Colombia',
    descripcion: SITIO.descripcionBlog,
    ruta: '/blog/',
    imagen: null,
    jsonLd,
    cuerpo,
  });
}

export function paginaArticulo(a, todos) {
  const url = `${SITIO.url}/blog/${a.slug}/`;
  const otro = todos.find(x => x.slug !== a.slug);
  const compartirTexto = encodeURIComponent(`${a.titulo} — ${url}`);

  const indice = a.secciones.length
    ? `<div class="indice"><h4>En este artículo</h4><ol>${a.secciones
        .map(s => `<li><a href="#${s.id}">${esc(s.titulo)}</a></li>`).join('')}</ol></div>`
    : '';

  const faq = a.faq?.length
    ? `<section class="faq"><h2>Preguntas frecuentes</h2>${a.faq
        .map(f => `<div class="par"><h3>${esc(f.p)}</h3><p>${esc(f.r)}</p></div>`).join('')}</section>`
    : '';

  const siguiente = otro
    ? `<section class="siguiente"><h4>Sigue leyendo</h4>
        <a class="tarjeta" href="/blog/${otro.slug}/" style="max-width:520px">
          <span class="eti">${esc(otro.categoria)}</span>
          <h3>${esc(otro.titulo)}</h3>
          <p>${esc(otro.descripcion)}</p>
        </a></section>`
    : '';

  const cuerpo = `<div class="art-cab"><div class="env">
    <nav class="migas" aria-label="Ruta">
      <a href="/">Inicio</a><span class="sep">›</span><a href="/blog/">Blog</a>
      <span class="sep">›</span><span class="pastilla">${esc(a.categoria)}</span>
    </nav>
    <div class="rej">
      <div>
        <h1>${esc(a.titulo)}</h1>
        <div class="firma">${avatar()}<span><b>${esc(AUTOR.nombre)}</b>, ${esc(AUTOR.cargo)}<br />Actualizado el ${fechaLarga(a.actualizado)} · ${a.lectura} min de lectura</span></div>
      </div>
      ${lienzo(a.imagen, a.imagenAlt, 900, 620)}
    </div>
  </div></div>

  <main class="env">
    <div class="cuerpo-rej">
      <aside class="lateral">
        <h4>Compartir</h4>
        <div class="compartir">
          <a href="https://wa.me/?text=${compartirTexto}" target="_blank" rel="noopener" aria-label="Compartir por WhatsApp">WA</a>
          <a href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}" target="_blank" rel="noopener" aria-label="Compartir en LinkedIn">in</a>
          <a href="https://twitter.com/intent/tweet?text=${compartirTexto}" target="_blank" rel="noopener" aria-label="Compartir en X">X</a>
        </div>
        ${indice}
      </aside>

      <article class="cuerpo">
        ${a.cuerpo}
        ${faq}
        <div class="bio">${avatar()}<div><b>${esc(AUTOR.nombre)}</b><br /><span>${esc(AUTOR.cargo)}</span><p>${esc(AUTOR.bio)}</p></div></div>
        <div class="remate">
          <h2>Deja de sacar las cuentas a mano</h2>
          <p>HoraPro registra la jornada y liquida recargos, extras, dominicales y festivos con la normativa colombiana al día. Siete días de prueba, sin tarjeta.</p>
          <a href="/registro" class="cta">Probar gratis</a>
        </div>
        ${siguiente}
      </article>
    </div>
  </main>`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BlogPosting',
        '@id': url,
        headline: a.titulo,
        description: a.descripcion,
        inLanguage: 'es-CO',
        datePublished: a.fecha,
        dateModified: a.actualizado,
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
        author: { '@type': 'Person', name: AUTOR.nombre, jobTitle: AUTOR.cargo, description: AUTOR.bio },
        publisher: { '@type': 'Organization', name: 'HoraPro', url: SITIO.url, logo: { '@type': 'ImageObject', url: `${SITIO.url}/logo.svg` } },
        image: a.imagen ? `${SITIO.url}${a.imagen}` : `${SITIO.url}/og-image.png`,
        articleSection: a.categoria,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${SITIO.url}/` },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITIO.url}/blog/` },
          { '@type': 'ListItem', position: 3, name: a.titulo, item: url },
        ],
      },
      ...(a.faq?.length ? [{
        '@type': 'FAQPage',
        mainEntity: a.faq.map(f => ({
          '@type': 'Question', name: f.p,
          acceptedAnswer: { '@type': 'Answer', text: f.r },
        })),
      }] : []),
    ],
  };

  return documento({
    titulo: a.tituloSeo, descripcion: a.descripcion,
    ruta: `/blog/${a.slug}/`, imagen: a.imagen, jsonLd, cuerpo,
  });
}
