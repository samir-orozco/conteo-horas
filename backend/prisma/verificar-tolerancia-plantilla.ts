import { prisma } from '../src/prisma';
import { limpiarPlantilla } from '../src/utils/cuerpoDePlantilla';
import { diaDesdePlantilla } from '../src/utils/pintarDia';

// ¿UNA TOLERANCIA PROPIA LLEGA DE VERDAD A LA BASE Y VUELVE? (23 de septiembre de 2026)
//
// El 23 de septiembre un turno del catálogo pasó a poder SOBRESCRIBIR la tolerancia del horario.
// Los módulos puros tienen sus pruebas y sus mutaciones, pero eso no dice nada sobre la costura:
// que `limpiarPlantilla` y Prisma se entiendan, que las columnas existan, y que un CERO sobreviva
// al viaje de ida y vuelta.
//
// Ese cero es todo el asunto. `0` significa «sin tolerancia» y `NULL` significa «la del horario».
// Si algo en el camino los confunde —un `||`, un `?? 0`, una columna con DEFAULT— el turno que
// alguien configuró para no perdonar ni un minuto pasaría a perdonar los diez del horario, y no se
// vería en ninguna pantalla: se vería en una tardanza que no se contó.
//
// Es la verificación de costura del CLAUDE.md §8.6: crea el caso, corre las funciones de verdad,
// comprueba lo que quedó escrito, y BORRA lo que creó. No reemplaza una prueba de integración de la
// ruta, que sigue pendiente porque necesita sesión abierta.
//
// Se corre:  npx ts-node prisma/verificar-tolerancia-plantilla.ts

const MARCA = 'ZZZ-verificacion-tolerancia';

async function main() {
  const empresa = await prisma.empresa.findFirst({ select: { id: true, nombre: true } });
  // Un vacío NO es un resultado negativo (CLAUDE.md §12.2): se dice qué pasó.
  if (!empresa) {
    console.log('*** NO HAY DATOS: ninguna empresa en esta base. No se verificó nada.');
    return;
  }
  console.log(`Empresa: ${empresa.nombre}\n`);

  // El cuerpo tal como lo manda la pantalla con el interruptor encendido. La tolerancia de entrada
  // va en CERO a propósito: es el caso que se rompe solo.
  const cuerpo = {
    nombre: MARCA,
    color: 'ambar',
    esDescanso: false,
    horaEntrada: '22:00',
    horaSalida: '06:00',
    tieneAlmuerzo: false,
    toleranciaMin: 0,
    toleranciaSalidaMin: 20,
    ajustaEntrada: false,
  };

  const limpia = limpiarPlantilla(cuerpo);
  if (!limpia.ok) {
    console.log(`*** El cuerpo se rechazó: ${limpia.motivo}`);
    return;
  }
  console.log('1) limpiarPlantilla lo aceptó y devolvió:');
  console.log(`     toleranciaMin=${limpia.datos.toleranciaMin}  toleranciaSalidaMin=${limpia.datos.toleranciaSalidaMin}  ajustaEntrada=${limpia.datos.ajustaEntrada}\n`);

  let creadaId: string | null = null;
  try {
    const creada = await prisma.plantillaTurno.create({
      data: { empresaId: empresa.id, ...limpia.datos },
    });
    creadaId = creada.id;

    // LO QUE IMPORTA: releer de la base, no mirar lo que devolvió el create.
    const leida = await prisma.plantillaTurno.findUniqueOrThrow({
      where: { id: creada.id },
      select: { toleranciaMin: true, toleranciaSalidaMin: true, ajustaEntrada: true },
    });
    console.log('2) releída de la base:');
    console.log(`     toleranciaMin=${leida.toleranciaMin}  toleranciaSalidaMin=${leida.toleranciaSalidaMin}  ajustaEntrada=${leida.ajustaEntrada}\n`);

    const ceroSobrevivio = leida.toleranciaMin === 0;
    const falseSobrevivio = leida.ajustaEntrada === false;

    // 3) Y que al PINTAR un día, la del turno le gane a la del horario.
    const horario = { toleranciaMin: 10, almuerzoMin: 60, toleranciaSalidaMin: 15, ajustaEntrada: true };
    const dia = diaDesdePlantilla(
      {
        esDescanso: false, horaEntrada: '22:00', horaSalida: '06:00', tieneAlmuerzo: false,
        almuerzoInicio: null, almuerzoFin: null, descansos: null,
        toleranciaMin: leida.toleranciaMin,
        toleranciaSalidaMin: leida.toleranciaSalidaMin,
        ajustaEntrada: leida.ajustaEntrada,
      },
      horario,
    );
    console.log('3) el día pintado con ese turno, contra un horario de 10/15/true:');
    console.log(`     toleranciaMin=${dia?.toleranciaMin}  toleranciaSalidaMin=${dia?.toleranciaSalidaMin}  ajustaEntrada=${dia?.ajustaEntrada}\n`);

    const gana = dia?.toleranciaMin === 0 && dia?.toleranciaSalidaMin === 20 && dia?.ajustaEntrada === false;

    console.log('--- VEREDICTO');
    console.log(`    el CERO sobrevivió al viaje:        ${ceroSobrevivio ? 'sí' : '*** NO ***'}`);
    console.log(`    el FALSE sobrevivió al viaje:       ${falseSobrevivio ? 'sí' : '*** NO ***'}`);
    console.log(`    la del turno le gana a la horario:  ${gana ? 'sí' : '*** NO ***'}`);
    if (!ceroSobrevivio || !falseSobrevivio || !gana) {
      console.log('    *** ALGO NO CUADRA: no dar la costura por buena.');
    } else {
      console.log('    la costura funciona de punta a punta.');
    }
  } finally {
    // Se borra SIEMPRE, también si algo falló arriba: esto corre contra la base de trabajo del
    // dueño y no puede dejar un turno de mentira en su catálogo.
    if (creadaId) {
      await prisma.plantillaTurno.delete({ where: { id: creadaId } });
      const quedan = await prisma.plantillaTurno.count({ where: { nombre: MARCA } });
      console.log(`\n--- limpieza: borrada. Plantillas con la marca que quedan: ${quedan} (tiene que ser 0)`);
    }
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
