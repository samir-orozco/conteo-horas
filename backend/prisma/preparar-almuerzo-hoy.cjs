/**
 * Adelanta a HOY la ventana de almuerzo de UNA persona, para poder grabar la
 * demostración sin esperar a mañana.
 *
 * QUÉ HACE Y POR QUÉ NORMALMENTE NO SE HACE
 *
 * El sistema congela cada día con lo que el horario exigía ESE día, y nunca
 * reescribe el pasado ni el día en curso: es lo que impide que cambiar un
 * horario mueva liquidaciones ya entregadas. Este script rompe esa regla a
 * propósito y de forma acotada — una sola cédula, un solo día, el de hoy — para
 * que la persona que va a salir en el video pueda marcar su almuerzo ya.
 *
 * Si ese colaborador ya tiene horas trabajadas hoy, lo que el día le exige puede
 * cambiar (por ejemplo, si la ventana dura distinto que los minutos fijos que
 * tenía). Por eso conviene usarlo con alguien de prueba, no con un trabajador
 * real en medio de su jornada. El script imprime el antes y el después para que
 * se vea exactamente qué cambió.
 *
 * No hace falta deshacerlo: mañana el día siguiente ya nace con la ventana por
 * su cuenta, y este día queda como cualquier otro.
 *
 * [EN EL SERVIDOR]
 *   source ~/nodevenv/horapro-co-api/22/bin/activate
 *   cp ~/horapro-repo/deploy-backend/preparar-almuerzo-hoy.cjs ~/horapro-co-api/
 *   cd ~/horapro-co-api && set -a && . ./.env && set +a && node preparar-almuerzo-hoy.cjs 1036786399
 */
const { PrismaClient } = require('@prisma/client');
// Se reutiliza el código YA COMPILADO del backend en vez de reimplementarlo: si
// la regla de cómo se arma un día cambia, este script cambia con ella.
const { materializarColaborador } = require('./dist/utils/materializarDias');
const { rangoDiaBogota } = require('./dist/utils/fechas');

const prisma = new PrismaClient();

const mostrar = (d) => {
  if (!d) return '(sin fila para hoy)';
  if (!d.programado) return 'hoy no trabaja según su horario';
  const v = d.almuerzoInicio && d.almuerzoFin ? `${d.almuerzoInicio}–${d.almuerzoFin}` : 'SIN VENTANA';
  return `${d.horaEntrada}-${d.horaSalida} · almuerzo ${v} (${d.almuerzoMin} min) · pide ${d.minutosEsperados} min`;
};

async function main() {
  const cedula = process.argv[2];
  if (!cedula) {
    console.log('\nFalta la cédula. Uso:\n  node preparar-almuerzo-hoy.cjs 1036786399\n');
    return;
  }

  const col = await prisma.colaborador.findFirst({
    where: { cedula, activo: true },
    include: { empresa: { select: { nombre: true } }, horario: { include: { franjas: true } } },
  });
  if (!col) { console.log(`\nNo hay ningún colaborador activo con cédula ${cedula}.\n`); return; }
  if (!col.horario) { console.log(`\n${col.nombre} no tiene horario asignado.\n`); return; }

  const conVentana = col.horario.franjas.filter(f => f.almuerzoInicio && f.almuerzoFin);
  console.log(`\n${col.empresa.nombre} · ${col.nombre} ${col.apellido} · horario "${col.horario.nombre}"`);
  if (conVentana.length === 0) {
    console.log('\n  Su horario NO tiene horario de almuerzo configurado, así que no hay nada');
    console.log('  que adelantar. Ve a Configuración → Horario y elige "Que marquen su');
    console.log('  almuerzo" antes de correr esto.\n');
    return;
  }
  console.log('  Franjas con almuerzo: ' + conVentana.map(f => `${f.horaEntrada}-${f.horaSalida} → ${f.almuerzoInicio}–${f.almuerzoFin}`).join(' · '));

  const { inicioDia, finDia } = rangoDiaBogota();
  const antes = await prisma.diaEsperado.findFirst({
    where: { colaboradorId: col.id, fecha: { gte: inicioDia, lt: finDia } },
  });
  console.log(`\n  ANTES   ${mostrar(antes)}`);

  await materializarColaborador(col.id, inicioDia, finDia, { pisarExistentes: true });

  const despues = await prisma.diaEsperado.findFirst({
    where: { colaboradorId: col.id, fecha: { gte: inicioDia, lt: finDia } },
  });
  console.log(`  DESPUÉS ${mostrar(despues)}`);

  const listo = !!(despues && despues.almuerzoInicio && despues.almuerzoFin);
  console.log(listo
    ? `\n  ✓ Listo. ${col.nombre} ya puede marcar su almuerzo en el kiosco hoy.\n`
    : '\n  ✗ El día sigue sin ventana. Revisa que la franja de HOY (ese día de la semana)\n    tenga horario de almuerzo y que descuente almuerzo.\n');

  if (antes && despues && antes.minutosEsperados !== despues.minutosEsperados) {
    console.log(`  Ojo: lo que el día le exige pasó de ${antes.minutosEsperados} a ${despues.minutosEsperados} minutos.\n`);
  }
}

main()
  .catch(e => console.error('Falló:', e.message))
  .finally(() => prisma.$disconnect());
