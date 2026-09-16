// Verificacion de costura del modal de «Detalles» del reporte de nomina (15 de septiembre de 2026).
// SOLO LECTURA: no crea ni modifica nada.
//
//   cd backend && npx tsx prisma/verificar-modal-detalle.ts [desde] [hasta]
//
// Pide las MISMAS rutas que pide el modal (/registros y /permisos de una persona) y corre sobre su
// respuesta REAL la MISMA regla que usa la pantalla, en vez de una copia.
//
// Contra que se contrasta: la BASE, que es la fuente de verdad. La primera version comparaba los
// dias del modal contra `registrosCont` del reporte y marcaba a las tres personas como
// discrepantes; eso no era un defecto del producto sino del script, porque esos dos numeros miden
// cosas distintas: `registrosCont` es `registros.filter(r => r.salida).length`, o sea marcaciones
// CERRADAS, y lo otro son dias de calendario. Comparar dos magnitudes distintas entre si no prueba
// nada. Aqui cada una se compara contra lo que la base dice de ella.
//
// Todo va dentro de una funcion: el backend no declara "type": "module" a proposito (CLAUDE.md
// seccion 10), asi que tsx lo transpila a CommonJS y el await de primer nivel no existe ahi.
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { createSigner } from 'fast-jwt';
import { diasDelPeriodo } from '../../frontend/src/features/reportes/detalleDelPeriodo';

const API = 'http://localhost:3002/api';
const DESDE = process.argv[2] ?? '2026-09-01';
const HASTA = process.argv[3] ?? '2026-09-15';
const TZ = 'America/Bogota';

// Medianoche de Bogota, que es como el reporte ancla su rango (utils/fechas.ts).
const medianocheBogota = (dia: string) => new Date(`${dia}T05:00:00.000Z`);
const claveDia = (f: Date) => f.toLocaleDateString('en-CA', { timeZone: TZ });

async function main() {
  const prisma = new PrismaClient();
  const tabla = (prisma as any).usuario ?? (prisma as any).user;
  const admin = await tabla.findFirst({ where: { rol: 'ADMIN', empresaId: { not: null } } });
  if (!admin) { console.log('No hay ningun ADMIN con empresa en la base local.'); return; }

  // El mismo payload que firma /auth (routes/auth.ts). El secreto no se imprime nunca.
  const firmar = createSigner({ key: process.env.JWT_SECRET as string, expiresIn: 600000 });
  const token = firmar({
    id: admin.id, email: admin.email, rol: admin.rol,
    nombre: admin.nombre, empresaId: admin.empresaId, afiliadoId: admin.afiliadoId ?? null,
  });
  const h = { headers: { Authorization: `Bearer ${token}` } };
  const pedir = async (ruta: string) => {
    const r = await fetch(API + ruta, h);
    if (!r.ok) throw new Error(`FALLO ${r.status} en ${ruta}`);
    return r.json() as any;
  };

  const ini = medianocheBogota(DESDE);
  const fin = new Date(medianocheBogota(HASTA).getTime() + 24 * 60 * 60 * 1000);
  const nomina = await pedir(`/reportes/nomina?desde=${DESDE}&hasta=${HASTA}`);
  console.log(`Periodo ${DESDE} a ${HASTA} · ${nomina.colaboradores.length} colaboradores activos\n`);

  let defectos = 0;
  for (const persona of nomina.colaboradores) {
    const registros = await pedir(`/registros?colaboradorId=${persona.colaboradorId}&desde=${DESDE}&hasta=${HASTA}`);
    const permisos = await pedir(`/permisos?colaboradorId=${persona.colaboradorId}`);
    const dias = diasDelPeriodo(registros, permisos, DESDE, HASTA);

    // La verdad, leida de la base sin pasar por ninguna ruta.
    const enBase = await prisma.registro.findMany({
      where: { colaboradorId: persona.colaboradorId, fecha: { gte: ini, lt: fin } },
      select: { fecha: true, salida: true },
    });
    const diasEnBase = new Set(enBase.map(r => claveDia(r.fecha))).size;
    const cerradasEnBase = enBase.filter(r => r.salida).length;

    console.log(`=== ${persona.nombre} ${persona.apellido}`);
    console.log(`    dias:                modal ${dias.length}  ·  base ${diasEnBase}`);
    console.log(`    marcaciones cerradas: reporte ${persona.registrosCont}  ·  base ${cerradasEnBase}`);
    console.log(`    jornadas que devuelve /registros: ${registros.length}  ·  filas en la base: ${enBase.length}`);
    console.log(`    novedades del reporte: ${persona.novedades.map((n: any) => `${n.tipo} ${n.dias}d+${n.parciales}p`).join(', ') || 'ninguna'}`);
    if (dias.length !== diasEnBase) {
      defectos++;
      console.log(`    *** DEFECTO: el modal mostraria ${dias.length} dias y la base tiene ${diasEnBase}`);
    }
    if (persona.registrosCont !== cerradasEnBase) {
      defectos++;
      console.log(`    *** DEFECTO: el reporte dice ${persona.registrosCont} marcaciones cerradas y la base tiene ${cerradasEnBase}`);
    }
    for (const d of dias) {
      console.log(`      ${d.dia}  ${d.entrada ?? '--'} a ${d.salida ?? '...'}${d.sinSalida ? '  [SIN SALIDA]' : ''}${
        d.jornadas > 1 ? `  (${d.jornadas} jornadas)` : ''}${
        d.novedades.length ? '  novedad: ' + d.novedades.map(n => n.tipo).join(' + ') : ''}`);
    }
    console.log('');
  }
  console.log(defectos === 0
    ? 'Sin defectos: el modal y el reporte dicen lo mismo que la base.'
    : `${defectos} DEFECTO(S) contra la base.`);
  await prisma.$disconnect();
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
