import { prisma } from '../src/prisma';
import { combinarDiasEsperados } from '../src/utils/diasEsperados';
import { rangoReporte, claveDiaBogota, medianocheBogota } from '../src/utils/fechas';
import { leerDescansos } from '../src/utils/descansos';

// ¿LOS CAMPOS NUEVOS DEL CALENDARIO LLEGAN CON VALORES DE VERDAD? (22 de septiembre de 2026)
//
// El 22 de septiembre `GET /turnos/calendario` empezó a mandar las reglas de cada día —las dos
// tolerancias, el almuerzo con su ventana y los descansos no remunerados— para que el panel de la
// celda las muestre. Hasta ahora lo ÚNICO que respaldaba eso era `tsc`: que los campos existen en
// `DiaEsperadoCalculado` y que el tipo cuadra. Eso no dice nada sobre lo que sale de la base.
//
// Este guion replica lo que hace la ruta con los mismos módulos (no una copia del cálculo) y
// imprime los valores para cotejarlos a mano. Es la verificación de costura del CLAUDE.md §8.6, en
// su variante más barata: la ruta es de LECTURA, así que no hay nada que crear ni que borrar.
//
// NO ES UNA PRUEBA AUTOMATIZADA y no reemplaza la de la costura HTTP, que sigue pendiente porque
// necesita sesión abierta. Lo que sí descarta es el fallo silencioso: que los campos viajen todos
// en blanco y el panel muestre «sin tolerancia / no se descuenta / ninguno» para todo el mundo.
//
// Se corre:  npx ts-node prisma/verificar-campos-calendario.ts

const UN_DIA_MS = 24 * 60 * 60 * 1000;

function lunesDeHoyBogota(): string {
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  const f = medianocheBogota(hoy);
  const diaSemana = f.getUTCDay(); // 0 = domingo
  const haciaAtras = diaSemana === 0 ? 6 : diaSemana - 1;
  return claveDiaBogota(new Date(f.getTime() - haciaAtras * UN_DIA_MS));
}

async function main() {
  const desde = lunesDeHoyBogota();
  const hasta = claveDiaBogota(new Date(medianocheBogota(desde).getTime() + 6 * UN_DIA_MS));
  const { desdeF, finExclusivo } = rangoReporte(desde, hasta);
  console.log(`Semana mirada: ${desde} a ${hasta}\n`);

  // Alguien que tenga horario: sin horario no hay reglas que mostrar, y el caso no probaría nada.
  const persona = await prisma.colaborador.findFirst({
    where: { activo: true, horarioId: { not: null } },
    select: {
      id: true, nombre: true, apellido: true,
      horario: { include: { franjas: true } },
    },
    orderBy: { nombre: 'asc' },
  });

  // Un vacío NO es un resultado negativo (CLAUDE.md §12.2): se dice qué pasó, no se calla.
  if (!persona || !persona.horario) {
    console.log('*** NO HAY DATOS: ningún colaborador activo con horario en esta base.');
    console.log('    Esto NO significa que los campos lleguen vacíos: significa que no se pudo mirar.');
    return;
  }
  console.log(`Persona: ${persona.nombre} ${persona.apellido}`);
  console.log(`Horario: ${persona.horario.nombre} (${persona.horario.franjas.length} franjas)\n`);

  const mias = await prisma.diaEsperado.findMany({
    where: { colaboradorId: persona.id, fecha: { gte: desdeF, lt: finExclusivo } },
    orderBy: { fecha: 'asc' },
  });
  const conFila = new Set(mias.map(f => claveDiaBogota(f.fecha)));
  console.log(`Filas en dias_esperados: ${mias.length} de 7 (las demás las resuelve el horario)\n`);

  const combinados = combinarDiasEsperados(desdeF, finExclusivo, mias, persona.horario);

  let conAlgunaRegla = 0;
  for (const d of combinados) {
    const clave = claveDiaBogota(d.fecha);
    const origen = conFila.has(clave) ? 'fila' : 'horario';
    if (!d.programado) {
      console.log(`${clave} [${origen}]  no programado`);
      continue;
    }
    const descansos = leerDescansos(d.descansos);
    const ventana = d.almuerzoInicio && d.almuerzoFin ? `${d.almuerzoInicio}-${d.almuerzoFin}` : 'sin ventana';
    console.log(
      `${clave} [${origen}]  ${d.horaEntrada}-${d.horaSalida}  ${d.minutosEsperados} min\n` +
      `            tolerancia entrada ${d.toleranciaMin} min` +
      `${d.ajustaEntrada ? ' (vale también para llegar antes)' : ''}` +
      `, salida ${d.toleranciaSalidaMin} min\n` +
      `            almuerzo ${d.almuerzoMin} min, ${ventana}\n` +
      `            descansos no remunerados: ${descansos.length}` +
      `${descansos.length ? ' -> ' + descansos.map(v => `${v.inicio}-${v.fin}`).join(', ') : ''}`,
    );
    // «Alguna regla» = algo que el panel pueda mostrar distinto del caso vacío.
    if (d.toleranciaMin > 0 || d.toleranciaSalidaMin > 0 || d.almuerzoMin > 0
      || d.almuerzoInicio !== null || descansos.length > 0) conAlgunaRegla++;
  }

  const programados = combinados.filter(d => d.programado).length;
  console.log(`\n--- Días programados: ${programados}. Con alguna regla puesta: ${conAlgunaRegla}.`);
  if (programados === 0) {
    console.log('    Esta persona no trabaja ningún día de esta semana: el caso no dice nada.');
  } else if (conAlgunaRegla === 0) {
    console.log('    *** OJO: todos los días vienen SIN tolerancia, SIN almuerzo y SIN descansos.');
    console.log('    Puede ser correcto (un horario que no descuenta nada), pero hay que cotejarlo');
    console.log('    contra el horario ANTES de dar por buenos los campos nuevos.');
  } else {
    console.log('    Los campos nuevos llegan con valores de verdad, no en blanco.');
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
