// QA de la costura de la carga masiva (CLAUDE.md 8.6): qué quedó GUARDADO de
// verdad, no qué dijo la pantalla. Solo lee; el borrado va en la otra mitad.
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const gente = await prisma.colaborador.findMany({
    where: { cedula: { startsWith: '7710000' } },
    select: { cedula: true, nombre: true, salarioMensual: true, auxilioTransporte: true },
    orderBy: { cedula: 'asc' },
  });
  console.log('encontrados:', gente.length);
  for (const c of gente) {
    const q = c.auxilioTransporte === null ? 'null  -> el del decreto'
      : c.auxilioTransporte === 0 ? '0     -> esta empresa no lo paga'
      : `${c.auxilioTransporte} -> pactado`;
    console.log(`${c.cedula}  ${c.nombre.padEnd(6)} basico=${c.salarioMensual}  auxilio=${q}`);
  }
}
main().finally(() => prisma.$disconnect());
