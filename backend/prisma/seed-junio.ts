// Datos de prueba: junio de 2026 completo para la empresa demo.
// Diversidad de horas: ordinarias, extras, nocturnas, dominicales y festivas.
// Ejecutar: npx ts-node prisma/seed-junio.ts (idempotente: borra y recrea junio)
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ANIO = 2026;
const MES = 5; // junio (0-index)

// Bogotá = UTC-5. Hora local d/h:m → instante UTC (el desborde de horas lo maneja Date.UTC)
const bog = (dia: number, hora: number, min = 0) => new Date(Date.UTC(ANIO, MES, dia, hora + 5, min));
const fechaDia = (dia: number) => new Date(Date.UTC(ANIO, MES, dia, 5, 0, 0));
const diaSemana = (dia: number) => new Date(Date.UTC(ANIO, MES, dia)).getUTCDay(); // 0=dom

const FESTIVOS_JUNIO = [8, 15, 29]; // Corpus Christi, Sagrado Corazón, San Pedro y San Pablo (lunes)

async function main() {
  const empresa = await prisma.empresa.findUnique({ where: { nit: '900123456-7' } });
  if (!empresa) throw new Error('Empresa demo no encontrada. Corre primero el seed principal.');

  const cols = await prisma.colaborador.findMany({ where: { empresaId: empresa.id } });
  const carlos = cols.find(c => c.cedula === '1020304050')!;
  const maria = cols.find(c => c.cedula === '1030405060')!;
  const julian = cols.find(c => c.cedula === '1040506070')!;

  // ===== Horarios de trabajo y asignación =====
  const LV = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'];
  const horariosDef = [
    { nombre: 'Oficina', horaEntrada: '08:00', horaSalida: '17:00', dias: LV, toleranciaMin: 10, colaboradorId: maria.id },
    { nombre: 'Turno diurno', horaEntrada: '06:00', horaSalida: '14:00', dias: [...LV, 'SABADO'], toleranciaMin: 10, colaboradorId: carlos.id },
    { nombre: 'Turno nocturno', horaEntrada: '21:00', horaSalida: '05:00', dias: LV, toleranciaMin: 10, colaboradorId: julian.id },
  ];
  for (const { colaboradorId, ...h } of horariosDef) {
    let horario = await prisma.horario.findFirst({ where: { empresaId: empresa.id, nombre: h.nombre } });
    if (!horario) horario = await prisma.horario.create({ data: { ...h, empresaId: empresa.id } });
    await prisma.colaborador.update({ where: { id: colaboradorId }, data: { horarioId: horario.id } });
  }

  // Limpiar junio para poder re-ejecutar
  const inicioJunio = fechaDia(1);
  const finJunio = new Date(Date.UTC(ANIO, MES + 1, 1, 5));
  await prisma.registro.deleteMany({
    where: { colaboradorId: { in: cols.map(c => c.id) }, fecha: { gte: inicioJunio, lt: finJunio } },
  });
  await prisma.permiso.deleteMany({
    where: { colaboradorId: { in: cols.map(c => c.id) }, fechaInicio: { gte: inicioJunio, lt: finJunio } },
  });

  type Reg = { colaboradorId: string; fecha: Date; entrada: Date; salida: Date; tipo: 'NORMAL' | 'FESTIVO' };
  const registros: Reg[] = [];

  for (let d = 1; d <= 30; d++) {
    const dow = diaSemana(d);
    const esFestivo = FESTIVOS_JUNIO.includes(d);
    const esDomingo = dow === 0;
    const esSabado = dow === 6;
    const esLaboralLV = dow >= 1 && dow <= 5;

    // ===== María (supervisora): oficina L-V 08:00-17:00 =====
    // Vacaciones del 22 al 26 · no trabaja festivos · algunos días llega tarde
    const mariaVacaciones = d >= 22 && d <= 26;
    if (esLaboralLV && !esFestivo && !mariaVacaciones) {
      const minutosLlegada = d % 7 === 3 ? 35 : d % 11 === 5 ? 22 : 0; // tardanzas de demo
      registros.push({ colaboradorId: maria.id, fecha: fechaDia(d), entrada: bog(d, 8, minutosLlegada), salida: bog(d, 17), tipo: 'NORMAL' });
    }

    // ===== Carlos (guarda diurno): L-S 06:00-14:00, viernes hasta las 16:00 =====
    // Incapacidad EPS 10-11 · trabaja los domingos 7 y 21 · trabaja el festivo 15
    const carlosIncapacidad = d === 10 || d === 11;
    const carlosDomingoTrabajado = d === 7 || d === 21;
    if (!carlosIncapacidad) {
      if ((esLaboralLV || esSabado) && (!esFestivo || d === 15)) {
        const salida = dow === 5 ? 16 : 14; // viernes acumula extras
        registros.push({
          colaboradorId: carlos.id, fecha: fechaDia(d),
          entrada: bog(d, 6), salida: bog(d, salida),
          tipo: d === 15 ? 'FESTIVO' : 'NORMAL',
        });
      } else if (esDomingo && carlosDomingoTrabajado) {
        registros.push({ colaboradorId: carlos.id, fecha: fechaDia(d), entrada: bog(d, 6), salida: bog(d, 14), tipo: 'NORMAL' });
      }
    }

    // ===== Julián (guarda nocturno): L-V 21:00-05:00 (cruza medianoche) =====
    // Cita médica el 18 · sábado 13 turno adicional (extras nocturnas) · no festivos
    const julianMedico = d === 18;
    if (((esLaboralLV && !esFestivo) || d === 13) && !julianMedico) {
      registros.push({ colaboradorId: julian.id, fecha: fechaDia(d), entrada: bog(d, 21), salida: bog(d + 1, 5), tipo: 'NORMAL' });
    }
  }

  // ===== Julio 1-5 (mes en curso): para que la vista interna muestre horas =====
  // jul 2026: 1=mié, 2=jue, 3=vie, 4=sáb, 5=dom. No toca los registros del 6 en adelante.
  const bogJul = (dia: number, hora: number) => new Date(Date.UTC(ANIO, 6, dia, hora + 5));
  const fechaJul = (dia: number) => new Date(Date.UTC(ANIO, 6, dia, 5, 0, 0));
  await prisma.registro.deleteMany({
    where: { colaboradorId: { in: cols.map(c => c.id) }, fecha: { gte: fechaJul(1), lt: fechaJul(6) } },
  });
  const bogJulMin = (dia: number, hora: number, min: number) => new Date(Date.UTC(ANIO, 6, dia, hora + 5, min));
  for (const d of [1, 2, 3]) {
    // María llega tarde el 2 de julio (08:25 con tolerancia de 10 → 15 min tarde)
    const entradaMaria = d === 2 ? bogJulMin(d, 8, 25) : bogJul(d, 8);
    registros.push({ colaboradorId: maria.id, fecha: fechaJul(d), entrada: entradaMaria, salida: bogJul(d, 17), tipo: 'NORMAL' });
    registros.push({ colaboradorId: julian.id, fecha: fechaJul(d), entrada: bogJul(d, 21), salida: bogJul(d + 1, 5), tipo: 'NORMAL' });
  }
  for (const d of [1, 2, 3, 4, 5]) {
    const salida = d === 3 ? 16 : 14; // viernes con extras; domingo 5 trabajado (dominical)
    registros.push({ colaboradorId: carlos.id, fecha: fechaJul(d), entrada: bogJul(d, 6), salida: bogJul(d, salida), tipo: 'NORMAL' });
  }

  await prisma.registro.createMany({ data: registros });

  await prisma.permiso.createMany({
    data: [
      { colaboradorId: maria.id, tipo: 'VACACIONES', fechaInicio: fechaDia(22), fechaFin: fechaDia(26), descripcion: 'Vacaciones anuales', aprobado: true },
      { colaboradorId: carlos.id, tipo: 'INCAPACIDAD_EPS', fechaInicio: fechaDia(10), fechaFin: fechaDia(11), descripcion: 'Gripe — incapacidad EPS 2 días', aprobado: true },
      { colaboradorId: julian.id, tipo: 'MEDICO', fechaInicio: fechaDia(18), fechaFin: fechaDia(18), descripcion: 'Cita médica EPS', aprobado: true },
    ],
  });

  console.log(`Junio 2026 sembrado ✓ — ${registros.length} registros y 3 novedades`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
