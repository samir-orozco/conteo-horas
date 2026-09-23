import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { unzipSync, zipSync, strToU8, strFromU8 } from 'fflate';
import { escribirEnPlantillaSiigo, type FilaDePlantilla } from './escribirEnPlantillaSiigo';

// Siigo rechaza con un 500 («Object reference not set…») cualquier archivo que se vuelva a ARMAR, aunque
// los datos estén bien: se probó el 23 de septiembre de 2026 con cinco archivos distintos contra su
// servidor. El único que entró fue el que conserva el archivo original y solo le cambia los valores de
// las celdas. Por eso estas pruebas miran dos cosas: que los datos queden donde van, y que el resto del
// archivo no se toque.
const plantilla = () => new Uint8Array(readFileSync(join(process.cwd(), 'src', 'pruebas', 'fixtures', 'siigo-novedades.xlsx')));

const fila = (extra: Partial<FilaDePlantilla> = {}): FilaDePlantilla => ({
  contrato: '1070806026-1', cedula: '1070806026', nombre: 'Edinson Antonio Pajaro Diaz',
  concepto: '10- Horas extras diurnas 125%- Ingreso', unidad: 'Horas', cantidad: 26.33,
  desde: '16/09/2026', hasta: '22/09/2026', diasNoHabiles: 0, tipo: 'Ingreso', ...extra,
});

const leer = async (archivo: Uint8Array) => {
  const XLSX = await import('xlsx');
  return XLSX.read(archivo, { type: 'array', cellDates: true }).Sheets['Novedades'];
};

describe('escribirEnPlantillaSiigo', () => {
  it('escribe cada novedad desde la fila 6, con el contrato, la cédula y el nombre', async () => {
    const hoja = await leer(escribirEnPlantillaSiigo(plantilla(), [fila(), fila({ cedula: '13991819', contrato: '13991819', nombre: 'Geovany Bermudez', cantidad: 8 })]));
    expect(hoja['A6'].v).toBe('1070806026-1');
    expect(hoja['B6'].v).toBe('1070806026');
    expect(hoja['C6'].v).toBe('Edinson Antonio Pajaro Diaz');
    expect(hoja['D6'].v).toBe('10- Horas extras diurnas 125%- Ingreso');
    expect(hoja['F6'].v).toBe(26.33);
    expect(hoja['A7'].v).toBe('13991819');
    expect(hoja['F7'].v).toBe(8);
  });

  it('las fechas van como fecha y no como texto, que es como las trae el archivo que Siigo acepta', async () => {
    const hoja = await leer(escribirEnPlantillaSiigo(plantilla(), [fila()]));
    expect(hoja['G6'].t).toBe('d');
    expect((hoja['G6'].v as Date).toISOString().slice(0, 10)).toBe('2026-09-16');
    expect((hoja['H6'].v as Date).toISOString().slice(0, 10)).toBe('2026-09-22');
  });

  it('llena la columna oculta «Tipo», que es la que Siigo lee para saber si suma o descuenta', async () => {
    const archivo = escribirEnPlantillaSiigo(plantilla(), [fila(), fila({ unidad: 'Valor $', tipo: 'Ingreso' })]);
    const hoja = await leer(archivo);
    expect(hoja['E6'].v).toBe('Horas');
    expect(hoja['J6'].v).toBe('IngresoHoras');
    expect(hoja['J7'].v).toBe('IngresoValor $');
  });

  it('solo toca la hoja y el catálogo de textos: las otras piezas del archivo quedan iguales', () => {
    const antes = unzipSync(plantilla());
    const despues = unzipSync(escribirEnPlantillaSiigo(plantilla(), [fila()]));
    expect(Object.keys(despues).sort()).toEqual(Object.keys(antes).sort());
    const cambiadas = Object.keys(antes).filter(p => String(antes[p]) !== String(despues[p])).sort();
    expect(cambiadas).toEqual(['xl/sharedStrings.xml', 'xl/worksheets/sheet1.xml']);
    // Las que no se tocan son la mayoría, y son las que el importador de Siigo necesita.
    expect(Object.keys(antes).length - cambiadas.length).toBeGreaterThan(20);
  });

  it('a una fila sin fórmula no le presta la de otra fila', () => {
    // La plantilla que HoraPro lleva adentro tiene filas sin la fórmula de «Tipo de novedad». Prestarles
    // la de la fila 6 dejaría esa celda mirando los datos de OTRA persona.
    const partes = unzipSync(plantilla());
    const ruta = 'xl/worksheets/sheet1.xml';
    partes[ruta] = strToU8(strFromU8(partes[ruta]).replace(/<c r="[EJ]8"[^>]*>[\s\S]*?<\/c>/g, ''));
    const sinFormula = zipSync(partes);

    const hoja = strFromU8(unzipSync(escribirEnPlantillaSiigo(sinFormula, [fila(), fila(), fila()]))[ruta]);
    const fila8 = hoja.match(/<row r="8"[^>]*>[\s\S]*?<\/row>/)?.[0] ?? '';
    expect(fila8).not.toContain('D6');
    expect(fila8).not.toContain('<f>');
  });

  it('no pisa el aviso que dice hasta dónde se puede escribir', async () => {
    const muchas = Array.from({ length: 600 }, () => fila());
    const hoja = await leer(escribirEnPlantillaSiigo(plantilla(), muchas));
    expect(String(hoja['A505'].v)).toContain('HASTA ACA');
    expect(hoja['A506']).toBeUndefined();
  });
});
