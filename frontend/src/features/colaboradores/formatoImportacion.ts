import { descargarExcelHojas } from '../../lib/exportar';
import { normalizarFecha } from './fechaImportada';

// Las manda el servidor (GET /colaboradores/formato). No se declaran aquí a
// propósito: son el contrato entre el archivo que se descarga y el validador
// que lo lee, y una copia local se separaría del original sin avisar.
export type Columna = {
  clave: string; titulo: string; obligatoria: boolean; ejemplo: string; ayuda?: string;
  // Qué clase de dato es. Lo dice el servidor porque de eso depende cómo se lee
  // la celda y qué control se pinta en la tabla.
  tipo?: 'texto' | 'fecha';
};

export type FilaCruda = Record<string, string>;

// "Cédula" y "CEDULA" son la misma columna. La mitad de los Excel que circulan
// perdieron las tildes por el camino.
const normalizar = (v: unknown) =>
  String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

const celda = (v: unknown) => (v === null || v === undefined ? '' : String(v).trim());

// Cuántos títulos conocidos tiene que traer una fila para considerarla el
// encabezado. Dos evita confundirla con una fila de datos donde alguien escribió
// "Nombre" como cargo.
const MINIMO_TITULOS = 2;

// Convierte la hoja (matriz de celdas) en filas con nombre de campo.
//
// Casa por el TÍTULO del encabezado y no por la posición: la gente reordena las
// columnas, y casar por posición sería casar por suerte. Si el encabezado no se
// reconoce, no se adivina: devolver filas mal mapeadas crearía gente con el
// cargo en el nombre.
export function mapearHoja(matriz: unknown[][], columnas: Columna[]): FilaCruda[] {
  const porTitulo = new Map(columnas.map(c => [normalizar(c.titulo), c.clave]));

  // El encabezado no siempre es la primera fila: alguien le pone un título
  // arriba a la hoja todo el tiempo.
  let iEncabezado = -1;
  for (let i = 0; i < Math.min(matriz.length, 10); i++) {
    const reconocidas = (matriz[i] ?? []).filter(c => porTitulo.has(normalizar(c))).length;
    if (reconocidas >= MINIMO_TITULOS) { iEncabezado = i; break; }
  }
  if (iEncabezado === -1) return [];

  // Posición de cada columna conocida dentro de la hoja.
  const posicion = new Map<string, number>();
  (matriz[iEncabezado] ?? []).forEach((titulo, j) => {
    const clave = porTitulo.get(normalizar(titulo));
    if (clave && !posicion.has(clave)) posicion.set(clave, j);
  });

  const filas: FilaCruda[] = [];
  for (const cruda of matriz.slice(iEncabezado + 1)) {
    const fila: FilaCruda = {};
    for (const c of columnas) {
      const j = posicion.get(c.clave);
      const bruto = j === undefined ? '' : (cruda ?? [])[j];
      // Las fechas se normalizan AL LEER y no al validar: así la tabla muestra
      // de una la fecha que se va a guardar, y quien mira puede comprobar que
      // "11/12/85" quedó como esperaba.
      fila[c.clave] = c.tipo === 'fecha' ? normalizarFecha(bruto) : celda(bruto);
    }
    // Excel arrastra filas vacías al final. No son un error, son el final.
    if (Object.values(fila).some(v => v !== '')) filas.push(fila);
  }
  return filas;
}

// Lee el archivo que eligió la persona y devuelve la primera hoja como matriz.
// SheetJS se carga solo aquí, igual que en la exportación: son cientos de
// kilobytes que no tienen por qué estar en el paquete de arranque.
export async function leerHoja(archivo: File): Promise<unknown[][]> {
  const XLSX = await import('xlsx');
  const datos = new Uint8Array(await archivo.arrayBuffer());
  // cellDates: las celdas de fecha llegan como Date en vez de como el texto que
  // Excel decidió mostrar. Sin esto, la misma celda se lee "11/12/85" en un
  // archivo gringo y "11/12/1985" en uno colombiano, y significan cosas
  // distintas.
  const libro = XLSX.read(datos, { type: 'array', cellDates: true });
  const hoja = libro.Sheets[libro.SheetNames[0]];
  if (!hoja) return [];
  return XLSX.utils.sheet_to_json<unknown[]>(hoja, { header: 1, blankrows: false, raw: true });
}

// Genera el formato para descargar: una hoja con los títulos y un ejemplo, y
// otra con las instrucciones y los horarios que existen de verdad.
export function descargarFormato(columnas: Columna[]) {
  const instrucciones: string[][] = [
    ['Cómo llenar este formato'],
    [''],
    ['1. Escribe una fila por persona, debajo del encabezado de la hoja "Colaboradores".'],
    ['2. Borra la fila de ejemplo antes de subirlo.'],
    ['3. No cambies los títulos de las columnas. Puedes moverlas de lugar si quieres.'],
    ['4. Al subirlo verás una tabla donde puedes corregir todo antes de crear a nadie.'],
    ['5. El horario NO va en este archivo: se elige en esa tabla, de una lista.'],
    [''],
    ['Columna', '¿Obligatoria?', 'Cómo se escribe'],
    ...columnas.map(c => [c.titulo, c.obligatoria ? 'Sí' : 'No', c.ayuda ?? '']),
  ];

  return descargarExcelHojas('formato-colaboradores', [
    { nombre: 'Colaboradores', columnas: columnas.map(c => c.titulo), filas: [columnas.map(c => c.ejemplo)] },
    { nombre: 'Instrucciones', columnas: instrucciones[0], filas: instrucciones.slice(1) },
  ]);
}
