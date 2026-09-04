// Genera los binarios de Excel con los que se prueba la lectura del importador.
//
// Se corre UNA vez y los archivos quedan versionados. Se generan en vez de
// escribirse a mano porque tienen que ser Excel de verdad: una matriz inventada
// prueba nuestro código, no la biblioteca, y lo que aquí se quiere fijar es
// justamente lo que la biblioteca devuelve.
//
//   node scripts/generar-fixtures-importacion.mjs
import * as XLSX from 'xlsx';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const destino = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'pruebas', 'fixtures');

// La fecha va como MEDIANOCHE LOCAL, no como Date.UTC.
//
// Cuesta un párrafo explicarlo y hay que hacerlo, porque la primera versión
// estaba mal y la prueba pasaba igual. SheetJS convierte un Date a número de
// serie usando el reloj LOCAL de la máquina que escribe. Con
// new Date(Date.UTC(2026,0,15)) el archivo quedaba con la celda en el 14 de
// enero (medianoche UTC son las 7 p.m. del día anterior en Bogotá), o sea que
// el fixture decía un día distinto del que se quería y encima dependía de dónde
// se hubiera generado.
//
// Con medianoche local el archivo dice el 15 en cualquier zona. Y al leerlo,
// `normalizarFecha` mira las partes LOCALES del Date a propósito, que es lo que
// hace que el día sea el mismo en Bogotá que en Tokio.
const filas = [
  ['Nombre', 'Apellido', 'Cédula', 'Cargo', 'Salario', 'Fecha de ingreso'],
  ['Ana', 'Gómez', '1020304050', 'Mesera', 1750000, new Date(2026, 0, 15)],
  ['José', 'Núñez', '1122334455', 'Cocinero', 2000000, new Date(2025, 11, 1)],
  // Fila realmente vacía: `null` deja un hueco de verdad en la hoja y es lo que
  // ejercita `blankrows: false`. Una fila de cadenas vacías NO sirve: para
  // Excel son celdas con contenido, llegan igual, y con ellas la prueba pasaba
  // sin comprobar nada. De esas se encarga después `mapearHoja`.
  null,
  ['Luz', 'Peña', '9988776655', 'Cajera', 1500000, new Date(2026, 1, 2)],
];

const hoja = XLSX.utils.aoa_to_sheet(filas, { cellDates: true });
const libro = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(libro, hoja, 'Colaboradores');

// Los bytes se escriben con fs y no con XLSX.writeFile: el build ESM de
// SheetJS 0.20.3 no trae acceso al sistema de archivos y writeFile falla con
// "cannot save file" sin escribir nada. La primera versión de este script
// fallaba así en silencio para quien lo corriera.
const escribir = (nombre, opciones) =>
  writeFileSync(join(destino, nombre), XLSX.write(libro, { ...opciones, type: 'buffer' }));

escribir('importacion.xlsx', { bookType: 'xlsx', cellDates: true });
escribir('importacion.xls', { bookType: 'biff8', cellDates: true });
console.log('Escritos importacion.xlsx e importacion.xls en', destino);
