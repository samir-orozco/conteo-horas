// Exportación de reportes a Excel (.xlsx real, con varias hojas).
// Usa SheetJS con carga diferida (solo se descarga al exportar, no en el bundle base).
type Celda = string | number;
export type Hoja = { nombre: string; columnas: string[]; filas: Celda[][] };

// Nombre de hoja válido para Excel: máx 31 chars y sin caracteres prohibidos.
const nombreHoja = (n: string) => n.slice(0, 31).replace(/[\\/?*[\]:]/g, ' ');

// LA DEPENDENCIA "xlsx" APUNTA A UNA URL A PROPÓSITO. No devolverla a npm.
//
// SheetJS dejó de publicar en npm: la última versión que hay allí es la 0.18.5,
// de 2022, y tiene dos avisos de seguridad SIN PARCHE POSIBLE, porque el rango
// ^0.18.5 no puede resolver a nada más. Uno de ellos, un ReDoS en la expresión
// que quita comentarios del XML, es alcanzable desde aquí: esa expresión corre
// al parsear xl/styles.xml en CADA lectura de un .xlsx.
//
// Las versiones parcheadas se publican en cdn.sheetjs.com, que es el sitio
// oficial del proyecto, y por eso package.json apunta al tarball de la 0.20.3.
// El package-lock guarda su hash de integridad, así que una instalación ya
// hecha no depende de que el CDN siga en pie.
//
// Se descartaron las alternativas por motivos concretos, no por gusto:
// ExcelJS no lee el .xls binario viejo (que este importador acepta) y arrastra
// 78 paquetes; @e965/xlsx es un espejo idéntico pero vive en la cuenta de npm
// de una sola persona, y un rango ^0.20.3 se instalaría solo lo que esa cuenta
// publique mañana.
export async function descargarExcelHojas(nombreArchivo: string, hojas: Hoja[]) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  for (const h of hojas) {
    const ws = XLSX.utils.aoa_to_sheet([h.columnas, ...h.filas]);
    XLSX.utils.book_append_sheet(wb, ws, nombreHoja(h.nombre));
  }
  const archivo = nombreArchivo.endsWith('.xlsx') ? nombreArchivo : `${nombreArchivo}.xlsx`;
  XLSX.writeFile(wb, archivo);
}

// Compat: exportar una sola hoja (mismo formato .xlsx).
export function descargarExcel(nombreArchivo: string, _titulo: string, columnas: string[], filas: Celda[][]) {
  return descargarExcelHojas(nombreArchivo, [{ nombre: 'Hoja1', columnas, filas }]);
}
