// El día del calendario de Bogotá para un instante, como 'AAAA-MM-DD'.
//
// No con toISOString, que da el día en UTC: desde las 7 p. m. de Bogotá, UTC ya va en el día
// siguiente, y un build del 14 de septiembre de 2026 a las 21:20 dejó el sitemap con
// <lastmod>2026-09-15</lastmod>. Tampoco con getDate(), que da el día de la máquina que compila.
// Las partes se arman a mano en vez de fiarse del orden en que un idioma escribe la fecha.
//
// Lo usan generar-blog.mjs (el lastmod del sitemap y la fecha con que se hornean las
// calculadoras) y avisar-indexnow.mjs (desde qué día anunciar). Tienen que dar el mismo día:
// si uno lo tomara en UTC y el otro en Bogotá, de noche el aviso buscaría cambios de mañana.
const FORMATO = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit',
});

export function diaEnBogota(instante) {
  const parte = Object.fromEntries(FORMATO.formatToParts(instante).map(p => [p.type, p.value]));
  return `${parte.year}-${parte.month}-${parte.day}`;
}
