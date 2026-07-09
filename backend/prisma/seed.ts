import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { festivosDelAnio } from '../src/utils/festivosColombia';

const prisma = new PrismaClient();

// Medianoche Bogotá (UTC-5)
const fbog = (a: number, m: number, d: number) => new Date(Date.UTC(a, m - 1, d, 5, 0, 0));

const SEMANA = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
const DOMFES = ['DOMINGO', 'FESTIVO'];

// Genera los 8 tipos de hora para un período de vigencia dado
function tiposDelPeriodo(opts: {
  vigenteDesde: Date;
  vigenteHasta: Date | null;
  inicioNocturna: number; // 21 antes de Ley 2466, 19 después
  recargoDom: number; // 0.75 / 0.80 / 0.90 / 1.00
}) {
  const { vigenteDesde, vigenteHasta, inicioNocturna, recargoDom } = opts;
  const finNocturna = 6;
  const base = { vigenteDesde, vigenteHasta };
  return [
    { ...base, nombre: 'Hora Ordinaria Diurna', codigo: 'HOD', horaInicio: finNocturna, horaFin: inicioNocturna, recargo: 1.0, aplica: SEMANA },
    { ...base, nombre: 'Hora Ordinaria Nocturna', codigo: 'HON', horaInicio: inicioNocturna, horaFin: finNocturna, recargo: 1.35, aplica: SEMANA },
    { ...base, nombre: 'Hora Extra Diurna', codigo: 'HED', horaInicio: finNocturna, horaFin: inicioNocturna, recargo: 1.25, aplica: SEMANA },
    { ...base, nombre: 'Hora Extra Nocturna', codigo: 'HEN', horaInicio: inicioNocturna, horaFin: finNocturna, recargo: 1.75, aplica: SEMANA },
    { ...base, nombre: 'Hora Diurna Dominical/Festivo', codigo: 'HDD', horaInicio: finNocturna, horaFin: inicioNocturna, recargo: 1 + recargoDom, aplica: DOMFES },
    { ...base, nombre: 'Hora Nocturna Dominical/Festivo', codigo: 'HND', horaInicio: inicioNocturna, horaFin: finNocturna, recargo: 1 + recargoDom + 0.35, aplica: DOMFES },
    { ...base, nombre: 'Hora Extra Diurna Dominical/Festivo', codigo: 'HEDD', horaInicio: finNocturna, horaFin: inicioNocturna, recargo: 1 + recargoDom + 0.25, aplica: DOMFES },
    { ...base, nombre: 'Hora Extra Nocturna Dominical/Festivo', codigo: 'HEND', horaInicio: inicioNocturna, horaFin: finNocturna, recargo: 1 + recargoDom + 0.75, aplica: DOMFES },
  ];
}

async function main() {
  // ===== Jornada máxima semanal — Ley 2101 de 2021 =====
  const jornadas = [
    { vigenteDesde: fbog(2023, 7, 15), horasSemanales: 47 },
    { vigenteDesde: fbog(2024, 7, 15), horasSemanales: 46 },
    { vigenteDesde: fbog(2025, 7, 15), horasSemanales: 44 },
    { vigenteDesde: fbog(2026, 7, 15), horasSemanales: 42 },
  ];
  for (const j of jornadas) {
    await prisma.jornadaVigencia.upsert({
      where: { vigenteDesde: j.vigenteDesde },
      update: { horasSemanales: j.horasSemanales },
      create: j,
    });
  }

  // ===== Tipos de hora con vigencias — CST + Ley 2466 de 2025 =====
  // Hasta 24/dic/2025: nocturna desde las 21:00, dominical 80% (desde jul/2025)
  // 25/dic/2025: nocturna desde las 19:00
  // 1/jul/2026: dominical 90% · 1/jul/2027: dominical 100%
  const periodos = [
    tiposDelPeriodo({ vigenteDesde: fbog(2025, 7, 1), vigenteHasta: fbog(2025, 12, 25), inicioNocturna: 21, recargoDom: 0.8 }),
    tiposDelPeriodo({ vigenteDesde: fbog(2025, 12, 25), vigenteHasta: fbog(2026, 7, 1), inicioNocturna: 19, recargoDom: 0.8 }),
    tiposDelPeriodo({ vigenteDesde: fbog(2026, 7, 1), vigenteHasta: fbog(2027, 7, 1), inicioNocturna: 19, recargoDom: 0.9 }),
    tiposDelPeriodo({ vigenteDesde: fbog(2027, 7, 1), vigenteHasta: null, inicioNocturna: 19, recargoDom: 1.0 }),
  ];
  for (const tipos of periodos) {
    for (const t of tipos) {
      await prisma.tipoHora.upsert({
        where: { codigo_vigenteDesde: { codigo: t.codigo, vigenteDesde: t.vigenteDesde } },
        update: t,
        create: t,
      });
    }
  }

  // ===== Festivos nacionales (Ley Emiliani) — globales (empresaId null) =====
  for (const anio of [2025, 2026, 2027]) {
    for (const f of festivosDelAnio(anio)) {
      const existente = await prisma.diaFestivo.findFirst({
        where: { empresaId: null, fecha: f.fecha },
      });
      if (!existente) {
        await prisma.diaFestivo.create({ data: { fecha: f.fecha, nombre: f.nombre } });
      }
    }
  }

  // ===== Super administrador de la plataforma =====
  const hashSuper = await bcrypt.hash('superadmin123', 10);
  await prisma.usuario.upsert({
    where: { email: 'superadmin@horapro.co' },
    update: {},
    create: {
      email: 'superadmin@horapro.co',
      password: hashSuper,
      nombre: 'Super Admin HoraPro',
      rol: 'SUPER_ADMIN',
      empresaId: null,
    },
  });

  // ===== Empresa demo con suscripción en prueba =====
  const empresa = await prisma.empresa.upsert({
    where: { nit: '900123456-7' },
    update: {},
    create: {
      nombre: 'Seguridad Andina Ltda',
      nit: '900123456-7',
      email: 'contacto@seguridadandina.co',
      telefono: '3001234567',
    },
  });

  await prisma.suscripcion.upsert({
    where: { empresaId: empresa.id },
    update: {},
    create: {
      empresaId: empresa.id,
      estado: 'PRUEBA',
      finPrueba: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  const hashDemo = await bcrypt.hash('demo123', 10);
  await prisma.usuario.upsert({
    where: { email: 'admin@seguridadandina.co' },
    update: {},
    create: {
      email: 'admin@seguridadandina.co',
      password: hashDemo,
      nombre: 'Admin Demo',
      rol: 'ADMIN',
      empresaId: empresa.id,
    },
  });

  const colaboradores = [
    { nombre: 'Carlos', apellido: 'Ramírez', cedula: '1020304050', cargo: 'Guarda de seguridad', salarioMensual: 1750000 },
    { nombre: 'María', apellido: 'Gómez', cedula: '1030405060', cargo: 'Supervisora', salarioMensual: 2300000 },
    { nombre: 'Julián', apellido: 'Torres', cedula: '1040506070', cargo: 'Guarda de seguridad', salarioMensual: 1750000 },
  ];
  for (const c of colaboradores) {
    await prisma.colaborador.upsert({
      where: { empresaId_cedula: { empresaId: empresa.id, cedula: c.cedula } },
      update: {},
      create: { ...c, empresaId: empresa.id },
    });
  }

  console.log('Seed HoraPro completado ✓');
  console.log('Super admin: superadmin@horapro.co / superadmin123');
  console.log('Empresa demo: admin@seguridadandina.co / demo123');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
