import { Prisma } from '@prisma/client';
import { sedePrincipal, sedesParaGuardar, sedeDeMarcaSinUbicacion } from './sedePrincipal';

// La plomería de la regla de utils/sedePrincipal.ts: lee de la base lo que la
// regla necesita y escribe lo que decide. Recibe el cliente, o el de una
// transacción, en vez de importar `prisma`, igual que borrarEmpresaEnCascada.
// Verificada contra MySQL con prisma/verificar-sede-principal.ts (CLAUDE.md 8.6).

type Db = Prisma.TransactionClient;

const CAMPOS_SEDE = { id: true, activa: true, creadoEn: true } as const;

export const NOMBRE_SEDE_PRINCIPAL = 'Sede principal';

// Toda empresa nace con su Sede principal. Nace sin ubicación, así que no exige
// GPS a nadie hasta que alguien la configure: no cambia cómo marca la gente.
export function crearSedePrincipal(tx: Db, empresaId: string) {
  return tx.sede.create({ data: { empresaId, nombre: NOMBRE_SEDE_PRINCIPAL }, select: { id: true } });
}

export async function principalDeEmpresa(db: Db, empresaId: string): Promise<string | null> {
  return sedePrincipal(await db.sede.findMany({ where: { empresaId, activa: true }, select: CAMPOS_SEDE }));
}

// La sede de una marca que no trae ubicación: la de un presencial cuyas sedes no
// tienen coordenadas, o la que escribe un administrador a mano.
export async function sedeParaMarcaSinUbicacion(
  db: Db, colaboradorId: string, sedeDeLaJornada: string | null = null,
): Promise<string | null> {
  const col = await db.colaborador.findUnique({
    where: { id: colaboradorId },
    select: { modalidad: true, empresaId: true, sedes: { select: { sede: { select: CAMPOS_SEDE } } } },
  });
  if (!col) return null;
  return sedeDeMarcaSinUbicacion({
    modalidad: col.modalidad,
    sedeIdentificada: null,
    sedeDeLaJornada,
    asignadas: col.sedes.map(s => s.sede),
    principal: await principalDeEmpresa(db, col.empresaId),
  });
}

// Le devuelve la principal a cada presencial que se quedó sin ninguna sede
// activa. Va después de crear, editar, importar o reingresar a alguien, y de
// desactivar una sede. Devuelve cuántas asignaciones creó.
export async function asegurarSedeDePresencial(db: Db, empresaId: string, colaboradorIds: string[]): Promise<number> {
  if (colaboradorIds.length === 0) return 0;
  const colaboradores = await db.colaborador.findMany({
    where: { id: { in: colaboradorIds }, empresaId },
    select: { id: true, modalidad: true, sedes: { where: { sede: { activa: true } }, select: { sedeId: true } } },
  });
  const principal = await principalDeEmpresa(db, empresaId);
  const faltantes = colaboradores.flatMap(c => {
    const suyas = c.sedes.map(s => s.sedeId);
    return sedesParaGuardar(c.modalidad, suyas, principal)
      .filter(sedeId => !suyas.includes(sedeId))
      .map(sedeId => ({ colaboradorId: c.id, sedeId }));
  });
  if (faltantes.length > 0) await db.colaboradorSede.createMany({ data: faltantes, skipDuplicates: true });
  return faltantes.length;
}
