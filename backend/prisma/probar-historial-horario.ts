import { prisma } from '../src/prisma';
import { calcularHorasEsperadas, parsearPoliticaPermisos, CLAVE_PERMISOS_REMUNERADOS } from '../src/utils/saldoTiempo';
import { combinarDiasEsperados } from '../src/utils/diasEsperados';
import { jornadaVigente } from '../src/utils/vigencias';
import { rangoReporte } from '../src/utils/fechas';

// El escenario que reportó el dueño: cambió la entrada de 08:00 a 07:00 y los
// reportes de meses ANTERIORES empezaron a mostrar deuda que nadie había hecho.
//
// Aquí se reproduce contra la base local: se adelanta la entrada una hora, se
// recalcula julio 2026 leyendo los días materializados, y se compara con lo que
// daría recorriendo el horario vigente (que es lo que el sistema hacía antes).
// El horario se restaura siempre, pase lo que pase.

const fmt = (m: number) => `${Math.trunc(m / 60)}h${String(m % 60).padStart(2, '0')}`;

async function main() {
  const { desdeF, finExclusivo } = rangoReporte('2026-07-01', '2026-07-31');

  const colaborador = await prisma.colaborador.findFirst({
    where: { nombre: 'Santiago', apellido: 'Soto García' },
    include: { horario: { include: { franjas: true } } },
  });
  if (!colaborador?.horario) throw new Error('colaborador u horario no encontrado');

  const semana = colaborador.horario.franjas.find(f => (f.dias as string[]).includes('LUNES'));
  if (!semana) throw new Error('franja de lunes a viernes no encontrada');
  const entradaOriginal = semana.horaEntrada;

  const [festivos, jornadas, cfgPermisos, permisos, materializados] = await Promise.all([
    prisma.diaFestivo.findMany({ where: { OR: [{ empresaId: null }, { empresaId: colaborador.empresaId }] } }),
    prisma.jornadaVigencia.findMany(),
    prisma.configuracion.findUnique({ where: { empresaId_clave: { empresaId: colaborador.empresaId, clave: CLAVE_PERMISOS_REMUNERADOS } } }),
    prisma.permiso.findMany({ where: { colaboradorId: colaborador.id, aprobado: true, fechaInicio: { lt: finExclusivo }, fechaFin: { gte: desdeF } }, select: { fechaInicio: true, fechaFin: true, tipo: true } }),
    prisma.diaEsperado.findMany({
      where: { colaboradorId: colaborador.id, fecha: { gte: desdeF, lt: finExclusivo } },
      select: { fecha: true, programado: true, horaEntrada: true, horaSalida: true, toleranciaMin: true, almuerzoMin: true, minutosEsperados: true },
      orderBy: { fecha: 'asc' },
    }),
  ]);

  const festivosDates = festivos.map(f => new Date(f.fecha));
  const politica = parsearPoliticaPermisos(cfgPermisos?.valor);
  const calcular = (dias: any[]) => calcularHorasEsperadas(
    desdeF, finExclusivo, dias, festivosDates, permisos as any, politica, (f) => jornadaVigente(f, jornadas),
  ).minutosEsperados;

  const recargarHorario = async () => {
    const c = await prisma.colaborador.findUnique({
      where: { id: colaborador.id },
      include: { horario: { include: { franjas: true } } },
    });
    return c!.horario as any;
  };

  const antes = calcular(combinarDiasEsperados(desdeF, finExclusivo, materializados, await recargarHorario()));
  console.log(`Entrada actual del horario: ${entradaOriginal}`);
  console.log(`Julio 2026 exige: ${fmt(antes)}\n`);

  try {
    await prisma.franjaHorario.update({ where: { id: semana.id }, data: { horaEntrada: '07:00' } });
    console.log('--- El admin adelanta la entrada a 07:00 ---\n');
    const horarioNuevo = await recargarHorario();

    const conHistorial = calcular(combinarDiasEsperados(desdeF, finExclusivo, materializados, horarioNuevo));
    const sinHistorial = calcular(combinarDiasEsperados(desdeF, finExclusivo, [], horarioNuevo));

    console.log(`Leyendo los días materializados : ${fmt(conHistorial)}   ${conHistorial === antes ? '✓ julio NO se movió' : '✗ SE MOVIÓ'}`);
    console.log(`Recorriendo el horario vigente  : ${fmt(sinHistorial)}   (así se comportaba antes: +${fmt(sinHistorial - antes)} de deuda inventada)`);
  } finally {
    await prisma.franjaHorario.update({ where: { id: semana.id }, data: { horaEntrada: entradaOriginal } });
    const restaurada = await prisma.franjaHorario.findUnique({ where: { id: semana.id } });
    console.log(`\nHorario restaurado a ${restaurada?.horaEntrada}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
