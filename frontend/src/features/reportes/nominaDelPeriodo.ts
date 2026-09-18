import type { Hoja } from '../../lib/exportar';

// El Excel de HoraPro del reporte de nómina del período (15 de septiembre de 2026).
//
// Tres hojas: «Resumen», una fila por persona con el salario como BASE del cálculo y las horas de
// cada concepto; «Detalle», una fila por persona y concepto, que es la forma en que los programas de
// nómina importan las novedades; y «Novedades», los días de vacaciones, incapacidades y permisos.
//
// El total a pagar NO va: en una quincena el salario del mes completo no es lo que se paga, y ese
// módulo todavía no existe. Lo que va es lo que se suma al salario: recargos y extras.
export type LineaDeLiquidacion = {
  codigo: string; nombre: string; horas: number; valorHora: number;
  recargo: number; esExtra: boolean; factorPagado: number; subtotal: number;
};

export type NovedadDeNomina = { tipo: string; remunerado: boolean; dias: number; parciales: number };

export type PersonaDeNomina = {
  colaboradorId: string;
  cedula: string | null;
  nombre: string;
  apellido: string;
  cargo: string | null;
  salarioMensual: number;
  valorHora: number;
  // Los dos contadores, que no son lo mismo: `registrosCont` son marcaciones CERRADAS
  // (`registros.filter(r => r.salida).length` en el motor) y `diasCont` son los días con marcación.
  // Una jornada partida por el almuerzo suma dos cerradas en un solo día, y quien nunca marca la
  // salida suma cero cerradas habiendo trabajado. `diasCont` es opcional porque un servidor anterior
  // no lo manda.
  registrosCont: number;
  diasCont?: number;
  // El auxilio de transporte del período, YA prorrateado por el servidor: no es salario, no entra en
  // el valor de la hora, y se paga por los días en que la persona efectivamente viajó al trabajo.
  // Opcional porque un servidor anterior no lo manda, y en ese caso la celda va vacía: un cero diría
  // «no recibe auxilio», que es una afirmación distinta a «aquí todavía no se calcula».
  auxilioTransporte?: number;
  minutosOrdinarios: number;
  liquidacion: LineaDeLiquidacion[];
  totalRecargos: number;
  totalExtra: number;
  totalAdicional: number;
  novedades: NovedadDeNomina[];
  sedes?: { id: string; nombre: string; porDefecto?: boolean }[];
};

export type Periodo = { desde: string; hasta: string };

// Los conceptos que calcula el motor de horas, con el nombre corto que lleva su columna. HOD va
// aparte: es la hora ordinaria, que ya paga el salario, y por eso no entra en el detalle.
const COLUMNAS_DE_CONCEPTO: { codigo: string; titulo: string }[] = [
  { codigo: 'HON', titulo: 'Recargo nocturno (h)' },
  { codigo: 'HDD', titulo: 'Dominical o festivo (h)' },
  { codigo: 'HND', titulo: 'Dominical o festivo nocturno (h)' },
  { codigo: 'HED', titulo: 'Extra diurna (h)' },
  { codigo: 'HEN', titulo: 'Extra nocturna (h)' },
  { codigo: 'HEDD', titulo: 'Extra diurna dominical o festiva (h)' },
  { codigo: 'HEND', titulo: 'Extra nocturna dominical o festiva (h)' },
];

const ORDINARIA = 'HOD';

const nombreDe = (p: PersonaDeNomina) => `${p.nombre} ${p.apellido}`;
const horasDe = (p: PersonaDeNomina, codigo: string) =>
  p.liquidacion.filter(l => l.codigo === codigo).reduce((s, l) => s + l.horas, 0);

export function hojasDeNomina(personas: PersonaDeNomina[], periodo: Periodo): Hoja[] {
  const resumen: Hoja = {
    nombre: 'Resumen',
    columnas: [
      // Los dos números, cada uno con su nombre (decisión del dueño, 15 de septiembre de 2026). Antes
      // iba uno solo rotulado «Días con marcación» que en realidad eran marcaciones cerradas: medido
      // contra la base, 11 para quien trabajó 5 días y 0 para quien trabajó 2 sin marcar la salida.
      'Cédula', 'Nombre', 'Cargo', 'Salario mensual', 'Valor hora', 'Auxilio de transporte',
      'Días con marcación', 'Marcaciones cerradas', 'Horas ordinarias',
      ...COLUMNAS_DE_CONCEPTO.map(c => c.titulo),
      'Recargos', 'Extras', 'Total adicional',
    ],
    filas: personas.map(p => [
      p.cedula ?? '', nombreDe(p), p.cargo ?? '', p.salarioMensual, p.valorHora, p.auxilioTransporte ?? '',
      p.diasCont ?? '', p.registrosCont,
      horasDe(p, ORDINARIA),
      ...COLUMNAS_DE_CONCEPTO.map(c => horasDe(p, c.codigo)),
      p.totalRecargos, p.totalExtra, p.totalAdicional,
    ]),
  };

  const detalle: Hoja = {
    nombre: 'Detalle',
    columnas: ['Cédula', 'Nombre', 'Código', 'Concepto', 'Horas', 'Valor hora', 'Subtotal'],
    filas: personas.flatMap(p => p.liquidacion
      .filter(l => l.codigo !== ORDINARIA && l.horas > 0)
      .map(l => [p.cedula ?? '', nombreDe(p), l.codigo, l.nombre, l.horas, l.valorHora, l.subtotal])),
  };

  const novedades: Hoja = {
    nombre: 'Novedades',
    columnas: ['Cédula', 'Nombre', 'Novedad', '¿Se paga?', 'Días', 'De parte del día'],
    filas: personas.flatMap(p => p.novedades
      .map(n => [p.cedula ?? '', nombreDe(p), n.tipo, n.remunerado ? 'Sí' : 'No', n.dias, n.parciales])),
  };

  // El período no cambia las filas, pero viaja en la firma porque el nombre del archivo y el
  // encabezado de la pantalla salen de él: así no se arma un Excel sin saber de qué fechas es.
  void periodo;
  return [resumen, detalle, novedades];
}
