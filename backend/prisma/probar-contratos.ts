// Escenarios de contrato para ver el módulo funcionando, en la empresa demo.
//
// Los cuatro casos que hay que poder mirar en pantalla, porque cada uno dispara
// una alerta distinta y son justo los que la Ley 2466 hizo difíciles:
//   1. Fijo con el plazo de preaviso ya vencido: se va a prorrogar solo.
//   2. Fijo trimestral con cuatro prórrogas: la quinta ya debe ser de un año.
//   3. Contrato anterior a la reforma: su tope corre desde el 25/06/2025.
//   4. Aprendiz a punto de pasar a etapa práctica, que le sube la remuneración.
//
// Solo toca la base local.
//   npx ts-node prisma/probar-contratos.ts            arma
//   npx ts-node prisma/probar-contratos.ts --limpiar  borra
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const f = (a: number, m: number, d: number) => new Date(Date.UTC(a, m - 1, d, 5, 0, 0));
(async () => {
  const emp = await p.empresa.findFirst({ where: { nombre: 'Seguridad Andina Ltda' }, select: { id: true } });
  const cols = await p.colaborador.findMany({ where: { empresaId: emp!.id, activo: true }, select: { id: true, nombre: true, apellido: true }, take: 4 });
  await p.contrato.deleteMany({ where: { colaborador: { empresaId: emp!.id } } });
  if (process.argv.includes('--limpiar')) { console.log('Contratos de prueba borrados.'); await p.$disconnect(); return; }

  // 1. Fijo con el preaviso encima: vence en 20 días.
  const hoy = new Date();
  const en20 = new Date(hoy.getTime() + 20 * 864e5);
  const c1 = await p.contrato.create({ data: {
    colaboradorId: cols[0].id, tipo: 'FIJO',
    fechaInicio: new Date(hoy.getTime() - 160 * 864e5), fechaFin: en20 } });

  // 2. Fijo trimestral con cuatro prórrogas: la quinta ya debe ser de un año.
  const c2 = await p.contrato.create({ data: {
    colaboradorId: cols[1].id, tipo: 'FIJO', fechaInicio: f(2025, 1, 1), fechaFin: f(2025, 3, 31) } });
  for (let i = 0; i < 4; i++) {
    await p.prorrogaContrato.create({ data: { contratoId: c2.id,
      desde: f(2025, 4 + i * 3, 1), hasta: f(2025, 6 + i * 3, 30) } });
  }

  // 3. Contrato viejo, anterior a la reforma: su tope corre desde el 25/06/2025.
  const c3 = await p.contrato.create({ data: {
    colaboradorId: cols[2].id, tipo: 'FIJO', fechaInicio: f(2019, 3, 1), fechaFin: f(2029, 6, 30) } });

  // 4. Aprendiz a punto de pasar a etapa práctica.
  const c4 = await p.contrato.create({ data: {
    colaboradorId: cols[3].id, tipo: 'APRENDIZAJE',
    fechaInicio: new Date(hoy.getTime() - 150 * 864e5),
    fechaFin: new Date(hoy.getTime() + 200 * 864e5),
    fechaInicioPractica: new Date(hoy.getTime() + 15 * 864e5) } });

  for (const [n, c] of [[cols[0], c1], [cols[1], c2], [cols[2], c3], [cols[3], c4]] as any) {
    console.log(`  ${n.nombre} ${n.apellido}: ${c.tipo}`);
  }
  await p.$disconnect();
})();
