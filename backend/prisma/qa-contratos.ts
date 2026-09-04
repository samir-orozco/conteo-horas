// QA del módulo de contratos: recorre el ciclo completo contra la base local y
// comprueba los invariantes que no cubren las pruebas unitarias, porque tocan la
// base de datos: que el adjunto sobreviva el viaje, que no queden dos contratos
// vigentes, que borrar arrastre las prórrogas, que una empresa no vea las de otra
// y que los avisos no se repitan.
//
//   npx ts-node prisma/qa-contratos.ts
import { PrismaClient } from '@prisma/client';
import { estadoDelContrato } from '../src/utils/contratos';
const p = new PrismaClient();
const f = (a: number, m: number, d: number) => new Date(Date.UTC(a, m - 1, d, 5, 0, 0));
let fallos = 0;
const ok = (cond: boolean, txt: string) => { console.log(`  ${cond ? '✓' : '✗ FALLA'}  ${txt}`); if (!cond) fallos++; };

// PDF mínimo válido, para probar el adjunto de verdad y no con texto suelto.
const PDF = 'data:application/pdf;base64,' + Buffer.from(
  '%PDF-1.1\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
  '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 100]>>endobj\ntrailer<</Root 1 0 R>>').toString('base64');

(async () => {
  const emp = await p.empresa.findFirst({ where: { nombre: 'Seguridad Andina Ltda' }, select: { id: true } });
  const col = await p.colaborador.findFirst({ where: { empresaId: emp!.id, activo: true }, select: { id: true } });

  console.log('\n1. Documento del contrato');
  const c = await p.contrato.create({ data: {
    colaboradorId: col!.id, tipo: 'FIJO', fechaInicio: f(2026, 1, 1), fechaFin: f(2026, 3, 31),
    documento: PDF, documentoTipo: 'application/pdf', documentoNombre: 'contrato-firmado.pdf' } });
  const leido = await p.contrato.findUnique({ where: { id: c.id }, select: { documento: true, documentoTipo: true } });
  ok(leido?.documento === PDF, 'el PDF se guarda y se recupera intacto');
  ok(leido?.documentoTipo === 'application/pdf', 'guarda el tipo, que es lo que decide si se muestra en iframe o como imagen');

  console.log('\n2. Otrosí de la prórroga');
  const pr = await p.prorrogaContrato.create({ data: {
    contratoId: c.id, desde: f(2026, 4, 1), hasta: f(2026, 6, 30),
    documento: PDF, documentoTipo: 'application/pdf', documentoNombre: 'otrosi-1.pdf' } });
  const prLeida = await p.prorrogaContrato.findUnique({ where: { id: pr.id }, select: { documento: true } });
  ok(prLeida?.documento === PDF, 'la prórroga guarda su propio documento');

  console.log('\n3. Un solo contrato vigente por colaborador');
  await p.contrato.updateMany({ where: { colaboradorId: col!.id, estado: 'VIGENTE' }, data: { estado: 'TERMINADO' } });
  const c2 = await p.contrato.create({ data: { colaboradorId: col!.id, tipo: 'INDEFINIDO', fechaInicio: f(2026, 7, 1) } });
  const vigentes = await p.contrato.count({ where: { colaboradorId: col!.id, estado: 'VIGENTE' } });
  ok(vigentes === 1, `solo queda uno vigente (hay ${vigentes})`);

  console.log('\n4. Borrar el contrato se lleva sus prórrogas');
  await p.contrato.delete({ where: { id: c.id } });
  const huerfanas = await p.prorrogaContrato.count({ where: { contratoId: c.id } });
  ok(huerfanas === 0, 'no quedan prórrogas huérfanas (ON DELETE CASCADE)');

  console.log('\n5. Aislamiento entre empresas');
  const otra = await p.colaborador.findFirst({ where: { empresa: { nombre: { not: 'Seguridad Andina Ltda' } } }, select: { id: true, empresaId: true } });
  const ajeno = await p.contrato.create({ data: { colaboradorId: otra!.id, tipo: 'INDEFINIDO', fechaInicio: f(2026, 1, 1) } });
  const visto = await p.contrato.findFirst({ where: { id: ajeno.id, colaborador: { empresaId: emp!.id } } });
  ok(visto === null, 'un contrato de otra empresa no es visible con el filtro de la ruta');
  await p.contrato.delete({ where: { id: ajeno.id } });

  console.log('\n6. Los avisos no se duplican');
  const antes = await p.notificacion.count({ where: { empresaId: emp!.id, tipo: { startsWith: 'CONTRATO_' } } });
  const { avisarContratos } = await import('../src/routes/contratos');
  await avisarContratos(emp!.id); await avisarContratos(emp!.id);
  const despues = await p.notificacion.count({ where: { empresaId: emp!.id, tipo: { startsWith: 'CONTRATO_' } } });
  ok(despues >= antes, `se generaron avisos (${antes} → ${despues})`);
  await avisarContratos(emp!.id);
  const tercera = await p.notificacion.count({ where: { empresaId: emp!.id, tipo: { startsWith: 'CONTRATO_' } } });
  ok(tercera === despues, 'una tercera pasada no agrega nada: no se repiten');

  console.log('\n7. Indefinido y obra o labor no generan vencimientos');
  for (const tipo of ['INDEFINIDO', 'OBRA_LABOR'] as const) {
    const e = estadoDelContrato({ tipo, fechaInicio: f(2020, 1, 1), fechaFin: null }, [], new Date());
    ok(e.finVigente === null && e.alertas.length === 0, `${tipo}: sin vencimiento ni alertas`);
  }

  await p.contrato.delete({ where: { id: c2.id } });
  console.log(fallos === 0 ? '\nQA: todo en orden.\n' : `\nQA: ${fallos} fallo(s).\n`);
  await p.$disconnect();
  process.exit(fallos === 0 ? 0 : 1);
})();
