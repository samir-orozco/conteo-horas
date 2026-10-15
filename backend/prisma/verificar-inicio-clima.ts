// Verifica la COSTURA del clima del Inicio contra la base local (CLAUDE.md §8.6), con las rutas reales:
//   - las cifras del Inicio son las mismas que da /clima/vistazo para esos 7 días (la misma lectura);
//   - ningún nombre de la empresa viaja en el clima del Inicio;
//   - el supervisor no recibe nada del clima, y el aviso de casos solo sale con la función;
//   - cargar el Inicio NO abre casos de seguimiento (es un GET que se carga a cada rato);
//   - los casos abiertos que anuncia el Inicio son los que muestra la pestaña Seguimiento, que sí los abre
//     al leer. Los casos que abra esa lectura se BORRAN al terminar: la base queda como estaba;
// Para que haya algo que abrir (en la base local todos los que necesitan atención ya tenían caso, y así la
// comprobación de «no abrió casos» pasaba igual con el Inicio abriéndolos), se crea en una empresa con la
// función y en otra sin ella una persona con tres respuestas malas en los últimos días. Se borran al final.
//   - el plan de las consultas del clima, que ahora corren en cada carga del Inicio (§8.4).
// La decisión está probada aparte (utils/climaDelInicio.test.ts).
//
//   npx ts-node prisma/verificar-inicio-clima.ts
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

type Clima = null | { estado: 'SIN_PLAN' | 'ACTIVO'; desde: string; hasta: string; vistazo: unknown; casosAbiertos?: number };
type Dash = { clima: Clima; pendientes: { casosClima?: number } };

async function appDe(empresaId: string, rol: string) {
  const { default: dashboardRoutes } = await import('../src/routes/dashboard');
  const { default: climaRoutes } = await import('../src/routes/clima');
  const app = Fastify();
  app.decorate('requireEmpresa', async (request: { user?: unknown; empresaId?: string }) => { request.user = { rol, empresaId }; request.empresaId = empresaId; });
  await app.register(dashboardRoutes, { prefix: '/dashboard' });
  await app.register(climaRoutes, { prefix: '/clima' });
  await app.ready();
  return app;
}

async function main() {
  const { capacidadesEmpresa } = await import('../src/utils/capacidades');
  const todas = await prisma.empresa.findMany({ select: { id: true, nombre: true } });
  const conFuncion = new Map<string, boolean>();
  for (const e of todas) conFuncion.set(e.id, !!(await capacidadesEmpresa(e.id)).features.clima);
  const SUF = `costura-${Date.now()}`;
  const DIA = 86400000;
  const z = new Date(Date.now() - 5 * 3600000);
  const hoyBog = Date.UTC(z.getUTCFullYear(), z.getUTCMonth(), z.getUTCDate(), 5);
  const sembradas = new Map<string, string>();
  for (const tiene of [true, false]) {
    const e = todas.find(x => conFuncion.get(x.id) === tiene);
    if (!e) continue;
    const c = await prisma.colaborador.create({ data: { empresaId: e.id, nombre: 'Costura', apellido: `Clima ${SUF}`, cedula: `c-${SUF}-${tiene ? 1 : 0}`, salarioMensual: 1750905 } });
    await prisma.calificacionClima.createMany({ data: [1, 2, 3].map(n => ({ empresaId: e.id, colaboradorId: c.id, fecha: new Date(hoyBog - n * DIA), carita: 1, motivos: [] })) });
    sembradas.set(e.id, c.id);
  }
  const empresas = await prisma.empresa.findMany({ select: { id: true, nombre: true, _count: { select: { calificacionesClima: true } } } });
  let activas = 0, sinPlan = 0, conCasos = 0;

  for (const e of empresas) {
    const tiene = !!conFuncion.get(e.id);
    const casosAntes = await prisma.seguimientoClima.findMany({ where: { empresaId: e.id }, select: { id: true } });

    const admin = await appDe(e.id, 'ADMIN');
    const r = await admin.inject({ method: 'GET', url: '/dashboard/empresa' });
    if (r.statusCode !== 200) { marca(false, `${e.nombre}: el Inicio respondió ${r.statusCode}`); await admin.close(); continue; }
    const d = r.json() as Dash;
    const casosDespues = await prisma.seguimientoClima.count({ where: { empresaId: e.id } });
    const conDatos = e._count.calificacionesClima > 0;
    // Las empresas sin una sola calificación y sin la función solo se cuentan: no hay nada que comparar.
    const habla = conDatos || tiene;
    if (habla) console.log(`\n${e.nombre} · ${tiene ? 'con' : 'sin'} la función · ${e._count.calificacionesClima} calificaciones`);

    const c = d.clima;
    if (!c) { marca(false, `${e.nombre}: el administrador no recibió el clima`); await admin.close(); continue; }
    if (habla) marca(c.estado === (tiene ? 'ACTIVO' : 'SIN_PLAN'), `estado ${c.estado}`);
    else if (c.estado !== 'SIN_PLAN') marca(false, `${e.nombre}: estado ${c.estado} sin la función`);
    tiene ? activas++ : sinPlan++;

    const v = await admin.inject({ method: 'GET', url: `/clima/vistazo?desde=${c.desde}&hasta=${c.hasta}` });
    const igual = JSON.stringify(v.json()) === JSON.stringify(c.vistazo);
    if (habla || !igual) marca(igual, `las cifras son las de /clima/vistazo del ${c.desde} al ${c.hasta}: ${JSON.stringify(c.vistazo)}`);

    const nombres = await prisma.colaborador.findMany({ where: { empresaId: e.id }, select: { nombre: true, apellido: true } });
    const texto = JSON.stringify(c);
    const fuga = nombres.find(n => n.nombre.length > 2 && texto.includes(`${n.nombre} ${n.apellido}`));
    if (habla || fuga) marca(!fuga, `ningún nombre de las ${nombres.length} personas viaja en el clima`);
    if (habla || casosDespues !== casosAntes.length) marca(casosDespues === casosAntes.length, `cargar el Inicio no abrió casos (${casosAntes.length} antes, ${casosDespues} después)`);

    if (c.estado === 'SIN_PLAN') {
      if (habla || d.pendientes.casosClima !== undefined) marca(d.pendientes.casosClima === undefined, 'sin la función no hay aviso de casos en los pendientes');
    } else {
      marca(d.pendientes.casosClima === c.casosAbiertos, `el aviso de los pendientes dice lo mismo que la tarjeta: ${c.casosAbiertos}`);
      // La pestaña Seguimiento abre los casos al leer y los lista: los abiertos tienen que ser los anunciados.
      const s = await admin.inject({ method: 'GET', url: '/clima/seguimientos' });
      const abiertos = (s.json().casos as { estado: string }[]).filter(x => x.estado !== 'CERRADO').length;
      marca(abiertos === c.casosAbiertos, `la pestaña Seguimiento muestra ${abiertos} abiertos; el Inicio anunció ${c.casosAbiertos}`);
      if (abiertos > 0) conCasos++;
      const yaEstaban = new Set(casosAntes.map(x => x.id));
      const abrio = (await prisma.seguimientoClima.findMany({ where: { empresaId: e.id }, select: { id: true } })).filter(x => !yaEstaban.has(x.id)).map(x => x.id);
      // La persona sembrada no tenía caso: la lectura de Seguimiento TIENE que abrirle uno. Si no, la
      // comprobación de que el Inicio no abre casos no está midiendo nada.
      if (sembradas.has(e.id)) marca(abrio.length >= 1, `había alguien sin caso para abrir: Seguimiento abrió ${abrio.length}`);
      if (abrio.length) {
        await prisma.seguimientoClima.deleteMany({ where: { id: { in: abrio } } });
        const quedan = await prisma.seguimientoClima.count({ where: { empresaId: e.id } });
        marca(quedan === casosAntes.length, `los ${abrio.length} casos que abrió la lectura de Seguimiento, borrados (${quedan} como antes)`);
      }
    }
    await admin.close();

    const sup = await appDe(e.id, 'SUPERVISOR');
    const ds = (await sup.inject({ method: 'GET', url: '/dashboard/empresa' })).json() as Dash;
    const nadaParaElSupervisor = ds.clima === null && ds.pendientes.casosClima === undefined;
    if (habla || !nadaParaElSupervisor) marca(nadaParaElSupervisor, 'el supervisor no recibe nada del clima');
    await sup.close();
  }
  await prisma.colaborador.deleteMany({ where: { id: { in: [...sembradas.values()] } } });
  const quedanSembradas = await prisma.calificacionClima.count({ where: { colaboradorId: { in: [...sembradas.values()] } } });
  marca(quedanSembradas === 0, `las ${sembradas.size} personas sembradas, borradas con sus calificaciones`);
  console.log(`\n${empresas.length} empresas: ${activas} con la función, ${sinPlan} sin ella, ${conCasos} con casos abiertos.`);
  marca(activas > 0 && sinPlan > 0, 'se ejercitaron los dos estados');

  // El plan de las consultas del clima con la empresa de más calificaciones y 30.000 filas de OTRA empresa
  // en calificaciones, seguimientos y registros: con tablas chicas el optimizador escoge un Table scan haya
  // índice o no.
  const mayor = [...empresas].sort((a, b) => b._count.calificacionesClima - a._count.calificacionesClima)[0];
  const SUFIJO = `clima-${Date.now()}`;
  const relleno = await prisma.empresa.create({ data: { nombre: `Relleno ${SUFIJO}`, nit: `r-${SUFIJO}`, email: `r-${SUFIJO}@ejemplo.co` } });
  const otro = await prisma.colaborador.create({ data: { empresaId: relleno.id, nombre: 'Otro', apellido: SUFIJO, cedula: `o-${SUFIJO}`, salarioMensual: 1750905 } });
  const base = Date.UTC(2026, 9, 15, 5);
  for (let i = 0; i < 30000; i += 5000) {
    const fechas = Array.from({ length: 5000 }, (_, k) => new Date(base - (i + k) * 86400000));
    await prisma.calificacionClima.createMany({ data: fechas.map((f, k) => ({ empresaId: relleno.id, colaboradorId: otro.id, fecha: f, carita: (k % 5) + 1, motivos: [] })) });
    await prisma.seguimientoClima.createMany({ data: fechas.map(f => ({ empresaId: relleno.id, colaboradorId: otro.id, desde: f })) });
    await prisma.registro.createMany({ data: fechas.map(f => ({ colaboradorId: otro.id, fecha: f, entrada: new Date(f.getTime() + 3 * 3600000), salida: new Date(f.getTime() + 11 * 3600000) })) });
  }
  await prisma.$executeRawUnsafe('ANALYZE TABLE calificaciones_clima, seguimientos_clima, registros, concesiones_funcion');
  const app = await appDe(mayor.id, 'ADMIN');
  consultas.length = 0;
  await app.inject({ method: 'GET', url: '/dashboard/empresa' });
  await app.close();
  console.log(`\nEl plan de las consultas del clima en el Inicio (§8.4), con «${mayor.nombre}» (${mayor._count.calificacionesClima} calificaciones)`);
  const delClima = consultas.filter(x => /`(calificaciones_clima|seguimientos_clima|concesiones_funcion)`/.test(x.query)
    || (x.query.includes('FROM `conteo_horas`.`registros`') && x.query.includes('GROUP BY')));
  marca(delClima.length >= 5, `${delClima.length} consultas del clima encontradas`);
  // «Table scan on <temporary>» es recorrer la tabla temporal de un GROUP BY, no la tabla: solo cuenta el
  // recorrido de una tabla de verdad.
  const recorreUnaTabla = (plan: string) => /Table scan on (?!<temporary>)/i.test(plan);
  const planDe = async (sql: string) => Object.values((await prisma.$queryRawUnsafe<Record<string, string>[]>(`EXPLAIN FORMAT=TREE ${sql}`))[0] ?? {}).join('');
  // La puerta se ve saltar antes de confiarle nada (§12.10): esta consulta no tiene índice que la sirva.
  marca(recorreUnaTabla(await planDe("SELECT id FROM registros WHERE metodoEntrada = 'MANUAL'")), 'la puerta ve un Table scan de verdad');
  for (const q of delClima) {
    const plan = await planDe(conParametros(q));
    const tabla = /FROM `conteo_horas`\.`(\w+)`/.exec(q.query)?.[1];
    marca(!recorreUnaTabla(plan), `${tabla}: ${recorreUnaTabla(plan) ? 'Table scan' : 'por índice'}`);
    console.log(plan.split('\n').map(l => `          ${l}`).join('\n'));
  }
  // El costo con un historial PROPIO grande (revisión adversarial): «necesita atención» lee todo el historial de la
  // empresa, sin fechas, en cada carga del Inicio. El relleno es de una empresa con 30.000 calificaciones suyas.
  const { resumenDelPanel } = await import('../src/utils/lecturasDelClima');
  const ventanaHoy = (await import('../src/utils/semanaDelInicio')).ventanaDelInicio(new Date());
  let t = performance.now();
  await resumenDelPanel(relleno.id, ventanaHoy.claves7[0], ventanaHoy.claves7[6], null, false);
  const msResumen = performance.now() - t;
  const appRelleno = await appDe(relleno.id, 'ADMIN');
  t = performance.now();
  const rr = await appRelleno.inject({ method: 'GET', url: '/dashboard/empresa' });
  const msInicio = performance.now() - t;
  await appRelleno.close();
  console.log(`\nCon 30.000 calificaciones propias: el resumen del clima tarda ${msResumen.toFixed(0)} ms y el Inicio entero ${msInicio.toFixed(0)} ms.`);
  marca(rr.statusCode === 200, `el Inicio de esa empresa responde ${rr.statusCode}`);

  const { borrarEmpresaEnCascada } = await import('../src/utils/borrarEmpresaEnCascada');
  await prisma.$transaction(tx => borrarEmpresaEnCascada(tx, relleno.id), { timeout: 120000 });
  const sobras = await prisma.empresa.count({ where: { id: relleno.id } });
  console.log(`\n${fallas === 0 ? 'TODO EN VERDE.' : `${fallas} FALLA(S).`} Relleno: ${sobras === 0 ? 'borrado' : 'SIN BORRAR'}.`);
  if (sobras) fallas++;
  await prisma.$disconnect();
  if (fallas > 0) process.exitCode = 1;
}

main().catch(e => { console.error('FALLÓ:', e); process.exitCode = 1; });
