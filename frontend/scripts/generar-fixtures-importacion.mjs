// Genera los binarios de Excel con los que se prueba la lectura del importador.
//
// Se corre UNA vez y los archivos quedan versionados. Se generan en vez de
// escribirse a mano porque tienen que ser Excel de verdad: una matriz inventada
// prueba nuestro código, no la biblioteca, y lo que aquí se quiere fijar es
// justamente lo que la biblioteca devuelve.
//
//   node scripts/generar-fixtures-importacion.mjs
import * as XLSX from 'xlsx';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const destino = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'pruebas', 'fixtures');

// La fecha va como número de serie de Excel con formato de fecha, que es como
// la guarda Excel de verdad. Si se escribiera como texto, la prueba no diría
// nada sobre cellDates, que es la opción de la que depende que una fecha
// colombiana no se lea como una gringa.
const filas = [
  ['Nombre', 'Apellido', 'Cédula', 'Cargo', 'Salario', 'Fecha de ingreso'],
  ['Ana', 'Gómez', '1020304050', 'Mesera', 1750000, new Date(Date.UTC(2026, 0, 15))],
  ['José', 'Núñez', '1122334455', 'Cocinero', 2000000, new Date(Date.UTC(2025, 11, 1))],
  // Fila realmente vacía: es la que ejercita `blankrows: false`. Ojo, una fila
  // de cadenas vacías NO es una fila en blanco para Excel y sí llega; de esa se
  // encarga después `mapearHoja`, que descarta la que no tiene ningún valor.
  [],
];

const hoja = XLSX.utils.aoa_to_sheet(filas, { cellDates: true });
const libro = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(libro, hoja, 'Colaboradores');

XLSX.writeFile(libro, join(destino, 'importacion.xlsx'), { cellDates: true });
XLSX.writeFile(libro, join(destino, 'importacion.xls'), { bookType: 'biff8', cellDates: true });
console.log('Escritos importacion.xlsx e importacion.xls en', destino);
