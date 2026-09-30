// ────────── DATOS PARA COMPROBAR LA NOMINA DE SEPTIEMBRE ANTES DE DESPLEGAR ──────────
//
// NO ES CODIGO DE PRODUCCION. Es un guion de los de `backend/prisma/`, hermano de
// `seed-turnos-demo.ts`: siembra dos personas con todos los casos que el motor tiene que saber
// distinguir, para poder mirar el Excel y cotejarlo a mano (CLAUDE.md §5.2).
//
// DOS PERSONAS, que son los dos modelos de descanso que existen desde el 30 de septiembre de 2026:
//
//   ANA   horario FIJO de lunes a viernes. Le sobran sabado y domingo, o sea DOS dias libres, asi que
//         manda la presuncion legal y su descanso obligatorio es el DOMINGO.
//   BRUNO SIN horario, turnos de noche pintados uno a uno. No tiene dia fijo: su descanso es el que
//         se MARQUE en la programacion de cada semana, y aqui se le marca el MIERCOLES.
//
// EL CASO QUE MAS IMPORTA, y por el que existe este guion: Bruno trabaja un DOMINGO que NO es su
// descanso. Con la regla vigente eso NO es dominical —«cuando este Codigo haga referencia a
// dominical, se entendera que trata de dia de descanso obligatorio», Ley 2466 de 2025, art. 14— y
// tiene que salir como hora ordinaria nocturna. Si sale como HDD, el motor esta mal.
//
// SE DESHACE ENTERO con `--borrar`: todo lo que crea lleva la cedula empezando por 88.
//
// APUNTA A UNA EMPRESA POR NOMBRE, la de la base de desarrollo, por lo mismo que el otro guion: si
// tomara «la primera empresa que encuentre», correrlo por error contra otra base la llenaria de
// gente inventada.
import { prisma } from '../src/prisma';
import { materializarColaborador, pintarDiaDeColaborador, marcarDescansoDeColaborador } from '../src/utils/materializarDias';

const AVISO = 'no encontre la empresa';
const EMPRESA = 'Seguridad Andina Ltda';
const CEDULA = (n: number) => `88${String(n).padStart(5, '0')}`;
const ES_QA = { startsWith: '88' };

// Medianoche de Bogota de un dia de septiembre de 2026, que es como se guardan `Registro.fecha` y
// `DiaEsperado.fecha`. Septiembre de 2026 empieza en MARTES.
const dia = (d: number) => new Date(Date.UTC(2026, 8, d, 5, 0, 0));
// Un instante de ese dia en hora de Bogota (UTC-5 todo el año, sin horario de verano).
const hora = (d: number, h: number, min = 0) => new Date(Date.UTC(2026, 8, d, h + 5, min, 0));

// ─────────────── LOS CASOS, con lo que se espera de cada uno ───────────────
//
// `parte` es un tramo de jornada: entra, sale, y si sale a almorzar se marca. Una jornada con
// almuerzo son DOS registros con la misma fecha, que es como la escribe el kiosco de verdad: el
// primero se cierra con `salidaAlmuerzo` y el segundo es el regreso.
type Parte = { entra: [number, number]; sale?: [number, number]; aAlmorzar?: boolean };
type Caso = { d: number; que: string; espera: string; partes: Parte[] };

const ANA: Caso[] = [
  { d: 1, que: 'jornada normal con almuerzo', espera: '8 h HOD · sin tardanza',
    partes: [{ entra: [8, 0], sale: [12, 0], aAlmorzar: true }, { entra: [13, 0], sale: [17, 0] }] },
  { d: 2, que: 'llega 25 min tarde, SIN justificar', espera: '25 min de tardanza · 7,58 h HOD',
    partes: [{ entra: [8, 25], sale: [12, 0], aAlmorzar: true }, { entra: [13, 0], sale: [17, 0] }] },
  { d: 3, que: 'llega 40 min tarde, CON permiso medico de 8 a 9', espera: 'tardanza justificada',
    partes: [{ entra: [8, 40], sale: [12, 0], aAlmorzar: true }, { entra: [13, 0], sale: [17, 0] }] },
  { d: 4, que: 'sale a almorzar y NO vuelve', espera: '4 h HOD · el almuerzo se descuenta igual',
    partes: [{ entra: [8, 0], sale: [12, 0], aAlmorzar: true }] },
  { d: 7, que: 'se queda hasta las 19:30', espera: '8 h HOD + extra diurna hasta 19:00 + nocturna 19:00-19:30',
    partes: [{ entra: [8, 0], sale: [12, 0], aAlmorzar: true }, { entra: [13, 0], sale: [19, 30] }] },
  { d: 8, que: 'FESTIVO de la empresa, trabajado', espera: '8 h HDD (festivo, no cuenta para las 42)',
    partes: [{ entra: [8, 0], sale: [16, 0] }] },
  { d: 9, que: 'jornada normal', espera: '8 h HOD', partes: [{ entra: [8, 0], sale: [12, 0], aAlmorzar: true }, { entra: [13, 0], sale: [17, 0] }] },
  { d: 10, que: 'jornada normal', espera: '8 h HOD', partes: [{ entra: [8, 0], sale: [12, 0], aAlmorzar: true }, { entra: [13, 0], sale: [17, 0] }] },
  { d: 11, que: 'sale a las 15:00 CON permiso personal de 15 a 17', espera: 'salida temprana justificada',
    partes: [{ entra: [8, 0], sale: [12, 0], aAlmorzar: true }, { entra: [13, 0], sale: [15, 0] }] },
  { d: 13, que: 'DOMINGO trabajado, y el domingo ES su descanso', espera: '8 h HDD · no cuenta para las 42',
    partes: [{ entra: [8, 0], sale: [16, 0] }] },
  { d: 14, que: 'jornada normal', espera: '8 h HOD', partes: [{ entra: [8, 0], sale: [12, 0], aAlmorzar: true }, { entra: [13, 0], sale: [17, 0] }] },
  { d: 15, que: 'jornada normal', espera: '8 h HOD', partes: [{ entra: [8, 0], sale: [12, 0], aAlmorzar: true }, { entra: [13, 0], sale: [17, 0] }] },
];

// Bruno hace noches de 22:00 a 06:00 del dia siguiente. Su descanso MARCADO es el miercoles.
const noche = (): Parte[] => [{ entra: [22, 0], sale: [30, 0] }]; // 30 = las 6 del dia siguiente
const BRUNO: Caso[] = [
  { d: 1, que: 'noche 22:00-06:00', espera: 'nocturna (HON) casi entera', partes: noche() },
  { d: 3, que: 'noche', espera: 'HON', partes: noche() },
  { d: 4, que: 'noche', espera: 'HON', partes: noche() },
  { d: 5, que: 'noche del SABADO', espera: 'HON · el sabado no es su descanso', partes: noche() },
  { d: 6, que: 'noche del DOMINGO, que NO es su descanso', espera: 'HON, NO dominical — EL CASO CLAVE', partes: noche() },
  { d: 8, que: 'noche', espera: 'HON', partes: noche() },
  { d: 9, que: 'trabaja su MIERCOLES, que SI es su descanso marcado', espera: 'HND (descanso trabajado nocturno)', partes: noche() },
  { d: 10, que: 'noche', espera: 'HON', partes: noche() },
  { d: 11, que: 'noche', espera: 'HON', partes: noche() },
  { d: 12, que: 'noche del sabado', espera: 'HON', partes: noche() },
  { d: 13, que: 'noche del DOMINGO', espera: 'HON, NO dominical', partes: noche() },
];

async function borrar(empresaId: string) {
  const suyos = await prisma.colaborador.findMany({ where: { empresaId, cedula: ES_QA }, select: { id: true } });
  const ids = suyos.map(c => c.id);
  console.log('colaboradores de QA encontrados:', ids.length);
  if (ids.length) {
    const r = await prisma.registro.deleteMany({ where: { colaboradorId: { in: ids } } });
    const p = await prisma.permiso.deleteMany({ where: { colaboradorId: { in: ids } } });
    const d = await prisma.diaEsperado.deleteMany({ where: { colaboradorId: { in: ids } } });
    await prisma.colaboradorSede.deleteMany({ where: { colaboradorId: { in: ids } } });
    await prisma.colaborador.deleteMany({ where: { id: { in: ids } } });
    console.log(`  registros ${r.count} · permisos ${p.count} · dias ${d.count}`);
  }
  const h = await prisma.horario.deleteMany({ where: { empresaId, nombre: 'QA · lunes a viernes 8-17' } });
  const f = await prisma.diaFestivo.deleteMany({ where: { empresaId, nombre: 'QA · festivo de prueba' } });
  console.log(`  horarios ${h.count} · festivos ${f.count}`);
}

async function main() {
  const empresa = await prisma.empresa.findFirst({ where: { nombre: EMPRESA }, select: { id: true } });
  if (!empresa) { console.log(AVISO, EMPRESA, '— este guion es solo para la base de desarrollo'); return; }
  if (process.argv.includes('--borrar')) { await borrar(empresa.id); return; }
  await borrar(empresa.id); // idempotente: se rehace desde cero en cada corrida

  const sede = await prisma.sede.findFirst({ where: { empresaId: empresa.id }, select: { id: true } });

  // EL FESTIVO del martes 8, de esta empresa. Va aparte del descanso a proposito: un festivo lo paga
  // el calendario y no depende de quien descansa cuando.
  await prisma.diaFestivo.create({
    data: { empresaId: empresa.id, fecha: dia(8), nombre: 'QA · festivo de prueba' },
  });

  const horario = await prisma.horario.create({
    data: {
      empresaId: empresa.id, nombre: 'QA · lunes a viernes 8-17',
      toleranciaMin: 10, almuerzoMin: 60, toleranciaSalidaMin: 0, ajustaEntrada: false,
      franjas: {
        create: [{
          dias: ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'],
          horaEntrada: '08:00', horaSalida: '17:00',
          tieneAlmuerzo: true, almuerzoInicio: '12:00', almuerzoFin: '13:00',
        }],
      },
    },
    select: { id: true },
  });

  const gente = [
    { cedula: CEDULA(1), nombre: 'Ana', apellido: 'QA Fijo', cargo: 'Auxiliar', salarioMensual: 1_750_000, horarioId: horario.id, casos: ANA },
    { cedula: CEDULA(2), nombre: 'Bruno', apellido: 'QA Rotativo', cargo: 'Guarda nocturno', salarioMensual: 1_623_500, horarioId: null, casos: BRUNO },
  ];

  for (const q of gente) {
    const col = await prisma.colaborador.create({
      data: {
        empresaId: empresa.id, nombre: q.nombre, apellido: q.apellido, cedula: q.cedula,
        cargo: q.cargo, salarioMensual: q.salarioMensual, horarioId: q.horarioId,
        auxilioTransporte: 200_000,
      },
      select: { id: true },
    });
    if (sede) await prisma.colaboradorSede.create({ data: { colaboradorId: col.id, sedeId: sede.id } });

    for (const caso of q.casos) {
      for (const p of caso.partes) {
        await prisma.registro.create({
          data: {
            colaboradorId: col.id, fecha: dia(caso.d),
            entrada: hora(caso.d, p.entra[0], p.entra[1]),
            salida: p.sale ? hora(caso.d, p.sale[0], p.sale[1]) : null,
            salidaAlmuerzo: p.aAlmorzar === true,
          },
        });
      }
    }
    console.log(`  ${q.nombre} ${q.apellido}: ${q.casos.length} dias sembrados`);
  }

  // ─────────── LO QUE HARIA LA PANTALLA, por el camino de verdad ───────────
  //
  // Sin esto las dos personas no tienen `dias_esperados` y el motor cae al horario vigente, que es
  // un camino valido pero NO el que se quiere probar: el descanso de Bruno sale de `descansoPintado`,
  // y sin dias pintados no hay columna que leer.
  //
  // EL «AHORA» VA EN AGOSTO, como en `seed-turnos-demo.ts` y por lo mismo: pintar tiene una guarda
  // que no deja tocar un dia ya pasado, y septiembre de 2026 ya paso. Pasandole el 31 de agosto, todo
  // septiembre le queda en futuro y pasa sus propias guardas. Asi estos dias son exactamente los que
  // produciria alguien programandolos desde la pantalla.
  const AHORA = new Date(Date.UTC(2026, 7, 31, 5, 0, 0));
  const DESDE = dia(1);
  const HASTA = new Date(Date.UTC(2026, 9, 1, 5, 0, 0)); // 1 de octubre, exclusivo

  const anaId = (await prisma.colaborador.findFirst({ where: { empresaId: empresa.id, cedula: CEDULA(1) }, select: { id: true } }))!.id;
  const brunoId = (await prisma.colaborador.findFirst({ where: { empresaId: empresa.id, cedula: CEDULA(2) }, select: { id: true } }))!.id;

  // ANA: sus dias salen del HORARIO, como cualquiera con horario fijo.
  const escritos = await materializarColaborador(anaId, DESDE, HASTA, { pisarExistentes: true });
  console.log(`  Ana: ${escritos} dias materializados desde su horario`);

  // BRUNO: sus dias se PINTAN uno a uno, y su descanso se MARCA. Es lo que hace la pantalla de turnos.
  const turnoNoche = await prisma.plantillaTurno.findFirst({
    where: { empresaId: empresa.id, nombre: 'Noche' },
    select: { id: true, horaEntrada: true, horaSalida: true, tieneAlmuerzo: true, almuerzoInicio: true, almuerzoFin: true, descansos: true },
  });
  if (!turnoNoche) { console.log('  falta el turno «Noche» en el catalogo de la empresa'); return; }

  let pintados = 0, descansos = 0, fallos = 0;
  for (let d = 1; d <= 30; d++) {
    const esMiercoles = new Date(Date.UTC(2026, 8, d)).getUTCDay() === 3;
    const r = esMiercoles
      // SU DESCANSO ES EL MIERCOLES, y se marca en TODOS los miercoles del mes: sin horario, cada
      // semana necesita su propia marca. El 9 ademas lo trabaja, que es el caso del descanso trabajado.
      ? await marcarDescansoDeColaborador(brunoId, dia(d), AHORA)
      : await pintarDiaDeColaborador(brunoId, dia(d), { ...turnoNoche, esDescanso: false }, AHORA);
    if (r.ok) { if (esMiercoles) descansos++; else pintados++; } else { fallos++; console.log('   no se pudo', d, r.motivo); }
  }
  console.log(`  Bruno: ${pintados} dias con turno de noche · ${descansos} miercoles marcados como descanso · ${fallos} fallos`);

  // LOS DOS PERMISOS de Ana, que son los que convierten una tardanza y una salida temprana en
  // justificadas. Con hora, que es lo que hace que excusen solo su tramo y no el dia entero.
  const ana = await prisma.colaborador.findFirst({ where: { empresaId: empresa.id, cedula: CEDULA(1) }, select: { id: true } });
  await prisma.permiso.createMany({
    data: [
      { colaboradorId: ana!.id, tipo: 'MEDICO', aprobado: true, fechaInicio: dia(3), fechaFin: dia(3), horaInicio: '08:00', horaFin: '09:00', descripcion: 'QA · cita medica' },
      { colaboradorId: ana!.id, tipo: 'PERSONAL', aprobado: true, fechaInicio: dia(11), fechaFin: dia(11), horaInicio: '15:00', horaFin: '17:00', descripcion: 'QA · diligencia' },
    ],
  });
  console.log('  2 permisos con hora para Ana (dias 3 y 11)');

  console.log('\nsembrado. Para deshacerlo: npx ts-node prisma/qa-nomina-septiembre.ts --borrar');
}
main().finally(() => prisma.$disconnect());
