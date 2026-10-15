import { TIPO_PERMISO_LABEL } from '../../constants/permisos';
import { diaYMes } from '../../lib/fechas';
import type { Dash } from './types';

// «Pendientes por resolver» en el Inicio (14 de octubre de 2026).
//
// Lo que espera a que alguien haga algo, decidido con el dueño: los turnos sin cerrar, las novedades por
// aprobar y los contratos por revisar. Lo demás (llegó tarde, no ha llegado, la pausa sin volver) se queda
// en la campana: son avisos del momento, no algo que siga abierto. Cada aviso se apaga cuando se resuelve.
// El 15 de octubre se sumaron los casos de clima abiertos, solo para el administrador que tiene la función.

export type ClavePendiente = 'TURNOS' | 'NOVEDADES' | 'CONTRATOS' | 'CLIMA';
export type Chip = { clave: ClavePendiente; total: number; texto: string };
export type ContratoPendiente = NonNullable<Dash['pendientes']>['contratos'][number];
export type NovedadPendiente = NonNullable<Dash['pendientes']>['novedades'][number];

const cuantos = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

// En este orden: lo que cambia la liquidación primero, y el clima al final. Un servidor anterior no manda `pendientes`, y
// entonces quedan solo los turnos sin cerrar, que existen desde antes.
export function chipsDePendientes(turnosSinCerrar: number, p: Dash['pendientes']): Chip[] {
  const novedades = p?.novedades.length ?? 0;
  const contratos = p?.contratos.length ?? 0;
  const clima = p?.casosClima ?? 0;
  const chips: Chip[] = [
    { clave: 'TURNOS', total: turnosSinCerrar, texto: cuantos(turnosSinCerrar, 'turno sin cerrar', 'turnos sin cerrar') },
    { clave: 'NOVEDADES', total: novedades, texto: cuantos(novedades, 'novedad por aprobar', 'novedades por aprobar') },
    { clave: 'CONTRATOS', total: contratos, texto: cuantos(contratos, 'contrato por revisar', 'contratos por revisar') },
    { clave: 'CLIMA', total: clima, texto: cuantos(clima, 'caso de clima abierto', 'casos de clima abiertos') },
  ];
  return chips.filter(c => c.total > 0);
}

// Qué hay que decidir con cada contrato. Un caso por estado y un default explícito (CLAUDE.md §9.4).
export function detalleDeContrato(c: ContratoPendiente): string {
  switch (c.estado) {
    case 'POR_VENCER': return `Preaviso hasta el ${diaYMes(c.limitePreaviso)}`;
    case 'PREAVISO_VENCIDO': return `Vence el ${diaYMes(c.vence)} y se prorroga solo`;
    case 'VENCIDO': return `Venció el ${diaYMes(c.vence)}: registra la prórroga o el retiro`;
    default: return 'Revisa el contrato';
  }
}

export function fechasDeNovedad(n: NovedadPendiente): string {
  const desde = diaYMes(n.fechaInicio);
  const hasta = diaYMes(n.fechaFin);
  return desde === hasta ? desde : `${desde} al ${hasta}`;
}

export const tipoDeNovedad = (tipo: string) => TIPO_PERMISO_LABEL[tipo] ?? tipo;
