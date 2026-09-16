// Genera la plantilla de Siigo que HoraPro lleva adentro (15 de septiembre de 2026).
//
//   node scripts/generar-plantilla-siigo.mjs
//
// Parte del archivo real que entregó el dueño (src/pruebas/fixtures/siigo-novedades.xlsx, el que Siigo
// le da a su empresa) y produce dos cosas:
//
//   1. plantillas/siigo-novedades.xlsx  — el mismo formato, SIN los empleados del cliente.
//   2. plantillas/siigoPlantilla.ts     — ese archivo en base64, que es lo que se importa desde el código.
//
// Por qué sin empleados: la copia original trae las 14 personas de la empresa del dueño, con nombre y
// cédula. Esa copia no puede viajar en el código, porque la descargaría cualquier otro cliente.
//
// Por qué base64 y no un import con ?url: así se lee igual en el navegador y en las pruebas, que corren
// en Node y no tienen un servidor del cual bajar el archivo. Medido el 15/09: con ?url el valor que
// llega a las pruebas es una ruta (/src/...) que `fetch` no puede resolver fuera del navegador.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as XLSX from 'xlsx';

const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = join(aqui, '..');
const ORIGEN = join(raiz, 'src', 'pruebas', 'fixtures', 'siigo-novedades.xlsx');
const DESTINO_XLSX = join(raiz, 'src', 'features', 'reportes', 'plantillas', 'siigo-novedades.xlsx');
const DESTINO_TS = join(raiz, 'src', 'features', 'reportes', 'plantillas', 'siigoPlantilla.ts');

const COLUMNAS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
const PRIMERA_FILA = 6;

const wb = XLSX.read(readFileSync(ORIGEN), { type: 'buffer' });
const hoja = wb.Sheets['Novedades'];
if (!hoja) throw new Error('El archivo de origen no tiene la hoja «Novedades»');

// Fuera los empleados del cliente. Se para en el aviso que marca hasta dónde se puede escribir.
let borradas = 0;
for (let fila = PRIMERA_FILA; fila < 520; fila++) {
  const marca = hoja['A' + fila]?.v;
  if (marca !== undefined && String(marca).toUpperCase().includes('HASTA ACA')) break;
  for (const col of COLUMNAS) if (hoja[col + fila]) { delete hoja[col + fila]; borradas++; }
}

// Celdas sin valor ni fórmula: no aportan nada y engordan el archivo.
for (const nombre of wb.SheetNames) {
  const h = wb.Sheets[nombre];
  for (const clave of Object.keys(h)) {
    if (clave.startsWith('!')) continue;
    const celda = h[clave];
    if (celda.v === undefined && celda.f === undefined) delete h[clave];
  }
}

// `XLSX.writeFile` no sirve aquí: en la versión .mjs esa función está pensada para el navegador, donde
// dispara una descarga, y desde Node falla con «cannot save file». Se escriben los bytes a mano.
writeFileSync(DESTINO_XLSX, Buffer.from(XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' })));
const base64 = readFileSync(DESTINO_XLSX).toString('base64');

writeFileSync(DESTINO_TS, `// La plantilla de novedades de Siigo que HoraPro lleva adentro, en base64 (15 de septiembre de 2026).
//
// Es el archivo que Siigo entrega a cada cliente, con sus tres hojas y su catálogo de conceptos, pero
// SIN empleados: los de cada empresa los escribe HoraPro al exportar. La copia original traía las 14
// personas de la empresa del dueño, y eso no puede viajar en el código: lo descargaría cualquier cliente.
//
// Va como base64 y no como archivo importado con ?url a propósito: así se lee igual en el navegador y
// en las pruebas, que corren en Node y no tienen un servidor del cual bajarlo. Se genera con
// scripts/generar-plantilla-siigo.mjs a partir de src/pruebas/fixtures/siigo-novedades.xlsx.
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

// Comprobación: que lo generado se abra como Excel, sin empleados y con el catálogo entero.
const revision = XLSX.read(readFileSync(DESTINO_XLSX), { type: 'buffer' });
const hojaRevision = revision.Sheets['Novedades'];
const catalogo = XLSX.utils.sheet_to_json(revision.Sheets['datos'], { header: 1, blankrows: false });
if (hojaRevision['A' + PRIMERA_FILA] !== undefined) throw new Error('Quedaron empleados en la plantilla');
if (hojaRevision['A5']?.v !== '#Contrato del empleado') throw new Error('Se perdieron los títulos');
if (catalogo.length < 100) throw new Error('Se perdió el catálogo de conceptos');

console.log(`celdas de empleados borradas: ${borradas}`);
console.log(`hojas: ${revision.SheetNames.join(' | ')}`);
console.log(`catálogo: ${catalogo.length} filas`);
console.log(`generados:\n  ${DESTINO_XLSX}\n  ${DESTINO_TS}`);
