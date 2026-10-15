// CONTRA QUÉ SE MIDEN LAS LLEGADAS TARDE de una persona en el reporte (15 de octubre de 2026). Desde que la regla es
// la de los días esperados (backend: `diasParaMedir`), a quien no tiene horario se le miden las llegadas contra los
// turnos que le pintó el planificador. El servidor manda entonces `horario: null`, o el que tenga inactivo.
export type HorarioDelReporte = { nombre: string; toleranciaMin: number; activo?: boolean } | null | undefined;

const activo = (h: HorarioDelReporte): h is { nombre: string; toleranciaMin: number; activo?: boolean } => !!h && h.activo !== false;

export function contraQueSeMide(h: HorarioDelReporte): string {
  if (activo(h)) return `horario ${h.nombre}, ${h.toleranciaMin} min de tolerancia`;
  return 'turnos programados, con la tolerancia de cada día';
}

// Para la cabecera del desglose, que dice la tolerancia aparte (la de los días, no la del horario de hoy).
export function referenciaDeLaMedicion(h: HorarioDelReporte): string {
  return activo(h) ? `Horario ${h.nombre}` : 'Turnos programados';
}
