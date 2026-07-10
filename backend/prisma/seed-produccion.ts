import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { festivosDelAnio } from '../src/utils/festivosColombia';

// ============================================================
// Seed de PRODUCCIÓN: solo datos legales + super admin.
// NO crea empresas ni usuarios demo. Es idempotente (se puede
// correr varias veces sin duplicar nada).
//
// Uso:
//   SUPERADMIN_EMAIL=tu@correo.co SUPERADMIN_PASSWORD=... npx ts-node prisma/seed-produccion.ts
// Si no defines SUPERADMIN_PASSWORD, se genera una aleatoria y
// se imprime UNA sola vez: guárdala.
// ============================================================

const prisma = new PrismaClient();

// Medianoche Bogotá (UTC-5)
const fbog = (a: number, m: number, d: number) => new Date(Date.UTC(a, m - 1, d, 5, 0, 0));

const SEMANA = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
const DOMFES = ['DOMINGO', 'FESTIVO'];

function tiposDelPeriodo(opts: { vigenteDesde: Date; vigenteHasta: Date | null; inicioNocturna: number; recargoDom: number }) {
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
    await prisma.jornadaVigencia.upsert({ where: { vigenteDesde: j.vigenteDesde }, update: { horasSemanales: j.horasSemanales }, create: j });
  }

  // ===== Tipos de hora con vigencias — CST + Ley 2466 de 2025 =====
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

  // ===== Festivos nacionales (Ley Emiliani) — globales =====
  const anioActual = new Date().getFullYear();
  for (const anio of [anioActual, anioActual + 1, anioActual + 2]) {
    for (const f of festivosDelAnio(anio)) {
      const existente = await prisma.diaFestivo.findFirst({ where: { empresaId: null, fecha: f.fecha } });
      if (!existente) await prisma.diaFestivo.create({ data: { fecha: f.fecha, nombre: f.nombre } });
    }
  }

  // ===== Precios de la plataforma (editables luego por el super admin) =====
  await prisma.configuracionPlataforma.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, precioTramo1: 10000, limiteTramo1: 15, precioTramo2: 2000 },
  });

  // ===== Super administrador =====
  const email = process.env.SUPERADMIN_EMAIL ?? 'superadmin@horapro.co';
  const passwordDada = process.env.SUPERADMIN_PASSWORD;
  const password = passwordDada ?? crypto.randomBytes(9).toString('base64url');
  const existente = await prisma.usuario.findUnique({ where: { email } });
  if (!existente) {
    await prisma.usuario.create({
      data: { email, password: await bcrypt.hash(password, 10), nombre: 'Super Admin HoraPro', rol: 'SUPER_ADMIN', empresaId: null },
    });
    console.log(`Super admin creado: ${email}`);
    if (!passwordDada) console.log(`Contraseña generada (guárdala AHORA, no se vuelve a mostrar): ${password}`);
  } else {
    console.log(`Super admin ya existe (${email}), no se modificó.`);
  }

  console.log('Seed de producción completado ✓ (sin datos demo)');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
