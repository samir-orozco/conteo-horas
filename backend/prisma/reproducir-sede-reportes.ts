// Verifica, contra la RUTA REAL, el filtro por sede de los reportes de extras y
// de llegadas tarde. Es la costura que las pruebas de src/utils/sedesDeReporte.ts
// no cubren (CLAUDE.md §8.6).
//
// HISTORIA. Una revisión de código encontró el 10 de septiembre de 2026 que esos
// reportes filtraban los registros por sede ANTES de calcular. La primera versión
// de este script lo reprodujo con la ruta de entonces:
//
//   - Extras de quien trabajó de lunes a miércoles en A y de jueves a sábado en
//     B: $75.000 sin filtro, y $0 en A y $0 en B. El tope de 42 h se medía sobre
//     media semana.
//   - Tardanza de quien entró a las 08:02 en A y regresó a las 13:00 en B: nada
//     sin filtro, y 297 minutos al filtrar por B.
//
// LO QUE COMPRUEBA AHORA es la regla acordada con el dueño (ver
// src/utils/sedesDeReporte.ts): cada persona se calcula con todos sus turnos, el
// filtro solo decide quién aparece, quien trabajó en varios lugares sale con
// todos, y el resumen trae una línea por sede, una de mixtos y «Todas», que
// suman el total de la empresa. Contra la ruta de antes, estas comprobaciones
// TIENEN que fallar; si no, no están probando nada.
//
// POR QUÉ UNA BASE DESECHABLE. `conteo_horas` no tiene ni una persona con
// registros en dos sedes, y sembrar ahí es escribir en la base del dueño. Este
// script:
//
//   - LEE de conteo_horas solo las tablas globales (tipos de hora, jornadas,
//     festivos nacionales). No escribe en ella.
//   - Crea `prisma_migrate_shadow_db_repro_sede` —el único patrón de nombre que
//     `conteo_user` tiene permiso de crear—, le aplica el esquema actual con
//     `db push`, siembra el caso y la BORRA al final, pase lo que pase.
//   - Registra `reporteRoutes`, el archivo real y no una réplica, en un Fastify
//     mínimo y lo llama con `inject`. No importa index.ts (§8.5).
//
//   npx ts-node prisma/reproducir-sede-reportes.ts
import 'dotenv/config';
import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import Fastify from 'fastify';

const BASE = 'prisma_migrate_shadow_db_repro_sede';
const DESDE = '2026-08-24'; // lunes
const HASTA = '2026-08-29'; // sábado

// Un instante dado en hora de Bogotá (UTC-5 todo el año, sin horario de verano).
const bog = (fecha: string, h: number, min = 0) => {
  const [a, m, d] = fecha.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d, h + 5, min, 0));
};
const cop = (n: number | undefined) => (n === undefined ? '—' : new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 2 }).format(n));

function urlDeLaBaseDesechable(origen: string): string {
  const u = new URL(origen);
  if (!['localhost', '127.0.0.1'].includes(u.hostname)) {
    throw new Error(`DATABASE_URL apunta a ${u.hostname}: este script solo corre contra MySQL local`);
  }
  u.pathname = `/${BASE}`;
  return u.toString();
}

const urlOrigen = process.env.DATABASE_URL ?? '';
// URL explícita: el cliente de origen no puede seguir a DATABASE_URL cuando más
// abajo se la cambie para el cliente de la app.
const origen = new PrismaClient({ datasources: { db: { url: urlOrigen } } });
let clienteApp: PrismaClient | null = null;
let baseCreada = false;

type SedeDeFila = { id: string | null; nombre: string | null };
type Fila = { nombre: string; sedes?: SedeDeFila[] } & Record<string, number>;
type Linea = SedeDeFila & Record<string, number>;
type Respuesta = { colaboradores: Fila[]; resumen?: { porSede: Linea[]; mixtos: Record<string, number>; todas: Record<string, number> } };

async function main(): Promise<number> {
  if (!urlOrigen) throw new Error('falta DATABASE_URL');
  const urlDesechable = urlDeLaBaseDesechable(urlOrigen);

  const [tiposHora, jornadas, festivos] = await Promise.all([
    origen.tipoHora.findMany(),
    origen.jornadaVigencia.findMany(),
    origen.diaFestivo.findMany({ where: { empresaId: null } }),
  ]);

  await origen.$executeRawUnsafe(`DROP DATABASE IF EXISTS \`${BASE}\``);
  await origen.$executeRawUnsafe(`CREATE DATABASE \`${BASE}\``);
  baseCreada = true;
  execSync('npx prisma db push --skip-generate', { env: { ...process.env, DATABASE_URL: urlDesechable }, stdio: 'pipe' });

  // Tiene que ser ANTES de importar: `src/prisma.ts` crea el cliente al
  // evaluarse, y dotenv no pisa una variable que ya existe.
  process.env.DATABASE_URL = urlDesechable;
  const { prisma } = await import('../src/prisma');
  const { default: reporteRoutes } = await import('../src/routes/reportes');
  clienteApp = prisma;

  // Guarda antes de la primera escritura: si el cliente de la app no quedó en la
  // base desechable, no se siembra nada.
  const [{ db }] = await prisma.$queryRawUnsafe<{ db: string }[]>('SELECT DATABASE() AS db');
  if (db !== BASE) throw new Error(`el cliente de la app apunta a "${db}", no a ${BASE}: no se siembra nada`);

  await prisma.tipoHora.createMany({ data: tiposHora.map(t => ({ ...t, aplica: t.aplica as object })) });
  await prisma.jornadaVigencia.createMany({ data: jornadas });
  await prisma.diaFestivo.createMany({ data: festivos });

  const empresa = await prisma.empresa.create({ data: { nombre: 'Repro sedes', nit: 'repro-sede', email: 'repro@prueba.local' } });
  const sedeA = await prisma.sede.create({ data: { empresaId: empresa.id, nombre: 'Sede A' } });
  const sedeB = await prisma.sede.create({ data: { empresaId: empresa.id, nombre: 'Sede B' } });
  // Sin almuerzo y sin tolerancia de salida a propósito: así lo único que mueve
  // los números es la regla de sedes, y se pueden cotejar a mano.
  const horario = await prisma.horario.create({
    data: {
      empresaId: empresa.id, nombre: 'L-S 08:00-16:00', toleranciaMin: 3, almuerzoMin: 0, toleranciaSalidaMin: 0,
      franjas: { create: [{ dias: ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'], horaEntrada: '08:00', horaSalida: '16:00', tieneAlmuerzo: false }] },
    },
  });
  const persona = (nombre: string) => prisma.colaborador.create({
    data: { empresaId: empresa.id, nombre, apellido: 'Repro', cedula: nombre, salarioMensual: 2_100_000, horarioId: horario.id },
  });
  const turno = (colaboradorId: string, sedeId: string | null, fecha: string, ini: [number, number], fin: [number, number]) => ({
    colaboradorId, sedeId, sedeSalidaId: sedeId, fecha: bog(fecha, 0), entrada: bog(fecha, ...ini), salida: bog(fecha, ...fin),
  });
  const semana = (colaboradorId: string, sedeId: string | null, finSabado: [number, number]) => [
    ...['2026-08-24', '2026-08-25', '2026-08-26', '2026-08-27', '2026-08-28'].map(f => turno(colaboradorId, sedeId, f, [8, 0], [16, 0])),
    turno(colaboradorId, sedeId, '2026-08-29', [8, 0], finSabado),
  ];

  // La semana repartida: lunes a miércoles en A y jueves a sábado en B.
  const rotaSemana = await persona('RotaSemana');
  // El día repartido: entra a tiempo en A y regresa del almuerzo en B.
  const rotaDia = await persona('RotaDia');
  // Toda la semana en A, con una tardanza real el sábado.
  const fija = await persona('Fija');
  // Toda la semana en B.
  const luis = await persona('Luis');
  // Toda la semana sin sede (remoto, carga manual, anterior a las sedes).
  const remota = await persona('Remota');

  await prisma.registro.createMany({
    data: [
      turno(rotaSemana.id, sedeA.id, '2026-08-24', [8, 0], [16, 0]),
      turno(rotaSemana.id, sedeA.id, '2026-08-25', [8, 0], [16, 0]),
      turno(rotaSemana.id, sedeA.id, '2026-08-26', [8, 0], [16, 0]),
      turno(rotaSemana.id, sedeB.id, '2026-08-27', [8, 0], [16, 0]),
      turno(rotaSemana.id, sedeB.id, '2026-08-28', [8, 0], [16, 0]),
      turno(rotaSemana.id, sedeB.id, '2026-08-29', [8, 0], [16, 0]),

      turno(rotaDia.id, sedeA.id, '2026-08-24', [8, 2], [12, 0]),
      turno(rotaDia.id, sedeB.id, '2026-08-24', [13, 0], [16, 0]),

      ...['2026-08-24', '2026-08-25', '2026-08-26', '2026-08-27', '2026-08-28'].map(f => turno(fija.id, sedeA.id, f, [8, 0], [16, 0])),
      turno(fija.id, sedeA.id, '2026-08-29', [8, 25], [16, 25]),

      ...semana(luis.id, sedeB.id, [15, 0]),
      ...semana(remota.id, null, [14, 0]),
    ],
  });

  const app = Fastify();
  app.decorate('requireEmpresa', async (request: { empresaId?: string }) => { request.empresaId = empresa.id; });
  await app.register(reporteRoutes, { prefix: '/reportes' });
  await app.ready();

  const pedir = async (ruta: string, sedeId?: string): Promise<Respuesta> => {
    const qs = new URLSearchParams({ desde: DESDE, hasta: HASTA, ...(sedeId ? { sedeId } : {}) });
    const r = await app.inject({ method: 'GET', url: `/reportes/${ruta}?${qs}` });
    if (r.statusCode !== 200) throw new Error(`${ruta} → ${r.statusCode} ${r.body}`);
    return r.json() as Respuesta;
  };
  const E = { todo: await pedir('extras-resumen'), A: await pedir('extras-resumen', sedeA.id), B: await pedir('extras-resumen', sedeB.id) };
  const T = { todo: await pedir('tardanzas-resumen'), A: await pedir('tardanzas-resumen', sedeA.id), B: await pedir('tardanzas-resumen', sedeB.id) };
  await app.close();

  const { jornadaVigente, tiposVigentes } = await import('../src/utils/vigencias');
  const jornada = jornadaVigente(bog(HASTA, 0), jornadas);
  const hed = tiposVigentes(bog(DESDE, 0), tiposHora).find(t => t.codigo === 'HED');
  const festivosDelRango = festivos.filter(f => f.fecha >= bog(DESDE, 0) && f.fecha < bog(HASTA, 24));
  console.log(`\nDatos para cotejar: jornada ${jornada} h/sem · horasMes ${jornada * 5} · valor hora ${cop(2_100_000 / (jornada * 5))} · recargo HED ${hed?.recargo} · festivos en el rango: ${festivosDelRango.length}`);

  const fila = (r: Respuesta, n: string) => r.colaboradores.find(f => f.nombre === n);
  const etiqueta = (f?: Fila) => (f?.sedes ? f.sedes.map(s => s.nombre ?? 'Sin sede').join(' · ') : '(sin campo sedes)');
  const NOMBRES = ['RotaSemana', 'RotaDia', 'Fija', 'Luis', 'Remota'];

  console.log('\nEXTRAS Y RECARGOS (totalExtra)');
  console.log(`  ${'persona'.padEnd(11)} ${'sin filtro'.padStart(12)} ${'Sede A'.padStart(12)} ${'Sede B'.padStart(12)}   sedes`);
  for (const n of NOMBRES) {
    console.log(`  ${n.padEnd(11)} ${cop(fila(E.todo, n)?.totalExtra).padStart(12)} ${cop(fila(E.A, n)?.totalExtra).padStart(12)} ${cop(fila(E.B, n)?.totalExtra).padStart(12)}   ${etiqueta(fila(E.todo, n))}`);
  }
  console.log('\nLLEGADAS TARDE (minutos)');
  console.log(`  ${'persona'.padEnd(11)} ${'sin filtro'.padStart(12)} ${'Sede A'.padStart(12)} ${'Sede B'.padStart(12)}`);
  for (const n of NOMBRES) {
    const m = (r: Respuesta) => String(fila(r, n)?.totalMinutos ?? '—');
    console.log(`  ${n.padEnd(11)} ${m(T.todo).padStart(12)} ${m(T.A).padStart(12)} ${m(T.B).padStart(12)}`);
  }
  if (E.todo.resumen) {
    console.log('\nRESUMEN DE EXTRAS (totalAdicional)');
    for (const l of E.todo.resumen.porSede) console.log(`  ${(l.nombre ?? (l.id === null ? 'Sin sede' : `sede sin nombre ${l.id}`)).padEnd(28)} ${cop(l.totalAdicional).padStart(12)}`);
    console.log(`  ${'Mixtos'.padEnd(28)} ${cop(E.todo.resumen.mixtos.totalAdicional).padStart(12)}`);
    console.log(`  ${'Todas'.padEnd(28)} ${cop(E.todo.resumen.todas.totalAdicional).padStart(12)}`);
  } else {
    console.log('\nRESUMEN DE EXTRAS: la respuesta no trae `resumen`');
  }

  const comprobaciones: { nombre: string; ok: boolean; obtenido: string }[] = [];
  const comprobar = (nombre: string, ok: boolean, obtenido = '') => comprobaciones.push({ nombre, ok, obtenido });

  // Sin filtro, contra la cuenta a mano: 2.100.000 / 210 = $10.000 la hora, HED al 1,25.
  //   RotaSemana y Fija: 48 h − 42 h = 6 h → $75.000
  //   Luis: 40 h + 7 h el sábado = 47 h → 5 h → $62.500
  //   Remota: 40 h + 6 h el sábado = 46 h → 4 h → $50.000
  //   RotaDia: 3 h 58 min + 3 h, todo ordinario → $0
  const A_MANO: Record<string, number> = { RotaSemana: 75_000, RotaDia: 0, Fija: 75_000, Luis: 62_500, Remota: 50_000 };
  for (const [n, v] of Object.entries(A_MANO)) {
    comprobar(`sin filtro, extra de ${n} = ${cop(v)} (cuenta a mano)`, fila(E.todo, n)?.totalExtra === v, cop(fila(E.todo, n)?.totalExtra));
  }

  // El defecto reproducido: quien rota sale con lo mismo en cada una de sus sedes.
  comprobar('RotaSemana, filtro A: lo mismo que sin filtro', fila(E.A, 'RotaSemana')?.totalExtra === 75_000, cop(fila(E.A, 'RotaSemana')?.totalExtra));
  comprobar('RotaSemana, filtro B: lo mismo que sin filtro', fila(E.B, 'RotaSemana')?.totalExtra === 75_000, cop(fila(E.B, 'RotaSemana')?.totalExtra));
  comprobar('RotaDia, filtro B: no llegó tarde', fila(T.B, 'RotaDia')?.totalMinutos === 0, String(fila(T.B, 'RotaDia')?.totalMinutos));
  comprobar('RotaDia, filtro A: no llegó tarde', fila(T.A, 'RotaDia')?.totalMinutos === 0, String(fila(T.A, 'RotaDia')?.totalMinutos));
  comprobar('Fija, filtro A: conserva su tardanza real de 22 min', fila(T.A, 'Fija')?.totalMinutos === 22, String(fila(T.A, 'Fija')?.totalMinutos));

  // Quién aparece.
  const quienes = (r: Respuesta) => r.colaboradores.map(f => f.nombre).sort().join(', ');
  comprobar('filtro A: Fija, RotaDia, RotaSemana', quienes(E.A) === 'Fija, RotaDia, RotaSemana', quienes(E.A));
  comprobar('filtro B: Luis, RotaDia, RotaSemana', quienes(E.B) === 'Luis, RotaDia, RotaSemana', quienes(E.B));
  comprobar('llegadas tarde muestra a las mismas personas', quienes(T.A) === quienes(E.A) && quienes(T.B) === quienes(E.B), `${quienes(T.A)} | ${quienes(T.B)}`);

  // La sede de cada fila.
  comprobar('RotaSemana dice sus dos sedes', etiqueta(fila(E.todo, 'RotaSemana')) === 'Sede A · Sede B', etiqueta(fila(E.todo, 'RotaSemana')));
  comprobar('RotaDia dice sus dos sedes', etiqueta(fila(E.todo, 'RotaDia')) === 'Sede A · Sede B', etiqueta(fila(E.todo, 'RotaDia')));
  comprobar('Fija dice solo Sede A', etiqueta(fila(E.todo, 'Fija')) === 'Sede A', etiqueta(fila(E.todo, 'Fija')));
  comprobar('Remota dice Sin sede', etiqueta(fila(E.todo, 'Remota')) === 'Sin sede', etiqueta(fila(E.todo, 'Remota')));

  // El resumen.
  const r = E.todo.resumen;
  const lineaSede = (nombre: string) => r?.porSede.find(l => l.nombre === nombre)?.totalAdicional;
  comprobar('resumen: Sede A = Fija', lineaSede('Sede A') === 75_000, cop(lineaSede('Sede A')));
  comprobar('resumen: Sede B = Luis', lineaSede('Sede B') === 62_500, cop(lineaSede('Sede B')));
  comprobar('resumen: Sin sede = Remota', r?.porSede.find(l => l.id === null)?.totalAdicional === 50_000, cop(r?.porSede.find(l => l.id === null)?.totalAdicional));
  comprobar('resumen: Mixtos = RotaSemana + RotaDia', r?.mixtos.totalAdicional === 75_000, cop(r?.mixtos.totalAdicional));
  const sumaFilas = E.todo.colaboradores.reduce((s, f) => s + f.totalAdicional, 0);
  comprobar('resumen: Todas = suma de las filas sin filtro', r?.todas.totalAdicional === sumaFilas, `${cop(r?.todas.totalAdicional)} contra ${cop(sumaFilas)}`);
  const sumaLineas = r ? r.porSede.reduce((s, l) => s + l.totalAdicional, 0) + r.mixtos.totalAdicional : undefined;
  comprobar('resumen: sedes + mixtos = Todas', !!r && sumaLineas === r.todas.totalAdicional, cop(sumaLineas));
  comprobar('el resumen es el mismo con y sin filtro', !!r && JSON.stringify(E.A.resumen) === JSON.stringify(r) && JSON.stringify(E.B.resumen) === JSON.stringify(r));
  const rt = T.todo.resumen;
  comprobar('llegadas tarde: la tardanza de Fija va en la línea de Sede A', rt?.porSede.find(l => l.nombre === 'Sede A')?.totalMinutos === 22, String(rt?.porSede.find(l => l.nombre === 'Sede A')?.totalMinutos));
  comprobar('llegadas tarde: Todas = suma de las filas', rt?.todas.totalMinutos === T.todo.colaboradores.reduce((s, f) => s + f.totalMinutos, 0), String(rt?.todas.totalMinutos));

  console.log('\nCOMPROBACIONES');
  for (const c of comprobaciones) {
    console.log(`  ${c.ok ? 'OK   ' : 'FALLA'} ${c.nombre}${c.ok ? '' : `  → obtuvo: ${c.obtenido}`}`);
  }
  const malas = comprobaciones.filter(c => !c.ok).length;
  console.log(`\n${comprobaciones.length - malas} de ${comprobaciones.length} en verde.`);
  return malas === 0 ? 0 : 1;
}

let salida = 1;
main()
  .then(c => { salida = c; })
  .catch(e => { console.error('EXPLOTÓ:', e); })
  .finally(async () => {
    await clienteApp?.$disconnect();
    if (baseCreada) {
      await origen.$executeRawUnsafe(`DROP DATABASE IF EXISTS \`${BASE}\``);
      const quedan = await origen.$queryRawUnsafe<unknown[]>(`SHOW DATABASES LIKE '${BASE.replace(/_/g, '\\_')}'`);
      console.log(quedan.length === 0 ? `\nLimpieza: ${BASE} borrada.` : `\nOJO: ${BASE} sigue existiendo, bórrala a mano.`);
    }
    await origen.$disconnect();
    process.exit(salida);
  });
