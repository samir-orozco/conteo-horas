// Verifica, contra las RUTAS REALES, dos cosas de los reportes que las pruebas de
// src/utils no cubren (CLAUDE.md §8.6):
//
// 1. Los reportes de llegadas tarde no le piden a la base las fotos de cada
//    marcación. `calcularTardanzas` solo lee la entrada, pero /tardanzas y
//    /tardanzas-resumen hacían `findMany` sin `select` y traían también
//    `fotoEntrada` y `fotoSalida` de TODA la empresa en el rango. Medido el 10 de
//    septiembre de 2026 con los datos locales de Seguridad Andina: 174 KB
//    cargados sin `select` contra 19 KB con él, para 89 marcaciones.
//
// 2. /reportes/asistencia ya no existe. Ninguna pantalla la usó nunca (venía del
//    commit inicial) y le entregaba a cualquier ADMIN o SUPERVISOR la ficha
//    completa de cada persona, con descriptor facial, foto, cédula y salario,
//    repetida en cada marcación: 1,3 MB para esas mismas 89. Se borró por
//    decisión del dueño.
//
// CÓMO. Se arma un cliente de Prisma que anota cada SQL y se pone en la caché de
// módulos EN LUGAR de `src/prisma.ts`, antes de importar las rutas. Así las rutas
// corren tal cual y cada consulta queda registrada. Si una ruta no llega a
// consultar `registros` (por ejemplo, alguien sin horario sale antes), la
// comprobación FALLA: pasar sin haber consultado nada no probaría nada.
//
// Solo lectura contra la base de DATABASE_URL.
//
//   npx ts-node prisma/verificar-consultas-sin-fotos.ts
import 'dotenv/config';
import path from 'path';
import { PrismaClient, Prisma } from '@prisma/client';
import Fastify from 'fastify';

const DESDE = '2026-06-01';
const HASTA = '2026-09-10';
const COLUMNAS_QUE_NO_SE_PIDEN = ['fotoEntrada', 'fotoSalida'];

const consultas: string[] = [];
const prisma = new PrismaClient({ log: [{ emit: 'event', level: 'query' }] });
prisma.$on('query', (e: Prisma.QueryEvent) => { consultas.push(e.query); });

const rutaDelCliente = require.resolve(path.join(__dirname, '../src/prisma'));
require.cache[rutaDelCliente] = { id: rutaDelCliente, filename: rutaDelCliente, loaded: true, exports: { prisma } } as unknown as NodeModule;

async function main(): Promise<number> {
  const { default: reporteRoutes } = await import('../src/routes/reportes');

  // Una empresa con fotos, y dentro de ella alguien con horario activo y fotos:
  // sin horario, /tardanzas responde antes de consultar registros.
  const [empresa] = await prisma.$queryRawUnsafe<{ id: string; nombre: string }[]>(`
    SELECT e.id, e.nombre FROM empresas e
    JOIN colaboradores c ON c.empresaId = e.id JOIN registros r ON r.colaboradorId = c.id
    WHERE r.fotoEntrada IS NOT NULL OR r.fotoSalida IS NOT NULL
    GROUP BY e.id, e.nombre ORDER BY COUNT(*) DESC LIMIT 1`);
  if (!empresa) throw new Error('no hay marcaciones con foto en esta base: no hay con qué verificar');
  const [persona] = await prisma.$queryRawUnsafe<{ id: string }[]>(`
    SELECT c.id FROM colaboradores c
    JOIN horarios h ON h.id = c.horarioId AND h.activo = 1
    JOIN registros r ON r.colaboradorId = c.id
    WHERE c.empresaId = ? AND c.activo = 1 AND (r.fotoEntrada IS NOT NULL OR r.fotoSalida IS NOT NULL)
    GROUP BY c.id ORDER BY COUNT(*) DESC LIMIT 1`, empresa.id);
  if (!persona) throw new Error(`nadie con horario activo y fotos en ${empresa.nombre}: no hay con qué verificar /tardanzas`);

  const app = Fastify();
  app.decorate('requireEmpresa', async (request: { empresaId?: string }) => { request.empresaId = empresa.id; });
  await app.register(reporteRoutes, { prefix: '/reportes' });
  await app.ready();

  console.log(`Empresa "${empresa.nombre}" · ${DESDE} → ${HASTA}\n`);
  let total = 0;
  let malas = 0;
  const anotar = (ruta: string, estado: string) => {
    total++;
    if (!estado.startsWith('OK')) malas++;
    console.log(`  ${ruta.padEnd(28)} ${estado}`);
  };

  for (const ruta of [
    `/reportes/tardanzas?colaboradorId=${persona.id}&desde=${DESDE}&hasta=${HASTA}`,
    `/reportes/tardanzas-resumen?desde=${DESDE}&hasta=${HASTA}`,
  ]) {
    consultas.length = 0;
    const r = await app.inject({ method: 'GET', url: ruta });
    const aRegistros = consultas.filter(q => /FROM `[^`]+`\.`registros`/.test(q));
    const conFotos = aRegistros.filter(q => COLUMNAS_QUE_NO_SE_PIDEN.some(col => q.includes(`\`${col}\``)));
    anotar(ruta.split('?')[0], r.statusCode !== 200 ? `FALLA: HTTP ${r.statusCode}`
      : aRegistros.length === 0 ? 'FALLA: no consultó registros, así que no probó nada'
      : conFotos.length > 0 ? `FALLA: ${conFotos.length} de ${aRegistros.length} consultas a registros piden fotos`
      : `OK: ${aRegistros.length} consulta(s) a registros, ninguna pide fotos`);
  }

  const asistencia = await app.inject({ method: 'GET', url: `/reportes/asistencia?desde=${DESDE}&hasta=${HASTA}` });
  anotar('/reportes/asistencia', asistencia.statusCode === 404
    ? 'OK: ya no existe (404)'
    : `FALLA: sigue respondiendo (HTTP ${asistencia.statusCode}, ${Math.round(asistencia.body.length / 1024)} KB)`);

  await app.close();
  console.log(`\n${total - malas} de ${total} en verde.`);
  return malas === 0 ? 0 : 1;
}

let salida = 1;
main()
  .then(c => { salida = c; })
  .catch(e => { console.error('EXPLOTÓ:', e); })
  .finally(async () => { await prisma.$disconnect(); process.exit(salida); });
