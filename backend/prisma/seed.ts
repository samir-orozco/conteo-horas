import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Usuario admin por defecto
  const hash = await bcrypt.hash('admin123', 10);
  await prisma.usuario.upsert({
    where: { email: 'admin@empresa.com' },
    update: {},
    create: { email: 'admin@empresa.com', password: hash, nombre: 'Administrador', rol: 'ADMIN' },
  });

  // Configuración base
  const configs = [
    { clave: 'HORAS_MES', valor: '200' },
    { clave: 'JORNADA_SEMANAL', valor: '46' },
    { clave: 'HORA_INICIO_DIURNA', valor: '6' },
    { clave: 'HORA_FIN_DIURNA', valor: '21' },
    { clave: 'EMPRESA_NOMBRE', valor: 'Mi Empresa' },
    { clave: 'TIMEZONE', valor: 'America/Bogota' },
  ];
  for (const c of configs) {
    await prisma.configuracion.upsert({ where: { clave: c.clave }, update: {}, create: c });
  }

  // Tipos de hora según normativa colombiana (Ley 2101/2021, CST)
  const tipos = [
    { nombre: 'Hora Ordinaria Diurna', codigo: 'HOD', horaInicio: 6, horaFin: 21, recargo: 1.0, aplica: ['LUNES','MARTES','MIERCOLES','JUEVES','VIERNES','SABADO'] },
    { nombre: 'Hora Ordinaria Nocturna', codigo: 'HON', horaInicio: 21, horaFin: 6, recargo: 1.35, aplica: ['LUNES','MARTES','MIERCOLES','JUEVES','VIERNES','SABADO'] },
    { nombre: 'Hora Extra Diurna', codigo: 'HED', horaInicio: 6, horaFin: 21, recargo: 1.25, aplica: ['LUNES','MARTES','MIERCOLES','JUEVES','VIERNES','SABADO'] },
    { nombre: 'Hora Extra Nocturna', codigo: 'HEN', horaInicio: 21, horaFin: 6, recargo: 1.75, aplica: ['LUNES','MARTES','MIERCOLES','JUEVES','VIERNES','SABADO'] },
    { nombre: 'Hora Diurna Dominical/Festivo', codigo: 'HDD', horaInicio: 6, horaFin: 21, recargo: 2.0, aplica: ['DOMINGO','FESTIVO'] },
    { nombre: 'Hora Nocturna Dominical/Festivo', codigo: 'HND', horaInicio: 21, horaFin: 6, recargo: 2.5, aplica: ['DOMINGO','FESTIVO'] },
    { nombre: 'Hora Extra Diurna Dominical/Festivo', codigo: 'HEDD', horaInicio: 6, horaFin: 21, recargo: 2.5, aplica: ['DOMINGO','FESTIVO'] },
    { nombre: 'Hora Extra Nocturna Dominical/Festivo', codigo: 'HEND', horaInicio: 21, horaFin: 6, recargo: 3.0, aplica: ['DOMINGO','FESTIVO'] },
  ];
  for (const t of tipos) {
    await prisma.tipoHora.upsert({ where: { codigo: t.codigo }, update: {}, create: t });
  }

  console.log('Seed completado ✓');
}

main().catch(console.error).finally(() => prisma.$disconnect());
