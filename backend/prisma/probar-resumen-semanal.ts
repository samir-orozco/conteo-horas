// Verifica la costura del resumen semanal contra la base local (CLAUDE.md §8.6).
//
// Corre la pasada DE VERDAD con un lunes simulado y comprueba lo que escribió:
//   1. la primera pasada manda y deja un aviso en la campana por empresa
//   2. la segunda pasada del mismo lunes no manda nada (la marca funciona)
//   3. una empresa con el interruptor en '0' no lo recibe
//   4. el martes no toca
// Al final BORRA los avisos y la configuración que creó. Sin SMTP en local, los correos salen al
// log; con `--html <carpeta>` además guarda el HTML de cada uno para mirarlo en el navegador.
//
//   npx ts-node prisma/probar-resumen-semanal.ts [--html /ruta/carpeta]
import { writeFileSync } from 'fs';
import { prisma } from '../src/prisma';
import * as correo from '../src/utils/correo';
import { enviarResumenesSemanales, CLAVE_RESUMEN_SEMANAL, TIPO_RESUMEN_SEMANAL } from '../src/utils/envioResumenSemanal';

const bog = (a: number, mes: number, d: number, h: number) => new Date(Date.UTC(a, mes - 1, d, h + 5));
const LUNES = bog(2026, 9, 14, 8);
const MARTES = bog(2026, 9, 15, 8);
const log = { info: (m: string) => console.log(`  [log] ${m}`), error: (e: unknown, m?: string) => console.log(`  [ERROR] ${m}`, e) };

function afirmar(cond: boolean, que: string) {
  console.log(`${cond ? 'OK   ' : 'FALLA'} ${que}`);
  if (!cond) process.exitCode = 1;
}

async function main() {
  const carpeta = process.argv.includes('--html') ? process.argv[process.argv.indexOf('--html') + 1] : null;
  const enviados: { para: string; asunto: string }[] = [];
  // Se intercepta el envío para contar a quién va, sin imprimir el HTML entero.
  (correo as any).enviarCorreo = async (o: { para: string; asunto: string; html: string }) => {
    enviados.push({ para: o.para, asunto: o.asunto });
    if (carpeta) writeFileSync(`${carpeta}/${o.asunto.replace(/[^\w-]+/g, '_')}.html`, o.html);
  };

  const previos = await prisma.notificacion.count({ where: { tipo: TIPO_RESUMEN_SEMANAL } });
  const previasCfg = await prisma.configuracion.count({ where: { clave: CLAVE_RESUMEN_SEMANAL } });
  afirmar(previos === 0 && previasCfg === 0, `la base arranca sin avisos de resumen (${previos}) ni interruptores (${previasCfg})`);
  if (previos || previasCfg) return;

  try {
    console.log('\n1. Primera pasada del lunes');
    const n1 = await enviarResumenesSemanales(log, LUNES);
    const avisos = await prisma.notificacion.findMany({ where: { tipo: TIPO_RESUMEN_SEMANAL }, include: { empresa: { select: { nombre: true } } } });
    afirmar(n1 > 0, `mandó a ${n1} empresas`);
    afirmar(avisos.length === n1, `dejó ${avisos.length} avisos en la campana, uno por empresa`);
    afirmar(avisos.every(a => a.entidadId === '2026-09-07'), 'todos marcados con la semana del 7 de septiembre');
    for (const a of avisos) console.log(`      ${a.empresa.nombre}: «${a.titulo}» — ${a.cuerpo}`);
    console.log(`      correos: ${enviados.length} a ${new Set(enviados.map(e => e.para)).size} direcciones`);

    console.log('\n2. Segunda pasada del mismo lunes');
    const antes = enviados.length;
    const n2 = await enviarResumenesSemanales(log, LUNES);
    afirmar(n2 === 0 && enviados.length === antes, `no repitió (${n2} empresas, ${enviados.length - antes} correos)`);

    console.log('\n3. Una empresa con el interruptor apagado');
    const elegida = avisos[0];
    await prisma.notificacion.deleteMany({ where: { tipo: TIPO_RESUMEN_SEMANAL, empresaId: elegida.empresaId } });
    await prisma.configuracion.create({ data: { empresaId: elegida.empresaId, clave: CLAVE_RESUMEN_SEMANAL, valor: '0' } });
    const n3 = await enviarResumenesSemanales(log, LUNES);
    const suyo = await prisma.notificacion.count({ where: { tipo: TIPO_RESUMEN_SEMANAL, empresaId: elegida.empresaId } });
    afirmar(n3 === 0 && suyo === 0, `${elegida.empresa.nombre} con '0' no lo recibió (${n3} enviados, ${suyo} avisos)`);

    console.log('\n4. El martes');
    const n4 = await enviarResumenesSemanales(log, MARTES);
    afirmar(n4 === 0, 'no toca');
  } finally {
    const b1 = await prisma.notificacion.deleteMany({ where: { tipo: TIPO_RESUMEN_SEMANAL } });
    const b2 = await prisma.configuracion.deleteMany({ where: { clave: CLAVE_RESUMEN_SEMANAL } });
    const quedan = await prisma.notificacion.count({ where: { tipo: TIPO_RESUMEN_SEMANAL } })
      + await prisma.configuracion.count({ where: { clave: CLAVE_RESUMEN_SEMANAL } });
    afirmar(quedan === 0, `limpieza: borrados ${b1.count} avisos y ${b2.count} interruptores, quedan ${quedan}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
