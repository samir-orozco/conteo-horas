// Comprobación DIFERENCIAL (CLAUDE.md §5.3) del barrido de los filtros por empresa (15 de octubre de 2026): las
// consultas que filtraban `colaborador: { empresaId }` pasan a la lista de personas (`colaboradorId: { in: ids }`),
// que entra por el índice (ver prisma/medir-filtros-por-empresa.ts). Leen lo mismo; las respuestas tienen que quedar
// idénticas, byte a byte.
//
//   DIFERENCIAL_DIR=<carpeta> npx ts-node prisma/diferencial-filtros-por-empresa.ts antes
//   DIFERENCIAL_DIR=<carpeta> npx ts-node prisma/diferencial-filtros-por-empresa.ts despues
//
// Cubre, para cada empresa local: el calendario de turnos (una semana y una que cruza el mes), la lista de
// Registros y la de Novedades (sin persona, con una persona suya y con una de OTRA empresa, que tiene que seguir
// devolviendo nada), el estado del kiosco, el resumen de «Eliminar empresa» del super admin y lo que lee el correo
// de los lunes. Solo lectura: no envía correos ni escribe nada.
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import Fastify from 'fastify';
import { prisma } from '../src/prisma';
import turnosRoutes from '../src/routes/turnos';
import registroRoutes from '../src/routes/registros';
import permisoRoutes from '../src/routes/permisos';
import configuracionRoutes from '../src/routes/configuracion';
import adminRoutes from '../src/routes/admin';
import { entradaDe } from '../src/utils/envioResumenSemanal';
import { semanaDelResumen } from '../src/utils/resumenSemanal';

const MODO = process.argv[2];
const ARCHIVO = path.join(process.env.DIFERENCIAL_DIR ?? '/tmp', 'diferencial-filtros-por-empresa.json');
// Un lunes a las 8 de la mañana en Bogotá: el día en que se arma el correo.
const LUNES = new Date(Date.UTC(2026, 9, 12, 13));

async function main() {
  if (MODO !== 'antes' && MODO !== 'despues') throw new Error('uso: antes | despues');
  const empresas = await prisma.empresa.findMany({ select: { id: true, nombre: true }, orderBy: { creadoEn: 'asc' } });
  const foto: Record<string, string> = {};
  const semana = semanaDelResumen(LUNES);
  if (!semana) throw new Error('el lunes de prueba no armó la semana del resumen');
  for (const [i, e] of empresas.entries()) {
    const suya = await prisma.colaborador.findFirst({ where: { empresaId: e.id }, select: { id: true }, orderBy: { creadoEn: 'asc' } });
    const ajena = await prisma.colaborador.findFirst({ where: { empresaId: empresas[(i + 1) % empresas.length].id }, select: { id: true } });
    const app = Fastify();
    app.decorate('requireEmpresa', async (request: { user?: unknown; empresaId?: string }) => { request.user = { rol: 'ADMIN', empresaId: e.id }; request.empresaId = e.id; });
    app.decorate('requireSuperAdmin', async () => {});
    await app.register(turnosRoutes, { prefix: '/turnos' });
    await app.register(registroRoutes, { prefix: '/registros' });
    await app.register(permisoRoutes, { prefix: '/permisos' });
    await app.register(configuracionRoutes, { prefix: '/configuracion' });
    await app.register(adminRoutes, { prefix: '/admin' });
    await app.ready();
    const urls = [
      '/turnos/calendario?desde=2026-10-12&hasta=2026-10-18',
      '/turnos/calendario?desde=2026-09-28&hasta=2026-10-04',
      '/registros?desde=2026-09-01&hasta=2026-10-15',
      ...(suya ? [`/registros?colaboradorId=${suya.id}&desde=2026-09-01&hasta=2026-10-15`, `/permisos?colaboradorId=${suya.id}`] : []),
      ...(ajena ? [`/registros?colaboradorId=${ajena.id}&desde=2026-09-01&hasta=2026-10-15`, `/permisos?colaboradorId=${ajena.id}`] : []),
      '/permisos',
      '/configuracion/kiosco-estado',
      `/admin/empresas/${e.id}/eliminacion`,
    ];
    for (const url of urls) {
      const r = await app.inject({ method: 'GET', url });
      foto[`${e.nombre}|${url.replace(suya?.id ?? '§', 'SUYA').replace(ajena?.id ?? '§', 'AJENA')}`] = `${r.statusCode} ${r.body}`;
    }
    await app.close();
    foto[`${e.nombre}|correo`] = JSON.stringify(await entradaDe(e.id, semana, LUNES));
  }
  if (MODO === 'antes') {
    fs.writeFileSync(ARCHIVO, JSON.stringify(foto));
    const conDatos = Object.values(foto).filter(v => v.length > 300).length;
    console.log(`Guardado: ${Object.keys(foto).length} respuestas de ${empresas.length} empresas (${conDatos} con datos).`);
    return;
  }
  const antes = JSON.parse(fs.readFileSync(ARCHIVO, 'utf-8')) as Record<string, string>;
  const distintas = Object.keys(antes).filter(k => antes[k] !== foto[k]);
  const conDatos = Object.values(foto).filter(v => v.length > 300).length;
  console.log(`${Object.keys(antes).length} respuestas comparadas (${conDatos} con datos): ${distintas.length === 0 ? 'IDÉNTICAS, byte a byte.' : `${distintas.length} DISTINTAS:`}`);
  for (const k of distintas.slice(0, 10)) console.log(`  ${k}`);
  if (distintas.length) process.exitCode = 1;
}

main().catch(e => { console.error('FALLÓ:', e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
