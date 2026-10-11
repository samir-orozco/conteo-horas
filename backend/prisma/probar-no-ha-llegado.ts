// Verifica la costura de «No ha llegado» contra la base local (CLAUDE.md §8.6).
//
// Corre el barrido DE VERDAD sobre un día pasado y comprueba lo que escribió:
//   1. la lista del aviso coincide con una consulta independiente (SQL a mano)
//   2. la segunda pasada del mismo día no repite
//   3. «ya llegó»: con una entrada temporal, manda el ✅ y cierra el aviso de la campana
//   4. una empresa con el kiosco pausado no recibe avisos
// Telegram se INTERCEPTA: el .env local tiene token del bot y no se manda nada a ningún chat.
// Al final borra los avisos, la marcación temporal y la configuración que creó, y devuelve la que
// había.
//
//   npx ts-node prisma/probar-no-ha-llegado.ts <empresa> <YYYY-MM-DD> <HH:MM>
import { prisma } from '../src/prisma';
import * as telegram from '../src/utils/telegram';
import { avisarNoHanLlegado, avisarSiYaLlego, TIPO_NO_HA_LLEGADO } from '../src/utils/avisoNoHaLlegado';
import { CLAVE_NO_HA_LLEGADO } from '../src/utils/noHaLlegado';
import { kioscoPausado } from '../src/utils/suscripcion';

const [nombreEmpresa = 'Seguridad Andina Ltda', fecha = '2026-09-09', hora = '10:00'] = process.argv.slice(2);
const [a, m, d] = fecha.split('-').map(Number);
const [h, mi] = hora.split(':').map(Number);
const AHORA = new Date(Date.UTC(a, m - 1, d, h + 5, mi));
const INICIO = new Date(Date.UTC(a, m - 1, d, 5));
const FIN = new Date(INICIO.getTime() + 24 * 3600 * 1000);
const log = { info: (x: string) => console.log(`  [log] ${x}`), error: (e: unknown, x?: string) => console.log(`  [ERROR] ${x}`, e) };

function afirmar(cond: boolean, que: string) {
  console.log(`${cond ? 'OK   ' : 'FALLA'} ${que}`);
  if (!cond) process.exitCode = 1;
}

async function main() {
  const mensajes: { chat: string; texto: string }[] = [];
  (telegram as any).enviarTelegram = async (chat: string, texto: string) => { mensajes.push({ chat, texto }); return { ok: true }; };

  const empresa = await prisma.empresa.findFirst({ where: { nombre: nombreEmpresa }, select: { id: true } });
  if (!empresa) throw new Error(`No existe la empresa ${nombreEmpresa}`);
  const previos = await prisma.notificacion.count({ where: { tipo: TIPO_NO_HA_LLEGADO } });
  afirmar(previos === 0, `la base arranca sin avisos de «no ha llegado» (${previos})`);
  if (previos) return;

  // La configuración de Telegram de TODAS las empresas, para devolverla tal cual.
  const cfgAntes = await prisma.configuracion.findMany({ where: { clave: { in: [CLAVE_NO_HA_LLEGADO, 'TELEGRAM_CHAT_ID'] } } });
  let temporal: string | null = null;
  try {
    // Solo esta empresa con el aviso encendido.
    await prisma.configuracion.updateMany({ where: { clave: CLAVE_NO_HA_LLEGADO }, data: { valor: '0' } });
    for (const [clave, valor] of [[CLAVE_NO_HA_LLEGADO, '1'], ['TELEGRAM_CHAT_ID', 'chat-de-prueba']]) {
      await prisma.configuracion.upsert({
        where: { empresaId_clave: { empresaId: empresa.id, clave } }, update: { valor }, create: { empresaId: empresa.id, clave, valor },
      });
    }

    console.log(`\n1. Barrido de ${nombreEmpresa}, ${fecha} a las ${hora}`);
    const n1 = await avisarNoHanLlegado(log, AHORA);
    const avisos = await prisma.notificacion.findMany({ where: { tipo: TIPO_NO_HA_LLEGADO }, select: { entidadId: true, titulo: true, cuerpo: true } });
    for (const x of avisos) console.log(`      campana: ${x.titulo} — ${x.cuerpo}`);
    for (const x of mensajes) console.log(`      telegram (${x.chat}):\n        ${x.texto.replace(/\n/g, '\n        ')}`);

    // La consulta independiente: programados ese día con hora de entrada, cuya entrada + tolerancia + 15
    // ya pasó, sin marcación ese día, sin novedad que toque ese día y que existía a su hora de entrada. Sin festivos ni turnos nocturnos:
    // el día elegido no los tiene (se imprime para poder revisarlo).
    const esperados: any[] = await prisma.$queryRawUnsafe(`
      SELECT c.id, c.nombre, c.creadoEn, de.horaEntrada, de.horaSalida, de.toleranciaMin FROM colaboradores c
      JOIN dias_esperados de ON de.colaboradorId = c.id AND de.fecha >= ? AND de.fecha < ?
      WHERE c.empresaId = ? AND c.activo = 1 AND de.programado = 1 AND de.horaEntrada IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM registros r WHERE r.colaboradorId = c.id AND r.fecha >= ? AND r.fecha < ? AND r.entrada IS NOT NULL)
        AND NOT EXISTS (SELECT 1 FROM permisos p WHERE p.colaboradorId = c.id AND p.fechaInicio < ? AND p.fechaFin >= ?)`,
      INICIO, FIN, empresa.id, INICIO, FIN, FIN, INICIO);
    const minutos = (x: string) => Number(x.slice(0, 2)) * 60 + Number(x.slice(3, 5));
    const ahoraMin = h * 60 + mi;
    const aMano = esperados
      // Quien no existía en el sistema a su hora de entrada no cuenta (en la base local, casi todo
      // septiembre se cargó después).
      .filter(e => new Date(e.creadoEn) <= new Date(INICIO.getTime() + minutos(e.horaEntrada) * 60000))
      .filter(e => ahoraMin >= minutos(e.horaEntrada) + Number(e.toleranciaMin) + 15 && !(e.horaSalida && minutos(e.horaSalida) > minutos(e.horaEntrada) && ahoraMin >= minutos(e.horaSalida)))
      .map(e => e.id).sort();
    console.log(`      a mano: ${esperados.length} programados sin marcar ni novedad; ${aMano.length} ya pasados de su tolerancia + 15`);
    afirmar(n1 === aMano.length && JSON.stringify(avisos.map(x => x.entidadId).sort()) === JSON.stringify(aMano),
      `el barrido avisó a ${n1} y la consulta a mano da ${aMano.length}, las mismas personas`);
    afirmar(mensajes.length === (n1 ? 1 : 0), `un solo mensaje de Telegram para toda la lista (${mensajes.length})`);

    console.log('\n2. Segunda pasada');
    const antes = mensajes.length;
    const n2 = await avisarNoHanLlegado(log, AHORA);
    afirmar(n2 === 0 && mensajes.length === antes, `no repite (${n2} personas, ${mensajes.length - antes} mensajes)`);

    if (avisos.length) {
      console.log('\n3. Ya llegó');
      const quien = await prisma.colaborador.findUnique({ where: { id: avisos[0].entidadId! }, select: { id: true, nombre: true, apellido: true } });
      const entrada = new Date(AHORA.getTime() + 20 * 60 * 1000);
      temporal = (await prisma.registro.create({ data: { colaboradorId: quien!.id, fecha: INICIO, entrada } })).id;
      const antesYa = mensajes.length;
      await avisarSiYaLlego(empresa.id, quien!.id, `${quien!.nombre} ${quien!.apellido}`, entrada);
      const cerrado = await prisma.notificacion.findFirst({ where: { tipo: TIPO_NO_HA_LLEGADO, entidadId: quien!.id }, select: { cuerpo: true } });
      console.log(`      telegram: ${mensajes.slice(antesYa).map(x => x.texto.replace(/\n/g, ' / ')).join(' | ')}`);
      console.log(`      campana: ${cerrado?.cuerpo}`);
      afirmar(mensajes.length === antesYa + 1 && mensajes[antesYa].texto.startsWith('✅'), 'mandó un ✅ al grupo');
      afirmar(!!cerrado?.cuerpo?.startsWith('Llegó a las'), 'cerró el aviso de la campana');
      const antesSegunda = mensajes.length;
      await prisma.registro.create({ data: { colaboradorId: quien!.id, fecha: INICIO, entrada: new Date(entrada.getTime() + 3600 * 1000) } })
        .then(async r => { await avisarSiYaLlego(empresa.id, quien!.id, 'x', r.entrada!); await prisma.registro.delete({ where: { id: r.id } }); });
      afirmar(mensajes.length === antesSegunda, 'la segunda entrada del día no vuelve a avisar');
    }

    console.log('\n4. Kiosco pausado');
    const pausadas = (await prisma.empresa.findMany({ select: { id: true, nombre: true, exentaPago: true, suscripcion: { select: { estado: true, finPrueba: true, pagadoHasta: true } } } }))
      .filter(e => kioscoPausado(e, e.suscripcion, AHORA));
    if (!pausadas.length) console.log('      (ninguna empresa local tiene el kiosco pausado ese día: no se prueba)');
    else {
      const p = pausadas[0];
      for (const [clave, valor] of [[CLAVE_NO_HA_LLEGADO, '1'], ['TELEGRAM_CHAT_ID', 'chat-de-prueba']]) {
        await prisma.configuracion.upsert({ where: { empresaId_clave: { empresaId: p.id, clave } }, update: { valor }, create: { empresaId: p.id, clave, valor } });
      }
      await avisarNoHanLlegado(log, AHORA);
      const suyos = await prisma.notificacion.count({ where: { tipo: TIPO_NO_HA_LLEGADO, empresaId: p.id } });
      // Un cero solo prueba la pausa si sin ella habría habido a quién avisar (§12.2).
      const [{ n }]: any[] = await prisma.$queryRawUnsafe(`
        SELECT COUNT(*) n FROM colaboradores c JOIN dias_esperados de ON de.colaboradorId = c.id AND de.fecha >= ? AND de.fecha < ?
        WHERE c.empresaId = ? AND c.activo = 1 AND de.programado = 1 AND de.horaEntrada IS NOT NULL AND de.horaEntrada <= '09:00'
          AND c.creadoEn < DATE_ADD(de.fecha, INTERVAL 3 HOUR)
          AND NOT EXISTS (SELECT 1 FROM registros r WHERE r.colaboradorId = c.id AND r.fecha >= ? AND r.fecha < ? AND r.entrada IS NOT NULL)`,
        INICIO, FIN, p.id, INICIO, FIN);
      console.log(`      sin la pausa, ${p.nombre} tendría ${Number(n)} personas sin marcar (con entrada hasta las 9:00)`);
      afirmar(suyos === 0, `${p.nombre}, con el kiosco pausado, no recibió avisos (${suyos})${Number(n) ? '' : ' — PERO no tenía a quién avisar: esto no prueba la pausa'}`);
    }
  } finally {
    if (temporal) await prisma.registro.delete({ where: { id: temporal } });
    const b = await prisma.notificacion.deleteMany({ where: { tipo: TIPO_NO_HA_LLEGADO } });
    await prisma.configuracion.deleteMany({ where: { clave: { in: [CLAVE_NO_HA_LLEGADO, 'TELEGRAM_CHAT_ID'] } } });
    if (cfgAntes.length) await prisma.configuracion.createMany({ data: cfgAntes });
    const cfgDespues = await prisma.configuracion.findMany({ where: { clave: { in: [CLAVE_NO_HA_LLEGADO, 'TELEGRAM_CHAT_ID'] } } });
    const igual = JSON.stringify(cfgAntes.map(c => [c.empresaId, c.clave, c.valor]).sort()) === JSON.stringify(cfgDespues.map(c => [c.empresaId, c.clave, c.valor]).sort());
    const quedan = await prisma.notificacion.count({ where: { tipo: TIPO_NO_HA_LLEGADO } });
    const reg = temporal ? await prisma.registro.count({ where: { id: temporal } }) : 0;
    afirmar(quedan === 0 && igual && reg === 0, `limpieza: borrados ${b.count} avisos, configuración de Telegram devuelta (${cfgAntes.length} filas), marcación temporal borrada`);
  }
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
