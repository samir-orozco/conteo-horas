import type { PersonaDeNomina, Periodo } from './nominaDelPeriodo';

// El archivo de novedades de nómina para Siigo (15 de septiembre de 2026).
//
// Se llena LA PLANTILLA que el cliente descarga de su Siigo, no se genera una nueva: ahí vienen sus
// empleados con su número de contrato, que es como Siigo los identifica. HoraPro busca a cada persona
// por su cédula entre los empleados de la plantilla; a quien no esté, lo deja por fuera y lo dice.
//
// Medido sobre la plantilla real del dueño: la hoja de novedades tiene sus títulos en la fila 5, los
// empleados desde la 6, y un aviso en la 505 que dice hasta dónde se puede escribir. Las tres hojas
// (novedades, conceptos del usuario y el catálogo «datos») viajan intactas, porque Siigo las lee al
// subir el archivo. Se reescribe SIN estilos a propósito: con ellos el archivo pasaba de 60 KB a 2,2 MB.
//
// Decisiones del dueño del 15 de septiembre de 2026, con lo que se pudo confirmar en fuentes públicas:
//  - Domingos y festivos van a los conceptos de RECARGO (25 y 27). La hora ordinaria ya la paga el salario.
//  - La incapacidad de EPS va al concepto del 66%, que es el de los días 3 al 90, el caso corriente.
//    El concepto queda escrito en el archivo para poder cambiarlo antes de subirlo.
//  - Los permisos remunerados (médico, calamidad, personal) van a licencia remunerada.
// «Valor $» es la unidad que el propio catálogo de Siigo declara para el auxilio de transporte
// (concepto 02): la cantidad que espera es la PLATA, ya prorrateada, no un número de días.
export type UnidadSiigo = 'Horas' | 'Dias' | 'Valor $';

export type ConceptoSiigo = { codigo: number; unidad: UnidadSiigo };

export type FilaSiigo = {
  cedula: string;
  concepto: number;
  cantidad: number;
  unidad: UnidadSiigo;
  desde: string;
  hasta: string;
};

export type FilaEscrita = {
  contrato: string;
  cedula: string;
  nombre: string;
  concepto: string;
  unidad: UnidadSiigo;
  cantidad: number;
  desde: string;
  hasta: string;
  diasNoHabiles: number;
};

export type ResultadoSiigo = {
  archivo: Uint8Array;
  filasEscritas: FilaEscrita[];
  fueraDeLaPlantilla: { cedula: string | null; nombre: string }[];
};

// De lo que calcula HoraPro a los conceptos de Siigo. La hora ordinaria (HOD) no está a propósito.
export const CONCEPTOS_SIIGO: Record<string, ConceptoSiigo> = {
  // Horas
  HON: { codigo: 26, unidad: 'Horas' }, // Recargo nocturno
  HDD: { codigo: 25, unidad: 'Horas' }, // Recargo dominical o festivo
  HND: { codigo: 27, unidad: 'Horas' }, // Recargo nocturno dominical o festivo ordinario
  HED: { codigo: 10, unidad: 'Horas' }, // Horas extras diurnas 125%
  HEN: { codigo: 11, unidad: 'Horas' }, // Horas extras nocturnas 175%
  HEDD: { codigo: 7, unidad: 'Horas' }, // Hora extra diurna dominical o festiva
  HEND: { codigo: 12, unidad: 'Horas' }, // Horas extras nocturnas dominical o festiva
  // Novedades, en días
  VACACIONES: { codigo: 31, unidad: 'Dias' }, // Vacaciones disfrutadas
  INCAPACIDAD_EPS: { codigo: 15, unidad: 'Dias' }, // Enfermedad general al 66%
  INCAPACIDAD_ARL: { codigo: 16, unidad: 'Dias' }, // Enfermedad profesional
  LICENCIA_MATERNIDAD: { codigo: 20, unidad: 'Dias' },
  LICENCIA_PATERNIDAD: { codigo: 20, unidad: 'Dias' },
  LICENCIA_LUTO: { codigo: 21, unidad: 'Dias' },
  MEDICO: { codigo: 22, unidad: 'Dias' }, // Licencia remunerada
  CALAMIDAD: { codigo: 22, unidad: 'Dias' },
  PERSONAL: { codigo: 22, unidad: 'Dias' },
  NO_REMUNERADO: { codigo: 38, unidad: 'Dias' }, // Licencia no remunerada (deducción)

  // Plata, no tiempo. No sale de la liquidación ni de las novedades: es un monto de la persona, ya
  // prorrateado por los días en que viajó al trabajo.
  AUXILIO_TRANSPORTE: { codigo: 2, unidad: 'Valor $' },
};

// Siigo pide las fechas como DD/MM/AAAA. Las del período vienen como AAAA-MM-DD.
function fechaSiigo(iso: string): string {
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}

const nombreDe = (p: PersonaDeNomina) => `${p.nombre} ${p.apellido}`;

// Una fila por persona y concepto: primero sus horas, después sus novedades en días. Lo que no tiene
// concepto conocido no se manda: inventarle uno sería cargarle a la nómina algo que nadie decidió.
export function filasParaSiigo(personas: PersonaDeNomina[], periodo: Periodo): FilaSiigo[] {
  const desde = fechaSiigo(periodo.desde);
  const hasta = fechaSiigo(periodo.hasta);
  const filas: FilaSiigo[] = [];
  for (const p of personas) {
    if (!p.cedula) continue;
    for (const linea of p.liquidacion) {
      const concepto = CONCEPTOS_SIIGO[linea.codigo];
      if (!concepto || concepto.unidad !== 'Horas' || linea.horas <= 0) continue;
      filas.push({ cedula: p.cedula, concepto: concepto.codigo, cantidad: linea.horas, unidad: 'Horas', desde, hasta });
    }
    for (const novedad of p.novedades) {
      const concepto = CONCEPTOS_SIIGO[novedad.tipo];
      // Las de parte del día no son un día: van en el reporte de HoraPro, no en la nómina del ERP.
      if (!concepto || concepto.unidad !== 'Dias' || novedad.dias <= 0) continue;
      filas.push({ cedula: p.cedula, concepto: concepto.codigo, cantidad: novedad.dias, unidad: 'Dias', desde, hasta });
    }

    // El auxilio va aparte de los dos bucles: no es una línea de liquidación ni una novedad. Viaja
    // como monto porque así lo pide el catálogo de Siigo, y solo si hay algo que pagar: un cero
    // ocuparía una fila del archivo para decir que no se paga nada.
    const auxilio = CONCEPTOS_SIIGO.AUXILIO_TRANSPORTE;
    if (p.auxilioTransporte && p.auxilioTransporte > 0) {
      filas.push({
        cedula: p.cedula, concepto: auxilio.codigo, cantidad: p.auxilioTransporte,
        unidad: auxilio.unidad, desde, hasta,
      });
    }
  }
  return filas;
}

// Dónde vive cada cosa en la plantilla de Siigo, medido sobre la que descargó el dueño.
const FILA_TITULOS = 5;
const PRIMERA_FILA = 6;
const COL = { contrato: 'A', cedula: 'B', nombre: 'C', concepto: 'D', unidad: 'E', cantidad: 'F', desde: 'G', hasta: 'H', noHabiles: 'I' };

export async function llenarPlantillaSiigo(
  plantilla: Uint8Array,
  personas: PersonaDeNomina[],
  periodo: Periodo,
): Promise<ResultadoSiigo> {
  const XLSX = await import('xlsx');
  const wb = XLSX.read(plantilla, { type: 'array' });
  const hoja = wb.Sheets['Novedades'];
  if (!hoja) throw new Error('Ese archivo no parece la plantilla de Siigo: no tiene la hoja «Novedades».');

  // Los empleados que trae la plantilla, con su número de contrato. La cédula es la llave.
  const empleados = new Map<string, { contrato: string; nombre: string }>();
  let ultimaFila = FILA_TITULOS;
  let avisoDelLimite = Infinity;
  for (let fila = PRIMERA_FILA; fila < 1000; fila++) {
    const contrato = hoja[COL.contrato + fila]?.v;
    if (contrato === undefined || String(contrato).trim() === '') continue;
    if (String(contrato).toUpperCase().includes('HASTA ACA')) { avisoDelLimite = fila; break; }
    const cedula = String(hoja[COL.cedula + fila]?.v ?? contrato).trim();
    empleados.set(cedula, { contrato: String(contrato).trim(), nombre: String(hoja[COL.nombre + fila]?.v ?? '').trim() });
    ultimaFila = fila;
  }

  // El nombre del concepto tal como lo escribe el catálogo de la plantilla, que es lo que Siigo espera
  // ver en la celda. Se lee de la hoja «datos» y no se arma a mano.
  const nombresDeConcepto = new Map<number, string>();
  const datos = wb.Sheets['datos'];
  if (datos) {
    for (const fila of XLSX.utils.sheet_to_json<unknown[]>(datos, { header: 1, blankrows: false })) {
      const [nombre, codigo] = fila as [unknown, unknown];
      if (typeof nombre === 'string' && typeof codigo === 'number' && !nombresDeConcepto.has(codigo)) {
        nombresDeConcepto.set(codigo, nombre);
      }
    }
  }

  const fueraDeLaPlantilla: { cedula: string | null; nombre: string }[] = [];
  for (const p of personas) {
    if (!p.cedula || !empleados.has(p.cedula)) fueraDeLaPlantilla.push({ cedula: p.cedula, nombre: nombreDe(p) });
  }

  const filasEscritas: FilaEscrita[] = [];
  let fila = ultimaFila + 1;
  for (const f of filasParaSiigo(personas, periodo)) {
    const empleado = empleados.get(f.cedula);
    if (!empleado) continue;
    if (fila >= avisoDelLimite) break; // no se pisa el aviso de hasta dónde se puede escribir
    const escrita: FilaEscrita = {
      contrato: empleado.contrato, cedula: f.cedula, nombre: empleado.nombre,
      concepto: nombresDeConcepto.get(f.concepto) ?? String(f.concepto),
      unidad: f.unidad, cantidad: f.cantidad, desde: f.desde, hasta: f.hasta, diasNoHabiles: 0,
    };
    XLSX.utils.sheet_add_aoa(hoja, [[
      escrita.contrato, escrita.cedula, escrita.nombre, escrita.concepto,
      escrita.unidad, escrita.cantidad, escrita.desde, escrita.hasta, escrita.diasNoHabiles,
    ]], { origin: COL.contrato + fila });
    filasEscritas.push(escrita);
    fila++;
  }

  // Sin estilos: con ellos el archivo pasaba de 60 KB a 2,2 MB, medido sobre esta misma plantilla.
  const archivo = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  return { archivo: new Uint8Array(archivo), filasEscritas, fueraDeLaPlantilla };
}
