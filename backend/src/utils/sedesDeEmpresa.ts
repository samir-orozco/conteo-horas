import { Prisma } from '@prisma/client';
import { sedePorDefecto, type SedeParaElegir } from './sedePrincipal';

// La plomería de las sedes de una empresa: crea la Sede principal y lee de la base
// lo que necesita la regla de utils/sedePrincipal.ts. Recibe el cliente, o el de una
// transacción, en vez de importar `prisma`, igual que borrarEmpresaEnCascada.
// Verificada contra MySQL con prisma/verificar-sede-principal.ts (CLAUDE.md 8.6).
//
// Desde el 12 de septiembre de 2026 no escribe ninguna sede deducida, ni en las
// marcaciones ni en las asignaciones: la sede de un presencial se muestra al leer.

type Db = Prisma.TransactionClient;

const CAMPOS_SEDE = { id: true, activa: true, creadoEn: true } as const;

export const NOMBRE_SEDE_PRINCIPAL = 'Sede principal';

// Toda empresa nace con su Sede principal. Nace sin ubicación, así que no exige
// GPS a nadie hasta que alguien la configure: no cambia cómo marca la gente.
export function crearSedePrincipal(tx: Db, empresaId: string) {
  return tx.sede.create({ data: { empresaId, nombre: NOMBRE_SEDE_PRINCIPAL }, select: { id: true } });
}

// La sede por defecto de cada persona de la empresa (`sedePorDefecto`), para
// mostrarla y contarla, nunca para guardarla. Son dos consultas para todo el grupo y
// no una por persona, porque los reportes la piden para la empresa entera. Con
// `colaboradorId` se leen solo las asignaciones de esa persona.
export async function sedesPorDefecto(
  db: Db, empresaId: string, colaboradorId?: string,
): Promise<(colaboradorId: string) => string | null> {
  const [asignaciones, deLaEmpresa] = await Promise.all([
    db.colaboradorSede.findMany({
      where: { sede: { empresaId, activa: true }, ...(colaboradorId ? { colaboradorId } : {}) },
      select: { colaboradorId: true, sede: { select: CAMPOS_SEDE } },
    }),
    db.sede.findMany({ where: { empresaId, activa: true }, select: CAMPOS_SEDE }),
  ]);
  const suyas = new Map<string, SedeParaElegir[]>();
  for (const a of asignaciones) {
    if (!suyas.has(a.colaboradorId)) suyas.set(a.colaboradorId, []);
    suyas.get(a.colaboradorId)!.push(a.sede);
  }
  return id => sedePorDefecto(suyas.get(id) ?? [], deLaEmpresa);
}
