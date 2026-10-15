// Verifica la COSTURA de «Próximos días» del Inicio contra la base local (CLAUDE.md §8.6), con la ruta real:
//   - los festivos de la agenda son los de la tarjeta anterior (`proximosFestivos`) que caen en los 30 días;
//   - los cumpleaños de la agenda que caen este mes son los de la tarjeta anterior (`cumpleanos`) de hoy en adelante;
//   - cada contrato de «Pendientes por resolver» que vence o pide aviso en la ventana está en la agenda, y nada más;
//   - el vencimiento de la suscripción sale al administrador si cae en su última semana, y nunca al supervisor;
//   - cada día viaja como medianoche de Bogotá (05:00Z);
//   - el plan de la consulta nueva de la suscripción (§8.4).
// La decisión está probada aparte (utils/agendaDelInicio.test.ts). Solo lectura.
//
//   npx ts-node prisma/verificar-inicio-agenda.ts
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

type Evento = { tipo: string; dia: string; enDias: number; nombre?: string; colaboradorId?: string; propio?: boolean; eraPrueba?: boolean };
type Dash = {
  fecha: string;
  agenda: Evento[];
  proximosFestivos: { nombre: string; fecha: string; propio: boolean }[];
  cumpleanos: { id: string; dia: number; mes: number }[];
  pendientes: { contratos: { colaboradorId: string; estado: string; vence: string; limitePreaviso: string }[] };
};

const DIA = 86400000;

async function main() {
  const { default: dashboardRoutes } = await import('../src/routes/dashboard');
  const { claveDiaBogota, medianocheBogota } = await import('../src/utils/fechas');
  const empresas = await prisma.empresa.findMany({
    select: { id: true, nombre: true, exentaPago: true, suscripcion: { select: { estado: true, finPrueba: true, pagadoHasta: true } } },
  });
  let conSuscripcion = 0, conContratos = 0, conCumple = 0, conFestivos = 0;

  for (const e of empresas) {
    const pedir = async (rol: string) => {
      const app = Fastify();
      app.decorate('requireEmpresa', async (request: { user?: unknown; empresaId?: string }) => { request.user = { rol, empresaId: e.id }; request.empresaId = e.id; });
      await app.register(dashboardRoutes, { prefix: '/dashboard' });
      await app.ready();
      const r = await app.inject({ method: 'GET', url: '/dashboard/empresa' });
      await app.close();
      return r;
    };
    const r = await pedir('ADMIN');
    if (r.statusCode !== 200) { marca(false, `${e.nombre}: el Inicio respondió ${r.statusCode}`); continue; }
    const d = r.json() as Dash;
    const a = d.agenda;
    const hoy = medianocheBogota(claveDiaBogota(new Date(d.fecha)));
    const enLaVentana = (iso: string) => { const n = Math.round((medianocheBogota(claveDiaBogota(new Date(iso))).getTime() - hoy.getTime()) / DIA); return n >= 0 && n < 30; };
    console.log(`\n${e.nombre} · ${a.length} eventos`);

    marca(a.every(x => x.dia.endsWith('T05:00:00.000Z')), 'cada día viaja como medianoche de Bogotá');
    marca(a.every((x, i) => i === 0 || x.dia >= a[i - 1].dia), 'en orden de fecha');

    const festivos = a.filter(x => x.tipo === 'FESTIVO').map(x => `${x.dia.slice(0, 10)} ${x.nombre} ${x.propio}`);
    const antes = d.proximosFestivos.filter(f => enLaVentana(f.fecha)).map(f => `${claveDiaBogota(new Date(f.fecha))} ${f.nombre} ${f.propio}`);
    marca(JSON.stringify(festivos) === JSON.stringify(antes), `festivos: los ${festivos.length} de la tarjeta anterior en los 30 días`);
    if (festivos.length) conFestivos++;

    // La tarjeta anterior trae los cumpleaños del mes; la agenda, los de 30 días. Coinciden en lo que queda del mes.
    const mesHoy = Number(claveDiaBogota(hoy).slice(5, 7)) - 1;
    const diaHoy = Number(claveDiaBogota(hoy).slice(8, 10));
    const cumpleAgenda = a.filter(x => x.tipo === 'CUMPLEANOS' && Number(x.dia.slice(5, 7)) - 1 === mesHoy).map(x => x.colaboradorId).sort();
    const cumpleAntes = d.cumpleanos.filter(c => c.mes === mesHoy && c.dia >= diaHoy).map(c => c.id).sort();
    marca(JSON.stringify(cumpleAgenda) === JSON.stringify(cumpleAntes), `cumpleaños de lo que queda del mes: ${cumpleAgenda.length}, como la tarjeta anterior`);
    if (cumpleAgenda.length) conCumple++;

    const esperados = d.pendientes.contratos.flatMap(c => [
      ...(c.estado === 'POR_VENCER' && enLaVentana(c.limitePreaviso) ? [`CONTRATO_PREAVISO ${c.colaboradorId} ${claveDiaBogota(new Date(c.limitePreaviso))}`] : []),
      ...(c.estado !== 'VENCIDO' && enLaVentana(c.vence) ? [`CONTRATO_VENCE ${c.colaboradorId} ${claveDiaBogota(new Date(c.vence))}`] : []),
    ]).sort();
    const contratos = a.filter(x => x.tipo.startsWith('CONTRATO_')).map(x => `${x.tipo} ${x.colaboradorId} ${x.dia.slice(0, 10)}`).sort();
    marca(JSON.stringify(contratos) === JSON.stringify(esperados), `contratos: ${contratos.length} eventos, los de los pendientes que caen en la ventana`);
    if (contratos.length) conContratos++;

    // La suscripción, calculada aquí a mano con sus fechas, aparte de la función.
    const s = e.suscripcion;
    let esperado: string | null = null;
    if (s && !e.exentaPago && s.estado !== 'CANCELADA') {
      const vence = s.pagadoHasta ?? s.finPrueba;
      const ultimo = claveDiaBogota(new Date(vence.getTime() - 1));
      const n = Math.round((medianocheBogota(ultimo).getTime() - hoy.getTime()) / DIA);
      if (new Date(d.fecha) < vence && n <= 7) esperado = `${ultimo} ${!s.pagadoHasta}`;
    }
    const sus = a.filter(x => x.tipo === 'SUSCRIPCION_VENCE').map(x => `${x.dia.slice(0, 10)} ${x.eraPrueba}`);
    marca(JSON.stringify(sus) === JSON.stringify(esperado ? [esperado] : []), `suscripción: ${esperado ?? 'nada que anunciar esta semana'}`);
    if (esperado) conSuscripcion++;

    const sup = (await pedir('SUPERVISOR')).json() as Dash;
    marca(!sup.agenda.some(x => x.tipo === 'SUSCRIPCION_VENCE' || x.tipo === 'PRUEBA_CLIMA_TERMINA'), 'el supervisor no ve nada de la suscripción ni de la prueba');
    marca(sup.agenda.filter(x => x.tipo !== 'SUSCRIPCION_VENCE' && x.tipo !== 'PRUEBA_CLIMA_TERMINA').length === a.filter(x => x.tipo !== 'SUSCRIPCION_VENCE' && x.tipo !== 'PRUEBA_CLIMA_TERMINA').length, 'y ve lo demás igual que el administrador');
  }
  console.log(`\n${empresas.length} empresas: ${conFestivos} con festivos, ${conCumple} con cumpleaños este mes, ${conContratos} con contratos, ${conSuscripcion} con el vencimiento anunciado.`);
  marca(conFestivos > 0 && conCumple > 0 && conContratos > 0 && conSuscripcion > 0, 'se ejercitó cada clase de evento');

  // La consulta nueva: la suscripción de la empresa, junto con la empresa por su llave primaria.
  const app = Fastify();
  app.decorate('requireEmpresa', async (request: { user?: unknown; empresaId?: string }) => { request.user = { rol: 'ADMIN', empresaId: empresas[0].id }; request.empresaId = empresas[0].id; });
  await app.register(dashboardRoutes, { prefix: '/dashboard' });
  await app.ready();
  consultas.length = 0;
  await app.inject({ method: 'GET', url: '/dashboard/empresa' });
  await app.close();
  const q = consultas.find(x => x.query.includes('FROM `conteo_horas`.`suscripciones`') && x.query.includes('`pagadoHasta`'));
  if (!q) marca(false, 'no se encontró la consulta de la suscripción');
  else {
    const plan = Object.values((await prisma.$queryRawUnsafe<Record<string, string>[]>(`EXPLAIN FORMAT=TREE ${conParametros(q)}`))[0] ?? {}).join('');
    marca(!/Table scan on (?!<temporary>)/i.test(plan), `suscripciones: ${/Table scan on (?!<temporary>)/i.test(plan) ? 'Table scan' : 'por índice'}`);
    console.log(plan.split('\n').map(l => `          ${l}`).join('\n'));
  }
  console.log(`\n${fallas === 0 ? 'TODO EN VERDE.' : `${fallas} FALLA(S).`}`);
  await prisma.$disconnect();
  if (fallas > 0) process.exitCode = 1;
}

main().catch(e => { console.error('FALLÓ:', e); process.exitCode = 1; });
