import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { leerHoja } from './formatoImportacion';

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
    const fecha = filas[1][5];
    expect(fecha).toBeInstanceOf(Date);
    // Las pruebas corren en América/Los Ángeles a propósito (vite.config.ts).
    // Se compara en UTC para que el valor no dependa del reloj de quien corre.
    expect((fecha as Date).toISOString().slice(0, 10)).toBe('2026-01-15');
  });

  it('los números llegan como números, no como texto', async () => {
    // `raw: true`. Si el salario llegara como '1.750.000', el importador
    // tendría que adivinar el separador de miles.
    const filas = await leerHoja(comoArchivo('importacion.xlsx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'));
    expect(filas[1][4]).toBe(1750000);
  });

  it('las filas en blanco no llegan', async () => {
    // `blankrows: false`. El formato que se descarga trae filas vacías al final
    // y sin esto se intentaría crear colaboradores sin nombre.
    //
    // Matiz que costó descubrir: una fila de cadenas vacías NO cuenta como
    // fila en blanco para Excel y sí llega hasta aquí. De esa se encarga
    // después `mapearHoja`, que descarta la que no tiene ningún valor.
    const filas = await leerHoja(comoArchivo('importacion.xlsx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'));
    expect(filas).toHaveLength(3);
  });

  it('un archivo vacío devuelve una lista vacía en vez de reventar', async () => {
    const filas = await leerHoja(new File([new Uint8Array(0)], 'vacio.xlsx',
      { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    expect(filas).toEqual([]);
  });
});
