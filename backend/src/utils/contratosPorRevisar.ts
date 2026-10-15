import { estadoDelContrato } from './contratos';
import { resumenDeContrato, type ContratoParaResumen } from './estadoContratoResumen';

// Los contratos que van en «Pendientes por resolver» del Inicio (14 de octubre de 2026).
//
// Decisión del dueño: los que piden una decisión. Es el filtro «Requieren atención» de Colaboradores sin
// «Sin contrato», y sale de la MISMA regla (`resumenDeContrato`), porque si el Inicio contara con otra,
// su número no coincidiría con el de la lista. «Sin contrato» se queda fuera: en una empresa que no usa
// el módulo de contratos serían todos, y el pendiente no bajaría nunca a cero.
//
// No repite la aritmética de fechas: el vencimiento y el límite del preaviso los da `estadoDelContrato`,
// que es donde vive el efecto de las prórrogas.

export type PersonaConContrato = { id: string; nombre: string; contrato: ContratoParaResumen | null };
export type EstadoPorRevisar = 'VENCIDO' | 'PREAVISO_VENCIDO' | 'POR_VENCER';
export type ContratoPorRevisar = { colaboradorId: string; colaborador: string; estado: EstadoPorRevisar; vence: Date; limitePreaviso: Date };

const POR_REVISAR: EstadoPorRevisar[] = ['VENCIDO', 'PREAVISO_VENCIDO', 'POR_VENCER'];

const esPorRevisar = (clave: string): clave is EstadoPorRevisar => (POR_REVISAR as string[]).includes(clave);

export function contratosPorRevisar(personas: PersonaConContrato[], hoy: Date): ContratoPorRevisar[] {
  const lista: ContratoPorRevisar[] = [];
  for (const p of personas) {
    if (!p.contrato) continue;
    const estado = resumenDeContrato(p.contrato, hoy);
    if (!esPorRevisar(estado)) continue;
    const { tipo, fechaInicio, fechaFin, fechaInicioPractica, prorrogas } = p.contrato;
    const e = estadoDelContrato({ tipo: tipo as never, fechaInicio, fechaFin, fechaInicioPractica }, prorrogas, hoy);
    // Los tres estados de arriba solo salen de un contrato con fecha de fin, así que las dos fechas
    // existen. La guarda es para el compilador, no un caso que se espere.
    if (!e.finVigente || !e.fechaLimitePreaviso) continue;
    lista.push({ colaboradorId: p.id, colaborador: p.nombre, estado, vence: e.finVigente, limitePreaviso: e.fechaLimitePreaviso });
  }
  // Por fecha de vencimiento, que ya deja lo más urgente primero: un vencido venció antes de hoy, uno que
  // se prorroga solo vence en menos de 30 días y uno por vencer, después. Ordenar además por estado
  // daría siempre el mismo orden.
  return lista.sort((a, b) => a.vence.getTime() - b.vence.getTime());
}
