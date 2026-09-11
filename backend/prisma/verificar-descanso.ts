// Reproduce el DESCANSO NO REMUNERADO de punta a punta, con las rutas de verdad y
// contra números calculados a mano. Es el protocolo de CLAUDE.md §8.6.
//
//   npx ts-node prisma/verificar-descanso.ts
//
// No hace falta levantar el backend: las rutas se montan dentro del proceso
// (ver `app-en-proceso.ts`). Solo toca la base local, y BORRA todo lo que crea.
//
//  1. EL HORARIO. POST y PUT /api/horarios: no guardan un descanso que se cruza
//     con el almuerzo ni uno a medias, y guardan la ventana y la foto.
//  2. EL KIOSCO. Con una franja armada alrededor de la hora actual, porque la ruta
//     toma la hora del reloj: sale al descanso, vuelve, y la segunda vez el
//     servidor ya no le cree el flag.
//  3. EL CASO. Un lunes y un martes pasados con el horario de la parte 1. Como el
//     kiosco no deja marcar en el pasado, las marcaciones se escriben directo,
//     CON LA MISMA FORMA que la parte 2 acaba de ver escribir al kiosco. Los
//     reportes y la tabla sí pasan por las rutas.
//  4. EL EDITOR. PUT /api/registros/jornada/:id con las dos pausas.
import { prisma } from '../src/prisma';
import { rangoDiaBogota, medianocheBogota } from '../src/utils/fechas';
import { DIAS_SEMANA } from '../src/utils/tardanzas';
import { asegurarDiaMaterializado } from '../src/utils/materializarDias';
import { montarApp } from './app-en-proceso';

const SUFIJO = `verif-descanso-${Date.now()}`;
const UN_DIA_MS = 24 * 60 * 60 * 1000;
// Lo que el kiosco acepta como foto: solo se miran los primeros bytes de un JPEG.
// Aquí no se prueba la foto, sino si se guarda o no.
const FOTO = `data:image/jpeg;base64,${Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0xff, 0xd9]).toString('base64')}`;

type Caso = { nombre: string; espera: string; obtenido: string; ok: boolean };
const casos: Caso[] = [];
function comprobar(nombre: string, espera: string | number, obtenido: string | number | null | undefined) {
  const valor = obtenido === null || obtenido === undefined ? 'null' : String(obtenido);
  casos.push({ nombre, espera: String(espera), obtenido: valor, ok: String(espera) === valor });
}

const dos = (n: number) => String(n).padStart(2, '0');
// Hora de pared de Bogotá de un instante, "HH:MM".
function horaBogota(d: Date): string {
  const z = rangoDiaBogota(d).ahoraBog;
  return `${dos(z.getHours())}:${dos(z.getMinutes())}`;
}
const horaDe = (s: string | null | undefined) => (s ? horaBogota(new Date(s)) : '—');
const diaBogota = (d: Date) => rangoDiaBogota(d).inicioDia.toISOString().slice(0, 10);
// Un instante dado en hora de Bogotá (UTC-5 todo el año). CLAUDE.md §8.1.
const bog = (a: number, mes: number, d: number, h: number, min = 0) =>
  new Date(Date.UTC(a, mes - 1, d, h + 5, min, 0));

type Marca = { entrada: Date | null; salida: Date | null; salidaAlmuerzo: boolean; salidaDescanso: boolean };
// "08:00-09:00 D | 09:15-12:00 A | 13:00-17:00 -": D = salió al descanso, A = a almorzar.
const describir = (ms: Marca[]) => ms
  .map(m => `${m.entrada ? horaBogota(m.entrada) : '—'}-${m.salida ? horaBogota(m.salida) : '—'} ${m.salidaDescanso ? 'D' : m.salidaAlmuerzo ? 'A' : '-'}`)
  .join(' | ');

type Pausa = { estado: string; minutosDescontados: number };
type FilaTabla = {
  fecha: string; entrada: string | null; salida: string | null; minutosContados: number;
  minutosDescansoAqui?: number; marcaciones?: unknown[]; almuerzo: Pausa | null; descanso?: Pausa | null;
};
type RespEstado = {
  dentroAhora: boolean; enAlmuerzo: boolean; enDescanso?: boolean; almuerzo: unknown;
  descanso?: { inicio: string; fin: string; ahora: boolean } | null;
};
type RespMarca = { accion?: string; codigo?: string; salidaDescanso?: boolean };
type RespLiquidacion = { saldo: { minutosEsperados: number; minutosTrabajados: number; minutosSaldo: number } };
type RespTardanzas = { diasTarde: number };
type RespTablero = { enDescanso?: { id: string; pausa?: string }[] };
type RespDetalle = { descanso?: Pausa | null; minutosDelDia: number };

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
  const enviar = (method: 'POST' | 'PUT', url: string, payload: object) => app.inject({ method, url, headers: admin, payload });

  // ===================== 1. EL HORARIO =====================
  const franja = {
    dias: ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'], horaEntrada: '08:00', horaSalida: '17:00',
    tieneAlmuerzo: true, almuerzoInicio: '12:00', almuerzoFin: '13:00',
  };
  const horarioCon = (f: object, extra: object = {}) =>
    ({ nombre: 'Oficina', toleranciaMin: 0, toleranciaSalidaMin: 0, almuerzoMin: 0, franjas: [f], ...extra });

  const cruzado = await enviar('POST', '/api/horarios', horarioCon({ ...franja, descansoInicio: '12:30', descansoFin: '12:45' }));
  comprobar('horario: un descanso que se cruza con el almuerzo no se guarda', 400, cruzado.statusCode);
  const aMedias = await enviar('POST', '/api/horarios', horarioCon({ ...franja, descansoInicio: '09:00' }));
  comprobar('horario: un descanso con una sola hora no se guarda', 400, aMedias.statusCode);
  comprobar('horario: ninguno de los dos quedó guardado', 0, await prisma.horario.count({ where: { empresaId: empresa.id } }));

  const creado = await enviar('POST', '/api/horarios', horarioCon({ ...franja, descansoInicio: '09:00', descansoFin: '09:15' }, { fotoEnDescanso: false }));
  if (creado.statusCode !== 201) throw new Error(`crear el horario: ${creado.statusCode} ${creado.body}`);
  const horarioId = creado.json<{ id: string }>().id;
  const leerHorario = () => prisma.horario.findUnique({ where: { id: horarioId }, include: { franjas: true } });
  const h1 = await leerHorario();
  comprobar('horario: guarda la ventana del descanso y la foto apagada', '09:00–09:15 foto:false',
    h1 && `${h1.franjas[0]?.descansoInicio}–${h1.franjas[0]?.descansoFin} foto:${h1.fotoEnDescanso}`);

  // Una pestaña con la pantalla vieja no manda `fotoEnDescanso`. Editar desde ahí
  // no puede volver a encender la foto que el administrador apagó.
  const editado = await enviar('PUT', `/api/horarios/${horarioId}`, horarioCon({ ...franja, descansoInicio: '09:00', descansoFin: '09:15' }));
  comprobar('horario: editarlo sin mandar la foto responde 200', 200, editado.statusCode);
  comprobar('horario: y la foto sigue apagada', 'false', String((await leerHorario())?.fotoEnDescanso));

  // ===================== 2. EL KIOSCO =====================
  const ahora = rangoDiaBogota(new Date()).ahoraBog;
  const minAhora = ahora.getHours() * 60 + ahora.getMinutes();
  if (minAhora < 15 || minAhora > 22 * 60 + 50) {
    throw new Error('Correrlo entre las 00:15 y las 22:50 de Bogotá: la franja de la parte 2 va de 00:00 a una hora después de ahora, y el descanso empieza diez minutos antes de ahora.');
  }
  const aHHMM = (m: number) => `${dos(Math.floor(m / 60))}:${dos(m % 60)}`;
  const descansoIni = aHHMM(minAhora - 10);
  const descansoFin = aHHMM(minAhora + 20);
  // Tolerancia de un día entero para que la llegada tarde y la salida temprana no
  // se atraviesen: aquí se mide el descanso, y esas dos tienen su propia verificación.
  const horarioKiosco = await prisma.horario.create({
    data: {
      empresaId: empresa.id, nombre: 'Kiosco', activo: true, toleranciaMin: 1440, almuerzoMin: 0, fotoEnDescanso: false,
      franjas: {
        create: [{
          dias: [DIAS_SEMANA[ahora.getDay()]], horaEntrada: '00:00', horaSalida: aHHMM(minAhora + 60),
          tieneAlmuerzo: false, descansoInicio: descansoIni, descansoFin,
        }],
      },
    },
  });
  // REMOTO para que la ubicación no estorbe.
  const kiosco = await prisma.colaborador.create({
    data: {
      empresaId: empresa.id, nombre: 'Kiosco', apellido: 'Prueba', cedula: `${SUFIJO}-k`,
      salarioMensual: 1_500_000, modalidad: 'REMOTO', horarioId: horarioKiosco.id,
    },
    select: { id: true, cedula: true },
  });
  const hoy = rangoDiaBogota(new Date()).inicioDia;
  await asegurarDiaMaterializado(kiosco.id, hoy);
  const diaHoy = await prisma.diaEsperado.findFirst({ where: { colaboradorId: kiosco.id, fecha: { gte: hoy, lt: new Date(hoy.getTime() + UN_DIA_MS) } } });
  comprobar('kiosco · precondición: el día de hoy congeló la ventana del descanso', `${descansoIni}–${descansoFin}`,
    diaHoy && `${diaHoy.descansoInicio}–${diaHoy.descansoFin}`);

  const login = await app.inject({ method: 'POST', url: '/api/worker/login', payload: { marcadorToken: empresa.marcadorToken, cedula: kiosco.cedula } });
  if (login.statusCode !== 200) throw new Error(`login del kiosco: ${login.statusCode} ${login.body}`);
  const worker = { authorization: `Bearer ${login.json<{ token: string }>().token}` };
  const marcar = async (payload: object) => {
    const r = await app.inject({ method: 'POST', url: '/api/worker/marcar', headers: worker, payload });
    const c = r.json<RespMarca>();
    return `${r.statusCode} ${c.accion ?? c.codigo}${c.accion === 'SALIDA' ? ` descanso:${c.salidaDescanso}` : ''}`;
  };
  const estado = async () => (await app.inject({ method: 'GET', url: '/api/worker/estado', headers: worker })).json<RespEstado>();

  comprobar('kiosco: entra', '200 ENTRADA', await marcar({ foto: FOTO }));
  const e1 = await estado();
  comprobar('kiosco: /estado le ofrece el descanso, y dice que es ahora', `${descansoIni}–${descansoFin} ahora:true`,
    e1.descanso && `${e1.descanso.inicio}–${e1.descanso.fin} ahora:${e1.descanso.ahora}`);
  comprobar('kiosco: /estado no le ofrece almuerzo, porque la franja no tiene', 'null', JSON.stringify(e1.almuerzo));

  comprobar('kiosco: sale al descanso', '200 SALIDA descanso:true', await marcar({ foto: FOTO, descanso: true }));
  const [primera] = await prisma.registro.findMany({
    where: { colaboradorId: kiosco.id }, orderBy: { creadoEn: 'asc' },
    select: { id: true, fecha: true, salidaAlmuerzo: true, salidaDescanso: true, fotoEntrada: true, fotoSalida: true },
  });
  comprobar('kiosco: la marcación queda como salida al descanso, no al almuerzo', 'descanso:true almuerzo:false',
    primera && `descanso:${primera.salidaDescanso} almuerzo:${primera.salidaAlmuerzo}`);
  comprobar('kiosco: la entrada guardó su foto (control: la foto de prueba sirve)', 'true', String(!!primera?.fotoEntrada));
  comprobar('kiosco: con la foto del descanso apagada, la salida al descanso no la guarda', 'false', String(!!primera?.fotoSalida));

  const e2 = await estado();
  comprobar('kiosco: /estado dice que está en su descanso, no adentro ni almorzando', 'enDescanso:true dentro:false enAlmuerzo:false',
    `enDescanso:${e2.enDescanso} dentro:${e2.dentroAhora} enAlmuerzo:${e2.enAlmuerzo}`);
  const tablero = await leer<RespTablero>('/api/dashboard/empresa');
  comprobar('tablero: sale en pausa, y la pausa es el descanso', 'DESCANSO', tablero.enDescanso?.find(p => p.id === kiosco.id)?.pausa);

  comprobar('kiosco: vuelve del descanso', '200 ENTRADA', await marcar({ foto: FOTO }));
  const segunda = await prisma.registro.findFirst({
    where: { colaboradorId: kiosco.id, id: { not: primera?.id } }, select: { fecha: true, fotoEntrada: true },
  });
  comprobar('kiosco: el regreso queda en el mismo día de la entrada', primera?.fecha.toISOString() ?? 'sin entrada', segunda?.fecha.toISOString());
  comprobar('kiosco: el regreso del descanso tampoco guarda la foto', 'false', String(!!segunda?.fotoEntrada));

  const e3 = await estado();
  comprobar('kiosco: ya tomado, /estado no le vuelve a ofrecer el descanso', 'null', JSON.stringify(e3.descanso ?? null));
  comprobar('kiosco: si igual lo pide, el servidor no le cree: es una salida normal', '200 SALIDA descanso:false',
    await marcar({ foto: FOTO, descanso: true }));

  const hoyTxt = diaBogota(new Date());
  const filasHoy = await leer<FilaTabla[]>(`/api/registros?colaboradorId=${kiosco.id}&desde=${hoyTxt}&hasta=${hoyTxt}`);
  comprobar('registros: la jornada del kiosco, con su descanso, es UNA fila de dos marcaciones', '1 fila · 2 marcaciones',
    `${filasHoy.length} fila · ${filasHoy[0]?.marcaciones?.length} marcaciones`);
  comprobar('registros: y esa fila trae el descanso como marcado', 'MARCADO', filasHoy[0]?.descanso?.estado);

  // ===================== 3. EL CASO =====================
  // Lunes 7 y martes 8 de septiembre de 2026, que no son festivos.
  const LUNES = medianocheBogota('2026-09-07');
  const MARTES = medianocheBogota('2026-09-08');
  const oficina = await prisma.colaborador.create({
    data: { empresaId: empresa.id, nombre: 'Oficina', apellido: 'Prueba', cedula: `${SUFIJO}-o`, salarioMensual: 1_500_000, horarioId },
    select: { id: true },
  });
  await asegurarDiaMaterializado(oficina.id, LUNES);
  await asegurarDiaMaterializado(oficina.id, MARTES);
  const diaLunes = await prisma.diaEsperado.findFirst({ where: { colaboradorId: oficina.id, fecha: { gte: LUNES, lt: MARTES } } });
  comprobar('caso · precondición: el lunes pedía 08:00–17:00, almuerzo 12:00–13:00, descanso 09:00–09:15, 465 min',
    '08:00–17:00 12:00–13:00 09:00–09:15 465',
    diaLunes && `${diaLunes.horaEntrada}–${diaLunes.horaSalida} ${diaLunes.almuerzoInicio}–${diaLunes.almuerzoFin} ${diaLunes.descansoInicio}–${diaLunes.descansoFin} ${diaLunes.minutosEsperados}`);

  const marcacion = (dia: Date, d: number, h1: number, m1: number, h2: number, m2: number, pausa: 'ALMUERZO' | 'DESCANSO' | null) =>
    prisma.registro.create({
      data: {
        colaboradorId: oficina.id, fecha: dia, entrada: bog(2026, 9, d, h1, m1), salida: bog(2026, 9, d, h2, m2),
        salidaAlmuerzo: pausa === 'ALMUERZO', salidaDescanso: pausa === 'DESCANSO',
      },
    });
  // El lunes marcó las dos pausas: tres marcaciones.
  await marcacion(LUNES, 7, 8, 0, 9, 0, 'DESCANSO');
  await marcacion(LUNES, 7, 9, 15, 12, 0, 'ALMUERZO');
  await marcacion(LUNES, 7, 13, 0, 17, 0, null);
  // El martes no marcó el descanso: trabajó de corrido hasta almorzar.
  const martesManana = await marcacion(MARTES, 8, 8, 0, 12, 0, 'ALMUERZO');
  const martesTarde = await marcacion(MARTES, 8, 13, 0, 17, 0, null);

  console.log(`
Calculado a mano, con franja 08:00–17:00, almuerzo 12:00–13:00 y descanso 09:00–09:15:
  el día pide    540 − 60 de almuerzo − 15 de descanso = 465 min
  lunes          08:00–09:00 + 09:15–12:00 + 13:00–17:00 = 60 + 165 + 240 = 465
                 no trabajó dentro de ninguna pausa: no se le descuenta nada → 465
  martes         08:00–12:00 + 13:00–17:00 = 240 + 240 = 480
                 trabajó los 15 min del descanso, que no se pagan → 480 − 15 = 465
  los dos días   esperadas 930, trabajadas 930, saldo 0
  tardanzas      entró a las 08:00 los dos días con tolerancia 0 → 0 días tarde`);

  const q = (desde: string, hasta: string) => `colaboradorId=${oficina.id}&desde=${desde}&hasta=${hasta}`;
  const liqLunes = await leer<RespLiquidacion>(`/api/reportes/liquidacion?${q('2026-09-07', '2026-09-07')}`);
  comprobar('lunes · liquidación: esperadas', 465, liqLunes.saldo.minutosEsperados);
  comprobar('lunes · liquidación: trabajadas', 465, liqLunes.saldo.minutosTrabajados);
  const liqMartes = await leer<RespLiquidacion>(`/api/reportes/liquidacion?${q('2026-09-08', '2026-09-08')}`);
  comprobar('martes · liquidación: trabajadas, sin los 15 min del descanso', 465, liqMartes.saldo.minutosTrabajados);
  const liqDos = await leer<RespLiquidacion>(`/api/reportes/liquidacion?${q('2026-09-07', '2026-09-08')}`);
  comprobar('los dos días · liquidación: esperadas', 930, liqDos.saldo.minutosEsperados);
  comprobar('los dos días · liquidación: trabajadas', 930, liqDos.saldo.minutosTrabajados);
  comprobar('los dos días · liquidación: saldo', 0, liqDos.saldo.minutosSaldo);
  const tar = await leer<RespTardanzas>(`/api/reportes/tardanzas?${q('2026-09-07', '2026-09-08')}`);
  comprobar('los dos días · tardanzas: días tarde', 0, tar.diasTarde);

  const filas = await leer<FilaTabla[]>(`/api/registros?${q('2026-09-07', '2026-09-08')}`);
  const filasDe = (dia: string) => filas.filter(f => diaBogota(new Date(f.fecha)) === dia);
  const lunes = filasDe('2026-09-07');
  comprobar('registros · lunes: entrada, descanso, almuerzo y salida son UNA fila', '1 fila · 3 marcaciones · 08:00→17:00',
    `${lunes.length} fila · ${lunes[0]?.marcaciones?.length} marcaciones · ${horaDe(lunes[0]?.entrada)}→${horaDe(lunes[0]?.salida)}`);
  comprobar('registros · lunes: contó 465 min, con las dos pausas marcadas', '465 almuerzo:MARCADO descanso:MARCADO',
    lunes[0] && `${lunes[0].minutosContados} almuerzo:${lunes[0].almuerzo?.estado} descanso:${lunes[0].descanso?.estado}`);
  const martes = filasDe('2026-09-08');
  comprobar('registros · martes: una fila que contó 465 min y le descontó 15 de descanso', '1 fila · 465 · descanso aquí 15',
    `${martes.length} fila · ${martes[0]?.minutosContados} · descanso aquí ${martes[0]?.minutosDescansoAqui}`);
  const detalleMartes = await leer<RespDetalle>(`/api/registros/${martesManana.id}/jornada`);
  comprobar('detalle · martes: el descanso descontó 15 min y el día contó 465', '15 · 465',
    `${detalleMartes.descanso?.minutosDescontados} · ${detalleMartes.minutosDelDia}`);

  // ===================== 4. EL EDITOR =====================
  const filasMartes = async () => describir(await prisma.registro.findMany({
    where: { colaboradorId: oficina.id, fecha: { gte: MARTES, lt: new Date(MARTES.getTime() + UN_DIA_MS) } },
    orderBy: { entrada: 'asc' }, select: { entrada: true, salida: true, salidaAlmuerzo: true, salidaDescanso: true },
  }));
  const editar = (payload: object) => enviar('PUT', `/api/registros/jornada/${martesManana.id}`,
    { colaboradorId: oficina.id, fecha: '2026-09-08', tipo: 'NORMAL', observacion: '', ...payload });

  const antesDeEditar = await filasMartes();
  comprobar('editor · precondición: el martes son dos marcaciones', '08:00-12:00 A | 13:00-17:00 -', antesDeEditar);

  // Novedades colgando de cada marcación, como las deja el kiosco: la de una salida
  // temprana cuelga de la marcación que cerró. Al reescribir la jornada tienen que
  // ir a donde fue su salida, no borrarse con una fila ni quedarse en otra.
  const novedadEn = (registroId: string, descripcion: string) => prisma.permiso.create({
    data: { colaboradorId: oficina.id, registroId, tipo: 'MEDICO', descripcion, fechaInicio: MARTES, fechaFin: MARTES, aprobado: false },
    select: { id: true },
  });
  const novTarde = await novedadEn(martesTarde.id, 'Novedad de la salida del día');
  const novManana = await novedadEn(martesManana.id, 'Novedad de la salida a almorzar');
  const entradaDeSuFila = async (permisoId: string) => {
    const p = await prisma.permiso.findUnique({ where: { id: permisoId }, select: { registroId: true } });
    const r = p?.registroId ? await prisma.registro.findUnique({ where: { id: p.registroId }, select: { entrada: true } }) : null;
    return r?.entrada ? horaBogota(r.entrada) : 'sin fila';
  };

  const vieja = await editar({ entrada: '08:00', descansoSalida: '12:00', descansoRegreso: '13:00', salida: '17:00' });
  comprobar('editor: una pantalla vieja, que manda el almuerzo como "descanso", se rechaza', '400 FORMATO_VIEJO',
    `${vieja.statusCode} ${vieja.json<{ codigo?: string }>().codigo}`);
  comprobar('editor: y no tocó nada', antesDeEditar, await filasMartes());

  const conDescanso = await editar({
    entrada: '08:00', descanso: { salida: '09:00', regreso: '09:15' }, almuerzo: { salida: '12:00', regreso: '13:00' }, salida: '17:00',
  });
  comprobar('editor: agregarle el descanso a la jornada responde 200', 200, conDescanso.statusCode);
  comprobar('editor: quedan tres marcaciones, cada una termina donde debe', '08:00-09:00 D | 09:15-12:00 A | 13:00-17:00 -', await filasMartes());
  comprobar('editor: la novedad de la salida del día sigue en la fila de las 13:00', '13:00', await entradaDeSuFila(novTarde.id));
  comprobar('editor: la de la salida a almorzar se va con esa salida, a la fila nueva de las 09:15', '09:15', await entradaDeSuFila(novManana.id));
  const cambios = await prisma.registroCambio.findMany({ where: { registroId: martesManana.id }, select: { campo: true, antes: true, despues: true } });
  comprobar('editor: la bitácora dice que esa salida pasó de almuerzo a descanso', 'salidaAlmuerzo sí→no · salidaDescanso no→sí',
    ['salidaAlmuerzo', 'salidaDescanso']
      .map(c => { const x = cambios.find(k => k.campo === c); return x ? `${c} ${x.antes}→${x.despues}` : `${c} sin anotar`; })
      .join(' · '));
  const filasEditadas = await leer<FilaTabla[]>(`/api/registros?${q('2026-09-08', '2026-09-08')}`);
  comprobar('editor: en la tabla sigue siendo UNA fila, ahora de tres marcaciones, y cuenta 465', '1 fila · 3 marcaciones · 465',
    `${filasEditadas.length} fila · ${filasEditadas[0]?.marcaciones?.length} marcaciones · ${filasEditadas[0]?.minutosContados}`);

  // Decir que cada pausa era la otra, a las mismas horas. Es el caso en que dos
  // novedades cambian de fila a la vez, cada una hacia la fila de la otra: movidas
  // una por una, la segunda arrastraría a la primera y las dos quedarían juntas.
  const novDescanso = await novedadEn(martesManana.id, 'Novedad de la salida al descanso');
  const novedades = async () =>
    `almuerzo ${await entradaDeSuFila(novManana.id)} · descanso ${await entradaDeSuFila(novDescanso.id)} · tarde ${await entradaDeSuFila(novTarde.id)}`;
  const trocadas = await editar({
    entrada: '08:00', almuerzo: { salida: '09:00', regreso: '09:15' }, descanso: { salida: '12:00', regreso: '13:00' }, salida: '17:00',
  });
  comprobar('editor: cambiar cuál pausa es cuál responde 200', 200, trocadas.statusCode);
  comprobar('editor: las filas quedan con las pausas trocadas', '08:00-09:00 A | 09:15-12:00 D | 13:00-17:00 -', await filasMartes());
  comprobar('editor: cada novedad sigue a su salida, sin arrastrar a la otra', 'almuerzo 08:00 · descanso 09:15 · tarde 13:00', await novedades());
  const devueltas = await editar({
    entrada: '08:00', descanso: { salida: '09:00', regreso: '09:15' }, almuerzo: { salida: '12:00', regreso: '13:00' }, salida: '17:00',
  });
  comprobar('editor: devolverlas deja las filas y las novedades como estaban',
    '200 08:00-09:00 D | 09:15-12:00 A | 13:00-17:00 - · almuerzo 09:15 · descanso 08:00 · tarde 13:00',
    `${devueltas.statusCode} ${await filasMartes()} · ${await novedades()}`);

  const sinRegreso = await editar({
    entrada: '08:00', descanso: { salida: '09:00' }, almuerzo: { salida: '12:00', regreso: '13:00' }, salida: '17:00',
  });
  const errorSinRegreso = sinRegreso.json<{ error?: string }>().error ?? '';
  comprobar('editor: un descanso sin regreso seguido del almuerzo se rechaza', '400 no puede haber otra pausa después',
    `${sinRegreso.statusCode} ${/no puede haber otra pausa después/.test(errorSinRegreso) ? 'no puede haber otra pausa después' : errorSinRegreso}`);
  const soloRegreso = await editar({ entrada: '08:00', almuerzo: { salida: '', regreso: '13:00' }, salida: '17:00' });
  comprobar('editor: un regreso sin su salida se rechaza', 400, soloRegreso.statusCode);
  comprobar('editor: ninguno de los dos rechazos tocó la jornada', '08:00-09:00 D | 09:15-12:00 A | 13:00-17:00 -', await filasMartes());

  const sinDescanso = await editar({ entrada: '08:00', almuerzo: { salida: '12:00', regreso: '13:00' }, salida: '17:00' });
  comprobar('editor: quitarle el descanso responde 200', 200, sinDescanso.statusCode);
  comprobar('editor: vuelve a dos marcaciones y la que sobraba se borra', '08:00-12:00 A | 13:00-17:00 -', await filasMartes());
  comprobar('editor: al quitarlo, cada novedad queda donde quedó su salida', 'almuerzo 08:00 · descanso 08:00 · tarde 13:00', await novedades());

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
      const registros = (await prisma.registro.findMany({ where: { colaboradorId: { in: ids } }, select: { id: true } })).map(r => r.id);
      await prisma.registroCambio.deleteMany({ where: { registroId: { in: registros } } });
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
        prisma.registroCambio.count({ where: { registroId: { in: registros } } }),
        prisma.diaEsperado.count({ where: { colaboradorId: { in: ids } } }),
        prisma.notificacion.count({ where: { empresaId: empresa.id } }),
      ]);
      console.log(quedan.every(n => n === 0)
        ? 'Limpieza: no quedó ninguna fila de la prueba.'
        : `Limpieza INCOMPLETA (empresa/colaboradores/horarios/permisos/registros/cambios/días/notificaciones): ${quedan.join('/')}`);
    }
    await prisma.$disconnect();
    process.exit(salida);
  });
