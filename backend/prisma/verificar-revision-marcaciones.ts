/**
 * ¿La pantalla de revisión deja escapar alguna foto, o datos de otra empresa?
 *
 * Corre `consultarRevision`, que es LA MISMA función que usa la ruta, no una
 * copia: una copia se separa del original sin que nadie lo note y entonces el
 * script verifica algo que ya no es lo que corre en producción.
 *
 * Comprueba tres cosas que `tsc` no puede comprobar:
 *   1. Que ninguna foto viaje en la respuesta. La consulta SÍ trae `fotoEntrada`
 *      y `fotoSalida` de la base (hacen falta para saber si existen), y solo un
 *      `!!` las convierte en booleano. Si alguien quita ese `!!`, TypeScript no
 *      dice nada y se filtran megabytes de rostros a un listado, que es
 *      justamente lo que la política publicada dice que no pasa.
 *   2. Que no viaje la distancia cruda del reconocimiento.
 *   3. Que una empresa no vea marcaciones de otra.
 *
 * CREA MARCACIONES DE PRUEBA Y LAS BORRA. No toca ninguna otra fila.
 *
 *   npx ts-node --transpile-only prisma/verificar-revision-marcaciones.ts
 */
import { prisma } from '../src/prisma';
import { consultarRevision } from '../src/routes/registros';

// Una foto de mentira pero con la forma de una de verdad: si se filtrara, esta
// cadena aparecería tal cual en la respuesta.
const FOTO = 'data:image/jpeg;base64,/9j/' + 'SEÑAL_DE_FOTO_FILTRADA'.repeat(40);
const DISTANCIA = 0.31415;

async function main() {
  const col = await prisma.colaborador.findFirst({
    select: { id: true, nombre: true, empresaId: true },
  });
  if (!col) { console.error('No hay colaboradores en esta base. Corre el seed.'); process.exit(1); }

  const otra = await prisma.colaborador.findFirst({
    where: { empresaId: { not: col.empresaId } },
    select: { id: true, empresaId: true },
  });

  console.log(`\nRevisión de marcaciones, contra la base de verdad.`);
  console.log(`Empresa de prueba: ${col.empresaId}`);
  console.log(otra ? `Otra empresa para el aislamiento: ${otra.empresaId}\n`
                   : `(solo hay una empresa: el aislamiento no se puede probar aquí)\n`);

  const creados: string[] = [];
  let fallos = 0;
  const comprobar = (ok: boolean, texto: string) => {
    if (!ok) fallos++;
    console.log(`  ${ok ? 'OK  ' : 'MAL '} ${texto}`);
  };

  try {
    const ahora = new Date();
    const mio = await prisma.registro.create({
      data: {
        colaboradorId: col.id, fecha: ahora, entrada: ahora, salida: ahora,
        fotoEntrada: FOTO, fotoSalida: FOTO,
        metodoEntrada: 'ROSTRO', metodoSalida: 'ROSTRO',
        distanciaEntrada: DISTANCIA, distanciaSalida: DISTANCIA,
      },
    });
    creados.push(mio.id);

    if (otra) {
      const ajeno = await prisma.registro.create({
        data: { colaboradorId: otra.id, fecha: ahora, entrada: ahora, fotoEntrada: FOTO },
      });
      creados.push(ajeno.id);
    }

    const r = await consultarRevision(col.empresaId);
    const crudo = JSON.stringify(r);

    comprobar(!crudo.includes('SEÑAL_DE_FOTO_FILTRADA'), 'ninguna foto viaja en la respuesta');
    comprobar(!crudo.includes('data:image'), 'ni siquiera la cabecera de un data URL');
    comprobar(!crudo.includes(String(DISTANCIA)), 'la distancia cruda no viaja');

    const mios = r.eventos.filter(e => e.registroId === mio.id);
    comprobar(mios.length === 2, `la marcación de prueba produce 2 eventos (dio ${mios.length})`);
    comprobar(mios.every(e => e.tieneFoto), 'y los dos dicen que SÍ tienen foto');
    comprobar(mios.every(e => e.distanciaRepetida),
      'la misma distancia en entrada y salida se marca como repetida');

    if (otra) {
      const filtrados = r.eventos.filter(e => e.colaboradorId === otra.id);
      comprobar(filtrados.length === 0, 'no se cuela ninguna marcación de la otra empresa');
      const desdeLaOtra = await consultarRevision(otra.empresaId);
      comprobar(!desdeLaOtra.eventos.some(e => e.registroId === mio.id),
        'y al revés tampoco: la otra empresa no ve la nuestra');
    }
  } finally {
    if (creados.length) {
      const { count } = await prisma.registro.deleteMany({ where: { id: { in: creados } } });
      const quedan = await prisma.registro.count({ where: { id: { in: creados } } });
      console.log(`\n  Limpieza: ${count} de ${creados.length} borradas. Quedan ${quedan} (tiene que ser 0).`);
      if (quedan !== 0) fallos++;
    }
  }

  console.log(fallos === 0 ? '\n  Todo bien.\n' : `\n  ${fallos} PROBLEMAS. No desplegar.\n`);
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
