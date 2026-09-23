import { describe, it, expect } from 'vitest';
import { filasParaSiigo, CONCEPTOS_SIIGO } from './siigo';
import type { PersonaDeNomina } from './nominaDelPeriodo';

// El archivo de novedades para Siigo (15 de septiembre de 2026).
//
// Siigo identifica a cada persona por su NÚMERO DE CONTRATO, que casi siempre es la cédula. Cuando
// alguien tiene un segundo contrato, Siigo le pone la cédula con un «-1» al final, y con la cédula sola
// rechaza esas filas («el contrato no pertenece a la nómina o no existe», medido el 23/09/2026). Por eso
// la ficha del colaborador tiene «Número de contrato»: vacío significa «es la cédula».
//
// El mapa de conceptos sale del catálogo de la propia plantilla (hoja «datos»). La hora ordinaria no
// se manda: esa ya la paga el salario. Las decisiones que el dueño confirmó el 15 de septiembre:
// los domingos y festivos van a los conceptos de RECARGO (25 y 27), y la incapacidad de EPS al 66%.

const ANA_CEDULA = '1001414194';

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
      { contrato: ANA_CEDULA, cedula: ANA_CEDULA, concepto: 26, cantidad: 6, unidad: 'Horas', desde: '01/09/2026', hasta: '15/09/2026' },
      { contrato: ANA_CEDULA, cedula: ANA_CEDULA, concepto: 10, cantidad: 4, unidad: 'Horas', desde: '01/09/2026', hasta: '15/09/2026' },
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
      { contrato: ANA_CEDULA, cedula: ANA_CEDULA, concepto: 31, cantidad: 3, unidad: 'Dias', desde: '01/09/2026', hasta: '15/09/2026' },
    ]);
  });

  it('una novedad que HoraPro no sabe a dónde mandar no se inventa un concepto', () => {
    const filas = filasParaSiigo([persona(ANA_CEDULA, 'Ana', {
      novedades: [{ tipo: 'OTRO', remunerado: true, dias: 2, parciales: 0 }],
    })], PERIODO);
    expect(filas).toEqual([]);
  });
});

describe('el número de contrato', () => {
  it('cuando la persona no lo tiene, el contrato es su cédula', () => {
    const filas = filasParaSiigo([persona(ANA_CEDULA, 'Ana', { liquidacion: [linea('HON', 6)] })], PERIODO);
    expect(filas[0].contrato).toBe(ANA_CEDULA);
  });

  it('cuando lo tiene, manda ese y no la cédula: es el segundo contrato de esa persona en Siigo', () => {
    const filas = filasParaSiigo([persona(ANA_CEDULA, 'Ana', {
      numeroContrato: `${ANA_CEDULA}-1`, liquidacion: [linea('HON', 6)],
    })], PERIODO);
    expect(filas[0]).toMatchObject({ contrato: `${ANA_CEDULA}-1`, cedula: ANA_CEDULA });
  });

  it('un campo escrito con espacios de más no rompe el archivo', () => {
    const filas = filasParaSiigo([persona(ANA_CEDULA, 'Ana', {
      numeroContrato: '  ', liquidacion: [linea('HON', 6)],
    })], PERIODO);
    expect(filas[0].contrato).toBe(ANA_CEDULA);
  });
});
