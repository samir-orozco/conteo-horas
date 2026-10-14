import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../prisma';
import { CARITA_MAX_DE_ATENCION, CLAVE_CALIFICACION_DIA, calificacionDelDiaEncendida, filasParaLaRacha, necesitanAtencion, type EnAtencion } from './clima';
import { capacidadesEmpresa } from './capacidades';

// QUIÉN NECESITA ATENCIÓN HOY EN UNA EMPRESA (4 de octubre de 2026; sacado de routes/clima.ts el 14 de octubre,
// PENDIENTES nº 39, fase 4, porque ahora lo usan tres: el panel, el aviso a las empresas sin el plan y el resumen
// semanal). La regla está en utils/clima.ts, con sus pruebas; esto lee la base.
//
// Entre las personas activas: lo malo que vino después del último buen día de cada una, por viejo que sea. Una
// ventana fija de fechas dejaba fuera a quien responde poco (revisión adversarial del 4 de octubre de 2026).
// Las dos consultas van por `empresaId`, que abre el índice (empresaId, fecha) de calificaciones_clima (§8.4).

export const comoLista = (v: Prisma.JsonValue): string[] => (Array.isArray(v) ? v.filter((m): m is string => typeof m === 'string') : []);

export async function atencionDeLaEmpresa(
  empresaId: string, activos?: Set<string>, db: PrismaClient = prisma,
): Promise<EnAtencion[]> {
  const [buenos, malas, gente] = await Promise.all([
    db.calificacionClima.groupBy({ by: ['colaboradorId'], where: { empresaId, carita: { gt: CARITA_MAX_DE_ATENCION } }, _max: { fecha: true } }),
    db.calificacionClima.findMany({
      where: { empresaId, carita: { lte: CARITA_MAX_DE_ATENCION } },
      select: { colaboradorId: true, fecha: true, carita: true, motivos: true },
    }),
    // Quien llama ya tiene a los activos (el panel): no se vuelven a leer.
    activos ? null : db.colaborador.findMany({ where: { empresaId, activo: true }, select: { id: true } }),
  ]);
  const vivos = activos ?? new Set((gente ?? []).map(c => c.id));
  const ultimoBueno = new Map(buenos.filter(b => b._max.fecha).map(b => [b.colaboradorId, b._max.fecha as Date]));
  return necesitanAtencion(
    filasParaLaRacha(malas.map(m => ({ ...m, motivos: comoLista(m.motivos) })), ultimoBueno).filter(c => vivos.has(c.colaboradorId)),
  );
}

/**
 * Si a esta empresa le tocan los avisos del clima SIN el plan (PENDIENTES nº 39, fase 4): no tiene el clima (ni por
 * plan, ni por prueba, ni por concesión) y la calificación del día está encendida. Con ella apagada no junta
 * respuestas nuevas, y avisar por lo que quedó de antes confunde.
 */
export async function esClimaSinPlan(empresaId: string, db: PrismaClient = prisma): Promise<boolean> {
  const [cap, conf] = await Promise.all([
    capacidadesEmpresa(empresaId),
    db.configuracion.findUnique({ where: { empresaId_clave: { empresaId, clave: CLAVE_CALIFICACION_DIA } }, select: { valor: true } }),
  ]);
  return !cap.features.clima && calificacionDelDiaEncendida(conf?.valor);
}
