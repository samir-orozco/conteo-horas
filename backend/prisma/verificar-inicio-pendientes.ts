// Verifica la COSTURA de «Pendientes por resolver» y «Primeros pasos» del Inicio contra MySQL
// (CLAUDE.md §8.6): lo que las pruebas de src/utils no ven porque no hablan con la base.
//
//   npx ts-node prisma/verificar-inicio-pendientes.ts
//
// Las decisiones están probadas aparte (contratosPorRevisar.test.ts, primerosPasos.test.ts). Aquí se
// comprueba la plomería de GET /dashboard/empresa, con la ruta real:
//   - que las novedades por aprobar sean las de los ACTIVOS y no las aprobadas;
//   - que los contratos salgan del mismo contrato y con el mismo estado que pinta la lista de
//     Colaboradores (GET /colaboradores), que es la promesa de esa franja;
//   - que «Primeros pasos» no cuente una carga a mano como marcación del kiosco, que desaparezca con los
//     cinco pasos hechos, y que a una empresa de más de un mes no se le pregunte nada a la base;
//   - el plan de cada consulta nueva (§8.4), con 30.000 filas de otra empresa en `permisos` y `registros`
//     para que el optimizador no escoja un Table scan solo porque la tabla es chica.
//
// Crea tres empresas de mentira y, pase lo que pase, las borra al final con todo lo suyo.
import 'dotenv/config';
import path from 'path';
import { PrismaClient, Prisma } from '@prisma/client';
import Fastify from 'fastify';

type Consulta = { query: string; params: string };
const consultas: Consulta[] = [];
const prisma = new PrismaClient({ log: [{ emit: 'event', level: 'query' }] });
prisma.$on('query', (e: Prisma.QueryEvent) => { consultas.push({ query: e.query, params: e.params }); });

// El cliente que anota cada SQL va EN LUGAR de src/prisma.ts, antes de importar las rutas.
const rutaDelCliente = require.resolve(path.join(__dirname, '../src/prisma'));
require.cache[rutaDelCliente] = { id: rutaDelCliente, filename: rutaDelCliente, loaded: true, exports: { prisma } } as unknown as NodeModule;

const SUFIJO = `inicio-${Date.now()}`;
const DIA = 24 * 60 * 60 * 1000;
// Medianoche de Bogotá de hoy, más o menos n días: como se guardan las fechas de contratos y novedades.
const hoyBog = (() => { const z = new Date(Date.now() - 5 * 60 * 60 * 1000); return Date.UTC(z.getUTCFullYear(), z.getUTCMonth(), z.getUTCDate(), 5, 0, 0); })();
const dia = (n: number) => new Date(hoyBog + n * DIA);
const ESCALA = 30000;

let fallas = 0;
const marca = (ok: boolean, texto: string, detalle = '') => {
  if (!ok) fallas++;
  console.log(`  ${ok ? 'ok   ' : 'FALLA'} ${texto}${detalle ? `  (${detalle})` : ''}`);
};

type Dash = {
  pendientes?: {
    novedades: { colaborador: string; tipo: string; fechaInicio: string }[];
    contratos: { colaboradorId: string; colaborador: string; estado: string; vence: string; limitePreaviso: string }[];
  };
  primerosPasos?: { clave: string; hecho: boolean }[] | null;
};

// La consulta tal como la mandó Prisma, con sus parámetros puestos, para pedirle el plan a MySQL.
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

async function main() {
  const { default: dashboardRoutes } = await import('../src/routes/dashboard');
  const { default: colaboradoresRoutes } = await import('../src/routes/colaboradores');
  const { borrarEmpresaEnCascada } = await import('../src/utils/borrarEmpresaEnCascada');

  async function pedir(empresaId: string, url: string) {
    const app = Fastify();
    app.decorate('requireEmpresa', async (request: { user?: unknown; empresaId?: string }) => {
      request.user = { rol: 'ADMIN', empresaId };
      request.empresaId = empresaId;
    });
    await app.register(dashboardRoutes, { prefix: '/dashboard' });
    await app.register(colaboradoresRoutes, { prefix: '/colaboradores' });
    await app.ready();
    consultas.length = 0;
    const r = await app.inject({ method: 'GET', url });
    await app.close();
    if (r.statusCode !== 200) throw new Error(`${url} respondió ${r.statusCode}: ${r.body.slice(0, 300)}`);
    return r.json();
  }

  const creadas: string[] = [];
  try {
    // ===== A: una empresa que arranca hoy =====
    const a = await prisma.empresa.create({ data: { nombre: `Arranca ${SUFIJO}`, nit: `a-${SUFIJO}`, email: `a-${SUFIJO}@ejemplo.co` } });
    creadas.push(a.id);

    console.log('\n1. Empresa recién creada, sin nada');
    let d = await pedir(a.id, '/dashboard/empresa') as Dash;
    marca(JSON.stringify(d.primerosPasos) === JSON.stringify([
      { clave: 'SEDE', hecho: true }, { clave: 'HORARIO', hecho: false }, { clave: 'TRABAJADOR', hecho: false },
      { clave: 'ROSTRO', hecho: false }, { clave: 'MARCACION', hecho: false },
    ]), 'primeros pasos: solo la sede hecha', JSON.stringify(d.primerosPasos));
    marca(d.pendientes?.novedades.length === 0 && d.pendientes?.contratos.length === 0, 'pendientes vacíos, pero presentes');

    const persona = (nombre: string, extra: Partial<Prisma.ColaboradorUncheckedCreateInput> = {}) => prisma.colaborador.create({
      data: { empresaId: a.id, nombre, apellido: SUFIJO, cedula: `${nombre}-${SUFIJO}`, salarioMensual: 1750905, ...extra },
    });
    const ana = await persona('Ana', { rostroEnroladoEn: new Date() });
    const beto = await persona('Beto');
    const caro = await persona('Caro');
    const dani = await persona('Dani');
    const eli = await persona('Eli', { activo: false });

    const fijo = (colaboradorId: string, fechaInicio: Date, fechaFin: Date | null, tipo: 'FIJO' | 'INDEFINIDO' = 'FIJO') =>
      prisma.contrato.create({ data: { colaboradorId, tipo, fechaInicio, fechaFin } });
    await fijo(ana.id, dia(-300), dia(57));      // preaviso hasta dentro de 27 días: POR_VENCER
    await fijo(beto.id, dia(-300), dia(10));     // ya no alcanza el preaviso: PREAVISO_VENCIDO
    await fijo(caro.id, dia(-400), dia(400));    // uno viejo con plazo largo...
    await fijo(caro.id, dia(-100), dia(-5));     // ...y uno más nuevo, vencido: manda el nuevo (VENCIDO)
    await fijo(dani.id, dia(-100), null, 'INDEFINIDO');
    await fijo(eli.id, dia(-300), dia(-5));      // retirado: no cuenta

    await prisma.permiso.createMany({ data: [
      { colaboradorId: ana.id, tipo: 'MEDICO', fechaInicio: dia(3), fechaFin: dia(3) },
      { colaboradorId: beto.id, tipo: 'VACACIONES', fechaInicio: dia(-20), fechaFin: dia(-10) },
      { colaboradorId: ana.id, tipo: 'CALAMIDAD', fechaInicio: dia(-2), fechaFin: dia(-2), aprobado: true },
      { colaboradorId: eli.id, tipo: 'MEDICO', fechaInicio: dia(1), fechaFin: dia(1) },
    ] });
    await prisma.horario.create({ data: { empresaId: a.id, nombre: `Horario ${SUFIJO}` } });
    // Cargada a mano por el administrador: NO prueba que el kiosco funcione.
    await prisma.registro.create({ data: { colaboradorId: beto.id, fecha: dia(-1), entrada: new Date(hoyBog - DIA + 8 * 3600 * 1000), metodoEntrada: 'MANUAL' } });

    console.log('\n2. Con gente, contratos, novedades, un horario y una marcación cargada a mano');
    d = await pedir(a.id, '/dashboard/empresa') as Dash;
    const nov = d.pendientes?.novedades ?? [];
    marca(nov.map(n => `${n.colaborador.split(' ')[0]}:${n.tipo}`).join(',') === 'Beto:VACACIONES,Ana:MEDICO',
      'novedades: las dos sin aprobar de activos, la más vieja primero', nov.map(n => n.colaborador.split(' ')[0]).join(','));
    const con = d.pendientes?.contratos ?? [];
    marca(con.map(c => `${c.colaborador.split(' ')[0]}:${c.estado}`).join(',') === 'Caro:VENCIDO,Beto:PREAVISO_VENCIDO,Ana:POR_VENCER',
      'contratos: vencido, se prorroga solo y por vencer, sin el indefinido ni el retirado', con.map(c => `${c.colaborador.split(' ')[0]}:${c.estado}`).join(','));
    const deAna = con.find(c => c.colaboradorId === ana.id);
    marca(deAna?.vence === dia(57).toISOString() && deAna?.limitePreaviso === dia(27).toISOString(),
      'fechas del contrato de Ana: vence y límite del preaviso', `${deAna?.vence} / ${deAna?.limitePreaviso}`);
    marca(con.find(c => c.colaboradorId === caro.id)?.vence === dia(-5).toISOString(), 'a Caro la representa su contrato más nuevo');
    marca(JSON.stringify(d.primerosPasos?.map(p => p.hecho)) === JSON.stringify([true, true, true, true, false]),
      'primeros pasos: todo menos la marcación (la carga a mano no cuenta)', JSON.stringify(d.primerosPasos));

    // La promesa de la franja: el mismo estado que la lista de Colaboradores, persona por persona.
    const lista = await pedir(a.id, '/colaboradores') as { id: string; estadoContrato: string }[];
    const estadoEnLista = new Map(lista.map(c => [c.id, c.estadoContrato]));
    const coincide = con.every(c => estadoEnLista.get(c.colaboradorId) === c.estado);
    const fuera = lista.filter(c => !con.some(x => x.colaboradorId === c.id)).map(c => c.estadoContrato).sort();
    marca(coincide, 'cada contrato del Inicio tiene el mismo estado en la lista de Colaboradores');
    marca(JSON.stringify(fuera) === JSON.stringify(['INDEFINIDO']), 'en la lista, el único que no está en el Inicio es el indefinido', fuera.join(','));

    // ===== El plan de cada consulta nueva, con escala =====
    // Otra empresa con 30.000 novedades y 30.000 marcaciones: si una consulta del Inicio no entra por su
    // índice, el plan lo dice.
    const grande = await prisma.empresa.create({ data: { nombre: `Grande ${SUFIJO}`, nit: `g-${SUFIJO}`, email: `g-${SUFIJO}@ejemplo.co` } });
    creadas.push(grande.id);
    const otro = await prisma.colaborador.create({ data: { empresaId: grande.id, nombre: 'Otro', apellido: SUFIJO, cedula: `otro-${SUFIJO}`, salarioMensual: 1750905 } });
    for (let i = 0; i < ESCALA; i += 5000) {
      await prisma.permiso.createMany({ data: Array.from({ length: 5000 }, (_, k) => ({ colaboradorId: otro.id, tipo: 'OTRO' as const, fechaInicio: dia(-(i + k) % 900), fechaFin: dia(-(i + k) % 900), aprobado: k % 2 === 0 })) });
      await prisma.registro.createMany({ data: Array.from({ length: 5000 }, (_, k) => ({ colaboradorId: otro.id, fecha: dia(-(i + k)), metodoEntrada: 'CEDULA' as const })) });
    }
    await prisma.$executeRawUnsafe('ANALYZE TABLE permisos, registros, contratos, horarios');

    d = await pedir(a.id, '/dashboard/empresa') as Dash;
    const nuevas: [string, (q: string) => boolean][] = [
      ['empresa (fecha de creación)', q => q.includes('`empresas`') && q.includes('`creadoEn`') && !q.includes('JOIN')],
      ['novedades por aprobar', q => q.includes('FROM `conteo_horas`.`permisos`') && q.includes('`aprobado` = ?') && !q.includes('JOIN')],
      ['contrato de cada persona', q => q.includes('FROM `conteo_horas`.`contratos`')],
      ['prórrogas de esos contratos', q => q.includes('FROM `conteo_horas`.`prorrogas_contrato`')],
      ['horarios activos (primeros pasos)', q => q.includes('COUNT(') && q.includes('`horarios`')],
      ['toda la gente de la empresa (primeros pasos)', q => q.includes('FROM `conteo_horas`.`colaboradores`') && q.includes('`empresaId` = ?') && !q.includes('`activo`')],
      ['primera marcación del kiosco', q => q.includes('FROM `conteo_horas`.`registros`') && q.includes('`metodoEntrada` IN')],
    ];
    console.log(`\n3. El plan de las consultas nuevas, con ${ESCALA} filas de otra empresa en permisos y registros (§8.4)`);
    for (const [nombre, es] of nuevas) {
      const c = consultas.find(x => es(x.query));
      if (!c) { marca(false, `${nombre}: no se encontró la consulta`); continue; }
      const filas = await prisma.$queryRawUnsafe<Record<string, string>[]>(`EXPLAIN FORMAT=TREE ${conParametros(c)}`);
      const plan = Object.values(filas[0] ?? {}).join('');
      const escaneo = /Table scan/i.test(plan);
      marca(!escaneo, `${nombre}: ${escaneo ? 'Table scan' : 'por índice'}`);
      console.log(plan.split('\n').map(l => `          ${l}`).join('\n'));
    }

    // ===== Con los cinco pasos, la tarjeta se va =====
    // La primera marcación la hace Eli, que está retirada: cuenta igual, porque es un hecho que ya pasó.
    await prisma.registro.create({ data: { colaboradorId: eli.id, fecha: dia(-2), entrada: new Date(hoyBog - 2 * DIA + 8 * 3600 * 1000), metodoEntrada: 'ROSTRO' } });
    console.log('\n4. Con una marcación del kiosco, de alguien que después se retiró');
    d = await pedir(a.id, '/dashboard/empresa') as Dash;
    marca(d.primerosPasos === null, 'primeros pasos: null, la tarjeta desaparece y no vuelve por el retiro', JSON.stringify(d.primerosPasos));

    // ===== B: una empresa de dos meses =====
    const b = await prisma.empresa.create({ data: { nombre: `Vieja ${SUFIJO}`, nit: `b-${SUFIJO}`, email: `b-${SUFIJO}@ejemplo.co`, creadoEn: dia(-60) } });
    creadas.push(b.id);
    console.log('\n5. Empresa de dos meses, sin nada configurado');
    d = await pedir(b.id, '/dashboard/empresa') as Dash;
    marca(d.primerosPasos === null, 'primeros pasos: null aunque no tenga nada');
    const preguntas = consultas.filter(c => (c.query.includes('COUNT(') && c.query.includes('`horarios`')) || c.query.includes('`metodoEntrada` IN')
      || (c.query.includes('FROM `conteo_horas`.`colaboradores`') && c.query.includes('`empresaId` = ?') && !c.query.includes('`activo`')));
    marca(preguntas.length === 0, 'no se le pregunta a la base por horarios, por la gente retirada ni por la marcación', `${preguntas.length} consultas`);
    marca(Array.isArray(d.pendientes?.novedades) && Array.isArray(d.pendientes?.contratos), 'los pendientes sí viajan');
  } finally {
    for (const id of creadas) await prisma.$transaction(tx => borrarEmpresaEnCascada(tx, id), { timeout: 120000 });
    const sobras = await prisma.empresa.count({ where: { id: { in: creadas } } });
    const filasSobrantes = await prisma.colaborador.count({ where: { apellido: SUFIJO } });
    console.log(`\n${fallas === 0 ? 'TODO EN VERDE.' : `${fallas} FALLA(S).`} Limpieza: ${sobras === 0 && filasSobrantes === 0 ? 'sin sobras' : `${sobras} empresa(s) y ${filasSobrantes} colaborador(es) sin borrar`}.`);
    await prisma.$disconnect();
    if (fallas > 0 || sobras > 0 || filasSobrantes > 0) process.exitCode = 1;
  }
}

main().catch(e => { console.error('FALLÓ:', e); process.exitCode = 1; });
