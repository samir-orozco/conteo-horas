// Una empresa de prueba para ver en el navegador, en LOCAL, el Inicio nuevo (14 y 15 de octubre de
// 2026): los pendientes, los primeros pasos, la asistencia de la semana y las llegadas tarde.
//
//   npx ts-node prisma/seed-inicio-demo.ts            crea (o vuelve a crear) la empresa
//   npx ts-node prisma/seed-inicio-demo.ts --borrar   la borra entera
//
// Credenciales de prueba, solo para la base local:
//   panel:  admin@inicio-demo.test / inicio-demo-123
//
// Lo que se ve al entrar (las fechas se arman alrededor del día en que se corre):
//   - Pendientes: 1 turno sin cerrar (Jorge, de ayer), 2 novedades por aprobar (Ana y Luis) y 3
//     contratos por revisar: Caro (vencido), Luis (se prorroga solo) y Ana (por vencer).
//   - Primeros pasos: 4 de 5. Falta el registro biométrico. La empresa tiene 20 días.
//   - La semana: horario de lunes a viernes de 08:00 a 17:00 con 5 minutos de tolerancia. Ana llegó
//     22 min tarde hace dos días; Luis, 40 min hace seis días y 12 min ayer, y hoy no ha marcado;
//     Caro llegó hoy a las 08:30; Sofía está de vacaciones aprobadas de ayer a mañana; Marta llega a
//     tiempo; Jorge no tiene horario, pero el planificador le pintó hoy un turno de 10:00 a 18:00.
//     Los festivos (por ejemplo el 12 de octubre) no tienen marcaciones.
//   - El clima: una carita por cada jornada cerrada de la semana y otras de la semana anterior, para la
//     variación. Luis calificó mal todas las de esta semana: necesita atención. La empresa no tiene la
//     función: el Inicio muestra las cifras sin nombres y la invitación a la prueba gratis.
import bcrypt from 'bcryptjs';
import { prisma } from '../src/prisma';
import { borrarEmpresaEnCascada } from '../src/utils/borrarEmpresaEnCascada';
import { crearSedePrincipal } from '../src/utils/sedesDeEmpresa';
import { claveDiaBogota } from '../src/utils/fechas';

const NIT = 'inicio-demo';
const DIA = 24 * 60 * 60 * 1000;
const HORA = 60 * 60 * 1000;
// Medianoche de Bogotá de hoy, más o menos n días: como se guardan las fechas.
const hoyBog = (() => { const z = new Date(Date.now() - 5 * HORA); return Date.UTC(z.getUTCFullYear(), z.getUTCMonth(), z.getUTCDate(), 5, 0, 0); })();
const dia = (n: number) => new Date(hoyBog + n * DIA);
const a = (n: number, h: number, min = 0) => new Date(hoyBog + n * DIA + (h * 60 + min) * 60 * 1000);

async function borrar(): Promise<boolean> {
  const e = await prisma.empresa.findUnique({ where: { nit: NIT }, select: { id: true } });
  if (!e) return false;
  await prisma.$transaction(tx => borrarEmpresaEnCascada(tx, e.id), { timeout: 120_000 });
  return true;
}

async function main() {
  if (process.argv.includes('--borrar')) {
    console.log((await borrar()) ? 'Empresa de Inicio borrada.' : 'No había empresa de Inicio.');
    return;
  }
  await borrar();

  const empresa = await prisma.empresa.create({
    data: { nombre: 'Panadería Inicio Demo', nit: NIT, email: 'contacto@inicio-demo.test', auxilioRevisadoEn: new Date(), creadoEn: new Date(Date.now() - 20 * DIA) },
  });
  await prisma.suscripcion.create({ data: { empresaId: empresa.id, finPrueba: new Date(Date.now() + 4 * DIA) } });
  await crearSedePrincipal(prisma, empresa.id);
  await prisma.usuario.create({
    data: { email: 'admin@inicio-demo.test', password: await bcrypt.hash('inicio-demo-123', 10), nombre: 'Admin Inicio', rol: 'ADMIN', empresaId: empresa.id, emailVerificado: true },
  });
  const horario = await prisma.horario.create({
    data: {
      empresaId: empresa.id, nombre: 'Panadería', toleranciaMin: 5, almuerzoMin: 60,
      franjas: { create: [{ dias: ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'], horaEntrada: '08:00', horaSalida: '17:00', tieneAlmuerzo: true }] },
    },
  });

  const hace60 = new Date(Date.now() - 60 * DIA);
  const persona = (nombre: string, apellido: string, cedula: string, cargo: string, conHorario = true) => prisma.colaborador.create({
    data: { empresaId: empresa.id, nombre, apellido, cedula, cargo, salarioMensual: 1750905, creadoEn: hace60, horarioId: conHorario ? horario.id : null },
  });
  const ana = await persona('Ana', 'Ruiz', '8001', 'Panadera');
  const luis = await persona('Luis', 'Mora', '8002', 'Cajero');
  const caro = await persona('Caro', 'Díaz', '8003', 'Auxiliar');
  const sofia = await persona('Sofía', 'Pardo', '8004', 'Administradora');
  const jorge = await persona('Jorge', 'Ríos', '8005', 'Repartidor', false);
  const marta = await persona('Marta', 'Gil', '8006', 'Panadera');

  const contrato = (colaboradorId: string, tipo: 'FIJO' | 'INDEFINIDO', fechaFin: Date | null) =>
    prisma.contrato.create({ data: { colaboradorId, tipo, fechaInicio: dia(-300), fechaFin } });
  await contrato(ana.id, 'FIJO', dia(57));
  await contrato(luis.id, 'FIJO', dia(10));
  await contrato(caro.id, 'FIJO', dia(-5));
  await contrato(sofia.id, 'INDEFINIDO', null);

  await prisma.permiso.createMany({ data: [
    { colaboradorId: ana.id, tipo: 'MEDICO', fechaInicio: dia(3), fechaFin: dia(3), descripcion: 'Control odontológico' },
    { colaboradorId: luis.id, tipo: 'VACACIONES', fechaInicio: dia(6), fechaFin: dia(10) },
    { colaboradorId: sofia.id, tipo: 'VACACIONES', fechaInicio: dia(-1), fechaFin: dia(1), aprobado: true },
  ] });

  // La semana: de hace seis días a hoy, solo de lunes a viernes y sin festivos.
  const festivos = new Set((await prisma.diaFestivo.findMany({ where: { empresaId: null, fecha: { gte: dia(-7), lt: dia(1) } }, select: { fecha: true } }))
    .map(f => claveDiaBogota(f.fecha)));
  const laborable = (n: number) => { const d = dia(n).getUTCDay(); return d >= 1 && d <= 5 && !festivos.has(claveDiaBogota(dia(n))); };
  type Marca = { colaboradorId: string; n: number; h: number; min: number };
  const marcas: Marca[] = [];
  for (let n = -6; n <= 0; n++) {
    if (!laborable(n)) continue;
    marcas.push({ colaboradorId: marta.id, n, h: 7, min: 50 });
    marcas.push({ colaboradorId: ana.id, n, h: n === -2 ? 8 : 7, min: n === -2 ? 27 : 58 });
    marcas.push({ colaboradorId: caro.id, n, h: n === 0 ? 8 : 7, min: n === 0 ? 30 : 55 });
    if (n !== 0) marcas.push({ colaboradorId: luis.id, n, h: 8, min: n === -6 ? 45 : n === -1 ? 17 : 1 });
    if (n < -1) marcas.push({ colaboradorId: sofia.id, n, h: 7, min: 59 });
  }
  await prisma.registro.createMany({ data: marcas.map(m => ({
    colaboradorId: m.colaboradorId, fecha: dia(m.n), entrada: a(m.n, m.h, m.min),
    // Las de hoy siguen abiertas: la gente está en planta.
    salida: m.n === 0 ? null : a(m.n, 17), metodoEntrada: 'CEDULA' as const,
  })) });

  // El clima. Esta semana, una carita por jornada cerrada (las de hoy siguen abiertas); la anterior, sin
  // marcaciones, solo para que haya con qué comparar.
  const caritaDe = (colaboradorId: string, n: number) =>
    colaboradorId === luis.id ? (n >= -6 ? 1 + (n % 2 === 0 ? 1 : 0) : 4)
      : colaboradorId === marta.id ? 5 : colaboradorId === caro.id ? 3 : 4;
  const anteriores = [-13, -12, -11, -10, -9].flatMap(n => [ana, luis, caro, sofia, marta].map(p => ({ colaboradorId: p.id, n })));
  const calificaciones = [...marcas.filter(m => m.n < 0), ...anteriores];
  await prisma.calificacionClima.createMany({ data: calificaciones.map(c => ({
    empresaId: empresa.id, colaboradorId: c.colaboradorId, fecha: dia(c.n), carita: caritaDe(c.colaboradorId, c.n), motivos: [],
  })) });

  // Jorge entró ayer a las 7:00 y nunca marcó salida (cargado a mano). Hoy el planificador le pintó
  // un turno de 10:00 a 18:00, aunque no tenga horario fijo.
  await prisma.registro.create({ data: { colaboradorId: jorge.id, fecha: dia(-1), entrada: a(-1, 7), metodoEntrada: 'MANUAL' } });
  await prisma.diaEsperado.create({ data: {
    colaboradorId: jorge.id, fecha: dia(0), programado: true, horaEntrada: '10:00', horaSalida: '18:00', toleranciaMin: 5,
    almuerzoMin: 0, minutosEsperados: 480, origen: 'MANUAL',
  } });

  console.log(`Empresa «${empresa.nombre}» creada: 6 personas, ${marcas.length + 1} marcaciones de la semana, ${calificaciones.length} caritas, 4 contratos y 3 novedades.`);
}

main()
  .catch(e => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
