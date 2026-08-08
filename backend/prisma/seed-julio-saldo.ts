import { PrismaClient } from '@prisma/client';

// Datos de prueba de JULIO 2026 para ver el "saldo de tiempo no remunerado".
//
// Es idempotente y ACOTADO: solo borra y vuelve a crear los registros y permisos
// de julio 2026 del colaborador objetivo. No toca a nadie más ni otros meses.
//
// Correr con:  npx ts-node prisma/seed-julio-saldo.ts

const prisma = new PrismaClient();

const CEDULA_OBJETIVO = null as string | null; // se resuelve por nombre si es null
const NOMBRE = 'Santiago';
const APELLIDO = 'Soto García';

// Medianoche Bogotá = 05:00 UTC. Es la misma convención que usa el kiosco al
// guardar `Registro.fecha`, y de la que dependen los filtros de los reportes.
const fechaDia = (dia: number) => new Date(Date.UTC(2026, 6, dia, 5, 0, 0));
const bog = (dia: number, hora: number, min = 0) => new Date(Date.UTC(2026, 6, dia, hora + 5, min, 0));

// Un día trabajado normal: entra y sale a la hora del horario.
const dia = (d: number, hIni: number, mIni: number, hFin: number, mFin: number) => ({
  fecha: fechaDia(d),
  entrada: bog(d, hIni, mIni),
  salida: bog(d, hFin, mFin),
  tipo: 'NORMAL' as const,
});

async function main() {
  const colaborador = CEDULA_OBJETIVO
    ? await prisma.colaborador.findFirst({ where: { cedula: CEDULA_OBJETIVO } })
    : await prisma.colaborador.findFirst({ where: { nombre: NOMBRE, apellido: APELLIDO } });
  if (!colaborador) throw new Error(`No encontré al colaborador ${NOMBRE} ${APELLIDO}`);

  const horario = colaborador.horarioId
    ? await prisma.horario.findUnique({ where: { id: colaborador.horarioId }, include: { franjas: true } })
    : null;
  if (!horario || !horario.activo) throw new Error('El colaborador no tiene un horario activo; sin horario no hay saldo que calcular.');

  console.log(`Colaborador: ${colaborador.nombre} ${colaborador.apellido} — salario ${colaborador.salarioMensual}`);
  console.log(`Horario "${horario.nombre}" (tolerancia ${horario.toleranciaMin} min, almuerzo ${horario.almuerzoMin} min)`);
  horario.franjas.forEach(f => console.log(`   ${JSON.stringify(f.dias)} ${f.horaEntrada}-${f.horaSalida}`));

  const desde = fechaDia(1);
  const finExclusivo = new Date(Date.UTC(2026, 7, 1, 5, 0, 0));

  // Limpieza acotada: solo julio 2026 de este colaborador, para poder re-ejecutar.
  const borrados = await prisma.registro.deleteMany({
    where: { colaboradorId: colaborador.id, fecha: { gte: desde, lt: finExclusivo } },
  });
  const borradosPermisos = await prisma.permiso.deleteMany({
    where: { colaboradorId: colaborador.id, fechaInicio: { gte: desde, lt: finExclusivo }, descripcion: { startsWith: '[demo saldo]' } },
  });
  console.log(`Limpieza: ${borrados.count} registro(s) y ${borradosPermisos.count} permiso(s) de demo previos.`);

  // ---- Escenario, semana por semana (horario L-V 08:00-16:00, SAB 08:00-12:00) ----
  const registros = [
    // Semana 1 (mié 1 – sáb 4): todo normal. Base de comparación.
    dia(1, 8, 0, 16, 0), dia(2, 8, 0, 16, 0), dia(3, 8, 0, 16, 0), dia(4, 8, 0, 12, 0),

    // Semana 2 (lun 6 – sáb 11): llega tarde el lunes y REPONE el miércoles.
    // El saldo de la semana debe quedar en cero: es el cruce automático.
    dia(6, 8, 25, 16, 0),   // 25 min tarde
    dia(7, 8, 0, 16, 0),
    dia(8, 8, 0, 16, 25),   // se queda 25 min más → repone
    dia(9, 8, 0, 16, 0), dia(10, 8, 0, 16, 0), dia(11, 8, 0, 12, 0),

    // Semana 3 (lun 13 – sáb 18): llega tarde 40 min y NO repone, más un día
    // completo de permiso NO remunerado (jue 16). Debe quedar saldo en contra.
    dia(13, 8, 40, 16, 0),  // 40 min tarde
    dia(14, 8, 0, 16, 0), dia(15, 8, 0, 16, 0),
    // (jue 16 no trabaja: permiso no remunerado)
    dia(17, 8, 0, 16, 0), dia(18, 8, 0, 12, 0),

    // Semana 4 (lun 20 – sáb 25): lun 20 es FESTIVO y mar 21 son vacaciones
    // (permiso remunerado, ya existente). No debe generar saldo en contra.
    dia(22, 8, 0, 16, 0), dia(23, 8, 0, 16, 0), dia(24, 8, 0, 16, 0), dia(25, 8, 0, 12, 0),

    // Semana 5 (lun 27 – vie 31): un día de permiso PERSONAL (jue 30), que es de
    // los que cada empresa decide si paga. Sirve para ver el efecto del toggle.
    dia(27, 8, 0, 16, 0), dia(28, 8, 0, 16, 0), dia(29, 8, 0, 16, 0),
    // (jue 30 no trabaja: permiso personal)
    dia(31, 8, 0, 16, 0),
  ];

  await prisma.registro.createMany({
    data: registros.map(r => ({ ...r, colaboradorId: colaborador.id })),
  });

  await prisma.permiso.createMany({
    data: [
      {
        colaboradorId: colaborador.id,
        fechaInicio: fechaDia(16), fechaFin: fechaDia(16),
        tipo: 'NO_REMUNERADO', aprobado: true,
        descripcion: '[demo saldo] Diligencia personal, sin remuneración',
      },
      {
        colaboradorId: colaborador.id,
        fechaInicio: fechaDia(30), fechaFin: fechaDia(30),
        tipo: 'PERSONAL', aprobado: true,
        descripcion: '[demo saldo] Permiso personal (depende de la política de la empresa)',
      },
    ],
  });

  console.log(`\nListo: ${registros.length} días trabajados + 2 permisos de demo en julio 2026.`);
  console.log('Ya existía un permiso de VACACIONES del 20 al 21 de julio (remunerado por ley).');
  console.log('\nQué esperar en el reporte del 1 al 31 de julio:');
  console.log('  • Semana del 6: llega tarde 25 min y los repone → saldo 0 (cruce automático).');
  console.log('  • Semana del 13: 40 min tarde + 1 día no remunerado → ~8h40m en contra.');
  console.log('  • Semana del 20: festivo + vacaciones → sin saldo en contra.');
  console.log('  • Semana del 27: 1 día de permiso PERSONAL → cambia según la configuración.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
