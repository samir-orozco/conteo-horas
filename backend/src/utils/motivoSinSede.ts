// Por qué una jornada no tiene sede de marcación (11 de octubre de 2026, PENDIENTES nº 11 y nº 38). Sale
// de los mismos datos con que decide el kiosco (utils/modalidad.ts): la modalidad de la persona y cuántas
// de sus sedes activas tienen coordenadas.
//
// Es el estado de HOY, no el del día de la jornada: si alguien pasó de presencial a remoto, sus jornadas
// viejas dirán «Remoto». No hay otro dato guardado del que sacarlo.
export type MotivoSinSede = 'REMOTO' | 'SIN_UBICACION_DE_SEDE' | 'FUERA_DE_SEDE' | 'NO_REGISTRADA';

export function motivoSinSede(p: { modalidad: string | null; sedesConUbicacion: number }): MotivoSinSede {
  if (p.modalidad === 'REMOTO') return 'REMOTO';
  if (p.sedesConUbicacion === 0) return 'SIN_UBICACION_DE_SEDE';
  switch (p.modalidad) {
    case 'HIBRIDO': return 'FUERA_DE_SEDE';
    // PRESENCIAL, y lo que no se reconozca, que se trata como presencial (MODALIDAD_POR_DEFECTO).
    default: return 'NO_REGISTRADA';
  }
}
