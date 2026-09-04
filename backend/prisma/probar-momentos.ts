// Escenario de prueba para los MOMENTOS de una jornada (`momentosDelDia`).
//
// Arma, en la empresa demo local, los dos casos que el bug de los rótulos hacía
// imposibles de ver:
//   1. Un día partido por el almuerzo con las CUATRO fotos, para comprobar que
//      cada una se rotule con lo que de verdad es y no como "Entrada"/"Salida".
//   2. Alguien que salió a almorzar HOY y no ha vuelto, para comprobar que el
//      dashboard lo muestre en descanso y no como salida del día.
//
// Solo toca la base local. No usar contra producción.
//
//   npx ts-node prisma/probar-momentos.ts            arma el escenario
//   npx ts-node prisma/probar-momentos.ts --limpiar  lo deshace
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const EMPRESA = 'Seguridad Andina Ltda';

// Una imagen reconocible por momento: en la pantalla se lee cuál es cuál sin
// tener que confiar en el orden.
const foto = (texto: string, color: string) =>
  'data:image/svg+xml;base64,' + Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240">` +
    `<rect width="320" height="240" fill="${color}"/>` +
    `<text x="160" y="130" font-family="sans-serif" font-size="24" font-weight="bold" ` +
    `fill="#fff" text-anchor="middle">${texto}</text></svg>`,
  ).toString('base64');

// Medianoche de Bogotá de un día, en UTC. La misma trampa de siempre:
// `new Date("2026-08-13")` es medianoche UTC, que en Bogotá es el 12 a las 7pm.
const medianocheBogota = (d: Date) => {
  const z = new Date(d);
  z.setUTCHours(5, 0, 0, 0);
  return z;
};
const aLas = (base: Date, h: number, m = 0) =>
  new Date(base.getTime() + (h * 60 + m) * 60_000);

async function main() {
  const limpiar = process.argv.includes('--limpiar');

  const empresa = await prisma.empresa.findFirst({ where: { nombre: EMPRESA }, select: { id: true } });
  if (!empresa) throw new Error(`No está "${EMPRESA}" en la base local.`);
  const col = await prisma.colaborador.findFirst({
    where: { empresaId: empresa.id, activo: true },
    select: { id: true, nombre: true, apellido: true },
  });
  if (!col) throw new Error(`"${EMPRESA}" no tiene colaboradores activos.`);

  const conAlmuerzo = medianocheBogota(new Date(Date.UTC(2026, 7, 13)));
  const hoy = medianocheBogota(new Date());

  for (const dia of [conAlmuerzo, hoy]) {
    await prisma.registro.deleteMany({
      where: { colaboradorId: col.id, fecha: { gte: dia, lt: new Date(dia.getTime() + 86_400_000) } },
    });
  }
  if (limpiar) {
    console.log('Escenario borrado.');
    return;
  }

  // Caso 1: entró 10:00, salió a almorzar 14:04, volvió 14:50, cerró 19:00.
  await prisma.registro.create({
    data: {
      colaboradorId: col.id, fecha: conAlmuerzo,
      entrada: aLas(conAlmuerzo, 10), salida: aLas(conAlmuerzo, 14, 4),
      salidaAlmuerzo: true,
      fotoEntrada: foto('1 ENTRADA', '#16a34a'),
      fotoSalida: foto('2 A ALMORZAR', '#d97706'),
    },
  });
  await prisma.registro.create({
    data: {
      colaboradorId: col.id, fecha: conAlmuerzo,
      entrada: aLas(conAlmuerzo, 14, 50), salida: aLas(conAlmuerzo, 19),
      fotoEntrada: foto('3 REGRESO', '#d97706'),
      fotoSalida: foto('4 SALIDA', '#dc2626'),
    },
  });

  // Caso 2: entró 08:00 de hoy y salió a almorzar a las 12:00. No ha vuelto.
  await prisma.registro.create({
    data: {
      colaboradorId: col.id, fecha: hoy,
      entrada: aLas(hoy, 8), salida: aLas(hoy, 12), salidaAlmuerzo: true,
    },
  });

  console.log(`Listo, sobre ${col.nombre} ${col.apellido}:`);
  console.log('  · 13/08/2026 — jornada con almuerzo y las 4 fotos (Registros → ojo o cámara).');
  console.log('  · hoy       — salió a almorzar a las 12:00 (Inicio → En planta ahora).');
}

main()
  .catch(e => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
