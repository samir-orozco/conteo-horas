/**
 * ¿Lo que devuelve `camposDeAutenticacion` llega DE VERDAD a las columnas?
 *
 * POR QUÉ HACE FALTA, aunque la función tenga 9 pruebas y `tsc` esté limpio:
 * la función devuelve `Record<string, unknown>`, y eso se esparce dentro del
 * `data` de Prisma sin que TypeScript compruebe las claves. Un `metodoEntrda`
 * mal escrito COMPILA, pasa las pruebas unitarias (que solo miran el objeto que
 * devuelve) y no escribe nada en la base. Es exactamente la costura que la
 * sección 8.6 del CLAUDE.md manda verificar a mano contra datos reales.
 *
 * CREA UNA MARCACIÓN DE PRUEBA Y LA BORRA. No toca ninguna otra fila.
 *
 *   npx ts-node --transpile-only prisma/verificar-metodo-marcacion.ts
 */
import { prisma } from '../src/prisma';
import { camposDeAutenticacion } from '../src/utils/metodoMarcacion';

async function main() {
  const col = await prisma.colaborador.findFirst({ select: { id: true, nombre: true } });
  if (!col) {
    console.error('No hay ningún colaborador en esta base. Corre el seed primero.');
    process.exit(1);
  }
  console.log(`\nCostura de `+'`camposDeAutenticacion`'+` contra la base de verdad.`);
  console.log(`Colaborador de prueba: ${col.nombre} (${col.id})\n`);

  const creados: string[] = [];
  let fallos = 0;

  const casos = [
    { nombre: 'rostro con distancia', sesion: { metodo: 'ROSTRO', distancia: 0.3421 },
      espera: { metodoEntrada: 'ROSTRO', distanciaEntrada: 0.3421, metodoSalida: 'ROSTRO', distanciaSalida: 0.3421 } },
    { nombre: 'cédula sin distancia', sesion: { metodo: 'CEDULA' },
      espera: { metodoEntrada: 'CEDULA', distanciaEntrada: null, metodoSalida: 'CEDULA', distanciaSalida: null } },
    { nombre: 'distancia exactamente 0', sesion: { metodo: 'ROSTRO', distancia: 0 },
      espera: { metodoEntrada: 'ROSTRO', distanciaEntrada: 0, metodoSalida: 'ROSTRO', distanciaSalida: 0 } },
    { nombre: 'token viejo, sin método', sesion: {},
      espera: { metodoEntrada: null, distanciaEntrada: null, metodoSalida: null, distanciaSalida: null } },
  ];

  try {
    for (const caso of casos) {
      const ahora = new Date();
      const creado = await prisma.registro.create({
        data: {
          colaboradorId: col.id,
          fecha: ahora,
          entrada: ahora,
          salida: ahora,
          // Exactamente el mismo gesto que hace la ruta de marcación.
          ...camposDeAutenticacion(caso.sesion, 'entrada'),
          ...camposDeAutenticacion(caso.sesion, 'salida'),
        } as any,
      });
      creados.push(creado.id);

      // Se vuelve a LEER de la base, no se mira el objeto que devolvió el create:
      // es la única forma de saber que la columna existe y guardó el valor.
      const leido = await prisma.registro.findUniqueOrThrow({
        where: { id: creado.id },
        select: { metodoEntrada: true, metodoSalida: true, distanciaEntrada: true, distanciaSalida: true },
      });

      const ok = (Object.keys(caso.espera) as (keyof typeof leido)[])
        .every(k => leido[k] === (caso.espera as any)[k]);
      if (!ok) fallos++;
      console.log(`  ${ok ? 'OK  ' : 'MAL '} ${caso.nombre.padEnd(24)} -> ${JSON.stringify(leido)}`);
      if (!ok) console.log(`       se esperaba            -> ${JSON.stringify(caso.espera)}`);
    }
  } finally {
    // Se borra pase lo que pase, incluso si una comprobación explotó.
    if (creados.length) {
      const { count } = await prisma.registro.deleteMany({ where: { id: { in: creados } } });
      console.log(`\n  Limpieza: ${count} de ${creados.length} marcaciones de prueba borradas.`);
      const quedan = await prisma.registro.count({ where: { id: { in: creados } } });
      console.log(`  Quedan en la base: ${quedan} (tiene que ser 0).`);
      if (quedan !== 0) fallos++;
    }
  }

  console.log(fallos === 0
    ? '\n  Todo bien: lo que devuelve la función llega a las columnas.\n'
    : `\n  ${fallos} PROBLEMAS. No desplegar hasta entenderlos.\n`);
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
