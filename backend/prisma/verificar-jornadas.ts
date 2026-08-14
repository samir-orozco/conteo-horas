/**
 * ¿Agrupar los tramos en jornadas cambia algún número?
 *
 * Comprobación diferencial sobre datos reales (CLAUDE.md §5.3). Para CADA día de
 * CADA colaborador compara dos cosas que tienen que dar exactamente lo mismo:
 *
 *   suma de los minutos de las jornadas   ===   minutosContadosDelDia(todo el día)
 *
 * Si no cuadran, la tabla mostraría filas que no suman lo que dice el modal, y no
 * habría forma de saber a cuál creerle. Solo lee.
 */
import { PrismaClient } from '@prisma/client';
import { partirDiaEnJornadas, minutosContadosDelDia } from '../src/utils/jornada';
import { combinarDiasEsperados } from '../src/utils/diasEsperados';
import { rangoDiaBogota } from '../src/utils/fechas';
import { toZonedTime } from 'date-fns-tz';

const prisma = new PrismaClient();
const TZ = 'America/Bogota';

async function main() {
  const registros = await prisma.registro.findMany({
    include: { colaborador: { include: { horario: { include: { franjas: true } } } } },
    orderBy: { fecha: 'asc' },
  });
  console.log(`\n${registros.length} marcaciones en la base.\n`);

  const porDia = new Map<string, typeof registros>();
  for (const r of registros) {
    const clave = `${r.colaboradorId}|${toZonedTime(r.fecha, TZ).toDateString()}`;
    if (!porDia.has(clave)) porDia.set(clave, []);
    porDia.get(clave)!.push(r);
  }

  let dias = 0, descuadres = 0, filasAntes = 0, filasDespues = 0, fundidos = 0, variasJornadas = 0;
  for (const [clave, delDia] of porDia) {
    const { inicioDia, finDia } = rangoDiaBogota(delDia[0].fecha);
    const congelado = await prisma.diaEsperado.findFirst({
      where: { colaboradorId: delDia[0].colaboradorId, fecha: { gte: inicioDia, lt: finDia } },
    });
    const [dia] = combinarDiasEsperados(
      inicioDia, finDia, congelado ? [congelado as any] : [],
      delDia[0].colaborador.horario as any,
    );
    if (!dia) continue;

    dias++;
    const jornadas = partirDiaEnJornadas(delDia, dia);
    filasAntes += delDia.length;
    filasDespues += jornadas.length;
    if (jornadas.some(j => j.marcaciones.length > 1)) fundidos++;
    if (jornadas.length > 1) variasJornadas++;

    const suma = jornadas.reduce((s, j) => s + j.minutosContados, 0);
    const total = minutosContadosDelDia(delDia, dia);
    if (suma !== total) {
      descuadres++;
      console.log(`  ✗ ${clave}: jornadas suman ${suma}, el día cuenta ${total}`);
      for (const j of jornadas) {
        console.log(`      ${j.marcaciones.map(m => `${m.entrada?.toISOString()}→${m.salida?.toISOString()}`).join('  |  ')}  = ${j.minutosContados} min`);
      }
    }
  }

  console.log(`\nDías revisados:              ${dias}`);
  console.log(`Filas ANTES (por marcación):  ${filasAntes}`);
  console.log(`Filas DESPUÉS (por jornada):  ${filasDespues}`);
  console.log(`Días con tramos fundidos:     ${fundidos}`);
  console.log(`Días con más de una jornada:  ${variasJornadas}`);
  console.log(descuadres === 0
    ? `\n✓ 0 DESCUADRES: las jornadas suman exactamente lo que cuenta el día.\n`
    : `\n✗ ${descuadres} DÍAS DESCUADRADOS.\n`);
}

main().catch(e => console.error('Falló:', e)).finally(() => prisma.$disconnect());
