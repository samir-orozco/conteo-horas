import { estadoDelContrato, type ProrrogaParaCalculo } from './contratos';

export type ContratoParaResumen = {
  tipo: string;
  fechaInicio: Date;
  fechaFin: Date | null;
  fechaInicioPractica: Date | null;
  prorrogas: ProrrogaParaCalculo[];
};

export type ClaveEstadoContrato =
  | 'SIN_CONTRATO' | 'INDEFINIDO' | 'VIGENTE' | 'POR_VENCER' | 'PREAVISO_VENCIDO' | 'VENCIDO';

// El contrato que representa a una persona: el VIGENTE más reciente. Vigente debería haber uno, y si
// hubiera dos manda el nuevo. Es un trozo de consulta y no una función porque la lista de Colaboradores y
// el Inicio lo piden dentro de su propia consulta de colaboradores: con el mismo trozo, los dos eligen el
// mismo contrato y su estado coincide (14 de octubre de 2026).
export const CONTRATO_QUE_LA_REPRESENTA = {
  where: { estado: 'VIGENTE' },
  select: {
    tipo: true, fechaInicio: true, fechaFin: true, fechaInicioPractica: true,
    prorrogas: { select: { desde: true, hasta: true } },
  },
  orderBy: { fechaInicio: 'desc' },
  take: 1,
} as const;

// Todas las claves que este módulo puede devolver. La pantalla las traduce a
// etiqueta y color; aquí solo viven las que existen, para poder comprobar que
// la traducción no se quede corta.
export const CLAVES_ESTADO_CONTRATO: ClaveEstadoContrato[] = [
  'PREAVISO_VENCIDO', 'VENCIDO', 'POR_VENCER', 'VIGENTE', 'INDEFINIDO', 'SIN_CONTRATO',
];

// El estado del contrato de alguien, en una sola palabra que se pueda filtrar.
//
// No repite la aritmética de fechas: se apoya en estadoDelContrato, que es el
// único sitio donde vive el preaviso de 30 días, el tope de cuatro años y el
// efecto de las prórrogas. Aquí solo se decide cuál de esos hechos es el que
// hay que mostrar en una columna angosta.
//
// El orden importa: lo primero que se pregunta es lo más urgente. Un preaviso
// vencido gana sobre "por vencer" porque ya no es una decisión pendiente, es
// una prórroga que ocurrió sola y que cuesta plata.
export function resumenDeContrato(c: ContratoParaResumen | null, hoy: Date): ClaveEstadoContrato {
  if (!c) return 'SIN_CONTRATO';

  const e = estadoDelContrato(
    { tipo: c.tipo as never, fechaInicio: c.fechaInicio, fechaFin: c.fechaFin, fechaInicioPractica: c.fechaInicioPractica },
    c.prorrogas, hoy,
  );

  // Sin fecha de fin no hay nada que vencer.
  if (!e.finVigente) return 'INDEFINIDO';
  if (e.diasParaVencer !== null && e.diasParaVencer < 0) return 'VENCIDO';
  if (e.preavisoVencido) return 'PREAVISO_VENCIDO';
  if (e.diasParaPreaviso !== null && e.diasParaPreaviso <= 30) return 'POR_VENCER';
  return 'VIGENTE';
}
