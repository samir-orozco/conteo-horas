// Reproduce las NOVEDADES QUE DEJA EL KIOSCO de punta a punta, con las rutas de
// verdad y contra números calculados a mano. Es el protocolo de CLAUDE.md §8.6.
//
//   npx ts-node prisma/verificar-novedad-parcial.ts
//
// No hace falta levantar el backend: las rutas se montan dentro del proceso
// (ver `app-en-proceso.ts`). Solo toca la base local, y BORRA todo lo que crea.
//
// Son dos partes porque cada una prueba una cosa distinta:
//
//  1. EL KIOSCO. Qué hace `POST /api/worker/marcar` cuando alguien llega tarde y
//     cuando se va antes de hora: en los dos casos pide el motivo antes de
//     escribir nada, y la novedad guarda el tramo que cubre. Se hace HOY y con una
//     franja armada alrededor de la hora actual, porque la ruta toma la hora del
//     reloj: una franja fija de 08:00 a 17:00 solo dispararía la salida temprana
//     si el script corre en ese rato.
//
//  2. EL CASO. Lo que el saldo y las tardanzas hacen con esas novedades una vez
//     aprobadas: franja de 08:00 a 17:00 con almuerzo de 12:00 a 13:00, llega
//     08:30 y se va 15:00 por una cita médica. Como el kiosco no deja marcar en el
//     pasado, la marcación y las novedades se escriben directo, CON LA MISMA FORMA
//     que la parte 1 acaba de ver escribir al kiosco. La aprobación y los
//     reportes sí pasan por las rutas.
import { prisma } from '../src/prisma';
import { rangoDiaBogota, medianocheBogota } from '../src/utils/fechas';
import { DIAS_SEMANA } from '../src/utils/tardanzas';
import { asegurarDiaMaterializado } from '../src/utils/materializarDias';
import { montarApp } from './app-en-proceso';

const SUFIJO = `verif-novedad-${Date.now()}`;
const UN_DIA_MS = 24 * 60 * 60 * 1000;

type Caso = { nombre: string; espera: string; obtenido: string; ok: boolean };
const casos: Caso[] = [];
function comprobar(nombre: string, espera: string | number, obtenido: string | number | null | undefined) {
  const valor = obtenido === null || obtenido === undefined ? 'null' : String(obtenido);
  casos.push({ nombre, espera: String(espera), obtenido: valor, ok: String(espera) === valor });
}

const dosDigitos = (n: number) => String(n).padStart(2, '0');
// Hora de pared de Bogotá de un instante, "HH:MM".
function horaBogota(d: Date): string {
  const z = rangoDiaBogota(d).ahoraBog;
  return `${dosDigitos(z.getHours())}:${dosDigitos(z.getMinutes())}`;
}
const diaBogota = (d: Date) => rangoDiaBogota(d).inicioDia.toISOString().slice(0, 10);
// Un instante dado en hora de Bogotá (UTC-5 todo el año). CLAUDE.md §8.1.
const bog = (a: number, mes: number, d: number, h: number, min = 0) =>
  new Date(Date.UTC(a, mes - 1, d, h + 5, min, 0));

type RespLiquidacion = {
  horasMes: number;
  saldo: { minutosEsperados: number; minutosPermisoRemunerado: number; minutosTrabajados: number; minutosSaldo: number; montoSaldo: number };
};
type RespTardanzas = { diasTarde: number; totalMinutos: number };
type RespResumen = { colaboradores: { colaboradorId: string; totalMinutos: number }[] };
type RespTablero = { llegadasTardeHoy: { id: string; minutosTarde: number }[] };

async function main() {
  const { app, tokenAdmin } = await montarApp();
  const empresa = await prisma.empresa.create({
    data: { nombre: `Prueba ${SUFIJO}`, nit: SUFIJO, email: `${SUFIJO}@prueba.local`, marcadorToken: SUFIJO },
    select: { id: true, marcadorToken: true },
  });
  const admin = { authorization: `Bearer ${tokenAdmin(empresa.id)}` };
  async function leer<T>(url: string): Promise<T> {
    const r = await app.inject({ method: 'GET', url, headers: admin });
    if (r.statusCode !== 200) throw new Error(`${url}: ${r.statusCode} ${r.body}`);
    return r.json<T>();
  }
  const aprobar = async (permisoId: string) =>
    (await app.inject({ method: 'PUT', url: `/api/permisos/${permisoId}`, headers: admin, payload: { aprobado: true } })).statusCode;

  // ===================== 1. EL KIOSCO =====================
  const ahora = rangoDiaBogota(new Date()).ahoraBog;
  if (ahora.getHours() >= 23 || (ahora.getHours() === 0 && ahora.getMinutes() < 2)) {
    throw new Error('Correrlo entre las 00:02 y las 23:00 de Bogotá: la franja de la parte 1 empieza a las 00:00, termina una hora después de ahora y no puede cruzar la medianoche.');
  }
  const finFranjaKiosco = `${dosDigitos(ahora.getHours() + 1)}:${dosDigitos(ahora.getMinutes())}`;
  const horarioKiosco = await prisma.horario.create({
    data: {
      empresaId: empresa.id, nombre: 'Kiosco', activo: true, toleranciaMin: 0, almuerzoMin: 0,
      franjas: { create: [{ dias: [DIAS_SEMANA[ahora.getDay()]], horaEntrada: '00:00', horaSalida: finFranjaKiosco, tieneAlmuerzo: false }] },
    },
  });
  // REMOTO para que la ubicación no estorbe: la llegada tarde y la salida temprana
  // se deciden después de la geocerca y no dependen de la modalidad.
  const kiosco = await prisma.colaborador.create({
    data: {
      empresaId: empresa.id, nombre: 'Kiosco', apellido: 'Prueba', cedula: `${SUFIJO}-k`,
      salarioMensual: 1_500_000, modalidad: 'REMOTO', horarioId: horarioKiosco.id,
    },
    select: { id: true, cedula: true },
  });
  const login = await app.inject({ method: 'POST', url: '/api/worker/login', payload: { marcadorToken: empresa.marcadorToken, cedula: kiosco.cedula } });
  if (login.statusCode !== 200) throw new Error(`login del kiosco: ${login.statusCode} ${login.body}`);
  const worker = { authorization: `Bearer ${login.json<{ token: string }>().token}` };
  const marcar = async (payload: object = {}) => {
    const r = await app.inject({ method: 'POST', url: '/api/worker/marcar', headers: worker, payload });
    const cuerpo = r.json<{ accion?: string; codigo?: string }>();
    return `${r.statusCode} ${cuerpo.accion ?? cuerpo.codigo}`;
  };

  // La franja empezó a las 00:00 con tolerancia 0: a esta hora siempre llega tarde.
  comprobar('kiosco: llegar tarde pide motivo', '409 REQUIERE_MOTIVO_TARDANZA', await marcar());
  comprobar('kiosco: la pregunta no marcó la entrada', 0, await prisma.registro.count({ where: { colaboradorId: kiosco.id } }));
  comprobar('kiosco: con motivo sí entra', '200 ENTRADA', await marcar({ novedadTipo: 'PERSONAL', novedadDescripcion: 'Verificación de llegada tarde' }));
  comprobar(`kiosco: irse antes de las ${finFranjaKiosco} pide motivo`, '409 REQUIERE_MOTIVO', await marcar());
  comprobar('kiosco: con motivo sí sale', '200 SALIDA', await marcar({ novedadTipo: 'MEDICO', novedadDescripcion: 'Verificación de salida temprana' }));

  const regKiosco = await prisma.registro.findFirst({
    where: { colaboradorId: kiosco.id }, orderBy: { creadoEn: 'desc' }, select: { id: true, entrada: true, salida: true },
  });
  const novedadesKiosco = regKiosco
    ? await prisma.permiso.findMany({ where: { registroId: regKiosco.id }, orderBy: { creadoEn: 'asc' } })
    : [];
  // La de la llegada es la que empieza a la hora de entrada de la franja.
  const novLlegada = novedadesKiosco.find(n => n.horaInicio === '00:00');
  const novSalida = novedadesKiosco.find(n => n !== novLlegada);
  const hoy = diaBogota(new Date());
  comprobar('kiosco: deja dos novedades ligadas a la marcación', 2, novedadesKiosco.length);
  comprobar('kiosco: las dos son de un solo día, el de hoy', `${hoy}→${hoy} ${hoy}→${hoy}`,
    novedadesKiosco.map(n => `${diaBogota(n.fechaInicio)}→${diaBogota(n.fechaFin)}`).join(' '));
  comprobar('kiosco: la de la llegada va de la entrada de la franja a la hora en que llegó',
    `00:00→${regKiosco?.entrada ? horaBogota(regKiosco.entrada) : 'sin entrada'}`,
    novLlegada && `${novLlegada.horaInicio}→${novLlegada.horaFin}`);
  comprobar('kiosco: la de la salida va de la hora en que se fue al fin de su franja',
    `${regKiosco?.salida ? horaBogota(regKiosco.salida) : 'sin salida'}→${finFranjaKiosco}`,
    novSalida && `${novSalida.horaInicio}→${novSalida.horaFin}`);

  // El tablero del día contesta la misma pregunta que el reporte. Aprobada solo la
  // novedad de la salida, la llegada tarde de hoy tiene que seguir en la lista;
  // aprobada también la de la llegada, tiene que salir. Como la franja empieza a
  // las 00:00 con tolerancia 0, llegó tarde tantos minutos como marca su entrada.
  const entradaBog = regKiosco?.entrada ? rangoDiaBogota(regKiosco.entrada).ahoraBog : null;
  const minutosTardeHoy = entradaBog ? entradaBog.getHours() * 60 + entradaBog.getMinutes() : 'sin entrada';
  const enTablero = async () =>
    (await leer<RespTablero>('/api/dashboard/empresa')).llegadasTardeHoy.find(l => l.id === kiosco.id)?.minutosTarde;
  if (novSalida) comprobar('kiosco: el administrador aprueba la novedad de la salida', 200, await aprobar(novSalida.id));
  comprobar('tablero: con la de la salida aprobada, la llegada tarde sigue en la lista', minutosTardeHoy, await enTablero());
  if (novLlegada) comprobar('kiosco: el administrador aprueba la novedad de la llegada', 200, await aprobar(novLlegada.id));
  comprobar('tablero: con la de la llegada aprobada, la tardanza sale de la lista', 'null', await enTablero());

  // ===================== 2. EL CASO =====================
  // Lunes 7 de septiembre de 2026, que no es festivo.
  const DIA = medianocheBogota('2026-09-07');
  const horarioOficina = await prisma.horario.create({
    data: {
      empresaId: empresa.id, nombre: 'Oficina', activo: true, toleranciaMin: 0, toleranciaSalidaMin: 0, almuerzoMin: 0,
      franjas: {
        create: [{
          dias: ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'], horaEntrada: '08:00', horaSalida: '17:00',
          tieneAlmuerzo: true, almuerzoInicio: '12:00', almuerzoFin: '13:00',
        }],
      },
    },
  });
  const oficina = await prisma.colaborador.create({
    data: { empresaId: empresa.id, nombre: 'Oficina', apellido: 'Prueba', cedula: `${SUFIJO}-o`, salarioMensual: 1_500_000, horarioId: horarioOficina.id },
    select: { id: true },
  });
  // El kiosco materializa el día al marcar la entrada; aquí, con la misma función.
  await asegurarDiaMaterializado(oficina.id, DIA);
  const fila = await prisma.diaEsperado.findFirst({ where: { colaboradorId: oficina.id, fecha: { gte: DIA, lt: new Date(DIA.getTime() + UN_DIA_MS) } } });
  comprobar('precondición: el día pedía 08:00–17:00, almuerzo 12:00–13:00, 480 min',
    '08:00–17:00 12:00–13:00 480', fila && `${fila.horaEntrada}–${fila.horaSalida} ${fila.almuerzoInicio}–${fila.almuerzoFin} ${fila.minutosEsperados}`);

  const regCaso = await prisma.registro.create({
    data: { colaboradorId: oficina.id, fecha: DIA, entrada: bog(2026, 9, 7, 8, 30), salida: bog(2026, 9, 7, 15, 0) },
  });
  const guardaHoras = (n: { horaInicio: string | null; horaFin: string | null } | undefined) => !!n?.horaInicio && !!n?.horaFin;
  const sembrarNovedad = (tipo: 'MEDICO' | 'PERSONAL', descripcion: string, horas: { horaInicio: string; horaFin: string } | null) =>
    prisma.permiso.create({
      data: {
        colaboradorId: oficina.id, registroId: regCaso.id, tipo, descripcion,
        fechaInicio: DIA, fechaFin: DIA, aprobado: false, ...(horas ?? {}),
      },
    });
  // Las dos con la forma que la parte 1 acaba de ver escribir al kiosco. Si el
  // kiosco no dejó novedad de llegada, el caso tampoco la tiene.
  const novCasoSalida = await sembrarNovedad('MEDICO', 'Cita médica', guardaHoras(novSalida) ? { horaInicio: '15:00', horaFin: '17:00' } : null);
  const novCasoLlegada = novLlegada
    ? await sembrarNovedad('PERSONAL', 'Se varó el bus', guardaHoras(novLlegada) ? { horaInicio: '08:00', horaFin: '08:30' } : null)
    : null;
  console.log(`\nNovedades del caso: salida ${guardaHoras(novSalida) ? 'de 15:00 a 17:00' : 'de DÍA COMPLETO'}, llegada ${novCasoLlegada ? (guardaHoras(novLlegada) ? 'de 08:00 a 08:30' : 'de DÍA COMPLETO') : 'NINGUNA'}; la forma en que el kiosco las escribió en la parte 1.`);

  comprobar('el administrador aprueba la novedad de la salida', 200, await aprobar(novCasoSalida.id));

  const q = `colaboradorId=${oficina.id}&desde=2026-09-07&hasta=2026-09-07`;
  const leerCaso = async () => ({
    liq: await leer<RespLiquidacion>(`/api/reportes/liquidacion?${q}`),
    tar: await leer<RespTardanzas>(`/api/reportes/tardanzas?${q}`),
    resumen: (await leer<RespResumen>('/api/reportes/tardanzas-resumen?desde=2026-09-07&hasta=2026-09-07'))
      .colaboradores.find(c => c.colaboradorId === oficina.id)?.totalMinutos,
  });

  console.log(`
Calculado a mano, con solo la novedad de la salida aprobada (la de la llegada, pendiente):
  el día pedía   08:00–17:00 = 540 min, menos 60 de almuerzo (12:00–13:00) = 480
  la novedad     15:00–17:00 = 120 min excusados (no toca el almuerzo)
  esperadas      480 − 120 = 360
  trabajadas     08:30–15:00 = 390 min, menos 60 de almuerzo (lo cruzó entero) = 330
  saldo          360 − 330 = 30 min en contra: la media hora que llegó tarde
  descuento      1.500.000 / 210 h (jornada de 42 h × 5) × 0,5 h = 3571.43
  tardanza       llegó 08:30 contra 08:00, tolerancia 0 = 30 min, 1 día

Y aprobada también la de la llegada (08:00–08:30, un tipo que se paga):
  excusado       120 + 30 = 150
  esperadas      480 − 150 = 330
  saldo          330 − 330 = 0, sin descuento
  tardanza       justificada: 0`);

  const soloSalida = await leerCaso();
  comprobar('supuesto del cálculo a mano: horas del mes', 210, soloSalida.liq.horasMes);
  comprobar('saldo: trabajadas ordinarias (control, no depende de las novedades)', 330, soloSalida.liq.saldo.minutosTrabajados);
  comprobar('saldo: excusado por la novedad de la salida', 120, soloSalida.liq.saldo.minutosPermisoRemunerado);
  comprobar('saldo: minutos esperados', 360, soloSalida.liq.saldo.minutosEsperados);
  comprobar('saldo: minutos en contra', 30, soloSalida.liq.saldo.minutosSaldo);
  comprobar('saldo: descuento', '3571.43', soloSalida.liq.saldo.montoSaldo.toFixed(2));
  comprobar('tardanzas: días tarde', 1, soloSalida.tar.diasTarde);
  comprobar('tardanzas: minutos', 30, soloSalida.tar.totalMinutos);
  comprobar('tardanzas-resumen: minutos', 30, soloSalida.resumen);

  if (novCasoLlegada) comprobar('el administrador aprueba la novedad de la llegada', 200, await aprobar(novCasoLlegada.id));
  const conLlegada = await leerCaso();
  comprobar('con la llegada aprobada · saldo: excusado', 150, conLlegada.liq.saldo.minutosPermisoRemunerado);
  comprobar('con la llegada aprobada · saldo: minutos en contra', 0, conLlegada.liq.saldo.minutosSaldo);
  comprobar('con la llegada aprobada · saldo: descuento', '0.00', conLlegada.liq.saldo.montoSaldo.toFixed(2));
  comprobar('con la llegada aprobada · tardanzas: días tarde', 0, conLlegada.tar.diasTarde);
  comprobar('con la llegada aprobada · tardanzas-resumen: minutos', 0, conLlegada.resumen);

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
    // Las rutas mandan las notificaciones sin `await`: se les da un momento para
    // que no aterricen después de la limpieza.
    await new Promise(r => setTimeout(r, 1500));
    const empresa = await prisma.empresa.findFirst({ where: { nit: SUFIJO }, select: { id: true } });
    if (empresa) {
      const ids = (await prisma.colaborador.findMany({ where: { empresaId: empresa.id }, select: { id: true } })).map(c => c.id);
      const horarios = (await prisma.horario.findMany({ where: { empresaId: empresa.id }, select: { id: true } })).map(h => h.id);
      await prisma.permiso.deleteMany({ where: { colaboradorId: { in: ids } } });
      await prisma.registro.deleteMany({ where: { colaboradorId: { in: ids } } });
      await prisma.diaEsperado.deleteMany({ where: { colaboradorId: { in: ids } } });
      await prisma.colaborador.deleteMany({ where: { id: { in: ids } } });
      await prisma.franjaHorario.deleteMany({ where: { horarioId: { in: horarios } } });
      await prisma.horario.deleteMany({ where: { id: { in: horarios } } });
      await prisma.notificacion.deleteMany({ where: { empresaId: empresa.id } });
      await prisma.empresa.delete({ where: { id: empresa.id } });
      const quedan = await Promise.all([
        prisma.empresa.count({ where: { nit: SUFIJO } }),
        prisma.colaborador.count({ where: { id: { in: ids } } }),
        prisma.horario.count({ where: { id: { in: horarios } } }),
        prisma.permiso.count({ where: { colaboradorId: { in: ids } } }),
        prisma.registro.count({ where: { colaboradorId: { in: ids } } }),
        prisma.diaEsperado.count({ where: { colaboradorId: { in: ids } } }),
        prisma.notificacion.count({ where: { empresaId: empresa.id } }),
      ]);
      console.log(quedan.every(n => n === 0)
        ? 'Limpieza: no quedó ninguna fila de la prueba.'
        : `Limpieza INCOMPLETA (empresa/colaboradores/horarios/permisos/registros/días/notificaciones): ${quedan.join('/')}`);
    }
    await prisma.$disconnect();
    process.exit(salida);
  });
