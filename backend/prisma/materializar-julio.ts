import { prisma } from '../src/prisma';
import { materializarColaborador } from '../src/utils/materializarDias';
import { rangoReporte } from '../src/utils/fechas';

// Siembra los días esperados de julio 2026 de Santiago Soto García, el escenario
// que se verificó a mano (seed-julio-saldo.ts). No es una prueba automatizada:
// deja las filas en la base para que `verificar-saldo.ts` lea de la tabla y se
// pueda cotejar que los números no se movieron ni un minuto.
//
// Es idempotente: `materializarColaborador` no pisa lo que ya existe salvo que
// se le pida, y nunca toca un día marcado como MANUAL.

async function main() {
  const { desdeF, finExclusivo } = rangoReporte('2026-07-01', '2026-07-31');

  const colaborador = await prisma.colaborador.findFirst({
    where: { nombre: 'Santiago', apellido: 'Soto García' },
    include: { horario: { include: { franjas: true } } },
  });
  if (!colaborador) throw new Error('colaborador no encontrado');

  const horario = colaborador.horario;
  console.log(`Colaborador: ${colaborador.nombre} ${colaborador.apellido}`);
  console.log(`Horario: ${horario ? `${horario.nombre} (activo=${horario.activo}, tolerancia=${horario.toleranciaMin}, almuerzo=${horario.almuerzoMin})` : 'ninguno'}`);
  horario?.franjas.forEach(f => console.log(`   ${(f.dias as string[]).join(',')} → ${f.horaEntrada}-${f.horaSalida} almuerzo=${f.tieneAlmuerzo}`));

  const escritos = await materializarColaborador(colaborador.id, desdeF, finExclusivo);
  console.log(`\nDías escritos: ${escritos}`);

  const filas = await prisma.diaEsperado.findMany({
    where: { colaboradorId: colaborador.id, fecha: { gte: desdeF, lt: finExclusivo } },
    orderBy: { fecha: 'asc' },
  });
  const totalMin = filas.reduce((s, f) => s + f.minutosEsperados, 0);
  console.log(`Filas en el rango: ${filas.length} · programados: ${filas.filter(f => f.programado).length} · suma bruta: ${Math.trunc(totalMin / 60)}h${String(totalMin % 60).padStart(2, '0')}`);
  console.log('(bruta = sin festivos, sin tope semanal legal y sin permisos; todo eso se aplica al leer)\n');
  for (const f of filas) {
    console.log(`   ${f.fecha.toISOString().slice(0, 10)}  ${f.programado ? `${f.horaEntrada}-${f.horaSalida}` : 'no programado'}  ${String(f.minutosEsperados).padStart(3)} min  [${f.origen}]`);
  }
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
