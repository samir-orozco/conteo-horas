// SOLO LECTURA. Corre la MISMA decisión que `GET /configuracion/auxilio-pendiente` sobre las
// empresas de verdad y dice, una por una, a quién le bloquearía el panel y a quién marcaría.
// No escribe nada.
//
//   npx tsx prisma/diagnostico-auxilio.ts
//
// Por qué existe: esa ruta es plomería sin pruebas de integración (§8.6), y lo que decide no es
// cosmético. Si `pendiente` sale mal, una empresa se queda con el panel bloqueado sin motivo; si
// `pareceIncluirAuxilio` marca de más, la marca deja de significar algo y nadie vuelve a mirarla.
// Antes de soltar esto a producción hay que ver los números reales, no los de un fixture.
import { PrismaClient } from '@prisma/client';
import { auxilioVigente } from '../src/utils/auxilioTransporte';
import { pareceIncluirAuxilio } from '../src/utils/salarioSospechoso';
// La MISMA función que usa la ruta. Este script tenía su propia copia de la regla (`!revisadoEn`),
// y en cuanto la ruta dejó de bloquear a las empresas sin gente, las dos empezaron a decir cosas
// distintas. Una copia rezagada aquí es peor que en cualquier otro lado: es la que se mira para
// decidir si esto sale a producción (§9.3).
import { revisionPendiente } from '../src/utils/revisionPendiente';

const prisma = new PrismaClient();
const miles = (n: number) => n.toLocaleString('es-CO');

async function main() {
  const vigencias = await prisma.auxilioVigencia.findMany({ orderBy: { vigenteDesde: 'asc' } });
  console.log('=== Vigencias del auxilio cargadas ===');
  if (vigencias.length === 0) {
    console.log('  NINGUNA. Sin vigencia, la ruta no marca a nadie y el bloqueo sale vacío de contenido.');
  }
  for (const v of vigencias) {
    console.log(`  desde ${v.vigenteDesde.toISOString().slice(0, 10)}  auxilio ${miles(v.valor)}  tope ${miles(v.tope)}  (mínimo implícito ${miles(v.tope / 2)})`);
  }

  // La ruta resuelve la vigencia con `new Date()`, así que el diagnóstico tiene que hacer lo mismo
  // para responder por lo que pasaría HOY, no por un instante elegido a conveniencia.
  const vigencia = auxilioVigente(new Date(), vigencias);
  console.log('\nvigente hoy:', vigencia ? `${miles(vigencia.valor)} / tope ${miles(vigencia.tope)}` : 'NINGUNA');

  const empresas = await prisma.empresa.findMany({
    select: { id: true, nombre: true, auxilioRevisadoEn: true },
    orderBy: { nombre: 'asc' },
  });

  let bloqueadas = 0;
  let marcadosTotal = 0;
  console.log('\n=== Empresa por empresa ===');
  for (const e of empresas) {
    // Mismo filtro que la ruta: solo gente activa. Una empresa cuyos únicos sospechosos estén
    // inactivos no debería ver a nadie marcado, y eso hay que poder verlo aquí.
    const colaboradores = await prisma.colaborador.findMany({
      where: { empresaId: e.id, activo: true },
      select: { nombre: true, apellido: true, salarioMensual: true, auxilioTransporte: true },
      orderBy: { nombre: 'asc' },
    });
    const marcados = colaboradores.filter(c => pareceIncluirAuxilio(c.salarioMensual, vigencia));
    const pendiente = revisionPendiente(e.auxilioRevisadoEn, colaboradores.length);
    if (pendiente) bloqueadas++;
    marcadosTotal += marcados.length;

    console.log(`\n${e.nombre}`);
    // Tres casos, no dos. Desde que las empresas sin gente dejaron de bloquearse, «no pendiente» ya
    // no implica que haya fecha: leerla con `!` reventaría el script justo en esas.
    const porQue = pendiente
      ? 'SÍ, ve el modal'
      : e.auxilioRevisadoEn
        ? `no, ya revisó (${e.auxilioRevisadoEn.toISOString().slice(0, 10)})`
        : 'no, no tiene gente activa que revisar';
    console.log(`  bloqueo: ${porQue}`);
    console.log(`  activos: ${colaboradores.length}   marcados: ${marcados.length}`);
    for (const c of marcados) {
      const resta = c.salarioMensual - (vigencia?.valor ?? 0);
      console.log(`    ${c.nombre} ${c.apellido}: básico ${miles(c.salarioMensual)} − auxilio = ${miles(resta)} (= mínimo) ${c.auxilioTransporte == null ? '' : `· auxilio propio ${miles(c.auxilioTransporte)}`}`);
    }
  }

  console.log(`\n=== Resumen ===`);
  console.log(`empresas: ${empresas.length}   con el panel bloqueado: ${bloqueadas}   personas marcadas en total: ${marcadosTotal}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
