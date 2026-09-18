import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { filasParaSiigo, llenarPlantillaSiigo, CONCEPTOS_SIIGO } from './siigo';
import type { PersonaDeNomina } from './nominaDelPeriodo';

// El archivo de novedades para Siigo (15 de septiembre de 2026).
//
// Se llena LA PLANTILLA del cliente, la que él descarga de su Siigo, porque ahí vienen sus empleados
// con su número de contrato. HoraPro no los inventa: busca a cada persona por su cédula y, si no está
// en la plantilla, la deja fuera y lo dice.
//
// El mapa de conceptos sale del catálogo de la propia plantilla (hoja «datos»). La hora ordinaria no
// se manda: esa ya la paga el salario. Las decisiones que el dueño confirmó el 15 de septiembre:
// los domingos y festivos van a los conceptos de RECARGO (25 y 27), y la incapacidad de EPS al 66%.

// El fixture es la plantilla real que el dueño descargó de su Siigo.
const plantilla = () => readFileSync(join(process.cwd(), 'src', 'pruebas', 'fixtures', 'siigo-novedades.xlsx'));

// Cédulas que existen en esa plantilla.
const ANA_CEDULA = '1001414194';
const IVAN_CEDULA = '1001471760';

const persona = (cedula: string, nombre: string, extra: Partial<PersonaDeNomina> = {}): PersonaDeNomina => ({
  colaboradorId: 'c-' + cedula, cedula, nombre, apellido: 'De Prueba', cargo: null,
  salarioMensual: 1_750_000, valorHora: 9_114.58, registrosCont: 10, minutosOrdinarios: 4_800,
  liquidacion: [], totalRecargos: 0, totalExtra: 0, totalAdicional: 0, novedades: [], ...extra,
});

const linea = (codigo: string, horas: number) =>
  ({ codigo, nombre: codigo, horas, valorHora: 9_114.58, recargo: 1, esExtra: false, factorPagado: 0, subtotal: 0 });

const PERIODO = { desde: '2026-09-01', hasta: '2026-09-15' };

// EL AUXILIO DE TRANSPORTE VA A SIIGO COMO MONTO, NO COMO HORAS NI DÍAS (17 de septiembre de 2026).
//
// En el catálogo de la propia plantilla, el concepto 02 declara su unidad como «Valor $», a
// diferencia del 26 («Horas») o el 31 («Dias»). O sea que la cantidad que espera Siigo es la plata,
// ya prorrateada, y no un número de días.
//
// Y no encaja en ninguno de los dos bucles que ya existen: no es una línea de liquidación ni una
// novedad, es un monto de la persona.
describe('el auxilio de transporte en el archivo de Siigo', () => {
  it('usa el concepto 02 y la unidad de valor, no de horas ni de días', () => {
    expect(CONCEPTOS_SIIGO.AUXILIO_TRANSPORTE).toMatchObject({ codigo: 2, unidad: 'Valor $' });
  });

  it('manda el monto del período, ya prorrateado', () => {
    const filas = filasParaSiigo([persona(ANA_CEDULA, 'Ana', { auxilioTransporte: 58_122.17 })], PERIODO);
    expect(filas).toHaveLength(1);
    expect(filas[0]).toMatchObject({ concepto: 2, cantidad: 58_122.17, unidad: 'Valor $' });
  });

  it('quien no lo recibe no ocupa una fila', () => {
    expect(filasParaSiigo([persona(ANA_CEDULA, 'Ana', { auxilioTransporte: 0 })], PERIODO)).toEqual([]);
  });

  it('un servidor que todavía no lo manda tampoco genera fila', () => {
    expect(filasParaSiigo([persona(ANA_CEDULA, 'Ana')], PERIODO)).toEqual([]);
  });
});

describe('CONCEPTOS_SIIGO', () => {
  it('manda cada concepto de horas al código de Siigo que le toca', () => {
    expect(CONCEPTOS_SIIGO.HED).toMatchObject({ codigo: 10, unidad: 'Horas' });
    expect(CONCEPTOS_SIIGO.HEN).toMatchObject({ codigo: 11 });
    expect(CONCEPTOS_SIIGO.HEDD).toMatchObject({ codigo: 7 });
    expect(CONCEPTOS_SIIGO.HEND).toMatchObject({ codigo: 12 });
    expect(CONCEPTOS_SIIGO.HON).toMatchObject({ codigo: 26 });
    // Domingos y festivos van al RECARGO, no a la hora: la hora ordinaria ya la paga el salario.
    expect(CONCEPTOS_SIIGO.HDD).toMatchObject({ codigo: 25 });
    expect(CONCEPTOS_SIIGO.HND).toMatchObject({ codigo: 27 });
    // La hora ordinaria no se manda.
    expect(CONCEPTOS_SIIGO.HOD).toBeUndefined();
  });

  it('manda cada novedad al concepto de Siigo que le toca, en días', () => {
    expect(CONCEPTOS_SIIGO.VACACIONES).toMatchObject({ codigo: 31, unidad: 'Dias' });
    expect(CONCEPTOS_SIIGO.INCAPACIDAD_EPS).toMatchObject({ codigo: 15 });
    expect(CONCEPTOS_SIIGO.INCAPACIDAD_ARL).toMatchObject({ codigo: 16 });
    expect(CONCEPTOS_SIIGO.LICENCIA_MATERNIDAD).toMatchObject({ codigo: 20 });
    expect(CONCEPTOS_SIIGO.LICENCIA_PATERNIDAD).toMatchObject({ codigo: 20 });
    expect(CONCEPTOS_SIIGO.LICENCIA_LUTO).toMatchObject({ codigo: 21 });
    expect(CONCEPTOS_SIIGO.NO_REMUNERADO).toMatchObject({ codigo: 38 });
    expect(CONCEPTOS_SIIGO.MEDICO).toMatchObject({ codigo: 22 });
  });
});

describe('filasParaSiigo', () => {
  it('arma una fila por persona y concepto, con las fechas del período', () => {
    const filas = filasParaSiigo([persona(ANA_CEDULA, 'Ana', {
      liquidacion: [linea('HOD', 104), linea('HON', 6), linea('HED', 4)],
    })], PERIODO);
    expect(filas).toEqual([
      { cedula: ANA_CEDULA, concepto: 26, cantidad: 6, unidad: 'Horas', desde: '01/09/2026', hasta: '15/09/2026' },
      { cedula: ANA_CEDULA, concepto: 10, cantidad: 4, unidad: 'Horas', desde: '01/09/2026', hasta: '15/09/2026' },
    ]);
  });

  it('no manda la hora ordinaria ni los conceptos en cero', () => {
    const filas = filasParaSiigo([persona(ANA_CEDULA, 'Ana', {
      liquidacion: [linea('HOD', 104), linea('HEN', 0)],
    })], PERIODO);
    expect(filas).toEqual([]);
  });

  it('manda las novedades en días, y no las de parte del día', () => {
    const filas = filasParaSiigo([persona(ANA_CEDULA, 'Ana', {
      novedades: [
        { tipo: 'VACACIONES', remunerado: true, dias: 3, parciales: 0 },
        { tipo: 'MEDICO', remunerado: false, dias: 0, parciales: 1 },
      ],
    })], PERIODO);
    expect(filas).toEqual([
      { cedula: ANA_CEDULA, concepto: 31, cantidad: 3, unidad: 'Dias', desde: '01/09/2026', hasta: '15/09/2026' },
    ]);
  });

  it('una novedad que HoraPro no sabe a dónde mandar no se inventa un concepto', () => {
    const filas = filasParaSiigo([persona(ANA_CEDULA, 'Ana', {
      novedades: [{ tipo: 'OTRO', remunerado: true, dias: 2, parciales: 0 }],
    })], PERIODO);
    expect(filas).toEqual([]);
  });
});

describe('llenarPlantillaSiigo', () => {
  it('escribe las novedades debajo de los empleados, respetando el contrato de la plantilla', async () => {
    const personas = [persona(ANA_CEDULA, 'Ana', { liquidacion: [linea('HON', 6)] })];
    const r = await llenarPlantillaSiigo(plantilla(), personas, PERIODO);
    expect(r.fueraDeLaPlantilla).toEqual([]);
    const escrita = r.filasEscritas[0];
    expect(escrita).toMatchObject({
      contrato: ANA_CEDULA, cedula: ANA_CEDULA, nombre: 'ANA SOFIA GIRALDO TOBON',
      concepto: '26- Recargo nocturno- Ingreso', unidad: 'Horas', cantidad: 6,
      desde: '01/09/2026', hasta: '15/09/2026', diasNoHabiles: 0,
    });
  });

  it('el archivo que devuelve sigue teniendo las tres hojas, el encabezado y los empleados de Siigo', async () => {
    const r = await llenarPlantillaSiigo(plantilla(), [persona(ANA_CEDULA, 'Ana', { liquidacion: [linea('HON', 6)] })], PERIODO);
    const XLSX = await import('xlsx');
    const wb = XLSX.read(r.archivo, { type: 'array' });
    expect(wb.SheetNames).toEqual(['Novedades', 'Conceptos creados por usuario', 'datos']);
    const hoja = wb.Sheets['Novedades'];
    expect(hoja['A5'].v).toBe('#Contrato del empleado');
    expect(hoja['C6'].v).toBe('ANA SOFIA GIRALDO TOBON');
    // El catálogo de conceptos viaja intacto: Siigo lo lee al subir el archivo.
    expect(XLSX.utils.sheet_to_json(wb.Sheets['datos'], { header: 1, blankrows: false })).toHaveLength(198);
  });

  it('escribe el número de contrato de la plantilla, no la cédula', async () => {
    // Fixture derivado del real: a Ana le pusieron un contrato distinto de su cédula, que es la razón
    // por la que el dueño eligió llenar SU plantilla en vez de generar un archivo nuevo.
    const conContrato = readFileSync(join(process.cwd(), 'src', 'pruebas', 'fixtures', 'siigo-novedades-contrato-distinto.xlsx'));
    const r = await llenarPlantillaSiigo(conContrato, [persona(ANA_CEDULA, 'Ana', { liquidacion: [linea('HON', 6)] })], PERIODO);
    expect(r.filasEscritas[0]).toMatchObject({ contrato: 'CT-8801', cedula: ANA_CEDULA });
  });

  it('escribe debajo del último empleado, sin pisar a los que trae la plantilla', async () => {
    const r = await llenarPlantillaSiigo(plantilla(), [persona(ANA_CEDULA, 'Ana', { liquidacion: [linea('HON', 6)] })], PERIODO);
    const XLSX = await import('xlsx');
    const hoja = XLSX.read(r.archivo, { type: 'array' }).Sheets['Novedades'];
    // Los 14 empleados de la plantilla siguen tal cual, del 6 al 19. La cédula viene como texto en el
    // archivo de Siigo, no como número: así la guarda su plantilla.
    expect(String(hoja['A6'].v)).toBe(ANA_CEDULA);
    expect(hoja['C19'].v).toBe('TATIANA RESTREPO GALLEGO');
    // Y la novedad quedó en la primera fila libre, la 20.
    expect(hoja['D20'].v).toBe('26- Recargo nocturno- Ingreso');
    expect(hoja['F20'].v).toBe(6);
  });

  it('a quien no está en la plantilla lo deja por fuera y lo dice', async () => {
    const personas = [
      persona(ANA_CEDULA, 'Ana', { liquidacion: [linea('HON', 6)] }),
      persona('9999999999', 'Nadie', { liquidacion: [linea('HED', 2)] }),
    ];
    const r = await llenarPlantillaSiigo(plantilla(), personas, PERIODO);
    expect(r.fueraDeLaPlantilla).toEqual([{ cedula: '9999999999', nombre: 'Nadie De Prueba' }]);
    expect(r.filasEscritas).toHaveLength(1);
  });

  it('sin cédula no se puede identificar a nadie en Siigo', async () => {
    const r = await llenarPlantillaSiigo(plantilla(), [persona(IVAN_CEDULA, 'Iván', { cedula: null, liquidacion: [linea('HED', 2)] })], PERIODO);
    expect(r.fueraDeLaPlantilla).toEqual([{ cedula: null, nombre: 'Iván De Prueba' }]);
    expect(r.filasEscritas).toEqual([]);
  });
});
