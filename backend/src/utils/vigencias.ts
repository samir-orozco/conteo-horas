import { JornadaVigencia, TipoHora } from '@prisma/client';

// Jornada legal vigente en una fecha (Ley 2101 de 2021: 48→42h gradual)
export function jornadaVigente(fecha: Date, jornadas: JornadaVigencia[]): number {
  const aplicables = jornadas
    .filter(j => j.vigenteDesde <= fecha)
    .sort((a, b) => b.vigenteDesde.getTime() - a.vigenteDesde.getTime());
  // fallback conservador si no hay vigencias sembradas
  return aplicables[0]?.horasSemanales ?? 42;
}

// Tipos de hora vigentes en una fecha (recargos con vigencias, Ley 2466 de 2025)
export function tiposVigentes(fecha: Date, tipos: TipoHora[]): TipoHora[] {
  return tipos.filter(
    t => t.activo && t.vigenteDesde <= fecha && (!t.vigenteHasta || fecha < t.vigenteHasta)
  );
}

// Divisor de horas mensuales para valor hora: jornada semanal × 30 / 6
// (44h → 220, 42h → 210; convención Mintrabajo)
export function horasMesDeJornada(jornadaSemanal: number): number {
  return jornadaSemanal * 5;
}
