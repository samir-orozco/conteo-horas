// MIDE el plan de las consultas que filtran por empresa a través de la persona, `colaborador: { empresaId }`
// (15 de octubre de 2026, CLAUDE.md §8.4). Con ese filtro MySQL resolvía un join que recorría la tabla entera, de
// todas las empresas; con la lista de personas (`colaboradorId: { in: ids }`) entra por el índice (colaboradorId,
// fecha). Los reportes por empresa ya se pasaron a la lista (commits fa02a57 y cfcac32); esto mide el resto, con la
// forma EXACTA de cada consulta, en la empresa local con más personas y 30.000 filas de relleno de OTRA empresa en
// cada tabla (con tablas chicas el optimizador escoge un Table scan haya índice o no). El relleno se borra al final.
//
//   npx ts-node prisma/medir-filtros-por-empresa.ts
import 'dotenv/config';
import path from 'path';
import { PrismaClient, Prisma } from '@prisma/client';

type Consulta = { query: string; params: string };
const consultas: Consulta[] = [];
const prisma = new PrismaClient({ log: [{ emit: 'event', level: 'query' }] });
prisma.$on('query', (e: Prisma.QueryEvent) => { consultas.push({ query: e.query, params: e.params }); });
const rutaDelCliente = require.resolve(path.join(__dirname, '../src/prisma'));
require.cache[rutaDelCliente] = { id: rutaDelCliente, filename: rutaDelCliente, loaded: true, exports: { prisma } } as unknown as NodeModule;

function conParametros(c: Consulta): string {
  const params = JSON.parse(c.params) as unknown[];
  let i = 0;
  return c.query.replace(/\?/g, () => {
    const v = params[i++];
    if (v === null || v === undefined) return 'NULL';
    if (typeof v === 'number') return String(v);
    if (typeof v === 'boolean') return v ? '1' : '0';
    return `'${String(v).replace(/'/g, "''")}'`;
  });
}

// «Table scan on <temporary>» es la tabla temporal de un GROUP BY, no la tabla.
const recorre = (plan: string) => [...plan.matchAll(/Table scan on (?!<temporary>)`?(\w+)`?/gi)].map(m => m[1]);

async function main() {
  const empresas = await prisma.empresa.findMany({ select: { id: true, nombre: true, _count: { select: { colaboradores: true } } } });
  const mayor = [...empresas].sort((a, b) => b._count.colaboradores - a._count.colaboradores)[0];
  const empresaId = mayor.id;
  const { idsDeLaEmpresa } = await import('../src/utils/reportesDeEmpresa');
  const ids = await idsDeLaEmpresa(empresaId);
  const activos = (await prisma.colaborador.findMany({ where: { empresaId, activo: true }, select: { id: true } })).map(c => c.id);

  const SUF = `filtros-${Date.now()}`;
  const relleno = await prisma.empresa.create({ data: { nombre: `Relleno ${SUF}`, nit: `r-${SUF}`, email: `r-${SUF}@ejemplo.co` } });
  const otro = await prisma.colaborador.create({ data: { empresaId: relleno.id, nombre: 'Otro', apellido: SUF, cedula: `o-${SUF}`, salarioMensual: 1750905 } });
  const base = Date.UTC(2026, 9, 15, 5);
  for (let i = 0; i < 30000; i += 5000) {
    const fechas = Array.from({ length: 5000 }, (_, k) => new Date(base - (i + k) * 86400000));
    await prisma.registro.createMany({ data: fechas.map(f => ({ colaboradorId: otro.id, fecha: f, entrada: new Date(f.getTime() + 3 * 3600000), salida: new Date(f.getTime() + 11 * 3600000) })) });
    await prisma.diaEsperado.createMany({ data: fechas.map(f => ({ colaboradorId: otro.id, fecha: f, programado: true, horaEntrada: '08:00', horaSalida: '17:00', toleranciaMin: 5, almuerzoMin: 60, minutosEsperados: 480, origen: 'MANUAL' as const })) });
    await prisma.permiso.createMany({ data: fechas.map((f, k) => ({ colaboradorId: otro.id, tipo: 'OTRO' as const, fechaInicio: f, fechaFin: f, aprobado: k % 2 === 0 })) });
    await prisma.descansoTrabajado.createMany({ data: fechas.map(f => ({ colaboradorId: otro.id, fecha: f })) });
  }
  await prisma.$executeRawUnsafe('ANALYZE TABLE registros, dias_esperados, permisos, descansos_trabajados, contratos');

  const desde = new Date(Date.UTC(2026, 9, 12, 5)), hasta = new Date(Date.UTC(2026, 9, 19, 5));
  const mesDesde = new Date(Date.UTC(2026, 9, 1, 5)), mesHasta = new Date(Date.UTC(2026, 10, 1, 5));
  // Cada consulta en su forma de hoy (por la relación) y en la nueva (por la lista), con lo que filtra cada ruta.
  const casos: [string, (porRelacion: boolean) => Promise<unknown>][] = [
    ['turnos: días de la semana', r => prisma.diaEsperado.findMany({ where: { ...(r ? { colaborador: { empresaId } } : { colaboradorId: { in: ids } }), fecha: { gte: desde, lt: hasta } }, select: { colaboradorId: true, fecha: true } })],
    ['turnos: días del mes', r => prisma.diaEsperado.findMany({ where: { ...(r ? { colaborador: { empresaId } } : { colaboradorId: { in: ids } }), fecha: { gte: mesDesde, lt: mesHasta } }, select: { colaboradorId: true, fecha: true, esDescanso: true } })],
    ['turnos: marcaciones del mes', r => prisma.registro.findMany({ where: { ...(r ? { colaborador: { empresaId } } : { colaboradorId: { in: ids } }), fecha: { gte: mesDesde, lt: mesHasta } }, select: { colaboradorId: true, fecha: true } })],
    ['turnos: descansos trabajados', r => prisma.descansoTrabajado.findMany({ where: { ...(r ? { colaborador: { empresaId } } : { colaboradorId: { in: ids } }), fecha: { gte: desde, lt: hasta } }, select: { colaboradorId: true, fecha: true, decision: true } })],
    ['registros: la lista de la semana', r => prisma.registro.findMany({ where: { ...(r ? { colaborador: { empresaId } } : { colaboradorId: { in: ids } }), fecha: { gte: desde, lt: hasta } }, select: { id: true }, orderBy: { fecha: 'desc' } })],
    ['permisos: la lista', r => prisma.permiso.findMany({ where: r ? { colaborador: { empresaId } } : { colaboradorId: { in: ids } }, select: { id: true }, orderBy: { fechaInicio: 'desc' } })],
    ['configuración: la última marcación del kiosco', r => prisma.registro.findFirst({ where: { ...(r ? { colaborador: { empresaId } } : { colaboradorId: { in: ids } }), entrada: { not: null } }, orderBy: { entrada: 'desc' }, select: { entrada: true } })],
    ['admin: marcaciones de la empresa', r => prisma.registro.count({ where: r ? { colaborador: { empresaId } } : { colaboradorId: { in: ids } } })],
    ['correo: novedades por aprobar', r => prisma.permiso.count({ where: { aprobado: false, ...(r ? { colaborador: { empresaId, activo: true } } : { colaboradorId: { in: activos } }) } })],
    ['correo y contratos: contratos vigentes', r => prisma.contrato.findMany({ where: { estado: 'VIGENTE', ...(r ? { colaborador: { empresaId } } : { colaboradorId: { in: ids } }) }, select: { id: true } })],
  ];
  console.log(`Empresa «${mayor.nombre}» (${ids.length} personas, ${activos.length} activas) con 30.000 filas de relleno por tabla:\n`);
  try {
    for (const [nombre, consulta] of casos) {
      const fila: string[] = [];
      let iguales = true;
      const resultados: string[] = [];
      for (const porRelacion of [true, false]) {
        consultas.length = 0;
        const t0 = performance.now();
        resultados.push(JSON.stringify(await consulta(porRelacion)));
        const ms = performance.now() - t0;
        const q = consultas.find(c => /FROM `conteo_horas`\.`(registros|dias_esperados|permisos|descansos_trabajados|contratos)`/.test(c.query));
        const plan = q ? Object.values((await prisma.$queryRawUnsafe<Record<string, string>[]>(`EXPLAIN FORMAT=TREE ${conParametros(q)}`))[0] ?? {}).join('') : '';
        const tablas = recorre(plan);
        fila.push(`${porRelacion ? 'por la relación' : 'por la lista'}: ${tablas.length ? `Table scan de ${tablas.join(', ')}` : 'por índice'} (${ms.toFixed(0)} ms)`);
      }
      iguales = resultados[0] === resultados[1];
      console.log(`${nombre}\n  ${fila.join('\n  ')}\n  mismas filas: ${iguales ? 'sí' : 'NO'}`);
    }
  } finally {
    // La cascada de eliminar empresa no borra `descansos_trabajados` (encontrado aquí, el 15 de octubre de 2026):
    // con ellos, la llave la tumba. Se borran antes, a mano.
    await prisma.descansoTrabajado.deleteMany({ where: { colaboradorId: otro.id } });
    const { borrarEmpresaEnCascada } = await import('../src/utils/borrarEmpresaEnCascada');
    await prisma.$transaction(tx => borrarEmpresaEnCascada(tx, relleno.id), { timeout: 300000 });
    const sobras = await prisma.empresa.count({ where: { id: relleno.id } });
    console.log(`\nRelleno: ${sobras === 0 ? 'borrado' : 'SIN BORRAR'}.`);
    await prisma.$disconnect();
  }
}

main().catch(e => { console.error('FALLÓ:', e); process.exitCode = 1; });
