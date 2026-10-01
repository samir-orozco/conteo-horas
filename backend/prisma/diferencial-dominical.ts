// FOTO DE LA LIQUIDACIÓN de todos los colaboradores en varios rangos, para la comprobación
// diferencial del CLAUDE.md §5.3: se corre antes y después de un cambio y se comparan con `diff`.
//
// NO USAR `foto-reportes.ts` PARA ESTO: esa foto mira esperadas, permisos y tardanzas, y no imprime
// un solo código de la liquidación. Un cambio en el recargo dominical no la mueve, así que saldría
// «sin diferencias» y no probaría nada (§12.2: un vacío no es un resultado negativo).
//
// Arma los datos igual que `routes/reportes.ts` en su vista de empresa, incluido `esDescanso` en el
// select de los días, que es por donde viaja la programación hasta el motor.
import { prisma } from '../src/prisma';
import { liquidarRegistros } from '../src/utils/liquidarRegistros';
import { combinarDiasEsperados } from '../src/utils/diasEsperados';
import { calcularTardanzas, HorarioConFranjas, construirExtraConfig } from '../src/utils/tardanzas';
import { jornadaVigente, horasMesDeJornada } from '../src/utils/vigencias';
import { fuenteDelDescansoDe } from '../src/utils/descansoDelHorario';
import { rangoReporte } from '../src/utils/fechas';

const RANGOS: [string, string][] = [
  ['2026-06-01', '2026-06-30'],
  ['2026-07-01', '2026-07-31'],
  ['2026-08-01', '2026-08-31'],
  ['2026-09-01', '2026-09-30'],
];

async function main() {
  const colaboradores = await prisma.colaborador.findMany({
    include: { horario: { include: { franjas: true } } },
    orderBy: [{ nombre: 'asc' }, { apellido: 'asc' }],
  });
  const [tiposHoraTodos, jornadas] = await Promise.all([
    prisma.tipoHora.findMany(), prisma.jornadaVigencia.findMany(),
  ]);

  for (const col of colaboradores) {
    const horario = (col as any).horario as HorarioConFranjas | null;
    for (const [desde, hasta] of RANGOS) {
      const { desdeF, hastaF, finExclusivo } = rangoReporte(desde, hasta);
      const [festivos, cfgModo, materializados, registros] = await Promise.all([
        prisma.diaFestivo.findMany({ where: { OR: [{ empresaId: null }, { empresaId: col.empresaId }] } }),
        prisma.configuracion.findUnique({ where: { empresaId_clave: { empresaId: col.empresaId, clave: 'HORAS_EXTRA_MODO' } } }),
        prisma.diaEsperado.findMany({
          where: { colaboradorId: col.id, fecha: { gte: desdeF, lt: finExclusivo } },
          select: {
            fecha: true, programado: true, horaEntrada: true, horaSalida: true, toleranciaMin: true,
            almuerzoMin: true, minutosEsperados: true, toleranciaSalidaMin: true, ajustaEntrada: true,
            almuerzoInicio: true, almuerzoFin: true, descansos: true, esDescanso: true,
          },
          orderBy: { fecha: 'asc' },
        }),
        prisma.registro.findMany({ where: { colaboradorId: col.id, fecha: { gte: desdeF, lt: finExclusivo } } }),
      ]);
      if (registros.length === 0) continue;

      const dias = combinarDiasEsperados(desdeF, finExclusivo, materializados, horario);
      const festivosDates = festivos.map(f => new Date(f.fecha));
      const horasMes = horasMesDeJornada(jornadaVigente(hastaF, jornadas));
      const extraConfig = construirExtraConfig(
        cfgModo?.valor === 'HORARIO' ? 'HORARIO' : 'SEMANAL', horario, dias);
      const r: any = liquidarRegistros(
        registros as any, horario, extraConfig, festivosDates, tiposHoraTodos, jornadas,
        col.salarioMensual, horasMes, true, dias, fuenteDelDescansoDe((col as any).horario));

      const codigos = (r.liquidacion ?? [])
        .filter((f: any) => Number(f.horas) > 0)
        .map((f: any) => `${f.codigo}=${Number(f.horas).toFixed(2)}`)
        .sort().join(' ');
      console.log(
        `${(col.nombre + ' ' + col.apellido).padEnd(26)} ${desde}→${hasta}  ` +
        `rec=${Math.round(r.totalRecargos ?? 0)} ext=${Math.round(r.totalExtra ?? 0)} ` +
        `adi=${Math.round(r.totalAdicional ?? 0)} | ${codigos}`,
      );
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
