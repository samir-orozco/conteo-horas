// Comprobación DIFERENCIAL del panel del clima (CLAUDE.md §5.3) al sacar su resumen de la ruta a un
// módulo propio (15 de octubre de 2026), para que también lo use el Inicio. Las respuestas tienen que
// quedar idénticas, byte a byte.
//
//   npx ts-node prisma/diferencial-clima-panel.ts antes     guarda /clima/resumen, /clima/vistazo y /clima/seguimientos
//   npx ts-node prisma/diferencial-clima-panel.ts despues   los vuelve a pedir y compara
//
// OJO: /clima/resumen ABRE casos de seguimiento al leer (así funciona el panel). Por eso «antes» se
// corre dos veces y se compara contra la segunda: la primera puede abrir casos y cambiar lo que dice.
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import Fastify from 'fastify';
import { prisma } from '../src/prisma';
import climaRoutes from '../src/routes/clima';

const MODO = process.argv[2];
const ARCHIVO = path.join(process.env.DIFERENCIAL_DIR ?? '/tmp', 'diferencial-clima-panel.json');
const RANGOS: [string, string][] = [['2026-09-01', '2026-09-30'], ['2026-10-01', '2026-10-15'], ['2026-10-09', '2026-10-15'], ['2026-09-28', '2026-10-04']];

async function main() {
  if (MODO !== 'antes' && MODO !== 'despues') throw new Error('uso: antes | despues');
  const empresas = await prisma.empresa.findMany({ where: { calificacionesClima: { some: {} } }, select: { id: true, nombre: true } });
  const foto: Record<string, string> = {};
  for (const e of empresas) {
    const app = Fastify();
    app.decorate('requireEmpresa', async (request: { user?: unknown; empresaId?: string }) => { request.user = { rol: 'ADMIN', empresaId: e.id }; request.empresaId = e.id; });
    await app.register(climaRoutes, { prefix: '/api/clima' });
    await app.ready();
    for (const [desde, hasta] of RANGOS) {
      for (const ruta of ['resumen', 'vistazo']) {
        const r = await app.inject({ method: 'GET', url: `/api/clima/${ruta}?desde=${desde}&hasta=${hasta}` });
        foto[`${e.nombre}|${ruta}|${desde}|${hasta}`] = `${r.statusCode} ${r.body}`;
      }
    }
    // La pestaña Seguimiento (15 de octubre de 2026): el caso que representa a quien necesita atención sale de la
    // misma regla que el resumen (`casoDeLaAtencion`). Abre casos al leer, como el resumen.
    const seg = await app.inject({ method: 'GET', url: '/api/clima/seguimientos' });
    foto[`${e.nombre}|seguimientos`] = `${seg.statusCode} ${seg.body}`;
    await app.close();
  }
  if (MODO === 'antes') {
    fs.writeFileSync(ARCHIVO, JSON.stringify(foto));
    console.log(`Guardado: ${Object.keys(foto).length} respuestas de ${empresas.length} empresas con calificaciones.`);
    return;
  }
  const antes = JSON.parse(fs.readFileSync(ARCHIVO, 'utf-8')) as Record<string, string>;
  const distintas = Object.keys(antes).filter(k => antes[k] !== foto[k]);
  const conDatos = Object.values(foto).filter(v => v.startsWith('200 ') && !v.includes('"total":0')).length;
  console.log(`${Object.keys(antes).length} respuestas comparadas (${conDatos} con datos): ${distintas.length === 0 ? 'IDÉNTICAS, byte a byte.' : `${distintas.length} DISTINTAS:`}`);
  for (const k of distintas.slice(0, 10)) console.log(`  ${k}`);
  if (distintas.length) process.exitCode = 1;
}

main().catch(e => { console.error('FALLÓ:', e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
