// Genera la plantilla de Siigo que HoraPro lleva adentro (15 de septiembre de 2026; rehecha el 23).
//
//   node scripts/generar-plantilla-siigo.mjs
//
// Parte del archivo real que entregó el dueño (src/pruebas/fixtures/siigo-novedades.xlsx, el que Siigo
// le da a su empresa) y produce dos cosas:
//
//   1. plantillas/siigo-novedades.xlsx  — el mismo archivo, sin los datos de esa empresa.
//   2. plantillas/siigoPlantilla.ts     — ese archivo en base64, que es lo que se importa desde el código.
//
// Qué se le quita: los empleados del cliente (nombre, cédula y contrato, en las filas de datos) y los
// conceptos que esa empresa creó en su Siigo, en la hoja «Conceptos creados por usuario». Ninguna de las
// dos cosas puede viajar en el código, porque la descargaría cualquier otro cliente. Antes solo se
// quitaban los empleados, y por eso hasta el 23/09 viajaba el concepto «49 - Compra de producto» del
// dueño en el archivo de todos.
//
// Qué se conserva, y por qué importa: TODO lo demás, byte por byte. Se edita el XML de las hojas dentro
// del zip en vez de volver a armar el libro con la librería de Excel. Siigo rechaza con un 500 cualquier
// archivo rearmado —probado el 23 de septiembre de 2026 con seis archivos contra su servidor—, así que
// la plantilla que HoraPro lleva adentro tiene que conservar el empaquetado original. La misma razón
// está explicada en features/reportes/plantillas/escribirEnPlantillaSiigo.ts, que es quien la llena.
//
// Por qué base64 y no un import con ?url: así se lee igual en el navegador y en las pruebas, que corren
// en Node y no tienen un servidor del cual bajar el archivo. Medido el 15/09: con ?url el valor que
// llega a las pruebas es una ruta (/src/...) que `fetch` no puede resolver fuera del navegador.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { unzipSync, zipSync, strToU8, strFromU8 } from 'fflate';

const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = join(aqui, '..');
const ORIGEN = join(raiz, 'src', 'pruebas', 'fixtures', 'siigo-novedades.xlsx');
const DESTINO_XLSX = join(raiz, 'src', 'features', 'reportes', 'plantillas', 'siigo-novedades.xlsx');
const DESTINO_TS = join(raiz, 'src', 'features', 'reportes', 'plantillas', 'siigoPlantilla.ts');
const PRIMERA_FILA = 6;

const partes = unzipSync(new Uint8Array(readFileSync(ORIGEN)));
const libro = strFromU8(partes['xl/workbook.xml']);
const rels = strFromU8(partes['xl/_rels/workbook.xml.rels']);
const rutaDe = nombre => {
  const id = libro.match(new RegExp(`<sheet[^>]*name="${nombre}"[^>]*r:id="([^"]+)"`))?.[1];
  const destino = id && rels.match(new RegExp(`Id="${id}"[^>]*Target="([^"]+)"`))?.[1];
  if (!destino) throw new Error(`El archivo de origen no tiene la hoja «${nombre}»`);
  return destino.startsWith('/') ? destino.slice(1) : `xl/${destino}`;
};

// Una celda vacía conserva su formato y su fórmula, y pierde su valor. Así la plantilla sigue sabiendo
// pintar una fecha como fecha y calcular la columna «Tipo», sin decir de quién eran esos datos.
const vaciarCelda = celda => {
  const formula = celda.match(/<f[^>]*>[\s\S]*?<\/f>/)?.[0];
  const referencia = celda.match(/r="[A-Z]+\d+"/)[0];
  const estilo = celda.match(/\ss="\d+"/)?.[0] ?? '';
  return formula ? `<c ${referencia}${estilo} t="str">${formula}<v/></c>` : `<c ${referencia}${estilo}/>`;
};

function vaciarFilas(xml, desde, hasta = Infinity) {
  return xml.replace(/<row r="(\d+)"([^>]*)>([\s\S]*?)<\/row>/g, (todo, n, atributos, dentro) => {
    const fila = Number(n);
    if (fila < desde || fila > hasta) return todo;
    if (dentro.includes('HASTA ACA')) return todo;
    const celdas = (dentro.match(/<c [^>]*\/>|<c [^>]*>[\s\S]*?<\/c>/g) ?? []).map(vaciarCelda).join('');
    return `<row r="${n}"${atributos}>${celdas}</row>`;
  });
}

// La hoja de novedades: fuera los empleados, hasta el aviso que marca el final de la zona escribible.
const rutaNovedades = rutaDe('Novedades');
const cadenas = strFromU8(partes['xl/sharedStrings.xml']);
const textos = (cadenas.match(/<si>[\s\S]*?<\/si>/g) ?? [])
  .map(si => (si.match(/<t[^>]*>([\s\S]*?)<\/t>/g) ?? []).map(t => t.replace(/<[^>]+>/g, '')).join(''));
const indiceDelAviso = textos.findIndex(t => t.toUpperCase().includes('HASTA ACA'));
const novedades = strFromU8(partes[rutaNovedades]);
const filaDelAviso = Number(novedades.match(new RegExp(`<c r="A(\\d+)"[^>]*t="s"[^>]*><v>${indiceDelAviso}</v>`))?.[1] ?? Infinity);
partes[rutaNovedades] = strToU8(vaciarFilas(novedades, PRIMERA_FILA, filaDelAviso - 1));

// Y los conceptos que creó esa empresa en su Siigo: la hoja lleva dos filas de títulos.
const rutaConceptos = rutaDe('Conceptos creados por usuario');
partes[rutaConceptos] = strToU8(vaciarFilas(strFromU8(partes[rutaConceptos]), 3));

// Vaciar las celdas no basta: Excel guarda los textos en un catálogo aparte, y ahí seguían los nombres
// y las cédulas de las 14 personas del dueño aunque ninguna celda los nombrara. Se vacía el texto de las
// entradas que ya no usa nadie, en vez de borrarlas: las celdas nombran su posición en la lista, y
// quitar una correría todas las demás.
const usados = new Set();
for (const [nombre, contenido] of Object.entries(partes)) {
  if (!nombre.startsWith('xl/worksheets/') || !nombre.endsWith('.xml')) continue;
  for (const celda of strFromU8(contenido).match(/<c [^>]*t="s"[^>]*>[\s\S]*?<\/c>/g) ?? []) {
    const indice = celda.match(/<v>(\d+)<\/v>/)?.[1];
    if (indice !== undefined) usados.add(Number(indice));
  }
}
let cual = -1;
let vaciados = 0;
partes['xl/sharedStrings.xml'] = strToU8(cadenas.replace(/<si>[\s\S]*?<\/si>/g, si => {
  cual++;
  if (usados.has(cual)) return si;
  vaciados++;
  return '<si><t xml:space="preserve"></t></si>';
}));

writeFileSync(DESTINO_XLSX, Buffer.from(zipSync(partes)));
const base64 = readFileSync(DESTINO_XLSX).toString('base64');

writeFileSync(DESTINO_TS, `// La plantilla de novedades de Siigo que HoraPro lleva adentro, en base64 (15 de septiembre de 2026).
//
// Es el archivo que Siigo entrega a cada cliente, con sus tres hojas y su catálogo de conceptos, pero
// SIN los empleados ni los conceptos propios de ninguna empresa: eso no puede viajar en el código,
// porque lo descargaría cualquier otro cliente.
//
// Conserva el empaquetado original del archivo de Siigo, que es lo que su importador necesita: rechaza
// con un 500 cualquier archivo que se vuelva a armar (ver escribirEnPlantillaSiigo.ts, que es quien la
// llena). Por eso se genera editando el XML por dentro, con scripts/generar-plantilla-siigo.mjs a
// partir de src/pruebas/fixtures/siigo-novedades.xlsx. NO se edita a mano.
//
// Va como base64 y no como archivo importado con ?url a propósito: así se lee igual en el navegador y
// en las pruebas, que corren en Node y no tienen un servidor del cual bajarlo.
export const SIIGO_PLANTILLA_BASE64 =
  '${base64}';

// Los bytes de la plantilla, decodificados. Funciona en el navegador (atob) y en Node (Buffer).
export function plantillaDeSiigo(): Uint8Array {
  if (typeof atob === 'function') {
    const binario = atob(SIIGO_PLANTILLA_BASE64);
    const bytes = new Uint8Array(binario.length);
    for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
    return bytes;
  }
  return new Uint8Array(Buffer.from(SIIGO_PLANTILLA_BASE64, 'base64'));
}
`);

console.log(`Plantilla lista: ${(base64.length / 1024).toFixed(0)} KB en base64, aviso en la fila ${filaDelAviso}, ${vaciados} textos del cliente vaciados.`);
