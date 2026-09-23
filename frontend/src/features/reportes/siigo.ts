import type { PersonaDeNomina, Periodo } from './nominaDelPeriodo';

// El archivo de novedades de nómina para Siigo (15 de septiembre de 2026).
//
// Qué fila le toca a cada persona y con qué concepto. El archivo lo escribe siigoDirecto.ts sobre la
// plantilla que HoraPro lleva adentro, cambiándole los valores por dentro: Siigo rechaza con un 500
// cualquier archivo que se vuelva a armar (ver plantillas/escribirEnPlantillaSiigo.ts).
//
// A cada persona la identifica su NÚMERO DE CONTRATO, que normalmente es la cédula. Cuando alguien
// tiene un segundo contrato, Siigo le pone la cédula con un «-1», y eso se escribe en su ficha.
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
  // Con el que Siigo identifica el contrato: el de la ficha si lo escribieron, y la cédula si no.
  contrato: string;
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
  // «Ingreso» o «Deducción», como lo declara el catálogo de la plantilla. Va en la columna oculta
  // «Tipo», que es la que Siigo lee para saber si el concepto suma o descuenta.
  tipo: string;
  unidad: UnidadSiigo;
  cantidad: number;
  desde: string;
  hasta: string;
  diasNoHabiles: number;
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

// Una fila por persona y concepto: primero sus horas, después sus novedades en días. Lo que no tiene
// concepto conocido no se manda: inventarle uno sería cargarle a la nómina algo que nadie decidió.
export function filasParaSiigo(personas: PersonaDeNomina[], periodo: Periodo): FilaSiigo[] {
  const desde = fechaSiigo(periodo.desde);
  const hasta = fechaSiigo(periodo.hasta);
  const filas: FilaSiigo[] = [];
  for (const p of personas) {
    if (!p.cedula) continue;
    // Vacío es lo normal y quiere decir «el contrato es la cédula». Se escribe en la ficha solo cuando
    // Siigo reporta que el contrato no existe, que pasa con el segundo contrato de una persona.
    const contrato = p.numeroContrato?.trim() || p.cedula;
    for (const linea of p.liquidacion) {
      const concepto = CONCEPTOS_SIIGO[linea.codigo];
      if (!concepto || concepto.unidad !== 'Horas' || linea.horas <= 0) continue;
      filas.push({ contrato, cedula: p.cedula, concepto: concepto.codigo, cantidad: linea.horas, unidad: 'Horas', desde, hasta });
    }
    for (const novedad of p.novedades) {
      const concepto = CONCEPTOS_SIIGO[novedad.tipo];
      // Las de parte del día no son un día: van en el reporte de HoraPro, no en la nómina del ERP.
      if (!concepto || concepto.unidad !== 'Dias' || novedad.dias <= 0) continue;
      filas.push({ contrato, cedula: p.cedula, concepto: concepto.codigo, cantidad: novedad.dias, unidad: 'Dias', desde, hasta });
    }

    // El auxilio va aparte de los dos bucles: no es una línea de liquidación ni una novedad. Viaja
    // como monto porque así lo pide el catálogo de Siigo, y solo si hay algo que pagar: un cero
    // ocuparía una fila del archivo para decir que no se paga nada.
    const auxilio = CONCEPTOS_SIIGO.AUXILIO_TRANSPORTE;
    if (p.auxilioTransporte && p.auxilioTransporte > 0) {
      filas.push({
        contrato, cedula: p.cedula, concepto: auxilio.codigo, cantidad: p.auxilioTransporte,
        unidad: auxilio.unidad, desde, hasta,
      });
    }
  }
  return filas;
}
