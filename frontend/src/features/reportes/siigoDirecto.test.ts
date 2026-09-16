import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { archivoParaSiigo } from './siigoDirecto';
import type { PersonaDeNomina } from './nominaDelPeriodo';

// La descarga directa para Siigo (15 de septiembre de 2026, corrección del dueño): el botón baja el
// MISMO formato que da Siigo, ya lleno por HoraPro, sin pedirle al cliente que suba nada.
//
// Para eso HoraPro lleva adentro la plantilla de Siigo, pero SIN empleados: los de cada empresa los
// escribe el sistema. La plantilla que viaja en el código no puede traer la gente de un cliente,
// porque la descargarían todos los demás.
//
// En este camino el número de contrato se llena con la cédula: HoraPro no conoce el contrato interno
// del Siigo de cada empresa. Quien lo necesite exacto puede seguir subiendo su propia plantilla
// (llenarPlantillaSiigo, en siigo.ts).

const plantillaDelSistema = () =>
  readFileSync(join(process.cwd(), 'src', 'features', 'reportes', 'plantillas', 'siigo-novedades.xlsx'));

const persona = (cedula: string | null, nombre: string, extra: Partial<PersonaDeNomina> = {}): PersonaDeNomina => ({
  colaboradorId: 'c-' + nombre, cedula, nombre, apellido: 'Gómez', cargo: null,
  salarioMensual: 1_750_000, valorHora: 9_114.58, registrosCont: 10, minutosOrdinarios: 4_800,
  liquidacion: [], totalRecargos: 0, totalExtra: 0, totalAdicional: 0, novedades: [], ...extra,
});

const linea = (codigo: string, horas: number) =>
  ({ codigo, nombre: codigo, horas, valorHora: 9_114.58, recargo: 1, esExtra: false, factorPagado: 0, subtotal: 0 });

const PERIODO = { desde: '2026-09-01', hasta: '2026-09-15' };
const leer = async (archivo: Uint8Array) => {
  const XLSX = await import('xlsx');
  return XLSX.read(archivo, { type: 'array' });
};

describe('la plantilla que HoraPro lleva adentro', () => {
  it('trae el formato de Siigo pero sin los empleados de ninguna empresa', async () => {
    const wb = await leer(plantillaDelSistema());
    expect(wb.SheetNames).toEqual(['Novedades', 'Conceptos creados por usuario', 'datos']);
    const hoja = wb.Sheets['Novedades'];
    expect(hoja['A5'].v).toBe('#Contrato del empleado');
    // La primera fila de datos está vacía: no viaja la gente de nadie.
    expect(hoja['A6']).toBeUndefined();
    expect(hoja['C6']).toBeUndefined();
    // El catálogo de conceptos sí viaja: Siigo lo lee al subir el archivo.
    const XLSX = await import('xlsx');
    expect(XLSX.utils.sheet_to_json(wb.Sheets['datos'], { header: 1, blankrows: false })).toHaveLength(198);
  });
});

describe('archivoParaSiigo', () => {
  it('escribe a cada persona desde la primera fila libre, con sus conceptos', async () => {
    const r = await archivoParaSiigo([
      persona('1020345678', 'Ana', { liquidacion: [linea('HOD', 104), linea('HON', 6), linea('HED', 4)] }),
    ], PERIODO);
    expect(r.filasEscritas).toHaveLength(2);
    expect(r.filasEscritas[0]).toMatchObject({
      contrato: '1020345678', cedula: '1020345678', nombre: 'Ana Gómez',
      concepto: '26- Recargo nocturno- Ingreso', unidad: 'Horas', cantidad: 6,
      desde: '01/09/2026', hasta: '15/09/2026', diasNoHabiles: 0,
    });
    expect(r.filasEscritas[1]).toMatchObject({ concepto: '10- Horas extras diurnas 125%- Ingreso', cantidad: 4 });
    // Cada novedad en su propia fila: si el contador no avanza, la segunda pisa a la primera.
    const hoja = (await leer(r.archivo)).Sheets['Novedades'];
    expect(hoja['D6'].v).toBe('26- Recargo nocturno- Ingreso');
    expect(hoja['D7'].v).toBe('10- Horas extras diurnas 125%- Ingreso');
    expect(hoja['F7'].v).toBe(4);
  });

  it('el archivo sale con el formato de Siigo y las novedades escritas en la fila 6', async () => {
    const r = await archivoParaSiigo([persona('1020345678', 'Ana', { liquidacion: [linea('HON', 6)] })], PERIODO);
    const wb = await leer(r.archivo);
    expect(wb.SheetNames).toEqual(['Novedades', 'Conceptos creados por usuario', 'datos']);
    const hoja = wb.Sheets['Novedades'];
    expect(hoja['A5'].v).toBe('#Contrato del empleado');
    expect(String(hoja['A6'].v)).toBe('1020345678');
    expect(hoja['C6'].v).toBe('Ana Gómez');
    expect(hoja['D6'].v).toBe('26- Recargo nocturno- Ingreso');
    expect(hoja['F6'].v).toBe(6);
    expect(hoja['G6'].v).toBe('01/09/2026');
  });

  it('las novedades van en días y las de parte del día no', async () => {
    const r = await archivoParaSiigo([persona('1020345678', 'Ana', {
      novedades: [
        { tipo: 'VACACIONES', remunerado: true, dias: 3, parciales: 0 },
        { tipo: 'MEDICO', remunerado: false, dias: 0, parciales: 1 },
      ],
    })], PERIODO);
    expect(r.filasEscritas).toHaveLength(1);
    expect(r.filasEscritas[0]).toMatchObject({ concepto: '31- Vacaciones disfrutadas- Ingreso', unidad: 'Dias', cantidad: 3 });
  });

  it('a quien no tiene cédula lo deja por fuera y lo dice: Siigo identifica por documento', async () => {
    const r = await archivoParaSiigo([
      persona('1020345678', 'Ana', { liquidacion: [linea('HON', 6)] }),
      persona(null, 'Sin Documento', { liquidacion: [linea('HED', 2)] }),
    ], PERIODO);
    expect(r.sinCedula).toEqual(['Sin Documento Gómez']);
    expect(r.filasEscritas).toHaveLength(1);
  });

  it('quien no tuvo nada en el período no ocupa una fila', async () => {
    const r = await archivoParaSiigo([persona('1020345678', 'Ana')], PERIODO);
    expect(r.filasEscritas).toEqual([]);
  });
});
