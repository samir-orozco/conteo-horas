// Le avisa a Bing (y a quien más use IndexNow) que algo se publicó.
//
//   npm run indexnow              lo que cambió HOY
//   npm run indexnow -- --desde 2026-09-01
//   npm run indexnow -- --todas   el sitemap entero, para el primer envío
//   npm run indexnow -- --seco    imprime lo que mandaría, sin mandarlo
//
// SE CORRE DESPUÉS DE DESPLEGAR, no al compilar. Compilar en local no publica
// nada, y anunciar una URL que todavía no existe en el servidor hace que Bing
// la rastree, no la encuentre, y la marque como error.
//
// La decisión de qué se anuncia vive en indexnow.mjs, que sí tiene pruebas.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PUNTO_FINAL, CLAVE, urlsParaAvisar, cuerpoIndexNow, explicarRespuesta } from './indexnow.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const bandera = n => args.includes(`--${n}`);
const valor = n => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : null; };

const hoy = new Date().toISOString().slice(0, 10);
const opciones = bandera('todas') ? { todas: true } : { desde: valor('desde') ?? hoy };

// Del sitemap compilado, que es la única lista que refleja lo que de verdad se
// publicó. Leerla del código fuente dejaría anunciar algo que el build no sacó.
const sitemap = join(raiz, 'dist', 'sitemap.xml');
let xml;
try {
  xml = readFileSync(sitemap, 'utf8');
} catch {
  console.error(`No encontré ${sitemap}. Corre "npm run build" primero.`);
  process.exit(1);
}

const urls = urlsParaAvisar(xml, opciones);

if (urls.length === 0) {
  console.log(opciones.todas
    ? 'El sitemap está vacío.'
    : `Nada cambió desde ${opciones.desde}. No hay nada que anunciar.`);
  process.exit(0);
}

console.log(`${urls.length} URL(s) para anunciar:`);
for (const u of urls) console.log(`  ${u}`);

if (bandera('seco')) {
  console.log('\n(--seco: no se mandó nada)');
  process.exit(0);
}

const cuerpo = cuerpoIndexNow(urls, CLAVE);
console.log(`\nAnunciando a ${new URL(PUNTO_FINAL).host}...`);

const r = await fetch(PUNTO_FINAL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(cuerpo),
});

console.log(`HTTP ${r.status} · ${explicarRespuesta(r.status)}`);
// 200 y 202 son las dos formas de "recibido". El 202 solo dice que la
// comprobación de la clave está pendiente, y es la respuesta normal.
process.exit(r.status === 200 || r.status === 202 ? 0 : 1);
