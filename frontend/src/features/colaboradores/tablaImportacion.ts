import type { Columna } from './formatoImportacion';

// El horario no viene del archivo: se elige en la tabla. Va con las columnas
// del Excel dentro de la misma fila, pero no se pinta en el formato.
export const CLAVE_HORARIO = 'horarioId';

export type FilaEditable = Record<string, string>;

export type ErrorFila = { fila: number; campo: string; mensaje: string };

export function filaVacia(columnas: Columna[]): FilaEditable {
  const fila: FilaEditable = {};
  for (const c of columnas) fila[c.clave] = '';
  fila[CLAVE_HORARIO] = '';
  return fila;
}

// ¿La fila tiene algo escrito de verdad?
//
// El horario NO cuenta: aplicar el horario global lo pone en todas, y si eso
// convirtiera en real a una fila vacía del final, el servidor la reportaría
// como una persona sin nombre y sin cédula.
export function hayDatos(fila: FilaEditable): boolean {
  return Object.entries(fila).some(([clave, valor]) => clave !== CLAVE_HORARIO && valor.trim() !== '');
}

// Los errores del servidor, puestos donde se pueden pintar.
//
// El servidor numera las filas como las ve una persona en Excel, contando el
// encabezado: la primera de datos es la 2. La tabla empieza en cero. Traducir
// mal corre todos los errores una fila y señala a la persona equivocada.
export function mapaDeErrores(errores: ErrorFila[]): Map<string, string> {
  return new Map(errores.map(e => [`${e.fila - 2}:${e.campo}`, e.mensaje]));
}

// Pone el mismo horario a todas las filas que tienen datos.
//
// Pisa el que ya tuvieran: es lo que significa "aplicar a todos". Quien quiera
// una excepción la cambia después en su propia fila.
export function conHorarioGlobal(filas: FilaEditable[], horarioId: string): FilaEditable[] {
  return filas.map(f => (hayDatos(f) ? { ...f, [CLAVE_HORARIO]: horarioId } : { ...f }));
}
