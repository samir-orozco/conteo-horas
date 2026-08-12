import { prisma } from '../src/prisma';
import { calcularHorasEsperadas, armarSaldo, parsearPoliticaPermisos, CLAVE_PERMISOS_REMUNERADOS } from '../src/utils/saldoTiempo';
import { calcularTardanzas } from '../src/utils/tardanzas';
import { combinarDiasEsperados } from '../src/utils/diasEsperados';
import { jornadaVigente, horasMesDeJornada } from '../src/utils/vigencias';
import { calcularValorHora } from '../src/utils/horasColombiana';
import { rangoReporte } from '../src/utils/fechas';

// Foto determinista de lo que dan los reportes para TODOS los colaboradores en
// varios rangos. Se corre antes y después de un cambio y se comparan las dos
// salidas con `diff`: si algo se movió, se ve.

const RANGOS: [string, string][] = [
  ['2026-06-01', '2026-06-30'],
  ['2026-07-01', '2026-07-31'],
  ['2026-08-01', '2026-08-31'],
  ['2026-07-13', '2026-07-19'],
];

async function main() {
  const colaboradores = await prisma.colaborador.findMany({
    include: { horario: { include: { franjas: true } } },
    orderBy: [{ nombre: 'asc' }, { apellido: 'asc' }],
  });
  const jornadas = await prisma.jornadaVigencia.findMany();

  for (const col of colaboradores) {
    const horario = col.horario as any;
    for (const [desde, hasta] of RANGOS) {
      const { desdeF, finExclusivo } = rangoReporte(desde, hasta);
      const [festivos, cfg, permisos, materializados, registros] = await Promise.all([
        prisma.diaFestivo.findMany({ where: { OR: [{ empresaId: null }, { empresaId: col.empresaId }] } }),
        prisma.configuracion.findUnique({ where: { empresaId_clave: { empresaId: col.empresaId, clave: CLAVE_PERMISOS_REMUNERADOS } } }),
        prisma.permiso.findMany({ where: { colaboradorId: col.id, aprobado: true, fechaInicio: { lt: finExclusivo }, fechaFin: { gte: desdeF } }, select: { fechaInicio: true, fechaFin: true, tipo: true } }),
        prisma.diaEsperado.findMany({
          where: { colaboradorId: col.id, fecha: { gte: desdeF, lt: finExclusivo } },
          select: { fecha: true, programado: true, horaEntrada: true, horaSalida: true, toleranciaMin: true, almuerzoMin: true, minutosEsperados: true, toleranciaSalidaMin: true, ajustaEntrada: true },
          orderBy: { fecha: 'asc' },
        }),
        prisma.registro.findMany({ where: { colaboradorId: col.id, fecha: { gte: desdeF, lt: finExclusivo } } }),
      ]);

      const dias = combinarDiasEsperados(desdeF, finExclusivo, materializados, horario);
      const festivosDates = festivos.map(f => new Date(f.fecha));
      const esp = calcularHorasEsperadas(
        desdeF, finExclusivo, dias, festivosDates, permisos as any,
        parsearPoliticaPermisos(cfg?.valor), (f) => jornadaVigente(f, jornadas),
      );
      const horasMes = horasMesDeJornada(jornadaVigente(new Date(hasta), jornadas));
      const saldo = armarSaldo(esp, 0, calcularValorHora(col.salarioMensual, horasMes), !horario || !horario.activo);
      const tard = calcularTardanzas(registros, dias, festivos, permisos as any);

      console.log(
        `${(col.nombre + ' ' + col.apellido).padEnd(24)} ${desde}→${hasta}  ` +
        `esp=${esp.minutosEsperados} rem=${esp.minutosPermisoRemunerado} nrem=${esp.minutosPermisoNoRemunerado} ` +
        `sinHorario=${saldo.sinHorario} tarde=${tard.diasTarde}/${tard.totalMinutos} tol=${tard.toleranciaMin}`,
      );
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
