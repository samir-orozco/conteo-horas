// Verifica la COSTURA de la semana del Inicio contra la base local (CLAUDE.md §8.6), con las rutas
// reales:
//   - las llegadas tarde de los últimos 7 días suman, empresa por empresa, lo mismo que el reporte
//     de llegadas tarde (/reportes/tardanzas-resumen) para esas mismas fechas: es la misma regla;
//   - la barra de hoy de la asistencia cuadra con «Aún no han marcado entrada»: debían − llegaron =
//     las filas rojas (las que no tienen novedad);
//   - las llegadas tarde de hoy que todavía viajan para el Inicio anterior son las del último día;
//   - el plan de las consultas nuevas (§8.4).
// La decisión está probada aparte (utils/semanaDelInicio.test.ts). Solo lectura.
//
//   npx ts-node prisma/verificar-inicio-semana.ts
import 'dotenv/config';
import path from 'path';
import { PrismaClient, Prisma } from '@prisma/client';
import Fastify from 'fastify';

type Consulta = { query: string; params: string };
const consultas: Consulta[] = [];
const prisma = new PrismaClient({ log: [{ emit: 'event', level: 'query' }] });
prisma.$on('query', (e: Prisma.QueryEvent) => { consultas.push({ query: e.query, params: e.params }); });
const rutaDelCliente = require.resolve(path.join(__dirname, '../src/prisma'));
require.cache[rutaDelCliente] = { id: rutaDelCliente, filename: rutaDelCliente, loaded: true, exports: { prisma } } as unknown as NodeModule;

let fallas = 0;
const marca = (ok: boolean, texto: string) => { if (!ok) fallas++; console.log(`  ${ok ? 'ok   ' : 'FALLA'} ${texto}`); };

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

type Dia = { clave: string; esHoy: boolean; totalMinutos: number; debian: number; personas: { id: string; minutosTarde: number }[] };
type Dash = {
  sinMarcarHoy: { id: string; novedad: string | null }[];
  llegadasTardeHoy: { id: string; minutosTarde: number }[];
  asistenciaSemana: { dias: { esHoy: boolean; debian: number; llegaron: number }[] };
  llegadasTarde7d: { dias: Dia[]; personas: Record<string, { nombre: string; fotoMini: string | null }> };
};

async function main() {
  const { default: dashboardRoutes } = await import('../src/routes/dashboard');
  const { default: reportesRoutes } = await import('../src/routes/reportes');
  const empresas = await prisma.empresa.findMany({ select: { id: true, nombre: true, _count: { select: { colaboradores: true } } } });
  let masGrande = { id: '', n: -1 };

  for (const e of empresas) {
    const app = Fastify();
    app.decorate('requireEmpresa', async (request: { user?: unknown; empresaId?: string }) => { request.user = { rol: 'ADMIN', empresaId: e.id }; request.empresaId = e.id; });
    await app.register(dashboardRoutes, { prefix: '/dashboard' });
    await app.register(reportesRoutes, { prefix: '/reportes' });
    await app.ready();
    const r = await app.inject({ method: 'GET', url: '/dashboard/empresa' });
    if (r.statusCode !== 200) { marca(false, `${e.nombre}: el Inicio respondió ${r.statusCode}`); await app.close(); continue; }
    const d = r.json() as Dash;
    const dias = d.llegadasTarde7d.dias;
    const desde = dias[0].clave, hasta = dias[6].clave;
    const res = await app.inject({ method: 'GET', url: `/reportes/tardanzas-resumen?desde=${desde}&hasta=${hasta}` });
    const reporte = (res.json().colaboradores as { totalMinutos: number }[]).reduce((s, c) => s + c.totalMinutos, 0);
    const inicio = dias.reduce((s, x) => s + x.totalMinutos, 0);
    const hoy = d.asistenciaSemana.dias.find(x => x.esHoy)!;
    const rojas = d.sinMarcarHoy.filter(p => !p.novedad).length;
    const hoyEn7 = dias[6];
    console.log(`\n${e.nombre} · ${desde}..${hasta}`);
    marca(inicio === reporte, `llegadas tarde de 7 días: Inicio ${inicio} min · reporte ${reporte} min`);
    marca(hoy.debian - hoy.llegaron === rojas, `hoy: debían ${hoy.debian}, llegaron ${hoy.llegaron} · filas rojas en «Aún no han marcado» ${rojas}`);
    marca(JSON.stringify(d.llegadasTardeHoy.map(p => [p.id, p.minutosTarde])) === JSON.stringify(hoyEn7.personas.map(p => [p.id, p.minutosTarde])), `las llegadas tarde de hoy que viajan para el Inicio anterior son las del último día (${d.llegadasTardeHoy.length})`);
    const conFoto = Object.values(d.llegadasTarde7d.personas).filter(p => p.fotoMini).length;
    marca(Object.keys(d.llegadasTarde7d.personas).length === new Set(dias.flatMap(x => x.personas.map(p => p.id))).size, `cada persona tarde viaja una sola vez (${Object.keys(d.llegadasTarde7d.personas).length}, ${conFoto} con foto)`);
    if (e._count.colaboradores > masGrande.n) masGrande = { id: e.id, n: e._count.colaboradores };
    await app.close();
  }

  // El plan de las consultas nuevas, con la empresa más grande y 30.000 filas de OTRA empresa en
  // permisos y registros: con tablas chicas el optimizador escoge un Table scan haya índice o no.
  const SUFIJO = `semana-${Date.now()}`;
  const relleno = await prisma.empresa.create({ data: { nombre: `Relleno ${SUFIJO}`, nit: `r-${SUFIJO}`, email: `r-${SUFIJO}@ejemplo.co` } });
  const otro = await prisma.colaborador.create({ data: { empresaId: relleno.id, nombre: 'Otro', apellido: SUFIJO, cedula: `o-${SUFIJO}`, salarioMensual: 1750905 } });
  const base = Date.UTC(2026, 9, 15, 5);
  for (let i = 0; i < 30000; i += 5000) {
    await prisma.permiso.createMany({ data: Array.from({ length: 5000 }, (_, k) => ({ colaboradorId: otro.id, tipo: 'OTRO' as const, fechaInicio: new Date(base - ((i + k) % 900) * 86400000), fechaFin: new Date(base - ((i + k) % 900) * 86400000), aprobado: k % 2 === 0 })) });
    await prisma.registro.createMany({ data: Array.from({ length: 5000 }, (_, k) => ({ colaboradorId: otro.id, fecha: new Date(base - (i + k) * 86400000), entrada: new Date(base - (i + k) * 86400000 + 3 * 3600000) })) });
  }
  await prisma.$executeRawUnsafe('ANALYZE TABLE permisos, registros, dias_esperados');
  const app = Fastify();
  app.decorate('requireEmpresa', async (request: { user?: unknown; empresaId?: string }) => { request.user = { rol: 'ADMIN', empresaId: masGrande.id }; request.empresaId = masGrande.id; });
  await app.register(dashboardRoutes, { prefix: '/dashboard' });
  await app.ready();
  consultas.length = 0;
  await app.inject({ method: 'GET', url: '/dashboard/empresa' });
  await app.close();
  console.log(`\nEl plan de las consultas nuevas (§8.4), con la empresa de ${masGrande.n} personas`);
  const nuevas: [string, (q: string) => boolean][] = [
    ['novedades aprobadas de la ventana', q => q.includes('FROM `conteo_horas`.`permisos`') && q.includes('`aprobado` = ?') && q.includes('`fechaFin` >=')],
    ['días esperados de la ventana', q => q.includes('FROM `conteo_horas`.`dias_esperados`') && q.includes('`toleranciaSalidaMin`')],
    ['entradas de la ventana', q => q.includes('FROM `conteo_horas`.`registros`') && q.includes('`entrada` IS NOT NULL') && !q.includes('`salida`')],
  ];
  for (const [nombre, es] of nuevas) {
    const c = consultas.find(x => es(x.query));
    if (!c) { marca(false, `${nombre}: no se encontró la consulta`); continue; }
    const filas = await prisma.$queryRawUnsafe<Record<string, string>[]>(`EXPLAIN FORMAT=TREE ${conParametros(c)}`);
    const plan = Object.values(filas[0] ?? {}).join('');
    marca(!/Table scan/i.test(plan), `${nombre}: ${/Table scan/i.test(plan) ? 'Table scan' : 'por índice'}`);
    console.log(plan.split('\n').map(l => `          ${l}`).join('\n'));
  }
  const { borrarEmpresaEnCascada } = await import('../src/utils/borrarEmpresaEnCascada');
  await prisma.$transaction(tx => borrarEmpresaEnCascada(tx, relleno.id), { timeout: 120000 });
  const sobras = await prisma.empresa.count({ where: { id: relleno.id } });
  console.log(`\n${fallas === 0 ? 'TODO EN VERDE.' : `${fallas} FALLA(S).`} Relleno: ${sobras === 0 ? 'borrado' : 'SIN BORRAR'}.`);
  if (sobras) fallas++;
  await prisma.$disconnect();
  if (fallas > 0) process.exitCode = 1;
}

main().catch(e => { console.error('FALLÓ:', e); process.exitCode = 1; });
