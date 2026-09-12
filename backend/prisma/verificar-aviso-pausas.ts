// Corre el AVISO DIARIO de las pausas sin regreso de verdad contra la base local, con sus
// consultas reales. Es el protocolo de CLAUDE.md §8.6 para la plomería que las pruebas
// (src/utils/cierreAlmuerzo.aviso.test.ts) solo ven contra un Prisma de mentira.
//
//   npx ts-node prisma/verificar-aviso-pausas.ts
//
// Crea una empresa de prueba con pausas en días ya pasados (12 de septiembre de 2026):
//   Ana       salió a su descanso y no volvió; al día siguiente marcó su jornada normal
//   Beto      salió a su descanso y volvió
//   Carla     salió a almorzar y no volvió
//   Nocturno  entró a las 22:00, salió a su descanso a las 02:00 y volvió a las 02:15, con
//             la fecha de su entrada: el aviso falso que se arregló el 12 de septiembre
//   Eva       salió a almorzar a las 14:00 y volvió a marcar a las 07:00 del día siguiente,
//             con la fecha del almuerzo: el kiosco lo tomó como su regreso, pero la tarde
//             no se contó, y eso se avisa como en producción
//   Fabio     salió al descanso de las 15:00 y no volvió; a las 19:00 entró a otro turno,
//             pasado el fin del suyo (de 07:00 a 16:00) más la gracia: no es su regreso
// y una pausa de HOY sin regreso (Dora), que todavía no se avisa.
//
// Corre el aviso tres veces: antes de crear nada, después, y otra vez. Comprueba las
// notificaciones que creó y la línea de log de cada pasada, también la que no avisa nada
// (CLAUDE.md §8.3), y muestra el EXPLAIN de la búsqueda del regreso y de la del día del descanso (§8.4).
//
// OJO: el aviso recorre TODOS los colaboradores de la base, no solo los de la prueba. Las
// notificaciones que cree para otras empresas en esta corrida se identifican contra una
// foto tomada antes y se BORRAN al final, para dejar la base como estaba; el script dice
// cuántas fueron. Lo suyo lo borra pase lo que pase.
import { prisma } from '../src/prisma';
import { rangoDiaBogota } from '../src/utils/fechas';
import { avisarPausasSinRegreso } from '../src/utils/cierreAlmuerzo';

const SUFIJO = `verif-aviso-${Date.now()}`;
const BASE_CEDULA = `${Date.now() % 10_000_000_000}`;
let cedulas = 0;
const nuevaCedula = () => `${BASE_CEDULA}${++cedulas}`;
const UN_DIA_MS = 24 * 60 * 60 * 1000;
const HORA_MS = 60 * 60 * 1000;
const MIN_MS = 60_000;

type Caso = { nombre: string; espera: string; obtenido: string; ok: boolean };
const casos: Caso[] = [];
function comprobar(nombre: string, espera: string | number, obtenido: string | number | null | undefined) {
  const valor = obtenido === null || obtenido === undefined ? 'null' : String(obtenido);
  casos.push({ nombre, espera: String(espera), obtenido: valor, ok: String(espera) === valor });
}

const LINEA = /^Pausas sin regreso: (\d+) salidas revisadas, (\d+) avisadas$/;

async function pasada(nombre: string) {
  const lineas: string[] = [];
  const errores: string[] = [];
  const avisados = await avisarPausasSinRegreso({
    info: m => { lineas.push(m); },
    error: (e, m) => { errores.push(`${m}: ${String(e)}`); },
  });
  console.log(`${nombre}: devolvió ${avisados} · log ${JSON.stringify(lineas)} · errores ${JSON.stringify(errores)}`);
  const m = lineas.length === 1 ? LINEA.exec(lineas[0]) : null;
  return { avisados, lineas, errores, revisadas: m ? Number(m[1]) : NaN, avisadas: m ? Number(m[2]) : NaN };
}

// Las notificaciones NO_MARCO_SALIDA que ya existían antes de correr nada.
let previas: Set<string> | null = null;

async function main() {
  const hoy = rangoDiaBogota(new Date()).inicioDia;
  if (Date.now() - hoy.getTime() < 10 * MIN_MS) {
    throw new Error('Correrlo después de las 00:10 de Bogotá: la pausa de hoy se crea a las 00:01.');
  }
  // Medianoche de Bogotá de hace n días, y un instante contado desde una medianoche.
  const dia = (n: number) => new Date(hoy.getTime() - n * UN_DIA_MS);
  const en = (base: Date, h: number, m = 0) => new Date(base.getTime() + h * HORA_MS + m * MIN_MS);

  previas = new Set((await prisma.notificacion.findMany({ where: { tipo: 'NO_MARCO_SALIDA' }, select: { id: true } })).map(n => n.id));

  const p0 = await pasada('pasada 0, antes de crear nada');
  comprobar('pasada 0: deja una sola línea, con el formato de siempre, y sin errores', 'una línea · 0 errores',
    `${Number.isNaN(p0.revisadas) ? `líneas ${JSON.stringify(p0.lineas)}` : 'una línea'} · ${p0.errores.length} errores`);
  comprobar('pasada 0: lo que dice la línea es lo que devolvió', p0.avisados, p0.avisadas);

  const empresa = await prisma.empresa.create({
    data: { nombre: `Prueba ${SUFIJO}`, nit: SUFIJO, email: `${SUFIJO}@prueba.local`, marcadorToken: SUFIJO },
    select: { id: true },
  });
  const persona = (nombre: string) => prisma.colaborador.create({
    data: { empresaId: empresa.id, nombre, apellido: 'Prueba', cedula: nuevaCedula(), salarioMensual: 1_500_000, modalidad: 'REMOTO' },
    select: { id: true },
  });
  const marca = (colaboradorId: string, fecha: Date, entrada: Date, salida: Date, extra: { salidaDescanso?: boolean; descansoVentana?: string; salidaAlmuerzo?: boolean } = {}) =>
    prisma.registro.create({ data: { colaboradorId, fecha, entrada, salida, ...extra }, select: { id: true } });

  const D3 = dia(3);
  const D2 = dia(2);
  const [ana, beto, carla, noche, dora] = [await persona('Ana'), await persona('Beto'), await persona('Carla'), await persona('Nocturno'), await persona('Dora')];
  const anaSalida = await marca(ana.id, D3, en(D3, 7), en(D3, 15), { salidaDescanso: true, descansoVentana: '15:00-15:10' });
  await marca(ana.id, D2, en(D2, 7), en(D2, 16)); // su jornada del día siguiente: no es el regreso
  const betoSalida = await marca(beto.id, D3, en(D3, 7), en(D3, 9), { salidaDescanso: true, descansoVentana: '09:00-09:15' });
  await marca(beto.id, D3, en(D3, 9, 15), en(D3, 16));
  const carlaSalida = await marca(carla.id, D3, en(D3, 7), en(D3, 12, 5), { salidaAlmuerzo: true });
  // 26 horas desde la medianoche de D3 son las 02:00 del día siguiente; la fila es de D3.
  const nocheSalida = await marca(noche.id, D3, en(D3, 22), en(D3, 26), { salidaDescanso: true, descansoVentana: '02:00-02:15' });
  await marca(noche.id, D3, en(D3, 26, 15), en(D3, 30));
  const doraSalida = await marca(dora.id, hoy, en(hoy, 0, 1), en(hoy, 0, 5), { salidaDescanso: true, descansoVentana: '00:00-00:15' });
  const [eva, fabio] = [await persona('Eva'), await persona('Fabio')];
  // 31 horas desde la medianoche de D3 son las 07:00 del día siguiente, con la fecha de D3.
  const evaSalida = await marca(eva.id, D3, en(D3, 7), en(D3, 14), { salidaAlmuerzo: true });
  await marca(eva.id, D3, en(D3, 31), en(D3, 40));
  await prisma.diaEsperado.create({ data: { colaboradorId: fabio.id, fecha: D3, programado: true, horaEntrada: '07:00', horaSalida: '16:00' } });
  const fabioSalida = await marca(fabio.id, D3, en(D3, 7), en(D3, 15), { salidaDescanso: true, descansoVentana: '15:00-15:10' });
  await marca(fabio.id, D3, en(D3, 19), en(D3, 22));

  const nuestras = () => prisma.notificacion.findMany({
    where: { empresaId: empresa.id }, orderBy: { titulo: 'asc' },
    select: { tipo: true, titulo: true, cuerpo: true, entidad: true, entidadId: true },
  });

  const p1 = await pasada('pasada 1, con las pausas de la prueba');
  const n1 = await nuestras();
  comprobar('pasada 1: avisó exactamente a Ana y a Fabio, por el descanso, y a Carla y a Eva, por el almuerzo',
    'NO_MARCO_SALIDA Ana Prueba no marcó su regreso del descanso | NO_MARCO_SALIDA Carla Prueba no marcó su regreso del almuerzo'
    + ' | NO_MARCO_SALIDA Eva Prueba no marcó su regreso del almuerzo | NO_MARCO_SALIDA Fabio Prueba no marcó su regreso del descanso',
    n1.map(n => `${n.tipo} ${n.titulo}`).join(' | '));
  comprobar('pasada 1: cada aviso apunta a la salida que quedó sin regreso', `registro:${anaSalida.id} registro:${carlaSalida.id} registro:${evaSalida.id} registro:${fabioSalida.id}`,
    n1.map(n => `${n.entidad}:${n.entidadId}`).join(' '));
  const INICIO_ANA = 'Salió a su descanso de 15:00 a 15:10 a las 15:00 del ';
  comprobar('pasada 1: el aviso de Ana dice a cuál descanso salió y a qué hora', INICIO_ANA, n1[0]?.cuerpo?.slice(0, INICIO_ANA.length));
  const INICIO_CARLA = 'Salió a almorzar a las 12:05 del ';
  comprobar('pasada 1: el aviso de Carla dice que salió a almorzar y a qué hora', INICIO_CARLA, n1[1]?.cuerpo?.slice(0, INICIO_CARLA.length));
  comprobar('pasada 1: el nocturno, que volvió después de medianoche con la fecha de su entrada, NO recibió aviso', 0,
    n1.filter(n => n.entidadId === nocheSalida.id).length);
  comprobar('pasada 1: Beto, que volvió, NO recibió aviso', 0, n1.filter(n => n.entidadId === betoSalida.id).length);
  comprobar('pasada 1: la pausa de hoy (Dora) todavía no se avisa', 0, n1.filter(n => n.entidadId === doraSalida.id).length);
  comprobar('pasada 1: una línea; revisó las 6 salidas a pausa nuevas de días pasados (no la de hoy) y avisó 4, lo mismo que devolvió',
    'una línea · revisadas +6 · avisadas 4 · devolvió 4',
    `${Number.isNaN(p1.revisadas) ? 'sin línea' : 'una línea'} · revisadas +${p1.revisadas - p0.revisadas} · avisadas ${p1.avisadas} · devolvió ${p1.avisados}`);

  const p2 = await pasada('pasada 2, otra vez');
  comprobar('pasada 2: no avisa dos veces, y la pasada que no avisa nada igual deja su línea',
    'una línea · avisadas 0 · devolvió 0 · revisadas igual · notificaciones de la prueba 4',
    `${Number.isNaN(p2.revisadas) ? 'sin línea' : 'una línea'} · avisadas ${p2.avisadas} · devolvió ${p2.avisados} · revisadas ${p2.revisadas === p1.revisadas ? 'igual' : `${p1.revisadas}→${p2.revisadas}`} · notificaciones de la prueba ${(await nuestras()).length}`);

  // El plan de la búsqueda del regreso, con la forma de la consulta de Prisma. En una base
  // chica el optimizador puede preferir recorrer: esto se muestra, no se da por bueno.
  const { inicioDia, finDia } = rangoDiaBogota(D3);
  for (const formato of ['', 'FORMAT=TREE ']) {
    const plan = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `EXPLAIN ${formato}SELECT id FROM registros WHERE colaboradorId = ? AND fecha >= ? AND fecha < ? AND entrada > ? LIMIT 1`,
      ana.id, inicioDia, finDia, en(D3, 15),
    );
    console.log(`EXPLAIN ${formato || '(tabla)'}:`, JSON.stringify(plan, (_k, v) => (typeof v === 'bigint' ? Number(v) : v)));
    const planDelDia = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `EXPLAIN ${formato}SELECT fecha, horaEntrada, horaSalida FROM dias_esperados WHERE colaboradorId = ? AND fecha >= ? AND fecha < ? LIMIT 1`,
      fabio.id, inicioDia, finDia,
    );
    console.log(`EXPLAIN del día ${formato || '(tabla)'}:`, JSON.stringify(planDelDia, (_k, v) => (typeof v === 'bigint' ? Number(v) : v)));
  }

  console.log('\nRESULTADOS');
  for (const c of casos) {
    console.log(`  ${c.ok ? 'OK  ' : 'MAL '} ${c.nombre}`);
    if (!c.ok) console.log(`       esperaba "${c.espera}" y llegó "${c.obtenido}"`);
  }
  const malos = casos.filter(c => !c.ok).length;
  console.log(`\n${casos.length - malos} de ${casos.length} en verde.`);
  return malos;
}

let salida = 1;
main()
  .then(malos => { salida = malos === 0 ? 0 : 1; })
  .catch(e => { console.error('EXPLOTÓ:', e); })
  .finally(async () => {
    const empresas = await prisma.empresa.findMany({ where: { nit: SUFIJO }, select: { id: true } });
    const idsEmpresas = empresas.map(e => e.id);
    const ids = (await prisma.colaborador.findMany({ where: { empresaId: { in: idsEmpresas } }, select: { id: true } })).map(c => c.id);
    await prisma.notificacion.deleteMany({ where: { empresaId: { in: idsEmpresas } } });
    // Lo que el aviso de esta corrida le dejó a otras empresas: nuevo desde la foto previa.
    let ajenas = 0;
    if (previas) {
      const antes = previas;
      const creadas = (await prisma.notificacion.findMany({ where: { tipo: 'NO_MARCO_SALIDA' }, select: { id: true } }))
        .map(n => n.id).filter(id => !antes.has(id));
      ajenas = creadas.length;
      if (ajenas > 0) await prisma.notificacion.deleteMany({ where: { id: { in: creadas } } });
    }
    await prisma.registro.deleteMany({ where: { colaboradorId: { in: ids } } });
    await prisma.diaEsperado.deleteMany({ where: { colaboradorId: { in: ids } } });
    await prisma.colaborador.deleteMany({ where: { id: { in: ids } } });
    await prisma.empresa.deleteMany({ where: { id: { in: idsEmpresas } } });
    const quedan = await Promise.all([
      prisma.empresa.count({ where: { nit: SUFIJO } }),
      prisma.colaborador.count({ where: { id: { in: ids } } }),
      prisma.registro.count({ where: { colaboradorId: { in: ids } } }),
      prisma.diaEsperado.count({ where: { colaboradorId: { in: ids } } }),
      prisma.notificacion.count({ where: { empresaId: { in: idsEmpresas } } }),
      previas ? prisma.notificacion.count({ where: { tipo: 'NO_MARCO_SALIDA', id: { notIn: [...previas] } } }) : Promise.resolve(0),
    ]);
    console.log(empresas.length > 0 && quedan.every(n => n === 0)
      ? `Limpieza: no quedó ninguna fila de la prueba (${empresas.length} empresa, ${ids.length} colaboradores, sus registros y avisos; ${ajenas} avisos ajenos de esta corrida borrados).`
      : `Limpieza INCOMPLETA o sin empresa (empresa/colaboradores/registros/días/avisos de la prueba/avisos ajenos nuevos): ${quedan.join('/')}`);
    await prisma.$disconnect();
    process.exit(salida);
  });
