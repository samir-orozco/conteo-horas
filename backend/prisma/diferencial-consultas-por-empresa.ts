// Comprobación DIFERENCIAL (CLAUDE.md §5.3) al cambiar CÓMO se leen las marcaciones y los días de una empresa en
// los reportes (15 de octubre de 2026): de `colaborador: { empresaId }`, que MySQL resolvía recorriendo las tablas
// enteras, a `colaboradorId IN (las personas de la empresa)`, que entra por el índice. Leen lo mismo; las respuestas
// tienen que quedar idénticas, byte a byte.
//
//   DIFERENCIAL_DIR=<carpeta> npx ts-node prisma/diferencial-consultas-por-empresa.ts antes
//   DIFERENCIAL_DIR=<carpeta> npx ts-node prisma/diferencial-consultas-por-empresa.ts despues
//
// Cubre las rutas de los reportes de toda la empresa (extras, llegadas tarde, nómina) y, aparte, lo que
// devuelven `liquidarEmpresa` y `tardanzasDeEmpresa` con los campos que las rutas quitan (los minutos de cada
// día, que usa el correo semanal).
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import Fastify from 'fastify';
import { prisma } from '../src/prisma';
import reportesRoutes from '../src/routes/reportes';
import { liquidarEmpresa, tardanzasDeEmpresa } from '../src/utils/reportesDeEmpresa';

const MODO = process.argv[2];
const ARCHIVO = path.join(process.env.DIFERENCIAL_DIR ?? '/tmp', 'diferencial-consultas-por-empresa.json');
const RANGOS: [string, string][] = [
  ['2026-09-01', '2026-09-15'], ['2026-09-16', '2026-09-30'], ['2026-09-01', '2026-09-30'],
  ['2026-09-28', '2026-10-04'], ['2026-10-01', '2026-10-15'],
];

async function main() {
  if (MODO !== 'antes' && MODO !== 'despues') throw new Error('uso: antes | despues');
  const empresas = await prisma.empresa.findMany({ select: { id: true, nombre: true } });
  const foto: Record<string, string> = {};
  for (const e of empresas) {
    const app = Fastify();
    app.decorate('requireEmpresa', async (request: { user?: unknown; empresaId?: string }) => { request.user = { rol: 'ADMIN', empresaId: e.id }; request.empresaId = e.id; });
    await app.register(reportesRoutes, { prefix: '/reportes' });
    await app.ready();
    for (const [desde, hasta] of RANGOS) {
      for (const ruta of ['extras-resumen', 'tardanzas-resumen', 'nomina']) {
        const r = await app.inject({ method: 'GET', url: `/reportes/${ruta}?desde=${desde}&hasta=${hasta}` });
        foto[`${e.nombre}|${ruta}|${desde}|${hasta}`] = `${r.statusCode} ${r.body}`;
      }
      foto[`${e.nombre}|liquidarEmpresa|${desde}|${hasta}`] = JSON.stringify(await liquidarEmpresa(e.id, desde, hasta));
      foto[`${e.nombre}|tardanzasDeEmpresa|${desde}|${hasta}`] = JSON.stringify(await tardanzasDeEmpresa(e.id, desde, hasta));
    }
    await app.close();
  }
  if (MODO === 'antes') {
    fs.writeFileSync(ARCHIVO, JSON.stringify(foto));
    console.log(`Guardado: ${Object.keys(foto).length} respuestas de ${empresas.length} empresas.`);
    return;
  }
  const antes = JSON.parse(fs.readFileSync(ARCHIVO, 'utf-8')) as Record<string, string>;
  const distintas = Object.keys(antes).filter(k => antes[k] !== foto[k]);
  const conDatos = Object.values(foto).filter(v => v.length > 200).length;
  console.log(`${Object.keys(antes).length} respuestas comparadas (${conDatos} con datos): ${distintas.length === 0 ? 'IDÉNTICAS, byte a byte.' : `${distintas.length} DISTINTAS:`}`);
  for (const k of distintas.slice(0, 10)) console.log(`  ${k}`);
  if (distintas.length) process.exitCode = 1;
}

main().catch(e => { console.error('FALLÓ:', e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
