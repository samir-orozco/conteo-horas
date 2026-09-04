import { describe, it, expect, vi, beforeEach } from 'vitest';
import { descargarExcelHojas, descargarExcel } from './exportar';

// El segundo uso de la biblioteca de Excel, y el que es fácil pasar por alto al
// evaluar un cambio de dependencia: aquí no se lee, se ESCRIBE el .xlsx que se
// baja desde Reportes y el formato de importación.
//
// `writeFile` dispara una descarga del navegador, que jsdom no hace, así que se
// intercepta para mirar el libro que se le entrega. Lo que se comprueba es lo
// nuestro: que cada hoja lleve sus columnas, que los nombres se recorten a lo
// que Excel admite y que la extensión quede bien.

const escrito: { libro: unknown; nombre: string }[] = [];

vi.mock('xlsx', async () => {
  const real = await vi.importActual<typeof import('xlsx')>('xlsx');
  return {
    ...real,
    writeFile: (libro: unknown, nombre: string) => { escrito.push({ libro, nombre }); },
  };
});

type Libro = { SheetNames: string[]; Sheets: Record<string, Record<string, { v: unknown }>> };
const ultimo = () => escrito[escrito.length - 1];
const libro = () => ultimo().libro as Libro;

beforeEach(() => { escrito.length = 0; });

describe('exportar a Excel', () => {
  it('cada hoja lleva su nombre, sus columnas y sus filas', async () => {
    await descargarExcelHojas('reporte', [
      { nombre: 'Horas', columnas: ['Nombre', 'Total'], filas: [['Ana', 160], ['José', 152]] },
      { nombre: 'Novedades', columnas: ['Tipo'], filas: [['Incapacidad']] },
    ]);
    expect(libro().SheetNames).toEqual(['Horas', 'Novedades']);
    expect(libro().Sheets.Horas.A1.v).toBe('Nombre');
    expect(libro().Sheets.Horas.A2.v).toBe('Ana');
    expect(libro().Sheets.Horas.B2.v).toBe(160);
  });

  it('un nombre de hoja demasiado largo se recorta a lo que Excel admite', async () => {
    // Excel no abre un archivo con una hoja de más de 31 caracteres. El reporte
    // usa el nombre de la sede, que puede ser largo.
    await descargarExcelHojas('r', [
      { nombre: 'Sede principal de la carrera séptima con calle noventa', columnas: ['x'], filas: [] },
    ]);
    expect(libro().SheetNames[0]).toHaveLength(31);
  });

  it('los caracteres que Excel prohíbe en un nombre de hoja se quitan', async () => {
    await descargarExcelHojas('r', [
      { nombre: 'Sede: Norte/Sur [2026]', columnas: ['x'], filas: [] },
    ]);
    expect(libro().SheetNames[0]).not.toMatch(/[\\/?*[\]:]/);
  });

  it('la extensión se agrega si no viene, y no se duplica si ya está', async () => {
    await descargarExcelHojas('reporte', [{ nombre: 'H', columnas: [], filas: [] }]);
    expect(ultimo().nombre).toBe('reporte.xlsx');
    await descargarExcelHojas('reporte.xlsx', [{ nombre: 'H', columnas: [], filas: [] }]);
    expect(ultimo().nombre).toBe('reporte.xlsx');
  });

  it('la exportación de una sola hoja sigue funcionando', async () => {
    // La usan las pantallas viejas y no se puede romper al tocar la otra.
    await descargarExcel('simple', 'ignorado', ['A', 'B'], [[1, 2]]);
    expect(libro().SheetNames).toEqual(['Hoja1']);
    expect(libro().Sheets.Hoja1.B2.v).toBe(2);
  });
});
