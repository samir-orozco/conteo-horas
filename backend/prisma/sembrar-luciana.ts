/**
 * Reproduce a Luciana en LOCAL con sus datos reales de producción, para poder
 * cambiarle el horario y ver si un reporte YA LIQUIDADO se mueve.
 *
 * El orden importa y es el del mundo real: primero se congelan los días con el
 * horario original, y solo después se cambia el horario. Si se hiciera al revés
 * no habría nada que demostrar.
 *
 * Solo toca a "Luciana Prueba". Borra lo suyo y lo vuelve a crear, así que se
 * puede correr las veces que haga falta.
 *
 *   npx tsx prisma/sembrar-luciana.ts
 */
import { PrismaClient } from '@prisma/client';
import { materializarColaborador } from '../src/utils/materializarDias';

const prisma = new PrismaClient();
const CEDULA = 'QA-LUCIANA';
const medianoche = (s: string) => new Date(`${s}T05:00:00.000Z`);
const instante = (f: string, hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(medianoche(f).getTime() + (h * 60 + m) * 60000);
};

const MARCACIONES: [string,string,string][] = [
  ['2026-07-11', '08:00', '13:00'],
  ['2026-07-14', '07:53', '17:42'],
  ['2026-07-15', '07:53', '17:07'],
  ['2026-07-16', '07:56', '17:06'],
  ['2026-07-17', '06:52', '15:00'],
  ['2026-07-18', '07:51', '12:09'],
  ['2026-07-21', '07:00', '16:00'],
  ['2026-07-22', '06:54', '16:05'],
  ['2026-07-23', '06:44', '16:00'],
  ['2026-07-24', '06:54', '15:09'],
  ['2026-07-25', '08:00', '12:09'],
  ['2026-07-27', '06:52', '16:04'],
  ['2026-07-28', '06:51', '16:03'],
  ['2026-07-29', '06:43', '16:10'],
  ['2026-07-30', '17:55', '19:22'],
  ['2026-07-30', '06:53', '16:36'],
  ['2026-07-31', '06:52', '15:08'],
  ['2026-08-01', '07:57', '12:00'],
  ['2026-08-03', '06:55', '16:00'],
  ['2026-08-04', '06:49', '16:04'],
  ['2026-08-05', '06:51', '16:04'],
  ['2026-08-06', '06:38', '16:04'],
  ['2026-08-08', '07:52', '12:03'],
  ['2026-08-10', '06:52', '16:07'],
  ['2026-08-11', '06:53', '16:03'],
  ['2026-08-12', '06:54', '16:05'],
  ['2026-08-13', '06:57', '16:06'],
  ['2026-08-14', '06:52', '15:05'],
];
// 28 marcaciones

// El horario que Luciana tenía DURANTE el período, tal cual producción.
const FRANJAS_ORIGINALES = [
  { dias: ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES'], horaEntrada: '07:00', horaSalida: '16:00', tieneAlmuerzo: false },
  { dias: ['VIERNES'], horaEntrada: '07:00', horaSalida: '15:00', tieneAlmuerzo: false },
  { dias: ['SABADO'], horaEntrada: '08:00', horaSalida: '12:00', tieneAlmuerzo: false },
];

async function main() {
  const empresa = await prisma.empresa.findFirst({ where: { nombre: { contains: 'MSM' } } });
  if (!empresa) throw new Error('No está Grupo MSM en la base local.');

  // Modo HORARIO: sin esto el horario ni se mira para clasificar extras.
  await prisma.configuracion.upsert({
    where: { empresaId_clave: { empresaId: empresa.id, clave: 'HORAS_EXTRA_MODO' } },
    update: { valor: 'HORARIO' },
    create: { empresaId: empresa.id, clave: 'HORAS_EXTRA_MODO', valor: 'HORARIO' },
  });

  const viejo = await prisma.colaborador.findFirst({ where: { cedula: CEDULA } });
  if (viejo) {
    await prisma.registro.deleteMany({ where: { colaboradorId: viejo.id } });
    await prisma.diaEsperado.deleteMany({ where: { colaboradorId: viejo.id } });
    await prisma.colaborador.delete({ where: { id: viejo.id } });
  }
  await prisma.horario.deleteMany({ where: { empresaId: empresa.id, nombre: 'QA Oficina' } });

  const horario = await prisma.horario.create({
    data: {
      empresaId: empresa.id, nombre: 'QA Oficina', activo: true,
      toleranciaMin: 3, almuerzoMin: 0, toleranciaSalidaMin: 0, ajustaEntrada: false,
      franjas: { create: FRANJAS_ORIGINALES as any },
    },
  });

  const col = await prisma.colaborador.create({
    data: {
      empresaId: empresa.id, nombre: 'Luciana', apellido: 'Prueba', cedula: CEDULA,
      salarioMensual: 2000000, horarioId: horario.id, activo: true,
    },
  });

  // 1) Congelar los días CON EL HORARIO ORIGINAL, como pasó en la realidad.
  await materializarColaborador(col.id, medianoche('2026-07-01'), medianoche('2026-08-15'));

  // 2) Y solo entonces, sus marcaciones.
  for (const [f, e, s] of MARCACIONES) {
    await prisma.registro.create({
      data: { colaboradorId: col.id, fecha: medianoche(f), entrada: instante(f, e), salida: instante(f, s), tipo: 'NORMAL' },
    });
  }

  const dias = await prisma.diaEsperado.count({ where: { colaboradorId: col.id } });
  console.log(`\n  ${col.nombre} ${col.apellido} · ${empresa.nombre} · modo HORARIO`);
  console.log(`  horario "QA Oficina": L-J 07:00-16:00 · V 07:00-15:00 · S 08:00-12:00`);
  console.log(`  ${MARCACIONES.length} marcaciones · ${dias} días congelados con el horario ORIGINAL`);
  console.log(`  id: ${col.id}\n`);
}

main().catch(e => console.error('\nFalló:', e, '\n')).finally(() => prisma.$disconnect());
