// Verifica la costura de «turnos cerrados solos» contra la base local (CLAUDE.md §8.6), con CIERRES
// REALES de Seguridad Andina: simula el 11/09 a las 7:30, cuya ventana (10/09 7:00 → 11/09 7:00) tiene
// cuatro cierres del 10/09 a las 7:46 y uno del 11/09 a las 3:27. Comprueba que el mensaje los trae a
// los 5 —y que una consulta SQL independiente cuenta lo mismo—, que no se repite el mismo día, y que
// antes de las 7 no toca. Telegram se INTERCEPTA. Al final deja la configuración como estaba.
//
//   npx ts-node prisma/probar-turnos-cerrados.ts
import { prisma } from '../src/prisma';
import * as telegram from '../src/utils/telegram';
import { avisarTurnosCerrados } from '../src/utils/avisoTurnosCerrados';
import { CLAVE_TURNOS_CERRADOS, CLAVE_TURNOS_CERRADOS_ENVIADO } from '../src/utils/turnosCerradosSolos';

const bog = (d: number, h: number, mi = 0) => new Date(Date.UTC(2026, 8, d, h + 5, mi));
const log = { info: (x: string) => console.log(`  [log] ${x}`), error: (e: unknown, x?: string) => console.log(`  [ERROR] ${x}`, e) };
const CLAVES = [CLAVE_TURNOS_CERRADOS, 'TELEGRAM_CHAT_ID', CLAVE_TURNOS_CERRADOS_ENVIADO];

function afirmar(cond: boolean, que: string) {
  console.log(`${cond ? 'OK   ' : 'FALLA'} ${que}`);
  if (!cond) process.exitCode = 1;
}

async function main() {
  const mensajes: string[] = [];
  (telegram as any).enviarTelegram = async (_c: string, texto: string) => { mensajes.push(texto); return { ok: true }; };
  const empresa = await prisma.empresa.findFirst({ where: { nombre: 'Seguridad Andina Ltda' }, select: { id: true } });
  if (!empresa) throw new Error('No existe Seguridad Andina Ltda');

  const cfgAntes = await prisma.configuracion.findMany({ where: { clave: { in: CLAVES } } });
  try {
    await prisma.configuracion.updateMany({ where: { clave: CLAVE_TURNOS_CERRADOS }, data: { valor: '0' } });
    await prisma.configuracion.deleteMany({ where: { clave: CLAVE_TURNOS_CERRADOS_ENVIADO } });
    for (const [clave, valor] of [[CLAVE_TURNOS_CERRADOS, '1'], ['TELEGRAM_CHAT_ID', 'chat-de-prueba']]) {
      await prisma.configuracion.upsert({ where: { empresaId_clave: { empresaId: empresa.id, clave } }, update: { valor }, create: { empresaId: empresa.id, clave, valor } });
    }

    console.log('\n1. 11/09 a las 6:59: todavía no toca');
    afirmar(await avisarTurnosCerrados(log, bog(11, 6, 59)) === 0 && mensajes.length === 0, 'no manda nada');

    console.log('\n2. 11/09 a las 7:30');
    const n = await avisarTurnosCerrados(log, bog(11, 7, 30));
    for (const m of mensajes) console.log('      ' + m.replace(/\n/g, '\n      '));
    const [{ c }]: any[] = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*) c FROM registros r JOIN colaboradores k ON k.id = r.colaboradorId
      WHERE k.empresaId = ? AND r.salidaEstimada = 1 AND r.editadoPor = 'SISTEMA' AND r.editadoEn >= ? AND r.editadoEn < ?`,
      empresa.id, bog(10, 7), bog(11, 7));
    // El total va en el encabezado: las líneas se agrupan por persona y día.
    const filas = Number((mensajes[0] ?? '').match(/solos? (\d+) turnos?/)?.[1] ?? 0);
    console.log(`      consulta independiente: ${Number(c)} cierres en la ventana`);
    afirmar(n === 1 && mensajes.length === 1, 'un solo mensaje');
    afirmar(filas === 5 && Number(c) === 5, `el encabezado cuenta los 5 cierres de la ventana, los mismos que la consulta (${filas} y ${Number(c)})`);
    const marca = await prisma.configuracion.findUnique({ where: { empresaId_clave: { empresaId: empresa.id, clave: CLAVE_TURNOS_CERRADOS_ENVIADO } } });
    afirmar(marca?.valor === '2026-09-11', `quedó anotado el envío del día (${marca?.valor})`);

    console.log('\n3. 11/09 a las 9:00 (la app arrancó de nuevo)');
    afirmar(await avisarTurnosCerrados(log, bog(11, 9)) === 0 && mensajes.length === 1, 'no lo repite');
  } finally {
    await prisma.configuracion.deleteMany({ where: { clave: { in: CLAVES } } });
    if (cfgAntes.length) await prisma.configuracion.createMany({ data: cfgAntes });
    const despues = await prisma.configuracion.findMany({ where: { clave: { in: CLAVES } } });
    const igual = JSON.stringify(cfgAntes.map(x => [x.empresaId, x.clave, x.valor]).sort()) === JSON.stringify(despues.map(x => [x.empresaId, x.clave, x.valor]).sort());
    afirmar(igual, `limpieza: configuración devuelta tal como estaba (${cfgAntes.length} filas)`);
  }
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
