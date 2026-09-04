import { describe, it, expect } from 'vitest';
import { urlsParaAvisar, cuerpoIndexNow } from './indexnow.mjs';

// A quién se le avisa y qué se le manda.
//
// IndexNow pide que se anuncien solo las URLs que CAMBIARON. Mandar las once en
// cada despliegue es lo que su documentación llama spam, y devuelve 429.

const SITEMAP = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://horapro.co/</loc><lastmod>2026-09-03</lastmod></url>
  <url><loc>https://horapro.co/blog/</loc><lastmod>2026-09-03</lastmod></url>
  <url><loc>https://horapro.co/registro</loc></url>
  <url><loc>https://horapro.co/blog/prorrogas-contrato-termino-fijo-colombia/</loc><lastmod>2026-09-02</lastmod></url>
  <url><loc>https://horapro.co/blog/jornada-laboral-colombia-2026/</loc><lastmod>2026-08-20</lastmod></url>
</urlset>`;

describe('urlsParaAvisar', () => {
  it('manda las que cambiaron en la fecha que se le pasa', () => {
    expect(urlsParaAvisar(SITEMAP, { desde: '2026-09-03' })).toEqual([
      'https://horapro.co/',
      'https://horapro.co/blog/',
    ]);
  });

  it('incluye las de días anteriores si se le abre la ventana', () => {
    // Publicar un martes y desplegar el jueves es normal. Con `desde` se
    // recupera lo que se quedó sin anunciar.
    const r = urlsParaAvisar(SITEMAP, { desde: '2026-09-02' });
    expect(r).toContain('https://horapro.co/blog/prorrogas-contrato-termino-fijo-colombia/');
    expect(r).not.toContain('https://horapro.co/blog/jornada-laboral-colombia-2026/');
  });

  it('con --todas manda el sitemap entero, incluidas las que no tienen fecha', () => {
    expect(urlsParaAvisar(SITEMAP, { todas: true })).toHaveLength(5);
  });

  it('sin nada que anunciar devuelve vacío, no el sitemap entero', () => {
    // El error caro sería mandarlo todo por defecto: eso es lo que se castiga.
    expect(urlsParaAvisar(SITEMAP, { desde: '2026-12-01' })).toEqual([]);
  });

  it('ignora una URL sin fecha cuando se filtra por fecha', () => {
    // /registro no tiene lastmod: no se sabe si cambió, así que no se anuncia.
    expect(urlsParaAvisar(SITEMAP, { desde: '2026-01-01' }))
      .not.toContain('https://horapro.co/registro');
  });

  it('un sitemap vacío no revienta', () => {
    expect(urlsParaAvisar('<urlset></urlset>', { todas: true })).toEqual([]);
  });
});

describe('cuerpoIndexNow', () => {
  const urls = ['https://horapro.co/blog/uno/', 'https://horapro.co/blog/dos/'];

  it('arma el cuerpo que pide la especificación', () => {
    const c = cuerpoIndexNow(urls, 'abc123');
    expect(c.host).toBe('horapro.co');
    expect(c.key).toBe('abc123');
    expect(c.urlList).toEqual(urls);
  });

  it('el host sale de las URLs, no de una constante suelta', () => {
    // Si el host no coincide con las URLs, IndexNow responde 422. Sacarlo de
    // los propios datos hace imposible que se desincronicen.
    expect(cuerpoIndexNow(['https://www.otro.com/x'], 'k').host).toBe('www.otro.com');
  });

  it('sin URLs no hay cuerpo que mandar', () => {
    expect(cuerpoIndexNow([], 'k')).toBeNull();
  });
});
