// Verifica la costura de «no ha vuelto de su pausa» contra la base local (CLAUDE.md §8.6), con
// PAUSAS REALES de Seguridad Andina, sin crear marcaciones:
//   - 4/09: salió a almorzar a las 12:00 (ventana 12-13, turno hasta las 17) y NO volvió.
//   - 3/09: salió a las 12:00 y volvió a las 13:00.
// Comprueba: a la 1:14 no avisa; a la 1:20 sí, una vez, con su campana; no repite; con la persona ya
// de vuelta (3/09) no avisa; pasado el turno (6:30 p. m.) no avisa; y «ya volvió» manda el ✅ y cierra
// la campana. Telegram se INTERCEPTA (el .env local tiene token). Al final deja la base como estaba.
//
//   npx ts-node prisma/probar-pausa-sin-volver.ts
import { prisma } from '../src/prisma';
import * as telegram from '../src/utils/telegram';
import { avisarPausasSinVolver, avisarSiYaVolvio, TIPO_PAUSA_SIN_VOLVER } from '../src/utils/avisoPausaSinVolver';
import { CLAVE_PAUSAS } from '../src/utils/pausaSinVolver';

const bog = (d: number, h: number, mi = 0) => new Date(Date.UTC(2026, 8, d, h + 5, mi));
const log = { info: (x: string) => console.log(`  [log] ${x}`), error: (e: unknown, x?: string) => console.log(`  [ERROR] ${x}`, e) };

function afirmar(cond: boolean, que: string) {
  console.log(`${cond ? 'OK   ' : 'FALLA'} ${que}`);
  if (!cond) process.exitCode = 1;
}

async function main() {
  const mensajes: string[] = [];
  (telegram as any).enviarTelegram = async (_chat: string, texto: string) => { mensajes.push(texto); return { ok: true }; };

  const empresa = await prisma.empresa.findFirst({ where: { nombre: 'Seguridad Andina Ltda' }, select: { id: true } });
  if (!empresa) throw new Error('No existe Seguridad Andina Ltda');
  const previos = await prisma.notificacion.count({ where: { tipo: TIPO_PAUSA_SIN_VOLVER } });
  afirmar(previos === 0, `la base arranca sin avisos de pausa (${previos})`);
  if (previos) return;

  const cfgAntes = await prisma.configuracion.findMany({ where: { clave: { in: [CLAVE_PAUSAS, 'TELEGRAM_CHAT_ID'] } } });
  const limpiarAvisos = () => prisma.notificacion.deleteMany({ where: { tipo: TIPO_PAUSA_SIN_VOLVER } });
  try {
    await prisma.configuracion.updateMany({ where: { clave: CLAVE_PAUSAS }, data: { valor: '0' } });
    for (const [clave, valor] of [[CLAVE_PAUSAS, '1'], ['TELEGRAM_CHAT_ID', 'chat-de-prueba']]) {
      await prisma.configuracion.upsert({ where: { empresaId_clave: { empresaId: empresa.id, clave } }, update: { valor }, create: { empresaId: empresa.id, clave, valor } });
    }

    console.log('\n1. 4/09 a la 1:14: todavía en tiempo');
    afirmar(await avisarPausasSinVolver(log, bog(4, 13, 14)) === 0 && mensajes.length === 0, 'no avisa');

    console.log('\n2. 4/09 a la 1:20: no ha vuelto');
    const n = await avisarPausasSinVolver(log, bog(4, 13, 20));
    const avisos = await prisma.notificacion.findMany({ where: { tipo: TIPO_PAUSA_SIN_VOLVER }, select: { id: true, titulo: true, cuerpo: true, entidadId: true } });
    for (const a of avisos) console.log(`      campana: ${a.titulo} — ${a.cuerpo}`);
    for (const m of mensajes) console.log(`      telegram: ${m.replace(/\n/g, ' / ')}`);
    afirmar(n === 1 && avisos.length === 1 && mensajes.length === 1, `avisa a 1, con 1 mensaje y 1 aviso en la campana (${n}, ${mensajes.length}, ${avisos.length})`);
    const pausa = await prisma.registro.findUnique({ where: { id: avisos[0]?.entidadId ?? '' }, select: { salida: true, salidaAlmuerzo: true } });
    afirmar(!!pausa?.salidaAlmuerzo && pausa.salida?.getTime() === bog(4, 12).getTime(), 'el aviso es de la salida a almorzar de las 12:00 del 4/09');

    console.log('\n3. Segunda pasada');
    afirmar(await avisarPausasSinVolver(log, bog(4, 13, 25)) === 0 && mensajes.length === 1, 'no repite');

    console.log('\n4. Ya volvió (a la 1:40)');
    await avisarSiYaVolvio(empresa.id, avisos[0].entidadId!, 'Persona de prueba', 'almuerzo', bog(4, 13, 40));
    const cerrado = await prisma.notificacion.findUnique({ where: { id: avisos[0].id }, select: { cuerpo: true } });
    console.log(`      telegram: ${mensajes[1]?.replace(/\n/g, ' / ')}`);
    console.log(`      campana: ${cerrado?.cuerpo}`);
    afirmar(mensajes.length === 2 && mensajes[1].startsWith('✅'), 'manda el ✅');
    afirmar(!!cerrado?.cuerpo?.startsWith('Volvió a la 1:40 p.m.'), 'cierra la campana');
    await avisarSiYaVolvio(empresa.id, avisos[0].entidadId!, 'Persona de prueba', 'almuerzo', bog(4, 13, 50));
    afirmar(mensajes.length === 2, 'un segundo regreso no vuelve a avisar');

    console.log('\n5. 3/09 a la 1:20: volvió a la 1:00');
    await limpiarAvisos();
    afirmar(await avisarPausasSinVolver(log, bog(3, 13, 20)) === 0, 'no avisa');

    console.log('\n6. 4/09 a las 6:30 p. m.: terminó el turno (5 p. m. + 1 h)');
    afirmar(await avisarPausasSinVolver(log, bog(4, 18, 30)) === 0, 'no avisa: lo cubre el aviso del día siguiente');
  } finally {
    const b = await limpiarAvisos();
    await prisma.configuracion.deleteMany({ where: { clave: { in: [CLAVE_PAUSAS, 'TELEGRAM_CHAT_ID'] } } });
    if (cfgAntes.length) await prisma.configuracion.createMany({ data: cfgAntes });
    const despues = await prisma.configuracion.findMany({ where: { clave: { in: [CLAVE_PAUSAS, 'TELEGRAM_CHAT_ID'] } } });
    const igual = JSON.stringify(cfgAntes.map(c => [c.empresaId, c.clave, c.valor]).sort()) === JSON.stringify(despues.map(c => [c.empresaId, c.clave, c.valor]).sort());
    afirmar(igual && await prisma.notificacion.count({ where: { tipo: TIPO_PAUSA_SIN_VOLVER } }) === 0,
      `limpieza: ${b.count} avisos borrados, configuración devuelta (${cfgAntes.length} filas)`);
  }
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
