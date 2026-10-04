// Borra lo que creó el QA de la carga masiva. Va aparte del que lee, para que
// una comprobación nunca pueda borrar por accidente lo que acaba de mirar.
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const gente = await prisma.colaborador.findMany({
    where: { cedula: { startsWith: '7710000' }, nombre: { startsWith: 'QA' } },
    select: { id: true, cedula: true },
  });
  const ids = gente.map(g => g.id);
  console.log('a borrar:', ids.length);
  if (!ids.length) return;

  // Las que NO tienen onDelete: Cascade en el esquema. Si queda una, el delete
  // del colaborador falla con una violación de clave foránea y el QA deja basura.
  const dias = await prisma.diaEsperado.deleteMany({ where: { colaboradorId: { in: ids } } });
  const eventos = await prisma.vinculacionEvento.deleteMany({ where: { colaboradorId: { in: ids } } });
  const registros = await prisma.registro.deleteMany({ where: { colaboradorId: { in: ids } } });
  console.log('dias:', dias.count, 'eventos:', eventos.count, 'registros:', registros.count);

  const borrados = await prisma.colaborador.deleteMany({ where: { id: { in: ids } } });
  console.log('colaboradores borrados:', borrados.count);

  const quedan = await prisma.colaborador.count({ where: { cedula: { startsWith: '7710000' } } });
  console.log('quedan con esa cédula:', quedan);
}
main().finally(() => prisma.$disconnect());
