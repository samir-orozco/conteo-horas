// ────────── DATOS DE MUESTRA PARA MIRAR LA REJILLA CON VOLUMEN (29 de septiembre de 2026) ──────────
//
// NO ES CÓDIGO DE PRODUCCIÓN. Es un guion de los de `backend/prisma/`, del mismo tipo que
// `diagnostico-autocierre.ts`: sirve para ver en el navegador cómo queda el calendario con veinte
// personas y un mes entero programado, cruzando todas las combinaciones de descanso y de rotación.
//
// SE PINTA POR EL CAMINO REAL y no escribiendo filas a mano. `pintarDiaDeColaborador` recibe el
// «ahora» como parámetro, así que pasándole el 31 de agosto todo septiembre le queda en FUTURO y pasa
// sus propias guardas. Con eso, estos días son exactamente los que produciría alguien pintándolos
// desde la pantalla: mismo cálculo de minutos, misma reescritura del descanso de la semana.
//
// SE DESHACE ENTERO con `--borrar`: todo lo que crea lleva marca, que es la cédula empezando por 99.
//
// APUNTA A UNA EMPRESA POR NOMBRE, la de la base de desarrollo. Es a propósito y no una constante que
// alguien deba parametrizar: este guion escribe 510 jornadas y 20 colaboradores, y si tomara «la
// primera empresa que encuentre» bastaría correrlo por error contra otra base para llenarla de gente
// inventada. Con el nombre escrito, contra cualquier otra base no encuentra nada y se sale diciéndolo.
//
// NO ES PARA PRODUCCIÓN. No hay ninguna guarda que lo impida porque los demás guiones de esta carpeta
// tampoco la tienen: lo que protege es que el nombre no exista allí.

const AVISO = 'no encontré la empresa';
import { prisma } from '../src/prisma';
import { pintarDiaDeColaborador, marcarDescansoDeColaborador } from '../src/utils/materializarDias';

const EMPRESA = 'Seguridad Andina Ltda';
// La marca por la que se reconoce y se borra lo de este guion.
const CEDULA = (n: number) => `99${String(n).padStart(5, '0')}`;
const ES_DEMO = { startsWith: '99' };
const MES = '2026-09';
// Todo septiembre le queda en futuro a este instante, así que las guardas del pintado pasan.
const AHORA = new Date('2026-08-29T05:00:00Z');

// LA REJILLA ENTERA Y NO SOLO EL MES, y esto salió de mirarlo en el navegador. La vista de mes
// arranca el LUNES de la semana del día 1 y termina el domingo de la semana del último: en septiembre
// de 2026 eso es del 31 de agosto al 4 de octubre. Pintando solo del 1 al 30, esos días de relleno se
// quedaban con lo que exige el HORARIO, y como el horario pide nueve horas, la primera semana de todo
// el mundo salía en 49 h y la pantalla se veía roja entera. No era un defecto de la pantalla: era este
// guion programando medio mes.
const PRIMER_DIA = new Date(Date.UTC(2026, 7, 31, 5, 0, 0)); // lunes 31 de agosto, medianoche de Bogotá
const ULTIMO_DIA = new Date(Date.UTC(2026, 9, 4, 5, 0, 0));  // domingo 4 de octubre
const UN_DIA = 24 * 60 * 60 * 1000;
const DIAS_DE_LA_REJILLA = Math.round((ULTIMO_DIA.getTime() - PRIMER_DIA.getTime()) / UN_DIA) + 1;
const dia = (i: number) => new Date(PRIMER_DIA.getTime() + (i - 1) * UN_DIA);

// ─── LOS TURNOS DEL CATÁLOGO ───
const TURNOS = [
  { nombre: 'Mañana', color: 'esmeralda', horaEntrada: '06:00', horaSalida: '14:00', tieneAlmuerzo: false },
  { nombre: 'Tarde', color: 'ambar', horaEntrada: '14:00', horaSalida: '22:00', tieneAlmuerzo: false },
  { nombre: 'Noche', color: 'cobalto', horaEntrada: '22:00', horaSalida: '06:00', tieneAlmuerzo: false },
  { nombre: 'Madrugada', color: 'violeta', horaEntrada: '02:00', horaSalida: '10:00', tieneAlmuerzo: false },
  { nombre: 'Diurno', color: 'grafito', horaEntrada: '08:00', horaSalida: '17:00', tieneAlmuerzo: true },
];

// ─── LOS HORARIOS DE MUESTRA (30 de septiembre de 2026) ───
//
// LA VARIEDAD SE MUDÓ AQUÍ. Hasta hoy las veinte personas compartían el horario de la empresa y lo que
// las diferenciaba eran tres columnas suyas: «esta descansa el martes por acuerdo escrito». Esas
// columnas se borraron, porque el día de descanso lo dicen las FRANJAS del horario o la programación de
// cada semana. Así que para ver los cuatro casos en pantalla hay que darle a la gente horarios
// distintos, que es como se ven de verdad.
//
// Los cuatro casos, que son todos los que existen:
//
//   L_A_V         dos días libres (sábado y domingo) → manda la presunción: el domingo.
//   L_A_S         uno libre, y es el domingo         → el domingo, y coincide con la presunción.
//   LIBRE_LUNES   uno libre y NO es el domingo       → el LUNES. Es el único que se nombra en la fila.
//   SIETE_DIAS    ninguno libre                     → el domingo por presunción, trabajado y con recargo.
//   null          SIN HORARIO                       → no tiene día fijo: lo pone la programación.
const HORARIOS_DEMO = {
  L_A_V: { nombre: 'Demo · lunes a viernes', dias: ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'] },
  L_A_S: { nombre: 'Demo · lunes a sábado', dias: ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'] },
  LIBRE_LUNES: { nombre: 'Demo · libra el lunes', dias: ['MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'] },
  SIETE_DIAS: { nombre: 'Demo · los siete días', dias: ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'] },
} as const;
type ClaveDeHorario = keyof typeof HORARIOS_DEMO;

// ─── EL REPARTO. Cruza todo lo que la pantalla puede dibujar. ───
//
// `patron` es cuántos trabaja y cuántos descansa, con el mismo significado que `ROTACIONES` en el
// frontend. `desfase` corre el ciclo para que dos personas del mismo patrón no descansen el mismo día.
// `marcaDescanso` dice si a quien NO tiene horario se le marca su día libre: a propósito hay de los
// dos, para ver en pantalla el chip de «descanso sin marcar» al lado de quien sí lo tiene.
type Personaje = {
  nombre: string; apellido: string; cargo: string;
  // `null` = sin horario, que es el caso en que la programación pone el descanso.
  horario: ClaveDeHorario | null;
  turnos: string[];            // el o los turnos que se le pintan, alternando
  patron: { trabaja: number; descansa: number };
  desfase: number;
  marcaDescanso: boolean;
  sinPintar?: boolean;
};

const REPARTO: Personaje[] = [
  // ── Lunes a viernes: les sobran dos días libres, así que manda la presunción y descansan el domingo ──
  { nombre: 'Camila', apellido: 'Ardila', cargo: 'Coordinadora', horario: 'L_A_V', turnos: ['Diurno'], patron: { trabaja: 5, descansa: 2 }, desfase: 0, marcaDescanso: false },
  { nombre: 'Andrés', apellido: 'Bermúdez', cargo: 'Analista', horario: 'L_A_V', turnos: ['Diurno'], patron: { trabaja: 5, descansa: 2 }, desfase: 0, marcaDescanso: false },
  { nombre: 'Lucía', apellido: 'Cáceres', cargo: 'Recursos humanos', horario: 'L_A_V', turnos: ['Diurno'], patron: { trabaja: 5, descansa: 2 }, desfase: 0, marcaDescanso: false },

  // ── Lunes a sábado: les sobra UNO y es el domingo. La fila no dice nada, porque es el caso normal ──
  { nombre: 'Jorge', apellido: 'Delgado', cargo: 'Guarda', horario: 'L_A_S', turnos: ['Mañana'], patron: { trabaja: 6, descansa: 1 }, desfase: 0, marcaDescanso: false },
  { nombre: 'Marta', apellido: 'Espitia', cargo: 'Guarda', horario: 'L_A_S', turnos: ['Tarde'], patron: { trabaja: 6, descansa: 1 }, desfase: 0, marcaDescanso: false },

  // ── Libra el lunes: el único caso en que la fila NOMBRA un día, «descansa lunes» ──
  { nombre: 'Hernán', apellido: 'Fajardo', cargo: 'Guarda nocturno', horario: 'LIBRE_LUNES', turnos: ['Noche'], patron: { trabaja: 6, descansa: 1 }, desfase: 1, marcaDescanso: false },
  { nombre: 'Paola', apellido: 'Guerrero', cargo: 'Guarda nocturno', horario: 'LIBRE_LUNES', turnos: ['Noche'], patron: { trabaja: 6, descansa: 1 }, desfase: 3, marcaDescanso: false },
  { nombre: 'Iván', apellido: 'Huertas', cargo: 'Supervisor', horario: 'LIBRE_LUNES', turnos: ['Diurno'], patron: { trabaja: 6, descansa: 1 }, desfase: 6, marcaDescanso: false },

  // ── Los siete días: no les sobra ninguno, así que su domingo es descanso trabajado con recargo ──
  { nombre: 'Karen', apellido: 'Ibáñez', cargo: 'Guarda nocturno', horario: 'SIETE_DIAS', turnos: ['Noche'], patron: { trabaja: 6, descansa: 1 }, desfase: 2, marcaDescanso: false },
  { nombre: 'Luis', apellido: 'Jaramillo', cargo: 'Guarda nocturno', horario: 'SIETE_DIAS', turnos: ['Noche'], patron: { trabaja: 6, descansa: 1 }, desfase: 4, marcaDescanso: false },

  // ── SIN HORARIO 6x1: aquí es donde la programación pone el descanso, y a estos SÍ se les marca ──
  { nombre: 'Nubia', apellido: 'Lozano', cargo: 'Guarda', horario: null, turnos: ['Madrugada'], patron: { trabaja: 6, descansa: 1 }, desfase: 5, marcaDescanso: true },
  { nombre: 'Óscar', apellido: 'Mahecha', cargo: 'Guarda', horario: null, turnos: ['Mañana'], patron: { trabaja: 6, descansa: 1 }, desfase: 0, marcaDescanso: true },
  // Sin marcar, a propósito: es el que saca el chip de «descanso sin marcar» al lado de los de arriba.
  { nombre: 'Pilar', apellido: 'Nieto', cargo: 'Guarda', horario: null, turnos: ['Mañana'], patron: { trabaja: 6, descansa: 1 }, desfase: 2, marcaDescanso: false },

  // ── SIN HORARIO 4x2: el descanso se corre un día cada semana ──
  { nombre: 'Ramiro', apellido: 'Ochoa', cargo: 'Guarda nocturno', horario: null, turnos: ['Noche'], patron: { trabaja: 4, descansa: 2 }, desfase: 4, marcaDescanso: true },
  { nombre: 'Sandra', apellido: 'Peña', cargo: 'Guarda', horario: null, turnos: ['Tarde'], patron: { trabaja: 4, descansa: 2 }, desfase: 0, marcaDescanso: false },

  // ── SIN HORARIO 2x2: el más movido, el descanso se corre tres días cada semana ──
  { nombre: 'Tomás', apellido: 'Quintero', cargo: 'Guarda', horario: null, turnos: ['Tarde'], patron: { trabaja: 2, descansa: 2 }, desfase: 2, marcaDescanso: true },

  // ── Turno mixto: alterna mañana y tarde, que es lo que hace media operación de verdad ──
  { nombre: 'Úrsula', apellido: 'Rincón', cargo: 'Cajera', horario: 'LIBRE_LUNES', turnos: ['Mañana', 'Tarde'], patron: { trabaja: 6, descansa: 1 }, desfase: 2, marcaDescanso: false },
  { nombre: 'Víctor', apellido: 'Salcedo', cargo: 'Cajero', horario: null, turnos: ['Mañana', 'Tarde', 'Noche'], patron: { trabaja: 5, descansa: 2 }, desfase: 3, marcaDescanso: true },

  // ── LOS DOS CASOS QUE DISPARAN AVISOS, a propósito ──
  // Siete de siete: semana sin ningún descanso (art. 173). Sale el chip rojo.
  { nombre: 'Wilson', apellido: 'Tavera', cargo: 'Guarda nocturno', horario: null, turnos: ['Noche'], patron: { trabaja: 7, descansa: 0 }, desfase: 0, marcaDescanso: false },
  // Sin nada pintado: solo lo que exige su horario. Para ver la celda de «Agregar».
  { nombre: 'Yolanda', apellido: 'Vargas', cargo: 'Aseo', horario: 'L_A_V', turnos: [], patron: { trabaja: 0, descansa: 0 }, desfase: 0, marcaDescanso: false, sinPintar: true },
];

async function borrar(empresaId: string) {
  const suyos = await prisma.colaborador.findMany({ where: { empresaId, cedula: ES_DEMO }, select: { id: true } });
  const ids = suyos.map(c => c.id);
  console.log('colaboradores de muestra encontrados:', ids.length);
  if (ids.length) {
    // Los días primero: `plantillaId` es RESTRICT, asi que una plantilla con días encima no se borra.
    const d = await prisma.diaEsperado.deleteMany({ where: { colaboradorId: { in: ids } } });
    await prisma.colaboradorSede.deleteMany({ where: { colaboradorId: { in: ids } } });
    await prisma.colaborador.deleteMany({ where: { id: { in: ids } } });
    console.log('días borrados:', d.count);
  }
  // LOS HORARIOS DE MUESTRA TAMBIÉN, y DESPUÉS de la gente: un horario con colaboradores encima no se
  // borra. Se reconocen por el nombre, que es la única marca que tienen.
  const h = await prisma.horario.deleteMany({
    where: { empresaId, nombre: { in: Object.values(HORARIOS_DEMO).map(x => x.nombre) } },
  });
  console.log('horarios de muestra borrados:', h.count);
  console.log('quedan colaboradores en la empresa:', await prisma.colaborador.count({ where: { empresaId } }));
}

async function main() {
  const empresa = await prisma.empresa.findFirst({ where: { nombre: EMPRESA }, select: { id: true } });
  if (!empresa) { console.log(AVISO, EMPRESA, '— este guion es solo para la base de desarrollo'); return; }

  if (process.argv.includes('--borrar')) { await borrar(empresa.id); return; }

  const sede = await prisma.sede.findFirst({ where: { empresaId: empresa.id }, select: { id: true } });

  // LOS HORARIOS DE MUESTRA, uno por patrón de días. Son la fuente del día de descanso, así que sin
  // ellos este guion no muestra ninguna variedad.
  //
  // SE BUSCAN POR NOMBRE ANTES DE CREAR, como los turnos del catálogo: correr el guion dos veces no
  // puede dejar ocho horarios. Y la franja se reescribe siempre, para que cambiar la lista de días de
  // arriba se vea sin tener que borrar a mano.
  const horariosDemo = new Map<ClaveDeHorario, string>();
  for (const [clave, def] of Object.entries(HORARIOS_DEMO) as [ClaveDeHorario, { nombre: string; dias: readonly string[] }][]) {
    const ya = await prisma.horario.findFirst({ where: { empresaId: empresa.id, nombre: def.nombre }, select: { id: true } });
    const h = ya ?? await prisma.horario.create({
      data: { empresaId: empresa.id, nombre: def.nombre, toleranciaMin: 10, almuerzoMin: 60 },
      select: { id: true },
    });
    await prisma.franjaHorario.deleteMany({ where: { horarioId: h.id } });
    await prisma.franjaHorario.create({
      data: {
        horarioId: h.id, dias: [...def.dias], horaEntrada: '08:00', horaSalida: '17:00',
        tieneAlmuerzo: true, almuerzoInicio: '12:00', almuerzoFin: '13:00',
      },
    });
    horariosDemo.set(clave, h.id);
  }
  console.log('horarios de muestra listos:', [...horariosDemo.keys()].join(', '));

  // Los turnos del catálogo, sin duplicar los que ya estén.
  const plantillas = new Map<string, { id: string } & typeof TURNOS[number]>();
  for (const t of TURNOS) {
    const ya = await prisma.plantillaTurno.findFirst({ where: { empresaId: empresa.id, nombre: t.nombre } });
    const p = ya ?? await prisma.plantillaTurno.create({
      data: { empresaId: empresa.id, nombre: t.nombre, color: t.color, esDescanso: false,
        horaEntrada: t.horaEntrada, horaSalida: t.horaSalida, tieneAlmuerzo: t.tieneAlmuerzo,
        almuerzoInicio: t.tieneAlmuerzo ? '12:00' : null, almuerzoFin: t.tieneAlmuerzo ? '13:00' : null },
    });
    plantillas.set(t.nombre, { ...t, id: p.id });
  }
  console.log('turnos del catálogo listos:', [...plantillas.keys()].join(', '));

  let creados = 0, pintados = 0, descansos = 0;
  for (const [i, quien] of REPARTO.entries()) {
    const cedula = CEDULA(i + 1);
    // EL HORARIO ES LO ÚNICO QUE DICE CUÁNDO DESCANSA, y `null` es un valor con significado: sin
    // horario no hay día fijo y lo pone la programación. Se escribe también en el `update` para que
    // volver a correr el guion mueva a la gente si la lista de arriba cambió.
    const horarioId = quien.horario === null ? null : horariosDemo.get(quien.horario)!;
    const col = await prisma.colaborador.upsert({
      where: { empresaId_cedula: { empresaId: empresa.id, cedula } },
      update: { horarioId },
      create: {
        empresaId: empresa.id, nombre: quien.nombre, apellido: quien.apellido, cedula,
        cargo: quien.cargo, salarioMensual: 1_623_500, horarioId,
      },
    });
    creados++;
    if (sede) {
      await prisma.colaboradorSede.upsert({
        where: { colaboradorId_sedeId: { colaboradorId: col.id, sedeId: sede.id } },
        update: {}, create: { colaboradorId: col.id, sedeId: sede.id },
      });
    }
    if (quien.sinPintar) continue;

    const ciclo = quien.patron.trabaja + quien.patron.descansa;
    let turno = 0;
    for (let d = 1; d <= DIAS_DE_LA_REJILLA; d++) {
      const pos = ciclo === 0 ? 0 : (((d - 1) + quien.desfase) % ciclo + ciclo) % ciclo;
      const trabaja = ciclo === 0 ? true : pos < quien.patron.trabaja;
      if (trabaja) {
        const nombre = quien.turnos[turno++ % quien.turnos.length];
        const p = plantillas.get(nombre)!;
        const r = await pintarDiaDeColaborador(col.id, dia(d), {
          id: p.id, esDescanso: false, horaEntrada: p.horaEntrada, horaSalida: p.horaSalida,
          tieneAlmuerzo: p.tieneAlmuerzo, almuerzoInicio: p.tieneAlmuerzo ? '12:00' : null,
          almuerzoFin: p.tieneAlmuerzo ? '13:00' : null, descansos: null,
        }, AHORA);
        if (r.ok) pintados++; else console.log('  no se pudo pintar', quien.nombre, d, r.motivo);
      } else if (quien.marcaDescanso || quien.horario !== null) {
        // SE MARCA EL DESCANSO, y esto hay que entenderlo: dejar un día EN BLANCO no lo convierte en
        // descanso. El horario lo sigue exigiendo, así que cuenta como trabajado y la persona sale con
        // «4 semanas sin descanso». La primera versión de este guion no lo marcaba y la pantalla salía
        // roja entera: no era un defecto de la pantalla, era el guion programando mal.
        //
        // A LOS QUE NO TIENEN HORARIO SE LES MARCA SOLO A ALGUNOS, a propósito: marcar es lo único
        // que les pone un día de descanso, y dejando a los otros sin marcar se ve en pantalla el chip
        // de «descanso sin marcar» al lado de quien sí lo tiene resuelto.
        const r = await marcarDescansoDeColaborador(col.id, dia(d), AHORA);
        if (r.ok) descansos++;
      }
    }
    console.log(`  ${quien.nombre} ${quien.apellido} · ${quien.horario ?? 'SIN HORARIO'} · ${quien.patron.trabaja}x${quien.patron.descansa} · ${quien.turnos.join('/') || 'sin turnos'}`);
  }

  console.log(`\nlisto: ${creados} colaboradores, ${pintados} días con turno, ${descansos} descansos marcados, mes ${MES}`);
  console.log('para deshacerlo: npx tsx prisma/seed-turnos-demo.ts --borrar');
}
main().finally(() => prisma.$disconnect());
