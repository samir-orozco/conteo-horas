import { describe, it, expect } from 'vitest';
import { hojasDeNomina, type PersonaDeNomina } from './nominaDelPeriodo';

// El Excel de HoraPro del reporte de nómina del período (15 de septiembre de 2026).
//
// Dos hojas. «Resumen» lleva una fila por persona, con el salario como BASE del cálculo y las horas
// de cada concepto. «Detalle» lleva una fila por persona y concepto, que es la forma en que los
// programas de nómina importan las novedades.
//
// El total a pagar no va: en una quincena el salario del mes completo no es lo que se paga, y ese
// módulo no existe todavía.

const ANA: PersonaDeNomina = {
  colaboradorId: 'c1', cedula: '1020345678', nombre: 'Ana', apellido: 'Giraldo', cargo: 'Cajera',
  // Ana parte sus jornadas con el almuerzo: 13 marcaciones cerradas en 7 días. Los dos números
  // tienen que ser distintos, o la prueba pasaría con una columna puesta en lugar de la otra.
  salarioMensual: 1_750_000, valorHora: 9_114.58, registrosCont: 13, diasCont: 7, minutosOrdinarios: 6_240,
  liquidacion: [
    { codigo: 'HOD', nombre: 'Hora Ordinaria Diurna', horas: 104, valorHora: 9_114.58, recargo: 1, esExtra: false, factorPagado: 0, subtotal: 0 },
    { codigo: 'HON', nombre: 'Hora Ordinaria Nocturna', horas: 6, valorHora: 9_114.58, recargo: 1.35, esExtra: false, factorPagado: 0.35, subtotal: 19_140.62 },
    { codigo: 'HED', nombre: 'Hora Extra Diurna', horas: 4, valorHora: 9_114.58, recargo: 1.25, esExtra: true, factorPagado: 1.25, subtotal: 45_572.9 },
    // El motor devuelve la línea del concepto aunque ese período no tenga horas de ese tipo.
    { codigo: 'HEN', nombre: 'Hora Extra Nocturna', horas: 0, valorHora: 9_114.58, recargo: 1.75, esExtra: true, factorPagado: 1.75, subtotal: 0 },
  ],
  totalRecargos: 19_140.62, totalExtra: 45_572.9, totalAdicional: 64_713.52,
  novedades: [{ tipo: 'VACACIONES', remunerado: true, dias: 3, parciales: 0 }],
  sedes: [{ id: 's1', nombre: 'Sede principal', porDefecto: true }],
};

const LUIS: PersonaDeNomina = {
  colaboradorId: 'c2', cedula: '1030405060', nombre: 'Luis', apellido: 'Pérez', cargo: null,
  // Luis trabajó dos días y nunca marcó la salida: cero marcaciones cerradas. Es el caso real que
  // apareció en la base del dueño, donde con un solo número salía como si no hubiera trabajado.
  salarioMensual: 1_600_000, valorHora: 8_333.33, registrosCont: 0, diasCont: 2, minutosOrdinarios: 0,
  liquidacion: [],
  totalRecargos: 0, totalExtra: 0, totalAdicional: 0,
  novedades: [{ tipo: 'MEDICO', remunerado: false, dias: 0, parciales: 1 }],
  sedes: [],
};

const PERIODO = { desde: '2026-09-01', hasta: '2026-09-15' };
const hojas = (personas: PersonaDeNomina[]) => hojasDeNomina(personas, PERIODO);
const hoja = (personas: PersonaDeNomina[], nombre: string) => hojas(personas).find(h => h.nombre === nombre)!;

describe('hojasDeNomina', () => {
  it('arma las hojas de resumen, detalle y novedades', () => {
    expect(hojas([ANA]).map(h => h.nombre)).toEqual(['Resumen', 'Detalle', 'Novedades']);
  });

  it('el resumen lleva una fila por persona, con su cédula, su cargo y el salario como base', () => {
    const r = hoja([ANA, LUIS], 'Resumen');
    expect(r.columnas.slice(0, 5)).toEqual(['Cédula', 'Nombre', 'Cargo', 'Salario mensual', 'Valor hora']);
    expect(r.filas).toHaveLength(2);
    expect(r.filas[0].slice(0, 5)).toEqual(['1020345678', 'Ana Giraldo', 'Cajera', 1_750_000, 9_114.58]);
    // Sin cargo no se inventa nada: va vacío.
    expect(r.filas[1][2]).toBe('');
  });

  // `registrosCont` no son días: es `registros.filter(r => r.salida).length` en el motor
  // (backend/src/utils/liquidarRegistros.ts), o sea las marcaciones CERRADAS. Medido contra la base
  // local el 15 de septiembre de 2026: una persona con 12 marcaciones repartidas en 5 días daba 11,
  // y otra que trabajó dos días sin marcar nunca la salida daba 0. Llamar a esa columna «Días con
  // marcación» le pone al contador un número que no es el que promete.
  it('el resumen trae los dos números, los días y las marcaciones cerradas, cada uno con su nombre', () => {
    const r = hoja([ANA, LUIS], 'Resumen');
    const col = (fila: number, titulo: string) => r.filas[fila][r.columnas.indexOf(titulo)];
    expect(r.columnas).toContain('Días con marcación');
    expect(r.columnas).toContain('Marcaciones cerradas');
    // Ana parte sus jornadas con el almuerzo: 13 marcaciones cerradas en 7 días.
    expect([col(0, 'Días con marcación'), col(0, 'Marcaciones cerradas')]).toEqual([7, 13]);
    // Luis trabajó dos días y nunca marcó la salida. Con un solo número salía como si no hubiera
    // trabajado: es el caso real que encontramos en la base del dueño.
    expect([col(1, 'Días con marcación'), col(1, 'Marcaciones cerradas')]).toEqual([2, 0]);
  });

  it('el resumen trae las horas de cada concepto en su columna, y en cero el que no tuvo', () => {
    const r = hoja([ANA], 'Resumen');
    const col = (titulo: string) => r.filas[0][r.columnas.indexOf(titulo)];
    expect(col('Horas ordinarias')).toBe(104);
    expect(col('Recargo nocturno (h)')).toBe(6);
    expect(col('Extra diurna (h)')).toBe(4);
    expect(col('Extra nocturna (h)')).toBe(0);
  });

  it('el resumen cierra con lo que se paga además del salario', () => {
    const r = hoja([ANA], 'Resumen');
    const col = (titulo: string) => r.filas[0][r.columnas.indexOf(titulo)];
    expect(col('Recargos')).toBe(19_140.62);
    expect(col('Extras')).toBe(45_572.9);
    expect(col('Total adicional')).toBe(64_713.52);
    // El total a pagar no va: el salario de un mes no es lo que se paga en una quincena.
    expect(r.columnas).not.toContain('Total a pagar');
  });

  it('el detalle lleva una fila por persona y concepto, sin las horas ordinarias', () => {
    const d = hoja([ANA], 'Detalle');
    expect(d.columnas).toEqual(['Cédula', 'Nombre', 'Código', 'Concepto', 'Horas', 'Valor hora', 'Subtotal']);
    // HOD no va: la hora ordinaria ya la paga el salario, y en el detalle solo va lo que se suma.
    expect(d.filas.map(f => f[2])).toEqual(['HON', 'HED']);
    expect(d.filas[0]).toEqual(['1020345678', 'Ana Giraldo', 'HON', 'Hora Ordinaria Nocturna', 6, 9_114.58, 19_140.62]);
  });

  it('quien no tuvo recargos ni extras no ensucia el detalle', () => {
    expect(hoja([LUIS], 'Detalle').filas).toEqual([]);
  });

  it('las novedades van en su hoja, con los días y las de parte del día aparte', () => {
    const n = hoja([ANA, LUIS], 'Novedades');
    expect(n.columnas).toEqual(['Cédula', 'Nombre', 'Novedad', '¿Se paga?', 'Días', 'De parte del día']);
    expect(n.filas[0]).toEqual(['1020345678', 'Ana Giraldo', 'VACACIONES', 'Sí', 3, 0]);
    expect(n.filas[1]).toEqual(['1030405060', 'Luis Pérez', 'MEDICO', 'No', 0, 1]);
  });
});
