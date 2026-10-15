// Verifica la COSTURA de las extras y los recargos de la quincena del Inicio contra la base local (CLAUDE.md §8.6),
// con las rutas reales:
//   - el total, las extras y los recargos de /dashboard/quincena son la suma de /reportes/extras-resumen para las
//     mismas fechas: el número del Inicio es el «Total» del reporte;
//   - el reporte no cambió: sus filas no traen los minutos nuevos;
//   - las horas con recargo cuadran, persona por persona, con el desglose de /reportes/liquidacion (que las da en
//     horas con dos decimales: margen de 0,3 minutos por código);
//   - cuánto tarda, empresa por empresa, y el plan de sus consultas con 30.000 filas de relleno (§8.4);
//   - un rango que no es corto o no es de fechas se rechaza.
// La decisión está probada aparte (utils/extrasDelInicio.test.ts). Solo lectura, salvo el relleno, que se borra.
//
//   npx ts-node prisma/verificar-inicio-quincena.ts
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

const centavos = (n: number) => Math.round(n * 100) / 100;
const dos = (n: number) => String(n).padStart(2, '0');
// Las dos quincenas de septiembre (con datos en la base local) y la de hoy.
function rangos(): [string, string][] {
  const z = new Date(Date.now() - 5 * 3600000);
  const a = z.getUTCFullYear(), m = z.getUTCMonth() + 1, d = z.getUTCDate();
  const ultimo = new Date(Date.UTC(a, m, 0)).getUTCDate();
  const hoy: [string, string] = d <= 15 ? [`${a}-${dos(m)}-01`, `${a}-${dos(m)}-15`] : [`${a}-${dos(m)}-16`, `${a}-${dos(m)}-${ultimo}`];
  return [['2026-09-01', '2026-09-15'], ['2026-09-16', '2026-09-30'], hoy];
}

type Quincena = { total: number; extras: number; recargos: number; minutosExtra: number; minutosConRecargo: number; personas: number };
type FilaReporte = { colaboradorId: string; totalRecargos: number; totalExtra: number; totalAdicional: number } & Record<string, unknown>;

async function appDe(empresaId: string) {
  const { default: dashboardRoutes } = await import('../src/routes/dashboard');
  const { default: reportesRoutes } = await import('../src/routes/reportes');
  const app = Fastify();
  app.decorate('requireEmpresa', async (request: { user?: unknown; empresaId?: string }) => { request.user = { rol: 'ADMIN', empresaId }; request.empresaId = empresaId; });
  await app.register(dashboardRoutes, { prefix: '/dashboard' });
  await app.register(reportesRoutes, { prefix: '/reportes' });
  await app.ready();
  return app;
}

async function main() {
  const empresas = await prisma.empresa.findMany({ select: { id: true, nombre: true, _count: { select: { colaboradores: true } } } });
  let conDinero = 0, conRecargo = 0, personasCotejadas = 0;
  const tiempos: { nombre: string; ms: number }[] = [];

  for (const e of empresas) {
    const app = await appDe(e.id);
    for (const [desde, hasta] of rangos()) {
      const t0 = performance.now();
      const r = await app.inject({ method: 'GET', url: `/dashboard/quincena?desde=${desde}&hasta=${hasta}` });
      tiempos.push({ nombre: `${e.nombre} ${desde}`, ms: performance.now() - t0 });
      if (r.statusCode !== 200) { marca(false, `${e.nombre} ${desde}: respondió ${r.statusCode}`); continue; }
      const q = r.json() as Quincena;
      const filas = ((await app.inject({ method: 'GET', url: `/reportes/extras-resumen?desde=${desde}&hasta=${hasta}` })).json().colaboradores as FilaReporte[]);
      const suma = (k: 'totalAdicional' | 'totalExtra' | 'totalRecargos') => centavos(filas.reduce((s, f) => s + f[k], 0));
      const igual = q.total === suma('totalAdicional') && q.extras === suma('totalExtra') && q.recargos === suma('totalRecargos');
      const habla = q.total > 0 || !igual;
      if (habla) {
        console.log(`\n${e.nombre} · ${desde} a ${hasta}`);
        marca(igual, `Inicio $${q.total} (extras ${q.extras}, recargos ${q.recargos}) · reporte $${suma('totalAdicional')}`);
        conDinero++;
      }
      const sinMinutos = filas.every(f => !('minutosConRecargo' in f) && !('minutosExtra' in f) && !('minutosOrdinarios' in f));
      if (habla || !sinMinutos) marca(sinMinutos, `el reporte sigue sin minutos en sus ${filas.length} filas`);

      // Las horas con recargo contra el desglose de cada persona con algo.
      if (q.minutosConRecargo > 0) {
        conRecargo++;
        let enLiquidacion = 0, codigos = 0;
        for (const f of filas) {
          const l = (await app.inject({ method: 'GET', url: `/reportes/liquidacion?colaboradorId=${f.colaboradorId}&desde=${desde}&hasta=${hasta}` })).json();
          const conRecargo = (l.liquidacion as { esExtra: boolean; recargo: number; horas: number }[]).filter(x => !x.esExtra && x.recargo > 1);
          enLiquidacion += conRecargo.reduce((s, x) => s + x.horas * 60, 0);
          codigos += conRecargo.length;
          personasCotejadas++;
        }
        marca(Math.abs(enLiquidacion - q.minutosConRecargo) <= 0.3 * Math.max(1, codigos),
          `horas con recargo: Inicio ${q.minutosConRecargo} min · desglose por persona ${enLiquidacion.toFixed(1)} min (${codigos} códigos)`);
      }
    }
    await app.close();
  }
  console.log(`\n${empresas.length} empresas: ${conDinero} quincenas con dinero, ${conRecargo} con horas con recargo, ${personasCotejadas} personas cotejadas.`);
  marca(conDinero > 0 && conRecargo > 0, 'se ejercitaron quincenas con extras y con recargos');
  const lenta = [...tiempos].sort((a, b) => b.ms - a.ms)[0];
  console.log(`  La más lenta: ${lenta.nombre}, ${lenta.ms.toFixed(0)} ms. Mediana: ${[...tiempos].sort((a, b) => a.ms - b.ms)[Math.floor(tiempos.length / 2)].ms.toFixed(0)} ms.`);

  // Un rango que no es corto o no es de fechas.
  const app = await appDe(empresas[0].id);
  for (const url of ['/dashboard/quincena', '/dashboard/quincena?desde=2026-01-01&hasta=2026-12-31', '/dashboard/quincena?desde=2026-10-15&hasta=2026-10-01']) {
    const r = await app.inject({ method: 'GET', url });
    marca(r.statusCode === 400, `${url.split('?')[1] ?? 'sin fechas'}: ${r.statusCode}`);
  }
  await app.close();

  // El plan, con la empresa más grande y 30.000 registros y días de OTRA empresa.
  const mayor = [...empresas].sort((a, b) => b._count.colaboradores - a._count.colaboradores)[0];
  const SUFIJO = `quincena-${Date.now()}`;
  const relleno = await prisma.empresa.create({ data: { nombre: `Relleno ${SUFIJO}`, nit: `r-${SUFIJO}`, email: `r-${SUFIJO}@ejemplo.co` } });
  const otro = await prisma.colaborador.create({ data: { empresaId: relleno.id, nombre: 'Otro', apellido: SUFIJO, cedula: `o-${SUFIJO}`, salarioMensual: 1750905 } });
  const base = Date.UTC(2026, 9, 15, 5);
  for (let i = 0; i < 30000; i += 5000) {
    const fechas = Array.from({ length: 5000 }, (_, k) => new Date(base - (i + k) * 86400000));
    await prisma.registro.createMany({ data: fechas.map(f => ({ colaboradorId: otro.id, fecha: f, entrada: new Date(f.getTime() + 3 * 3600000), salida: new Date(f.getTime() + 11 * 3600000) })) });
    await prisma.diaEsperado.createMany({ data: fechas.map(f => ({ colaboradorId: otro.id, fecha: f, programado: true, horaEntrada: '08:00', horaSalida: '17:00', toleranciaMin: 5, almuerzoMin: 60, minutosEsperados: 480, origen: 'MANUAL' as const })) });
  }
  await prisma.$executeRawUnsafe('ANALYZE TABLE registros, dias_esperados');
  const [desde, hasta] = rangos()[2];
  const appMayor = await appDe(mayor.id);
  consultas.length = 0;
  const t0 = performance.now();
  await appMayor.inject({ method: 'GET', url: `/dashboard/quincena?desde=${desde}&hasta=${hasta}` });
  const ms = performance.now() - t0;
  await appMayor.close();
  console.log(`\nEl plan de las consultas de la quincena (§8.4), con «${mayor.nombre}» (${mayor._count.colaboradores} personas): ${ms.toFixed(0)} ms con el relleno`);
  const pesadas = consultas.filter(x => /FROM `conteo_horas`\.`(registros|dias_esperados)`/.test(x.query));
  marca(pesadas.length >= 2, `${pesadas.length} consultas sobre registros y dias_esperados`);
  for (const q of pesadas) {
    const plan = Object.values((await prisma.$queryRawUnsafe<Record<string, string>[]>(`EXPLAIN FORMAT=TREE ${conParametros(q)}`))[0] ?? {}).join('');
    const tabla = /FROM `conteo_horas`\.`(\w+)`/.exec(q.query)?.[1];
    const recorre = /Table scan on (?!<temporary>)/i.test(plan);
    marca(!recorre, `${tabla}: ${recorre ? 'Table scan' : 'por índice'}`);
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
