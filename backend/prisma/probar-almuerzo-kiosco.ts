// Prepara y comprueba el flujo de almuerzo del kiosco contra la base local.
//
// Sin argumentos: imprime el estado (quién tiene ventana congelada hoy).
// Con `--preparar`: pone ventana 12:00-13:00 en el horario del primer
// colaborador activo y REGENERA el día de hoy, que es lo único que permite
// probarlo el mismo día. En producción la ventana solo aplica desde mañana, a
// propósito: el día en curso ya se congeló sin ella.
import { prisma } from '../src/prisma';
import { materializarColaborador } from '../src/utils/materializarDias';
import { rangoDiaBogota } from '../src/utils/fechas';

async function main() {
  const preparar = process.argv.includes('--preparar');
  const { inicioDia, finDia } = rangoDiaBogota();

  const col = await prisma.colaborador.findFirst({
    where: { activo: true, horarioId: { not: null } },
    include: { horario: { include: { franjas: true } } },
  });
  if (!col) { console.log('No hay colaboradores con horario.'); return; }

  console.log(`Colaborador: ${col.nombre} ${col.apellido} · horario "${col.horario!.nombre}"`);

  if (preparar) {
    await prisma.franjaHorario.updateMany({
      where: { horarioId: col.horarioId!, tieneAlmuerzo: true },
      data: { almuerzoInicio: '12:00', almuerzoFin: '13:00' },
    });
    const n = await materializarColaborador(col.id, inicioDia, finDia, { pisarExistentes: true });
    console.log(`Ventana 12:00-13:00 puesta en las franjas. Días de hoy regenerados: ${n}`);
  }

  const dia = await prisma.diaEsperado.findFirst({
    where: { colaboradorId: col.id, fecha: { gte: inicioDia, lt: finDia } },
    select: { programado: true, horaEntrada: true, horaSalida: true, almuerzoMin: true, almuerzoInicio: true, almuerzoFin: true, minutosEsperados: true },
  });
  console.log('Día congelado de hoy:', dia ?? '(sin fila)');

  const registros = await prisma.registro.findMany({
    where: { colaboradorId: col.id, fecha: { gte: inicioDia, lt: finDia } },
    orderBy: { entrada: 'asc' },
    select: { entrada: true, salida: true, salidaAlmuerzo: true, entradaEstimada: true },
  });
  console.log('Registros de hoy:', registros.length === 0 ? '(ninguno)' : '');
  const hhmm = (d: Date | null) => d ? d.toISOString().slice(11, 16) + 'Z' : '—';
  for (const r of registros) {
    console.log(`  ${hhmm(r.entrada)} → ${hhmm(r.salida)}  almuerzo=${r.salidaAlmuerzo}  entradaEstimada=${r.entradaEstimada}`);
  }
}

main().finally(() => prisma.$disconnect());
