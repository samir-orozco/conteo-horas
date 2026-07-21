// Exportación de reportes a Excel (.xlsx real, con varias hojas).
// Usa SheetJS con carga diferida (solo se descarga al exportar, no en el bundle base).
type Celda = string | number;
export type Hoja = { nombre: string; columnas: string[]; filas: Celda[][] };

// Nombre de hoja válido para Excel: máx 31 chars y sin caracteres prohibidos.
const nombreHoja = (n: string) => n.slice(0, 31).replace(/[\\/?*[\]:]/g, ' ');

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
