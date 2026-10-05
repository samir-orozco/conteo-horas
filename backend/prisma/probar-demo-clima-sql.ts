// PRUEBA EN LOCAL DEL SQL QUE LLENA EL CLIMA LABORAL DE «DEMO» EN PRODUCCIÓN (5 de octubre de 2026).
//
// El dueño pidió ver cómo se ve el clima laboral con todo septiembre lleno, en su empresa «Demo» de
// producción (id cmrfu0b5m0008avi678kzeldr). El SQL que va allá se prueba aquí antes, LETRA POR LETRA el
// mismo, contra una réplica local con la forma de Demo: el mismo id de empresa, las dos sedes con los
// mismos nombres («Sede principal» y «Sede Robledo») y dos personas activas. Es el protocolo de la
// §8.6: crear el caso, correr lo de verdad, comprobar lo que escribió y borrar lo que creó.
//
// Comprueba, además de que el SQL corre:
//   - que Prisma lee lo insertado (los motivos como lista, las fechas);
//   - qué mostraría el panel: el resumen y «Necesitan atención», con las mismas funciones del panel;
//   - y que el SQL de borrado deja la empresa como estaba.
//
// Uso (los tres .sql los genera el script de la sesión, en su carpeta temporal):
//   npx ts-node prisma/probar-demo-clima-sql.ts <inserta.sql> <cuenta.sql> <borra.sql>
import 'dotenv/config';
import { readFileSync } from 'fs';
import { PrismaClient } from '@prisma/client';
import { resumenDelClima, necesitanAtencion, filasParaLaRacha, CARITA_MAX_DE_ATENCION } from '../src/utils/clima';

const prisma = new PrismaClient();
const EMP = 'cmrfu0b5m0008avi678kzeldr';

const sentencias = (archivo: string) =>
  readFileSync(archivo, 'utf8').split(/;\s*\n/).map(s => s.trim()).filter(Boolean);

const comoLista = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

async function contar() {
  const filas = await prisma.$queryRawUnsafe<Record<string, bigint | number>[]>(sentencias(process.argv[3])[0]);
  return Object.fromEntries(Object.entries(filas[0]).map(([k, v]) => [k, Number(v)]));
}

async function main() {
  const [inserta, , borra] = process.argv.slice(2);
  if (!inserta || !borra) throw new Error('Faltan los archivos .sql');
  if (!/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL ?? '')) throw new Error('PARA: esto solo corre contra la base local');
  if (await prisma.empresa.findUnique({ where: { id: EMP } })) throw new Error(`PARA: ya existe una empresa ${EMP} en la base local`);

  // La réplica: lo mínimo que el SQL toca de Demo.
  await prisma.empresa.create({ data: {
    id: EMP, nombre: 'Demo (réplica local de prueba)', nit: 'REPLICA-DEMO-CLIMA', email: 'replica@demo.local',
    suscripcion: { create: { plan: 'EMPRESARIAL', estado: 'PRUEBA', finPrueba: new Date('2026-12-31T05:00:00.000Z') } },
    sedes: { create: [{ nombre: 'Sede principal' }, { nombre: 'Sede Robledo' }] },
  } });
  const sedes = await prisma.sede.findMany({ where: { empresaId: EMP } });
  for (const [i, n] of ['Ana', 'Beto', 'Carla'].entries()) {
    await prisma.colaborador.create({ data: {
      empresaId: EMP, nombre: n, apellido: 'Réplica', cedula: `REPLICA-${i}`, salarioMensual: 1500000, activo: i < 2,
      creadoEn: new Date(Date.UTC(2026, 7, 1 + i)), sedes: { create: { sedeId: sedes[i % 2].id } },
    } });
  }
  console.log('réplica creada');

  try {
    const antes = await contar();
    console.log('antes:', antes);
    for (const s of sentencias(inserta)) await prisma.$executeRawUnsafe(s);
    console.log('después:', await contar());

    const caritas = await prisma.calificacionClima.findMany({ where: { empresaId: EMP }, orderBy: { fecha: 'asc' } });
    const motivosMal = caritas.filter(c => !Array.isArray(c.motivos));
    console.log(`Prisma lee ${caritas.length} caritas; motivos que no son lista: ${motivosMal.length}`);
    console.log('primera:', caritas[0].fecha.toISOString(), '· última:', caritas[caritas.length - 1].fecha.toISOString());
    const reales = await prisma.colaborador.findMany({ where: { empresaId: EMP, cedula: { startsWith: 'REPLICA-' } }, select: { id: true, nombre: true, activo: true } });
    for (const r of reales) console.log(`  ${r.nombre} (${r.activo ? 'activa' : 'inactiva'}): ${caritas.filter(c => c.colaboradorId === r.id).length} caritas`);

    const r = resumenDelClima(caritas.map(c => ({ ...c, motivos: comoLista(c.motivos) })));
    console.log('resumen:', { total: r.total, personas: r.personas, promedio: r.promedio, negativas: r.negativas, motivos: r.motivos.slice(0, 3) });

    // «Necesitan atención» igual que la ruta (routes/clima.ts, atencionDeLaEmpresa).
    const buenos = await prisma.calificacionClima.groupBy({ by: ['colaboradorId'], where: { empresaId: EMP, carita: { gt: CARITA_MAX_DE_ATENCION } }, _max: { fecha: true } });
    const malas = await prisma.calificacionClima.findMany({ where: { empresaId: EMP, carita: { lte: CARITA_MAX_DE_ATENCION } }, select: { colaboradorId: true, fecha: true, carita: true, motivos: true } });
    const ultimoBueno = new Map(buenos.filter(b => b._max.fecha).map(b => [b.colaboradorId, b._max.fecha as Date]));
    const activos = new Set((await prisma.colaborador.findMany({ where: { empresaId: EMP, activo: true }, select: { id: true } })).map(c => c.id));
    const atencion = necesitanAtencion(filasParaLaRacha(malas.map(m => ({ ...m, motivos: comoLista(m.motivos) })), ultimoBueno).filter(c => activos.has(c.colaboradorId)));
    console.log('necesitan atención:', atencion.map(a => `${a.colaboradorId} · ${a.dias} seguidas desde ${a.desde.toISOString().slice(0, 10)}`));

    const notas = await prisma.observacionConfidencial.findMany({ where: { empresaId: EMP }, orderBy: { visibleDesde: 'asc' } });
    console.log(`buzón: ${notas.length} notas, de ${notas[0]?.visibleDesde.toISOString().slice(0, 10)} a ${notas[notas.length - 1]?.visibleDesde.toISOString().slice(0, 10)}`);

    // El borrado tiene que dejar la empresa como estaba.
    for (const s of sentencias(borra)) await prisma.$executeRawUnsafe(s);
    const despues = await contar();
    console.log('después de borrar:', despues);
    const quedan = await prisma.colaborador.count({ where: { empresaId: EMP } });
    console.log(`personas que quedan en la réplica: ${quedan} (eran 3)`);
    if (Object.values(despues).some(v => v !== 0) || quedan !== 3) throw new Error('EL BORRADO NO DEJÓ LA EMPRESA COMO ESTABA');
    console.log('BORRADO OK');
  } finally {
    // Hijo por hijo y no confiando en la cascada: no todas las tablas la tienen hacia empresas (por eso
    // existe utils/borrarEmpresaEnCascada.ts). Si la prueba se cayó a la mitad, esto también limpia.
    await prisma.comentarioSeguimientoClima.deleteMany({ where: { seguimiento: { empresaId: EMP } } });
    await prisma.seguimientoClima.deleteMany({ where: { empresaId: EMP } });
    await prisma.observacionConfidencial.deleteMany({ where: { empresaId: EMP } });
    await prisma.calificacionClima.deleteMany({ where: { empresaId: EMP } });
    await prisma.colaboradorSede.deleteMany({ where: { colaborador: { empresaId: EMP } } });
    await prisma.colaborador.deleteMany({ where: { empresaId: EMP } });
    await prisma.sede.deleteMany({ where: { empresaId: EMP } });
    await prisma.suscripcion.deleteMany({ where: { empresaId: EMP } });
    await prisma.empresa.delete({ where: { id: EMP } });
    console.log('réplica borrada:', (await prisma.empresa.findUnique({ where: { id: EMP } })) === null);
  }
}

main().catch(e => { console.error('FALLA:', e.message ?? e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
