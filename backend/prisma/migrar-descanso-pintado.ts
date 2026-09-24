// Los días que ya estaban marcados como descanso, antes de que existiera la columna
// (23 de septiembre de 2026).
//
// Hasta hoy, marcar un día como libre se hacía pintándolo con un turno del catálogo cuyo
// `esDescanso` era true. Ese concepto se retira: «descanso es siempre descanso», así que dejó de
// ser un turno que cada empresa tenía que inventarse y pasó a ser una acción sobre el día
// (`dias_esperados.descansoPintado`).
//
// Este guion traslada el hecho de un sitio al otro. Sin él, los días ya marcados perderían su
// condición de descanso en cuanto se borren las plantillas, y volverían a verse como «sin turno».
//
// Y HACE FALTA ANTES de borrar nada: `dias_esperados.plantillaId` tiene `onDelete: Restrict` a
// propósito, así que una plantilla que ya pintó días no se puede borrar mientras alguien la
// apunte. Primero se traslada el hecho y se suelta la referencia; después se borran las plantillas.
//
// Idempotente: correrlo dos veces no cambia nada la segunda vez.
//
//   npx ts-node prisma/migrar-descanso-pintado.ts
import { prisma } from '../src/prisma';

(async () => {
  const plantillasDescanso = await prisma.plantillaTurno.findMany({
    where: { esDescanso: true },
    select: { id: true, nombre: true, empresaId: true },
  });
  console.log(`Plantillas de descanso en el catálogo: ${plantillasDescanso.length}`);

  const ids = plantillasDescanso.map(p => p.id);
  if (ids.length === 0) {
    console.log('No hay ninguna. Nada que migrar.');
    await prisma.$disconnect();
    return;
  }

  // Los días pintados con alguna de ellas. Se leen ANTES de tocar nada, para poder contar.
  const pintados = await prisma.diaEsperado.findMany({
    where: { plantillaId: { in: ids } },
    select: { id: true, fecha: true, descansoPintado: true, colaborador: { select: { nombre: true, apellido: true } } },
  });
  console.log(`Días pintados con una de ellas: ${pintados.length}`);
  for (const d of pintados) {
    console.log(`  ${d.fecha.toISOString().slice(0, 10)}  ${d.colaborador.nombre} ${d.colaborador.apellido}` +
      `  (descansoPintado actual: ${d.descansoPintado})`);
  }

  // El traslado: el día pasa a decirlo por sí mismo y suelta la plantilla.
  //
  // `origen` NO se toca: sigue siendo MANUAL, que es lo que protege el día de que el materializador
  // lo regenere desde el horario. Ese marcador significa «alguien ajustó esto a mano», y sigue
  // siendo verdad.
  const { count } = await prisma.diaEsperado.updateMany({
    where: { plantillaId: { in: ids } },
    data: { descansoPintado: true, plantillaId: null },
  });
  console.log(`\nTrasladados: ${count}`);

  // EL CONTROL DEL EFECTO, no de que el comando no se quejara (CLAUDE.md §12.1).
  const quedanApuntando = await prisma.diaEsperado.count({ where: { plantillaId: { in: ids } } });
  const conDescansoPintado = await prisma.diaEsperado.count({ where: { descansoPintado: true } });
  console.log(`Días que todavía apuntan a una plantilla de descanso: ${quedanApuntando} (tiene que ser 0)`);
  console.log(`Días con descansoPintado = true en total: ${conDescansoPintado}`);

  if (quedanApuntando !== 0) {
    console.log('*** NO se soltaron todas las referencias: NO borrar las plantillas todavía.');
  } else if (conDescansoPintado < pintados.length) {
    console.log('*** Se soltaron las referencias pero hay menos días marcados de los que había: revisar.');
  } else {
    console.log('Listo: las plantillas de descanso ya se pueden borrar sin dejar ningún día colgando.');
  }

  await prisma.$disconnect();
})().catch(async e => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
