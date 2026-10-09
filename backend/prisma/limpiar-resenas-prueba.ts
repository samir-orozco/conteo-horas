// Borra TODO lo que crea prisma/seed-resenas-prueba.ts, y nada más (8 de octubre de 2026). Solo en la
// base LOCAL: se niega a correr si DATABASE_URL no es la base de desarrollo de este equipo, con la
// misma guarda del seed (en el servidor, DATABASE_URL también apunta a localhost).
//
//   npx tsx prisma/limpiar-resenas-prueba.ts
//
// Lo que borra, buscado por los mismos identificadores que usa el seed:
//   - «Ferretería Prueba Reseñas» entera, con la cascada de verdad (borrarEmpresaEnCascada): su
//     administrador, su sede, su suscripción, sus dos pagos y la reseña que haya dejado. Solo si el NIT
//     de prueba lo tiene una empresa con ESE nombre.
//   - Las 16 reseñas «Cliente de prueba N» (ids que empiezan por `resena-prueba-`).
//   - Los tres testimonios de la landing (`IDS_TESTIMONIOS`). El seed los crea si faltan, y también
//     sql/resenas.sql: después de limpiar, correr cualquiera de los dos los devuelve.
//
// Al final vuelve a contar, y si algo quedó lo dice y sale con error.
import { prisma } from '../src/prisma';
import { borrarEmpresaEnCascada } from '../src/utils/borrarEmpresaEnCascada';
import { exigirBaseLocal, EMPRESA_NIT, EMPRESA_NOMBRE, ADMIN_EMAIL, PREFIJO_PRUEBA, IDS_TESTIMONIOS } from './seed-resenas-prueba';

async function main() {
  exigirBaseLocal();

  const empresa = await prisma.empresa.findUnique({ where: { nit: EMPRESA_NIT }, select: { id: true, nombre: true } });
  if (empresa && empresa.nombre !== EMPRESA_NOMBRE) {
    throw new Error(`El NIT ${EMPRESA_NIT} es de «${empresa.nombre}», no de la empresa de prueba: no se borra.`);
  }
  const borradoEmpresa = empresa
    ? await prisma.$transaction(tx => borrarEmpresaEnCascada(tx, empresa.id), { timeout: 60_000 })
    : null;
  const deMuestra = await prisma.resena.deleteMany({ where: { id: { startsWith: PREFIJO_PRUEBA } } });
  const testimonios = await prisma.resena.deleteMany({ where: { id: { in: IDS_TESTIMONIOS } } });

  console.log(`\n  empresa de prueba: ${borradoEmpresa ? `borrada (${JSON.stringify(borradoEmpresa)})` : 'no estaba'}`);
  console.log(`  reseñas de prueba borradas: ${deMuestra.count}`);
  console.log(`  testimonios borrados: ${testimonios.count}`);

  const quedan = {
    empresa: await prisma.empresa.count({ where: { nit: EMPRESA_NIT } }),
    usuario: await prisma.usuario.count({ where: { email: ADMIN_EMAIL } }),
    resenas: await prisma.resena.count({ where: { OR: [{ id: { startsWith: PREFIJO_PRUEBA } }, { id: { in: IDS_TESTIMONIOS } }] } }),
  };
  const sobras = Object.values(quedan).reduce((a, b) => a + b, 0);
  console.log(`\n${sobras ? `*** QUEDARON FILAS: ${JSON.stringify(quedan)} ***` : 'Limpieza completa: no quedó nada del seed.'}\n`);
  if (sobras) process.exitCode = 1;
}

main()
  .catch(e => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
