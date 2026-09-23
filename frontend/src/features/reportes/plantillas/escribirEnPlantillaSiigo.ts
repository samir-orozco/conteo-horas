import { unzipSync, zipSync, strToU8, strFromU8 } from 'fflate';

// Escribe las novedades DENTRO del archivo de Siigo, sin volver a armarlo (23 de septiembre de 2026).
//
// Por qué así, medido contra el Siigo de un cliente ese día con seis archivos: cualquier archivo
// REARMADO por la librería de Excel (leer el libro y volver a escribirlo) lo rechaza con
// `500 unhandled_error · Object reference not set to an instance of an object`, aunque los datos sean
// correctos. Se probó rearmando la plantilla propia y la que el cliente acababa de bajar de Siigo, con
// los contratos y las fechas buenas: todas fallaron. El mismo archivo con solo los VALORES cambiados
// por dentro entró a la primera. Algo del empaquetado original necesita su importador y la librería no
// lo reproduce; no se averiguó qué.
//
// Entonces aquí se abre el archivo como lo que es —un zip de piezas XML—, se cambian las celdas de la
// hoja «Novedades», se agregan al catálogo de textos las palabras nuevas, y todo lo demás se devuelve
// byte por byte: estilos, fórmulas, validaciones, el catálogo «datos» y las piezas internas de Excel.
export type FilaDePlantilla = {
  contrato: string;
  cedula: string;
  nombre: string;
  concepto: string;
  unidad: string;
  cantidad: number;
  desde: string; // DD/MM/AAAA, como las escribe la plantilla
  hasta: string;
  diasNoHabiles: number;
  tipo: string; // «Ingreso» o «Deducción», del catálogo de la plantilla
};

const PRIMERA_FILA = 6;
const HOJA = 'Novedades';
const CADENAS = 'xl/sharedStrings.xml';

const escapar = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Excel cuenta los días desde el 30 de diciembre de 1899. Se arma en UTC para que el resultado no
// dependa de la zona del navegador: con hora local, un mismo día da un número distinto en Bogotá que
// en Madrid.
function serieDeExcel(fecha: string): number {
  const [d, m, a] = fecha.split('/').map(Number);
  return Math.round((Date.UTC(a, m - 1, d) - Date.UTC(1899, 11, 30)) / 86_400_000);
}

// El catálogo de textos del archivo. Excel guarda las cadenas una sola vez y las celdas las nombran por
// su posición, así que escribir un texto nuevo es agregarlo aquí y usar su número.
class Catalogo {
  private textos: string[] = [];
  private agregados: string[] = [];
  private xml: string | null;
  constructor(xml: string | null) {
    this.xml = xml;
    if (!xml) return;
    for (const si of xml.match(/<si>[\s\S]*?<\/si>/g) ?? []) {
      this.textos.push((si.match(/<t[^>]*>([\s\S]*?)<\/t>/g) ?? [])
        .map(t => t.replace(/<[^>]+>/g, '')).join(''));
    }
  }

  numeroDe(texto: string): number {
    const escapado = escapar(texto);
    const existente = this.textos.indexOf(escapado);
    if (existente >= 0) return existente;
    const yaAgregado = this.agregados.indexOf(escapado);
    if (yaAgregado >= 0) return this.textos.length + yaAgregado;
    this.agregados.push(escapado);
    return this.textos.length + this.agregados.length - 1;
  }

  buscar(fragmento: string): number {
    return this.textos.findIndex(t => t.toUpperCase().includes(fragmento.toUpperCase()));
  }

  get cambio() { return this.agregados.length > 0; }

  nuevoXml(): string {
    if (!this.xml) throw new Error('La plantilla de Siigo no trae catálogo de textos.');
    const total = this.textos.length + this.agregados.length;
    return this.xml
      .replace('</sst>', this.agregados.map(t => `<si><t xml:space="preserve">${t}</t></si>`).join('') + '</sst>')
      .replace(/uniqueCount="\d+"/, `uniqueCount="${total}"`)
      .replace(/count="\d+"/, `count="${total}"`);
  }
}

// La hoja «Novedades» no siempre es sheet1.xml: se busca por su nombre en el libro y se resuelve su
// archivo por la relación, como haría Excel.
function rutaDeLaHoja(partes: Record<string, Uint8Array>): string {
  const libro = strFromU8(partes['xl/workbook.xml'] ?? new Uint8Array());
  const id = libro.match(new RegExp(`<sheet[^>]*name="${HOJA}"[^>]*r:id="([^"]+)"`))?.[1];
  const rels = strFromU8(partes['xl/_rels/workbook.xml.rels'] ?? new Uint8Array());
  const destino = id ? rels.match(new RegExp(`Id="${id}"[^>]*Target="([^"]+)"`))?.[1] : null;
  if (!destino) throw new Error(`La plantilla de Siigo no tiene la hoja «${HOJA}».`);
  return destino.startsWith('/') ? destino.slice(1) : `xl/${destino}`;
}

type Celda = { estilo: string; formula: string };

// El primer estilo con formato de fecha que declara el archivo. Los 14 a 17 y el 22 son los formatos de
// fecha que trae Excel de fábrica; también vale uno propio cuyo código hable de día, mes y año.
function estiloDeFecha(partes: Record<string, Uint8Array>): string {
  const estilos = strFromU8(partes['xl/styles.xml'] ?? new Uint8Array());
  const propios = new Set((estilos.match(/<numFmt [^>]*\/>/g) ?? [])
    .filter(f => /formatCode="[^"]*[dD][^"]*[yY]|formatCode="[^"]*[yY][^"]*[dD]/.test(f))
    .map(f => f.match(/numFmtId="(\d+)"/)?.[1] ?? ''));
  const cellXfs = estilos.match(/<cellXfs[^>]*>[\s\S]*?<\/cellXfs>/)?.[0] ?? '';
  const lista = cellXfs.match(/<xf [^>]*\/>|<xf [^>]*>[\s\S]*?<\/xf>/g) ?? [];
  const cual = lista.findIndex(xf => {
    const id = xf.match(/numFmtId="(\d+)"/)?.[1] ?? '';
    return ['14', '15', '16', '17', '22'].includes(id) || propios.has(id);
  });
  return cual >= 0 ? String(cual) : '';
}

// Lo que ya tiene la plantilla en esa fila: el estilo de cada columna y, en «Tipo de novedad» y
// «Tipo», su fórmula. Las dos se conservan tal cual y solo se les cambia el valor guardado, que es lo
// que lee quien abre el archivo sin recalcularlo.
function celdasDeLaFila(fila: string): Record<string, Celda> {
  const celdas: Record<string, Celda> = {};
  for (const c of fila.match(/<c [^>]*\/>|<c [^>]*>[\s\S]*?<\/c>/g) ?? []) {
    const columna = c.match(/r="([A-Z]+)\d+"/)?.[1];
    if (!columna) continue;
    celdas[columna] = {
      estilo: c.match(/\ss="(\d+)"/)?.[1] ?? '',
      formula: c.match(/<f[^>]*>[\s\S]*?<\/f>/)?.[0] ?? '',
    };
  }
  return celdas;
}

export function escribirEnPlantillaSiigo(plantilla: Uint8Array, filas: FilaDePlantilla[]): Uint8Array {
  const partes = unzipSync(plantilla);
  const ruta = rutaDeLaHoja(partes);
  let hoja = strFromU8(partes[ruta]);
  const catalogo = new Catalogo(partes[CADENAS] ? strFromU8(partes[CADENAS]) : null);

  // El aviso «HASTA ACA PUEDES INCLUIR INFORMACION» marca el final de la zona escribible, y pisarlo
  // dejaría un archivo que Siigo ya no entiende.
  const avisoTexto = catalogo.buscar('HASTA ACA');
  const avisoFila = avisoTexto < 0 ? Infinity
    : Number(hoja.match(new RegExp(`<c r="A(\\d+)"[^>]*t="s"[^>]*><v>${avisoTexto}</v>`))?.[1] ?? Infinity);

  // Los estilos que ya usa la plantilla sirven de molde para las celdas que trae vacías: sin el estilo
  // de fecha, Excel pinta un número de cinco cifras en vez de una fecha. Se miran varias filas porque
  // ninguna las trae todas: la plantilla del dueño, por ejemplo, tiene el estilo de «desde» y no el de
  // «hasta», que nunca se llenó.
  const molde: Record<string, Celda> = {};
  for (const fila of hoja.match(/<row r="\d+"[^>]*>[\s\S]*?<\/row>/g) ?? []) {
    const n = Number(fila.match(/<row r="(\d+)"/)?.[1]);
    if (n < PRIMERA_FILA || n >= avisoFila) continue;
    for (const [columna, celda] of Object.entries(celdasDeLaFila(fila))) {
      if (!molde[columna]?.estilo) molde[columna] = celda;
    }
  }
  // Y si en toda la hoja no hay una celda de fecha, se toma el primer estilo de fecha que declare el
  // archivo: está ahí aunque ninguna celda lo use todavía.
  for (const columna of ['G', 'H']) {
    if (!molde[columna]?.estilo) molde[columna] = { estilo: estiloDeFecha(partes), formula: molde[columna]?.formula ?? '' };
  }

  filas.forEach((f, i) => {
    const n = PRIMERA_FILA + i;
    if (n >= avisoFila) return;
    const patron = new RegExp(`<row r="${n}"([^>]*)(?:/>|>([\\s\\S]*?)</row>)`);
    const encontrada = hoja.match(patron);
    const propias = celdasDeLaFila(encontrada?.[2] ?? '');
    // El estilo puede venir del molde, pero la FÓRMULA no: la de la plantilla nombra su propia fila
    // (`IF(D6="",…)`), y copiarla a otra fila la dejaría mirando los datos de la de arriba.
    const de = (columna: string): Celda => ({
      estilo: propias[columna]?.estilo || molde[columna]?.estilo || '',
      formula: propias[columna]?.formula ?? '',
    });
    const con = (columna: string, dentro: string, tipo = '') => {
      const { estilo, formula } = de(columna);
      const s = estilo ? ` s="${estilo}"` : '';
      const t = formula ? ' t="str"' : tipo;
      return `<c r="${columna}${n}"${s}${t}>${formula}${dentro}</c>`;
    };
    const texto = (columna: string, valor: string) => {
      const { formula } = de(columna);
      // Con fórmula se conserva la fórmula y se actualiza su resultado; sin ella va como texto del
      // catálogo, que es como la plantilla guarda los demás textos.
      return formula ? con(columna, `<v>${escapar(valor)}</v>`)
        : con(columna, `<v>${catalogo.numeroDe(valor)}</v>`, ' t="s"');
    };
    const celdas = texto('A', f.contrato) + texto('B', f.cedula) + texto('C', f.nombre)
      + texto('D', f.concepto) + texto('E', f.unidad)
      + con('F', `<v>${Number(f.cantidad.toFixed(4))}</v>`)
      + con('G', `<v>${serieDeExcel(f.desde)}</v>`)
      + con('H', `<v>${serieDeExcel(f.hasta)}</v>`)
      + con('I', `<v>${Math.trunc(f.diasNoHabiles)}</v>`)
      + texto('J', `${f.tipo}${f.unidad}`);
    const nueva = `<row r="${n}"${encontrada?.[1] ?? ''}>${celdas}</row>`;
    hoja = encontrada ? hoja.replace(patron, nueva) : hoja.replace('</sheetData>', `${nueva}</sheetData>`);
  });

  partes[ruta] = strToU8(hoja);
  if (catalogo.cambio) partes[CADENAS] = strToU8(catalogo.nuevoXml());
  return zipSync(partes);
}
