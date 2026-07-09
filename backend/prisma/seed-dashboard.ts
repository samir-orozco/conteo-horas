// Datos para el dashboard de la empresa: arma la "foto del día de hoy"
// relativa a la hora actual, para que el panel se vea vivo al probarlo.
// Ejecutar: npx ts-node prisma/seed-dashboard.ts
import { PrismaClient } from '@prisma/client';
import { toZonedTime } from 'date-fns-tz';

const prisma = new PrismaClient();
const TZ = 'America/Bogota';
const DIAS = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];

const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

async function main() {
  const empresa = await prisma.empresa.findUnique({ where: { nit: '900123456-7' } });
  if (!empresa) throw new Error('Empresa demo no encontrada. Corre primero el seed principal.');

  const cols = await prisma.colaborador.findMany({ where: { empresaId: empresa.id } });
  const carlos = cols.find(c => c.cedula === '1020304050')!;
  const maria = cols.find(c => c.cedula === '1030405060')!;
  const julian = cols.find(c => c.cedula === '1040506070')!;

  const bog = toZonedTime(new Date(), TZ);
  const diaHoy = DIAS[bog.getDay()];
  const minAhora = bog.getHours() * 60 + bog.getMinutes(); // minutos transcurridos hoy
  const inicioDiaUtc = new Date(Date.UTC(bog.getFullYear(), bog.getMonth(), bog.getDate(), 5, 0, 0)); // 00:00 Bogotá
  const finDiaUtc = new Date(inicioDiaUtc.getTime() + 24 * 60 * 60 * 1000);
  // Instante UTC del minuto M del día de hoy en Bogotá
  const enMinuto = (m: number) => new Date(inicioDiaUtc.getTime() + m * 60 * 1000);

  if (minAhora < 20) {
    console.log('Es muy temprano (Bogotá); el dashboard del día se ve mejor pasada la primera hora.');
  }

  // Horario "Jornada demo": entrada programada hace ~90 min (o al inicio del día si es temprano)
  const entradaProgMin = Math.max(1, minAhora - 90);
  const salidaMin = Math.min(1439, minAhora + 360);
  const datosHorario = { nombre: 'Jornada demo', horaEntrada: hhmm(entradaProgMin), horaSalida: hhmm(salidaMin), dias: [diaHoy], toleranciaMin: 10 };
  let horarioDemo = await prisma.horario.findFirst({ where: { empresaId: empresa.id, nombre: 'Jornada demo' } });
  if (horarioDemo) horarioDemo = await prisma.horario.update({ where: { id: horarioDemo.id }, data: datosHorario });
  else horarioDemo = await prisma.horario.create({ data: { ...datosHorario, empresaId: empresa.id } });

  await prisma.colaborador.update({ where: { id: maria.id }, data: { horarioId: horarioDemo.id } });
  await prisma.colaborador.update({ where: { id: julian.id }, data: { horarioId: horarioDemo.id } });

  // Cumpleaños: uno hoy (para ver "¡Hoy!") y otros dos este mes
  const mm = String(bog.getMonth() + 1).padStart(2, '0');
  const dd = String(bog.getDate()).padStart(2, '0');
  await prisma.colaborador.update({ where: { id: maria.id }, data: { fechaNacimiento: new Date(`1990-${mm}-${dd}T12:00:00Z`) } });
  await prisma.colaborador.update({ where: { id: carlos.id }, data: { fechaNacimiento: new Date(`1988-${mm}-22T12:00:00Z`) } });
  await prisma.colaborador.update({ where: { id: julian.id }, data: { fechaNacimiento: new Date(`1992-${mm}-03T12:00:00Z`) } });

  // Limpiar registros de hoy
  await prisma.registro.deleteMany({
    where: { colaboradorId: { in: cols.map(c => c.id) }, fecha: { gte: inicioDiaUtc, lt: finDiaUtc } },
  });

  // María → EN PLANTA + LLEGÓ TARDE: entró 25 min después de lo programado
  const mariaEntradaMin = Math.min(minAhora - 1, entradaProgMin + 25);
  await prisma.registro.create({
    data: { colaboradorId: maria.id, fecha: inicioDiaUtc, entrada: enMinuto(mariaEntradaMin), tipo: 'NORMAL' },
  });

  // Carlos → EN PLANTA a tiempo (entró justo a la hora programada)
  const carlosEntradaMin = Math.max(1, Math.min(minAhora - 1, entradaProgMin));
  await prisma.registro.create({
    data: { colaboradorId: carlos.id, fecha: inicioDiaUtc, entrada: enMinuto(carlosEntradaMin), tipo: 'NORMAL' },
  });

  // Julián → SIN MARCAR: tiene el horario demo pero no ha entrado hoy.

  // Novedad activa hoy: incapacidad de una colaboradora
  let sofia = await prisma.colaborador.findFirst({ where: { empresaId: empresa.id, cedula: '1050607080' } });
  if (!sofia) {
    sofia = await prisma.colaborador.create({
      data: { empresaId: empresa.id, nombre: 'Sofía', apellido: 'Ramos', cedula: '1050607080', cargo: 'Recepcionista', salarioMensual: 1600000 },
    });
  }
  await prisma.permiso.deleteMany({ where: { colaboradorId: sofia.id } });
  await prisma.permiso.create({
    data: {
      colaboradorId: sofia.id, tipo: 'INCAPACIDAD_EPS',
      fechaInicio: inicioDiaUtc, fechaFin: new Date(inicioDiaUtc.getTime() + 2 * 24 * 60 * 60 * 1000),
      descripcion: 'Incapacidad 3 días', aprobado: true,
    },
  });

  console.log('Dashboard demo sembrado ✓');
  console.log(`  Hoy ${diaHoy} · horario demo entra ${hhmm(entradaProgMin)}`);
  console.log('  María: en planta + tarde · Carlos: en planta · Julián: sin marcar · Sofía: incapacidad · Julián(ayer): turno olvidado');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
