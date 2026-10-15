import type { Tardanza } from './tardanzas';

// Las llegadas tarde de los últimos 7 días, día por día, para el Inicio (15 de octubre de 2026).
//
// No decide quién llegó tarde: eso lo dice `calcularTardanzas`, la misma regla del reporte. Aquí solo
// se reordena su detalle por día. Las fechas son claves de Bogotá ('YYYY-MM-DD').

export type LlegadaTardeDelDia = { id: string; horaEsperada: string; horaLlegada: string; minutosTarde: number };
export type LlegadasDelDia = { clave: string; totalMinutos: number; personas: LlegadaTardeDelDia[] };

export function llegadasTardePorDia(claves: string[], filas: { colaboradorId: string; detalle: Tardanza[] }[]): LlegadasDelDia[] {
  const porDia = new Map<string, LlegadaTardeDelDia[]>(claves.map(c => [c, []]));
  for (const f of filas) {
    for (const t of f.detalle) {
      porDia.get(t.fecha)?.push({ id: f.colaboradorId, horaEsperada: t.horaEsperada, horaLlegada: t.horaLlegada, minutosTarde: t.minutosTarde });
    }
  }
  return claves.map(clave => {
    const personas = (porDia.get(clave) ?? []).sort((a, b) => b.minutosTarde - a.minutosTarde);
    return { clave, totalMinutos: personas.reduce((s, p) => s + p.minutosTarde, 0), personas };
  });
}
