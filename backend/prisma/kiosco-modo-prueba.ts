/**
 * Enciende o apaga la exigencia de dispositivo vinculado en el kiosco de la
 * empresa demo, para poder abrirlo desde cualquier navegador al probar en local.
 *
 *   npx ts-node --transpile-only prisma/kiosco-modo-prueba.ts abrir
 *   npx ts-node --transpile-only prisma/kiosco-modo-prueba.ts cerrar
 *   npx ts-node --transpile-only prisma/kiosco-modo-prueba.ts        (solo mira)
 *
 * Toca UNA fila de configuración de la empresa demo y nada más. En producción
 * esa exigencia es una protección de verdad: si no está, cualquiera con el link
 * del kiosco puede marcar desde su propio teléfono.
 */
import { prisma } from '../src/prisma';

const CLAVE = 'KIOSCO_SOLO_DISPOSITIVOS';
const accion = process.argv[2];

async function main() {
  const empresa = await prisma.empresa.findFirst({
    where: { nit: '900123456-7' },
    select: { id: true, nombre: true, marcadorToken: true },
  });
  if (!empresa) { console.error('No está la empresa demo.'); process.exit(1); }

  if (accion === 'abrir' || accion === 'cerrar') {
    const valor = accion === 'abrir' ? '0' : '1';
    await prisma.configuracion.upsert({
      where: { empresaId_clave: { empresaId: empresa.id, clave: CLAVE } },
      update: { valor },
      create: { empresaId: empresa.id, clave: CLAVE, valor },
    });
  }

  const cfg = await prisma.configuracion.findUnique({
    where: { empresaId_clave: { empresaId: empresa.id, clave: CLAVE } },
    select: { valor: true },
  });
  const exige = cfg?.valor === '1';

  console.log(`\n  ${empresa.nombre}`);
  console.log(`  Kiosco: http://localhost:5174/marcador/${empresa.marcadorToken}`);
  console.log(`  Exige dispositivo vinculado: ${exige ? 'SÍ (hay que vincular con un código del panel)' : 'NO (entra cualquier navegador)'}`);
  if (!exige) {
    console.log(`\n  OJO: así queda abierto. Para volver a exigirlo:`);
    console.log(`    npx ts-node --transpile-only prisma/kiosco-modo-prueba.ts cerrar`);
  }
  console.log('');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
