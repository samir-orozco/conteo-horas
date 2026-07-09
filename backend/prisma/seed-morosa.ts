// Empresa demo MOROSA: su prueba venció hace 10 días → suscripción SUSPENDIDA.
// Sirve para probar el modal bloqueante de pago en el panel del admin.
// Ejecutar: npx ts-node prisma/seed-morosa.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const DIA_MS = 24 * 60 * 60 * 1000;

async function main() {
  const empresa = await prisma.empresa.upsert({
    where: { nit: '900555444-3' },
    update: {},
    create: {
      nombre: 'Transportes El Cóndor SAS',
      nit: '900555444-3',
      email: 'gerencia@condor.co',
      telefono: '3109876543',
    },
  });

  await prisma.suscripcion.upsert({
    where: { empresaId: empresa.id },
    update: { finPrueba: new Date(Date.now() - 10 * DIA_MS), pagadoHasta: null, estado: 'PRUEBA' },
    create: {
      empresaId: empresa.id,
      estado: 'PRUEBA',
      finPrueba: new Date(Date.now() - 10 * DIA_MS), // venció hace 10 días → SUSPENDIDA
    },
  });

  const hash = await bcrypt.hash('moroso123', 10);
  await prisma.usuario.upsert({
    where: { email: 'moroso@condor.co' },
    update: {},
    create: { email: 'moroso@condor.co', password: hash, nombre: 'Gerente Cóndor', rol: 'ADMIN', empresaId: empresa.id },
  });

  const colaboradores = [
    { nombre: 'Pedro', apellido: 'Salazar', cedula: '2010203040', cargo: 'Conductor', salarioMensual: 1900000 },
    { nombre: 'Luisa', apellido: 'Mendoza', cedula: '2020304050', cargo: 'Auxiliar logística', salarioMensual: 1600000 },
  ];
  for (const c of colaboradores) {
    await prisma.colaborador.upsert({
      where: { empresaId_cedula: { empresaId: empresa.id, cedula: c.cedula } },
      update: {},
      create: { ...c, empresaId: empresa.id },
    });
  }

  const emp = await prisma.empresa.findUnique({ where: { id: empresa.id } });
  console.log('Empresa morosa lista ✓');
  console.log('Admin bloqueado: moroso@condor.co / moroso123');
  console.log('Kiosco:', `/marcador/${emp!.marcadorToken}`, '(cédulas 2010203040, 2020304050)');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
