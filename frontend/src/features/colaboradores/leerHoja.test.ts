import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { leerHoja } from './formatoImportacion';
import { normalizarFecha } from './fechaImportada';

// La lectura del archivo que sube quien importa colaboradores.
//
// No tenía ninguna prueba. formatoImportacion.test.ts prueba `mapearHoja`, que
// recibe una matriz escrita a mano, y ModalImportar.test.tsx mockea `leerHoja`
// entera. O sea que el único código que toca la biblioteca de Excel estaba sin
// red, justo en el camino que crea colaboradores en la base.
//
// Se lee de binarios de verdad y no de matrices inventadas a propósito: lo que
// aquí se fija es lo que devuelve la BIBLIOTECA. Una matriz escrita a mano
// probaría nuestro código y no diría nada el día que haya que cambiar de
// versión o de biblioteca, que es exactamente cuando hace falta.
//
// Los fixtures se generan con scripts/generar-fixtures-importacion.mjs.
//
// OJO CON LA RUTA: dentro de jsdom, el `URL` global no es el de Node y se come
// la base file://, así que `new URL('...', import.meta.url)` resuelve a
// http://localhost/... y readFileSync falla con ENOENT sobre una ruta cortada.
// Por eso se arma desde process.cwd(), que en Vitest es la raíz del frontend.
const fixture = (n: string) =>
  readFileSync(join(process.cwd(), 'src', 'pruebas', 'fixtures', n));

const comoArchivo = (nombre: string, tipo: string): File =>
  new File([fixture(nombre)], nombre, { type: tipo });

describe('leer la primera hoja de un archivo de Excel', () => {
  it('lee un .xlsx con sus encabezados y sus filas', async () => {
    const filas = await leerHoja(comoArchivo('importacion.xlsx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'));
    expect(filas[0]).toEqual(['Nombre', 'Apellido', 'Cédula', 'Cargo', 'Salario', 'Fecha de ingreso']);
    expect(filas[1][0]).toBe('Ana');
    expect(filas[1][1]).toBe('Gómez');
  });

  it('lee también el .xls viejo, que es lo que el input sigue aceptando', async () => {
    // ModalImportar acepta ".xlsx,.xls,.csv". Cualquier cambio de biblioteca
    // que pierda el .xls binario le quita algo al cliente, y esta prueba es la
    // que lo dice en vez de dejar que lo descubra alguien subiendo un archivo.
    const filas = await leerHoja(comoArchivo('importacion.xls', 'application/vnd.ms-excel'));
    expect(filas[0]).toEqual(['Nombre', 'Apellido', 'Cédula', 'Cargo', 'Salario', 'Fecha de ingreso']);
    expect(filas[1][0]).toBe('Ana');
  });

  it('los acentos y la eñe llegan bien', async () => {
    // Si esto se rompe, `normalizar('cã©dula')` no casa con 'cedula' y la
    // columna se pierde en silencio: se importan todas las filas sin cédula.
    const filas = await leerHoja(comoArchivo('importacion.xlsx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'));
    expect(filas[0][2]).toBe('Cédula');
    expect(filas[2][1]).toBe('Núñez');
  });

  it('una fecha llega como Date y no como el texto que Excel decidió mostrar', async () => {
    // Es lo que hace `cellDates`, y es la diferencia entre leer "11/12/85" como
    // 11 de diciembre o como 12 de noviembre. La misma celda se muestra
    // distinto en un Excel gringo y en uno colombiano.
    const filas = await leerHoja(comoArchivo('importacion.xlsx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'));
    expect(filas[1][5]).toBeInstanceOf(Date);
  });

  it('el día que llega es el que dice la celda, en cualquier zona horaria', async () => {
    // ESTE ES EL CASO QUE HAY QUE MIRAR CON CUIDADO, y la primera versión de
    // esta prueba estaba mal.
    //
    // SheetJS arma el Date de modo que su RELOJ DE PARED coincida con lo que
    // Excel muestra, y por eso `normalizarFecha` lee getFullYear/getMonth/
    // getDate y no las partes UTC. Comparar con toISOString() es leerlo por
    // donde no es: da un día distinto según el signo del huso, y la prueba
    // pasaría en Bogotá y fallaría en Madrid.
    //
    // Se afirma sobre lo que el producto de verdad manda al backend, que es la
    // cadena de normalizarFecha. Comprobado a mano en Bogotá, Los Ángeles, UTC
    // y Tokio: las cuatro dan 2026-01-15.
    const filas = await leerHoja(comoArchivo('importacion.xlsx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'));
    expect(normalizarFecha(filas[1][5])).toBe('2026-01-15');
    expect(normalizarFecha(filas[2][5])).toBe('2025-12-01');
  });

  it('los números llegan como números, no como texto', async () => {
    // `raw: true`. Si el salario llegara como '1.750.000', el importador
    // tendría que adivinar el separador de miles.
    const filas = await leerHoja(comoArchivo('importacion.xlsx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'));
    expect(filas[1][4]).toBe(1750000);
  });

  it('las filas en blanco no llegan, pero sí lo que viene después', async () => {
    // `blankrows: false`. El formato que se descarga trae huecos, y sin esto se
    // intentaría crear colaboradores sin nombre.
    //
    // El fixture tiene un hueco de verdad en la fila 4 y datos en la 5, así que
    // la hoja mide A1:F5 y de aquí tienen que salir 4: encabezado y tres
    // personas. Que la última llegue es la mitad que importa: quitar las filas
    // vacías no puede cortar la lectura en el primer hueco.
    //
    // Costó una versión equivocada: con una fila de CADENAS vacías esta prueba
    // pasaba sin comprobar nada, porque para Excel esas son celdas con
    // contenido. Se comprobó por mutación: quitando `blankrows: false` del
    // código, esta prueba tiene que ponerse roja.
    const filas = await leerHoja(comoArchivo('importacion.xlsx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'));
    expect(filas).toHaveLength(4);
    expect(filas[3][0]).toBe('Luz');
  });

  it('un archivo vacío devuelve una lista vacía en vez de reventar', async () => {
    const filas = await leerHoja(new File([new Uint8Array(0)], 'vacio.xlsx',
      { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    expect(filas).toEqual([]);
  });
});
