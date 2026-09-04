// Comprueba que los avisos de vencimiento se generan SIN que nadie abra el
// tablero, que es el agujero que tenían: `avisarContratos` colgaba de la ruta
// del dashboard, así que la empresa que no entraba nunca se enteraba.
//
// Correr con: npx ts-node prisma/verificar-avisos-contratos.ts
import { prisma } from '../src/prisma';
import { avisarContratosDeTodas } from '../src/routes/contratos';

const TIPOS = ['CONTRATO_PREAVISO', 'CONTRATO_PREAVISO_VENCIDO', 'CONTRATO_A_INDEFINIDO', 'CONTRATO_ETAPA_APRENDIZ'];

const listar = () => prisma.notificacion.findMany({
  where: { tipo: { in: TIPOS as any } },
  select: { tipo: true, titulo: true, cuerpo: true },
  orderBy: { titulo: 'asc' },
});

(async () => {
  // Punto de partida limpio: se borran solo las notificaciones de contratos.
  const borradas = await prisma.notificacion.deleteMany({ where: { tipo: { in: TIPOS as any } } });
  console.log(`\nPartimos de cero: ${borradas.count} avisos de contratos borrados.`);

  const empresas = await prisma.empresa.count({ where: { activa: true } });
  console.log(`Empresas activas: ${empresas}\n`);

  console.log('--- Primera pasada (lo que haría el arranque del servidor) ---');
  const ok1 = await avisarContratosDeTodas({ info: m => console.log('  ' + m), error: (e, m) => console.log('  ERROR ' + m, e) });
  const tras1 = await listar();
  for (const n of tras1) console.log(`  [${n.tipo}] ${n.titulo}\n      ${n.cuerpo}`);
  console.log(`  => ${tras1.length} avisos generados en ${ok1} empresas\n`);

  console.log('--- Segunda pasada (no debe duplicar nada) ---');
  await avisarContratosDeTodas({ info: m => console.log('  ' + m), error: (e, m) => console.log('  ERROR ' + m, e) });
  const tras2 = await listar();
  console.log(`  => ${tras2.length} avisos en total`);
  console.log(tras2.length === tras1.length
    ? '  OK: idempotente, no duplicó.\n'
    : `  FALLA: pasó de ${tras1.length} a ${tras2.length}.\n`);

  await prisma.$disconnect();
  process.exit(tras2.length === tras1.length && tras1.length > 0 ? 0 : 1);
})();
