// Una empresa de prueba para ver en el navegador, en LOCAL, los «Pendientes por resolver» y los «Primeros
// pasos» del Inicio (14 de octubre de 2026).
//
//   npx ts-node prisma/seed-inicio-demo.ts            crea (o vuelve a crear) la empresa
//   npx ts-node prisma/seed-inicio-demo.ts --borrar   la borra entera
//
// Credenciales de prueba, solo para la base local:
//   panel:  admin@inicio-demo.test / inicio-demo-123
//
// Lo que se ve al entrar:
//   - Pendientes: 1 turno sin cerrar (Jorge, de ayer), 2 novedades por aprobar (Ana y Luis) y 3 contratos
//     por revisar: Caro (vencido), Luis (se prorroga solo) y Ana (por vencer, con el preaviso a tiempo).
//     Sofía tiene contrato indefinido y no aparece.
//   - Primeros pasos: 2 de 5. La sede (siempre) y el trabajador; faltan el horario, el rostro y la
//     primera marcación en el kiosco. La empresa tiene 3 días: la tarjeta se ve.
import bcrypt from 'bcryptjs';
import { prisma } from '../src/prisma';
import { borrarEmpresaEnCascada } from '../src/utils/borrarEmpresaEnCascada';
import { crearSedePrincipal } from '../src/utils/sedesDeEmpresa';

const NIT = 'inicio-demo';
const DIA = 24 * 60 * 60 * 1000;
const HORA = 60 * 60 * 1000;
// Medianoche de Bogotá de hoy, más o menos n días: como se guardan las fechas de contratos y novedades.
const hoyBog = (() => { const z = new Date(Date.now() - 5 * HORA); return Date.UTC(z.getUTCFullYear(), z.getUTCMonth(), z.getUTCDate(), 5, 0, 0); })();
const dia = (n: number) => new Date(hoyBog + n * DIA);

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
    data: { nombre: 'Panadería Inicio Demo', nit: NIT, email: 'contacto@inicio-demo.test', auxilioRevisadoEn: new Date(), creadoEn: new Date(Date.now() - 3 * DIA) },
  });
  await prisma.suscripcion.create({ data: { empresaId: empresa.id, finPrueba: new Date(Date.now() + 4 * DIA) } });
  await crearSedePrincipal(prisma, empresa.id);
  await prisma.usuario.create({
    data: { email: 'admin@inicio-demo.test', password: await bcrypt.hash('inicio-demo-123', 10), nombre: 'Admin Inicio', rol: 'ADMIN', empresaId: empresa.id, emailVerificado: true },
  });

  const persona = (nombre: string, apellido: string, cedula: string, cargo: string) => prisma.colaborador.create({
    data: { empresaId: empresa.id, nombre, apellido, cedula, cargo, salarioMensual: 1750905 },
  });
  const ana = await persona('Ana', 'Ruiz', '8001', 'Panadera');
  const luis = await persona('Luis', 'Mora', '8002', 'Cajero');
  const caro = await persona('Caro', 'Díaz', '8003', 'Auxiliar');
  const sofia = await persona('Sofía', 'Pardo', '8004', 'Administradora');
  const jorge = await persona('Jorge', 'Ríos', '8005', 'Repartidor');

  const contrato = (colaboradorId: string, tipo: 'FIJO' | 'INDEFINIDO', fechaFin: Date | null) =>
    prisma.contrato.create({ data: { colaboradorId, tipo, fechaInicio: dia(-300), fechaFin } });
  await contrato(ana.id, 'FIJO', dia(57));
  await contrato(luis.id, 'FIJO', dia(10));
  await contrato(caro.id, 'FIJO', dia(-5));
  await contrato(sofia.id, 'INDEFINIDO', null);

  await prisma.permiso.createMany({ data: [
    { colaboradorId: ana.id, tipo: 'MEDICO', fechaInicio: dia(3), fechaFin: dia(3), descripcion: 'Control odontológico' },
    { colaboradorId: luis.id, tipo: 'VACACIONES', fechaInicio: dia(6), fechaFin: dia(10) },
  ] });

  // Jorge entró ayer a las 7:00 y nunca marcó salida. Cargado a mano, para que no cuente como la primera
  // marcación del kiosco.
  await prisma.registro.create({ data: { colaboradorId: jorge.id, fecha: dia(-1), entrada: new Date(dia(-1).getTime() + 7 * HORA), metodoEntrada: 'MANUAL' } });

  console.log(`Empresa «${empresa.nombre}» creada: 5 personas, 4 contratos, 2 novedades por aprobar y 1 turno sin cerrar.`);
}

main()
  .catch(e => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
