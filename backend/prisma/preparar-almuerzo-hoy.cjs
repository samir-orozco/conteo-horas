/**
 * Adelanta a HOY la ventana de almuerzo de UNA persona, para poder grabar la
 * demostración sin esperar a mañana. Y si no puede, dice exactamente por qué.
 *
 * QUÉ HACE Y POR QUÉ NORMALMENTE NO SE HACE
 *
 * El sistema congela cada día con lo que el horario exigía ESE día, y nunca
 * reescribe el pasado ni el día en curso: es lo que impide que cambiar un
 * horario mueva liquidaciones ya entregadas. Este script rompe esa regla a
 * propósito y de forma acotada — una cédula, un día, el de hoy.
 *
 * Termina diciendo lo que el KIOSCO va a ver, que es la única prueba que
 * importa: que el día tenga ventana no basta si esa persona ya marcó su
 * almuerzo, o si hoy no trabaja.
 *
 * [EN EL SERVIDOR]
 *   source ~/nodevenv/horapro-co-api/22/bin/activate
 *   cp ~/horapro-repo/deploy-backend/preparar-almuerzo-hoy.cjs ~/horapro-co-api/
 *   cd ~/horapro-co-api && set -a && . ./.env && set +a && node preparar-almuerzo-hoy.cjs 123123123123
 *
 * Sin cédula, lista las que hay.
 */
const { PrismaClient } = require('@prisma/client');
const { materializarColaborador } = require('./dist/utils/materializarDias');
const { rangoDiaBogota } = require('./dist/utils/fechas');

const prisma = new PrismaClient();
const DIAS = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
const VENTANA_TURNO_MS = 18 * 60 * 60 * 1000;

const mostrar = (d) => {
  if (!d) return '(sin fila para hoy)';
  if (!d.programado) return 'hoy NO trabaja según su horario';
  const v = d.almuerzoInicio && d.almuerzoFin ? `${d.almuerzoInicio}–${d.almuerzoFin}` : 'SIN VENTANA';
  return `${d.horaEntrada}-${d.horaSalida} · almuerzo ${v} (${d.almuerzoMin} min) · pide ${d.minutosEsperados} min`;
};

async function listar() {
  const cols = await prisma.colaborador.findMany({
    where: { activo: true },
    include: { empresa: { select: { nombre: true } }, horario: { select: { nombre: true } } },
    orderBy: [{ empresaId: 'asc' }, { nombre: 'asc' }],
  });
  console.log('\nColaboradores activos y sus cédulas:\n');
  for (const c of cols) {
    console.log(`  ${String(c.cedula).padEnd(16)} ${c.nombre} ${c.apellido}  ·  ${c.empresa.nombre}  ·  ${c.horario?.nombre ?? 'SIN HORARIO'}`);
  }
  console.log('');
}

async function main() {
  const arg = (process.argv[2] || '').trim();
  if (!arg) { await listar(); return; }

  // Se busca exacta y, si no aparece, sin espacios ni puntos: una cédula
  // copiada de una pantalla suele traer basura invisible.
  let col = await prisma.colaborador.findFirst({
    where: { cedula: arg, activo: true },
    include: { empresa: { select: { nombre: true } }, horario: { include: { franjas: true } } },
  });
  if (!col) {
    const limpia = arg.replace(/[\s.\-]/g, '');
    const todos = await prisma.colaborador.findMany({
      where: { activo: true },
      include: { empresa: { select: { nombre: true } }, horario: { include: { franjas: true } } },
    });
    col = todos.find(c => String(c.cedula).replace(/[\s.\-]/g, '') === limpia) || null;
    if (col) console.log(`\n(La cédula guardada es "${col.cedula}"; se encontró igualando sin espacios ni puntos.)`);
  }

  if (!col) {
    const inactivo = await prisma.colaborador.findFirst({ where: { cedula: arg }, select: { nombre: true, apellido: true } });
    console.log(inactivo
      ? `\n"${arg}" es ${inactivo.nombre} ${inactivo.apellido}, pero está INACTIVO. Actívalo primero.`
      : `\nNo hay ningún colaborador con cédula "${arg}".`);
    await listar();
    return;
  }

  console.log(`\n${col.empresa.nombre} · ${col.nombre} ${col.apellido}`);
  if (!col.horario) { console.log('\n  No tiene horario asignado. Asígnale uno desde su perfil.\n'); return; }
  console.log(`Horario "${col.horario.nombre}"`);

  // La franja que aplica HOY, que es la que decide. Un horario puede tener la
  // ventana en lunes-viernes y hoy ser sábado.
  const { inicioDia, finDia } = rangoDiaBogota();
  const diaSemana = DIAS[new Date(inicioDia.getTime() + 12 * 3600e3 - 5 * 3600e3).getUTCDay()];
  const franjaHoy = col.horario.franjas.find(f => (f.dias || []).includes(diaSemana));

  console.log(`\nHoy es ${diaSemana}.`);
  if (!franjaHoy) {
    console.log('  Su horario NO tiene franja para hoy: hoy no trabaja, así que el kiosco');
    console.log('  no le va a preguntar nada. Para el video, usa un día que sí trabaje.\n');
    return;
  }
  console.log(`  Franja de hoy: ${franjaHoy.horaEntrada}-${franjaHoy.horaSalida}`);
  console.log(`  ¿Descuenta almuerzo?: ${franjaHoy.tieneAlmuerzo ? 'sí' : 'NO'}`);
  console.log(`  Horario de almuerzo: ${franjaHoy.almuerzoInicio && franjaHoy.almuerzoFin ? `${franjaHoy.almuerzoInicio}–${franjaHoy.almuerzoFin}` : 'NO CONFIGURADO'}`);

  if (!franjaHoy.tieneAlmuerzo) {
    console.log('\n  Esa franja NO descuenta almuerzo, así que no hay almuerzo que marcar.');
    console.log('  En Configuración → Horario, marca "Descontar almuerzo en estos días".\n');
    return;
  }
  if (!franjaHoy.almuerzoInicio || !franjaHoy.almuerzoFin) {
    console.log('\n  Falta el horario de almuerzo en la franja de HOY.');
    console.log('  En Configuración → Horario elige "Que marquen su almuerzo" y guarda.');
    console.log('  Ojo: la opción se pone por franja, así que revisa la de este día.\n');
    return;
  }

  const antes = await prisma.diaEsperado.findFirst({ where: { colaboradorId: col.id, fecha: { gte: inicioDia, lt: finDia } } });
  console.log(`\n  ANTES   ${mostrar(antes)}`);
  await materializarColaborador(col.id, inicioDia, finDia, { pisarExistentes: true });
  const despues = await prisma.diaEsperado.findFirst({ where: { colaboradorId: col.id, fecha: { gte: inicioDia, lt: finDia } } });
  console.log(`  DESPUÉS ${mostrar(despues)}`);

  if (antes && despues && antes.minutosEsperados !== despues.minutosEsperados) {
    console.log(`\n  Ojo: lo que el día le exige pasó de ${antes.minutosEsperados} a ${despues.minutosEsperados} minutos.`);
  }
  if (antes && antes.origen === 'MANUAL') {
    console.log('\n  Ese día estaba marcado como ajustado A MANO, así que no se pisa. Bórralo o');
    console.log('  cámbialo desde la aplicación si de verdad quieres regenerarlo.');
  }

  // La prueba que importa: lo mismo que responde /worker/estado.
  const yaAlmorzo = await prisma.registro.count({
    where: { colaboradorId: col.id, salidaAlmuerzo: true, salida: { gte: new Date(Date.now() - VENTANA_TURNO_MS) } },
  });
  const tieneVentana = !!(despues && despues.almuerzoInicio && despues.almuerzoFin);

  console.log('\n─── LO QUE VA A VER EL KIOSCO ───');
  if (tieneVentana && yaAlmorzo === 0) {
    console.log(`  ✓ Al marcar salida le va a preguntar: "Salgo a almorzar" / "Termino mi jornada".`);
    console.log(`    (Su almuerzo es de ${despues.almuerzoInicio} a ${despues.almuerzoFin}.)\n`);
  } else if (!tieneVentana) {
    console.log('  ✗ El día sigue sin ventana. Con la franja bien configurada esto no debería');
    console.log('    pasar: mándame las líneas de arriba.\n');
  } else {
    console.log('  · Ya marcó su almuerzo en las últimas horas, así que el kiosco no va a');
    console.log('    volver a preguntarle hoy. Para repetir la demo, borra esa marcación');
    console.log('    desde Registros.\n');
  }
}

main()
  .catch(e => console.error('\nFalló:', e.message, '\n'))
  .finally(() => prisma.$disconnect());
