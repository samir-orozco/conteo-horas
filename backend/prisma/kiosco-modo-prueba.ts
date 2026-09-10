/**
 * Interruptores del kiosco de la empresa demo, para probar en local.
 *
 *   abrir  / cerrar   → exigir o no un dispositivo vinculado
 *   reto   / sin-reto → pedir o no el giro de cabeza en el ingreso facial
 *   (sin argumento)   → solo mira, no toca nada
 *
 *   npx ts-node --transpile-only prisma/kiosco-modo-prueba.ts reto
 *
 * Toca filas de configuración de la empresa demo y nada más. Dos avisos que no
 * son adorno: sin dispositivo vinculado, cualquiera con el link del kiosco marca
 * desde su teléfono; y el reto de giro está apagado por defecto porque esta es
 * la parte del producto que ya dejó a la gente sin poder marcar varias veces.
 */
import { prisma } from '../src/prisma';

const DISPOSITIVOS = 'KIOSCO_SOLO_DISPOSITIVOS';
const RETO = 'KIOSCO_RETO_POSE';
const accion = process.argv[2];

async function main() {
  const empresa = await prisma.empresa.findFirst({
    where: { nit: '900123456-7' },
    select: { id: true, nombre: true, marcadorToken: true },
  });
  if (!empresa) { console.error('No está la empresa demo.'); process.exit(1); }

  const fijar = async (clave: string, valor: string) => {
    await prisma.configuracion.upsert({
      where: { empresaId_clave: { empresaId: empresa.id, clave } },
      update: { valor },
      create: { empresaId: empresa.id, clave, valor },
    });
  };
  if (accion === 'abrir') await fijar(DISPOSITIVOS, '0');
  if (accion === 'cerrar') await fijar(DISPOSITIVOS, '1');
  if (accion === 'reto') await fijar(RETO, '1');
  if (accion === 'sin-reto') await fijar(RETO, '0');

  const leer = async (clave: string) => (await prisma.configuracion.findUnique({
    where: { empresaId_clave: { empresaId: empresa.id, clave } }, select: { valor: true },
  }))?.valor === '1';

  const exigeDispositivo = await leer(DISPOSITIVOS);
  const exigeReto = await leer(RETO);

  console.log(`\n  ${empresa.nombre}`);
  console.log(`  Kiosco: http://localhost:5174/marcador/${empresa.marcadorToken}`);
  console.log(`  Exige dispositivo vinculado: ${exigeDispositivo ? 'SÍ (hay que vincular con un código del panel)' : 'NO (entra cualquier navegador)'}`);
  console.log(`  Pide girar la cabeza al entrar:  ${exigeReto ? 'SÍ' : 'NO'}`);
  console.log('');
  if (!exigeDispositivo) console.log(`  Para volver a exigir dispositivo:  ...kiosco-modo-prueba.ts cerrar`);
  if (exigeReto) console.log(`  Para quitar el reto de giro:       ...kiosco-modo-prueba.ts sin-reto`);
  else console.log(`  Para pedir el reto de giro:        ...kiosco-modo-prueba.ts reto`);
  console.log('');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
