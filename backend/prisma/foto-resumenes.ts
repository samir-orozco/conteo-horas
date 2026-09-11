// Foto determinista de los reportes de extras y de llegadas tarde, pedidos a las
// RUTAS REALES sobre `conteo_horas`. Se corre antes y después de un cambio y se
// comparan las dos salidas con `diff` (CLAUDE.md §5.3).
//
// Es de SOLO LECTURA: registra `reporteRoutes` en un Fastify mínimo y llama con
// `inject` a cuatro rutas GET que solo consultan. No importa index.ts (§8.5).
//
// Cubre, por empresa y rango:
//   - /extras-resumen y /tardanzas-resumen SIN filtro y con cada sede
//   - /liquidacion y /tardanzas de cada colaborador activo (el drill-down), que
//     comparten con los resúmenes el núcleo de la liquidación
//
// Cada línea lleva su etiqueta, para separar en el diff lo que no puede moverse
// (todo lo que no sea `sede=`) de lo que un cambio de atribución sí mueve.
//
//   npx ts-node prisma/foto-resumenes.ts > /ruta/antes.txt
import Fastify from 'fastify';
import { prisma } from '../src/prisma';
import reporteRoutes from '../src/routes/reportes';

const RANGOS: [string, string][] = [
  ['2026-06-01', '2026-06-30'],
  ['2026-07-01', '2026-07-31'],
  ['2026-07-13', '2026-07-19'],
  ['2026-08-01', '2026-08-31'],
  ['2026-09-01', '2026-09-10'],
];

async function main() {
  const app = Fastify();
  app.decorate('requireEmpresa', async (request: any) => { request.empresaId = request.headers['x-empresa']; });
  await app.register(reporteRoutes, { prefix: '/reportes' });
  await app.ready();

  const pedir = async (empresaId: string, ruta: string, params: Record<string, string>) => {
    const r = await app.inject({ method: 'GET', url: `/reportes/${ruta}?${new URLSearchParams(params)}`, headers: { 'x-empresa': empresaId } });
    if (r.statusCode !== 200) return { error: r.statusCode };
    return r.json();
  };

  const empresas = await prisma.empresa.findMany({ select: { id: true, nombre: true }, orderBy: { nombre: 'asc' } });
  for (const emp of empresas) {
    const [sedes, colaboradores] = await Promise.all([
      prisma.sede.findMany({ where: { empresaId: emp.id }, select: { id: true, nombre: true }, orderBy: { nombre: 'asc' } }),
      prisma.colaborador.findMany({ where: { empresaId: emp.id, activo: true }, select: { id: true, nombre: true, apellido: true }, orderBy: [{ nombre: 'asc' }, { apellido: 'asc' }] }),
    ]);

    for (const [desde, hasta] of RANGOS) {
      const filtros: [string, Record<string, string>][] = [
        ['sin-filtro', {}],
        ...sedes.map(s => [`sede=${s.nombre}`, { sedeId: s.id }] as [string, Record<string, string>]),
      ];
      for (const [etiqueta, extra] of filtros) {
        const ext = await pedir(emp.id, 'extras-resumen', { desde, hasta, ...extra });
        const tar = await pedir(emp.id, 'tardanzas-resumen', { desde, hasta, ...extra });
        const tarPorId = new Map(((tar as any).colaboradores ?? []).map((t: any) => [t.colaboradorId, t]));
        for (const e of ((ext as any).colaboradores ?? [])) {
          const t: any = tarPorId.get(e.colaboradorId) ?? {};
          console.log(`${emp.nombre} | ${desde}→${hasta} | ${etiqueta} | ${e.nombre} ${e.apellido} | extra=${e.totalExtra} rec=${e.totalRecargos} adic=${e.totalAdicional} | tarde=${t.sinHorario ? 'sinHorario' : `${t.diasTarde}/${t.totalMinutos}/${t.montoTardanzas}`}`);
        }
      }

      for (const col of colaboradores) {
        const liq: any = await pedir(emp.id, 'liquidacion', { colaboradorId: col.id, desde, hasta });
        const tar: any = await pedir(emp.id, 'tardanzas', { colaboradorId: col.id, desde, hasta });
        const filas = (liq.liquidacion ?? []).map((l: any) => `${l.codigo}:${l.horas}h=${l.subtotal}`).join(',');
        const detalle = (liq.detalleRegistros ?? []).length;
        const saldo = liq.saldo ? `${liq.saldo.minutosEsperados}/${liq.saldo.minutosTrabajados}/${liq.saldo.minutosSaldo}/${liq.saldo.montoSaldo}` : '-';
        const tarde = tar.sinHorario ? 'sinHorario' : `${tar.diasTarde}/${tar.totalMinutos}/${tar.montoTardanzas}`;
        console.log(`${emp.nombre} | ${desde}→${hasta} | drill | ${col.nombre} ${col.apellido} | adic=${liq.totalAdicional} [${filas}] detalle=${detalle} saldo=${saldo} | tarde=${tarde}`);
      }
    }
  }
  await app.close();
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
