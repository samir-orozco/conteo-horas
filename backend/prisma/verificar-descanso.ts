// Reproduce los DESCANSOS NO REMUNERADOS de punta a punta, con las rutas de verdad y
// contra números calculados a mano. Es el protocolo de CLAUDE.md §8.6.
//
//   npx ts-node prisma/verificar-descanso.ts
//
// Desde el 12 de septiembre de 2026 cada franja tiene una LISTA de hasta tres
// descansos, además del almuerzo, y ninguno se paga. El kiosco anota a cuál salió
// según la hora, y el editor reescribe jornadas de hasta cinco marcaciones.
//
// No hace falta levantar el backend: las rutas se montan dentro del proceso (ver
// `app-en-proceso.ts`). Solo toca la base local, y BORRA todo lo que crea.
//
//  1. EL HORARIO. POST, GET y PUT /api/horarios: lo que no se guarda, el texto
//     canónico, la foto, y la pantalla de antes que no puede borrar descansos.
//  2. EL KIOSCO, con un REMOTO y franjas armadas alrededor de la hora actual, porque
//     la ruta toma la hora del reloj: sale al descanso que toca, vuelve, sale al
//     siguiente; el descanso de ayer no gasta el de hoy; el tope del regreso que la
//     persona declara; y el cuerpo de la tableta de producción (67d6fe6).
//  2c. EL DESCANSO QUE NO VOLVIÓ AYER. Pasado el fin del turno de su día más la gracia, la
//     entrada de hoy es una entrada normal, con su llegada tarde; con el turno de ayer
//     todavía abierto, sigue siendo su regreso (12 de septiembre de 2026).
//  2b. EL KIOSCO con un PRESENCIAL y una sede con coordenadas: cada descanso son dos
//     marcas con geocerca, y la jornada queda en su sede.
//  3. EL CASO DEL DUEÑO. Ana, Beto y Carla el lunes 7 de septiembre de 2026, y el caso
//     de un solo descanso que ya estaba. Las marcaciones se escriben directo, con la
//     forma que deja el kiosco; los reportes y la tabla pasan por las rutas.
//  3b. EL DESCUENTO INCOMPLETO. La liquidación y el panel de inicio cobran enteras las
//     pausas de un día aunque su primera fila sea corta (12 de septiembre de 2026).
//  4. EL EDITOR. PUT /api/registros/jornada/:id con el almuerzo y dos descansos, las
//     fotos de cada salida, los topes, y las novedades que siguen a su salida. Además
//     (12 de septiembre de 2026): el regreso de un descanso solo va a la fila de ESE
//     descanso (Ana), y una fila vacía no corre el «descanso N» del mensaje.
import { prisma } from '../src/prisma';
import { rangoDiaBogota, medianocheBogota } from '../src/utils/fechas';
import { DIAS_SEMANA } from '../src/utils/tardanzas';
import { asegurarDiaMaterializado } from '../src/utils/materializarDias';
import { montarApp } from './app-en-proceso';

const SUFIJO = `verif-descanso-${Date.now()}`;
// La cédula tiene tope de 30 caracteres en el login del kiosco: solo dígitos, cortos.
const BASE_CEDULA = `${Date.now() % 10_000_000_000}`;
let cedulas = 0;
const nuevaCedula = () => `${BASE_CEDULA}${++cedulas}`;
const UN_DIA_MS = 24 * 60 * 60 * 1000;
const MS_MIN = 60_000;
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
const horaDe = (s: string | Date | null | undefined) => (s ? horaBogota(new Date(s)) : '—');
const diaBogota = (d: Date) => rangoDiaBogota(d).inicioDia.toISOString().slice(0, 10);
// Un instante dado en hora de Bogotá (UTC-5 todo el año). CLAUDE.md §8.1.
const bog = (a: number, mes: number, d: number, h: number, min = 0) =>
  new Date(Date.UTC(a, mes - 1, d, h + 5, min, 0));
const V = (inicio: string, fin: string) => ({ inicio, fin });
type Ventana = { inicio: string; fin: string };
const clave = (v: Ventana) => `${v.inicio}-${v.fin}`;
const listaDe = (v: unknown) => (Array.isArray(v) ? v.map((x: Ventana) => clave(x)).join(',') : `no es arreglo: ${JSON.stringify(v)}`);

type Marca = { entrada: Date | null; salida: Date | null; salidaAlmuerzo: boolean; salidaDescanso: boolean; descansoVentana: string | null };
// "07:00-09:00 D(09:00-09:15) | 09:15-12:00 A | 13:00-16:00 -": D = al descanso, A = a almorzar.
const describir = (ms: Marca[]) => ms
  .map(m => `${m.entrada ? horaBogota(m.entrada) : '—'}-${m.salida ? horaBogota(m.salida) : '—'} ${m.salidaDescanso ? 'D' : m.salidaAlmuerzo ? 'A' : '-'}${m.descansoVentana ? `(${m.descansoVentana})` : ''}`)
  .join(' | ');

type Pausa = {
  estado: string; minutosDescontados: number; minutosDeMas: number;
  ventana: Ventana | null; salida: string | null; regreso: string | null;
};
type FilaTabla = {
  fecha: string; entrada: string | null; salida: string | null; minutosContados: number;
  minutosDescansoAqui?: number; marcaciones?: unknown[]; almuerzo: Pausa | null; descansos?: Pausa[];
  sede?: { nombre: string } | null;
};
type RespEstado = {
  dentroAhora: boolean; enAlmuerzo: boolean; enDescanso?: boolean; almuerzo: unknown;
  descanso?: { inicio: string; fin: string; ahora: boolean } | null;
};
type RespMarca = { accion?: string; codigo?: string; salidaDescanso?: boolean; descanso?: Ventana | null; regresoEstimado?: boolean };
type RespLiquidacion = { saldo: { minutosEsperados: number; minutosTrabajados: number; minutosSaldo: number } };
type RespTardanzas = { diasTarde: number };
type RespTablero = { enDescanso?: { id: string; pausa?: string }[] };
type RespDetalle = { descansos?: Pausa[]; minutosDelDia: number; dia?: { descansos?: unknown } | null };
type RespExtras = { colaboradores?: { colaboradorId: string; sedes?: { id: string | null; nombre: string | null; porDefecto?: boolean }[] }[] };

// Un resumen por ventana, como lo pinta la tabla.
const estados = (ds: Pausa[] | undefined) => (ds ?? [])
  .map(d => `${d.ventana ? clave(d.ventana) : 'sin ventana'} ${d.estado}${d.salida ? ` ${horaDe(d.salida)}→${horaDe(d.regreso)}` : ''} desc:${d.minutosDescontados} más:${d.minutosDeMas}`)
  .join(' | ');

async function main() {
  // La parte 2 arma las ventanas alrededor de la hora actual: de ahora − 120 a ahora + 60
  // minutos, sin dar la vuelta al día.
  const ahoraBog = rangoDiaBogota(new Date()).ahoraBog;
  const M = ahoraBog.getHours() * 60 + ahoraBog.getMinutes();
  if (M < 125 || M > 22 * 60 + 30) {
    throw new Error('Correrlo entre las 02:05 y las 22:30 de Bogotá: la parte 2 usa horas desde ahora − 120 hasta ahora + 60 minutos, dentro del mismo día.');
  }
  const aHHMM = (m: number) => {
    if (m < 0 || m >= 1440) throw new Error(`la hora ${m} se sale del día: el script no sirve a esta hora`);
    return `${dos(Math.floor(m / 60))}:${dos(m % 60)}`;
  };
  const hoy = rangoDiaBogota(new Date()).inicioDia;
  const hoyTxt = diaBogota(new Date());
  const enMinuto = (m: number) => new Date(hoy.getTime() + m * MS_MIN);
  const hoyDia = DIAS_SEMANA[ahoraBog.getDay()];

  const { app, tokenAdmin } = await montarApp();
  const empresa = await prisma.empresa.create({
    data: { nombre: `Prueba ${SUFIJO}`, nit: SUFIJO, email: `${SUFIJO}@prueba.local`, marcadorToken: SUFIJO },
    select: { id: true, marcadorToken: true },
  });
  const cabeceras = (empresaId: string) => ({ authorization: `Bearer ${tokenAdmin(empresaId)}` });
  const admin = cabeceras(empresa.id);
  async function leer<T>(url: string, headers = admin): Promise<T> {
    const r = await app.inject({ method: 'GET', url, headers });
    if (r.statusCode !== 200) throw new Error(`${url}: ${r.statusCode} ${r.body}`);
    return r.json<T>();
  }
  const enviar = (method: 'POST' | 'PUT', url: string, payload: object) => app.inject({ method, url, headers: admin, payload });

  // ===================== 1. EL HORARIO =====================
  // El ejemplo del dueño: de 07:00 a 16:00, almuerzo de 12:00 a 13:00.
  const LABORABLES = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'];
  const ejemplo = { dias: LABORABLES, horaEntrada: '07:00', horaSalida: '16:00', tieneAlmuerzo: true, almuerzoInicio: '12:00', almuerzoFin: '13:00' };
  const horarioCon = (franjas: object[], extra: object = {}) =>
    ({ nombre: 'Oficina', toleranciaMin: 0, toleranciaSalidaMin: 0, almuerzoMin: 0, franjas, ...extra });

  const rechazos: [string, object][] = [
    ['el descanso 2 se cruza con el 1', { ...ejemplo, descansos: [V('09:00', '09:15'), V('09:10', '09:20')] }],
    ['cuatro descansos', { ...ejemplo, descansos: [V('08:00', '08:10'), V('09:00', '09:10'), V('10:00', '10:10'), V('15:00', '15:10')] }],
    ['el descanso 2 se cruza con el almuerzo', { ...ejemplo, descansos: [V('09:00', '09:15'), V('12:30', '12:45')] }],
    ['descansos que no son una lista', { ...ejemplo, descansos: '09:00-09:15' }],
    ['una hora de entrada "99:99"', { ...ejemplo, horaEntrada: '99:99', descansos: [] }],
  ];
  for (const [nombre, franja] of rechazos) {
    const r = await enviar('POST', '/api/horarios', horarioCon([franja]));
    comprobar(`horario: ${nombre} no se guarda`, 400, r.statusCode);
  }
  comprobar('horario: ninguno de los rechazados quedó guardado', 0, await prisma.horario.count({ where: { empresaId: empresa.id } }));

  // Desordenados a propósito: se guardan en el orden de la jornada.
  const creado = await enviar('POST', '/api/horarios', horarioCon([{ ...ejemplo, descansos: [V('15:00', '15:10'), V('09:00', '09:15')] }], { fotoEnDescanso: false }));
  if (creado.statusCode !== 201) throw new Error(`crear el horario: ${creado.statusCode} ${creado.body}`);
  const horarioId = creado.json<{ id: string }>().id;
  const DOS_TEXTO = '[{"inicio":"09:00","fin":"09:15"},{"inicio":"15:00","fin":"15:10"}]';
  const leerHorario = () => prisma.horario.findUnique({ where: { id: horarioId }, include: { franjas: true } });
  const h1 = await leerHorario();
  comprobar('horario: guarda el texto canónico, ordenado desde la entrada, y la foto apagada', `${DOS_TEXTO} foto:false`,
    h1 && `${h1.franjas[0]?.descansos} foto:${h1.fotoEnDescanso}`);
  comprobar('horario: la respuesta del POST trae los descansos como arreglo', '09:00-09:15,15:00-15:10',
    listaDe(creado.json<{ franjas: { descansos: unknown }[] }>().franjas[0]?.descansos));
  const horarios = await leer<{ id: string; franjas: { descansos: unknown }[] }[]>('/api/horarios');
  comprobar('horario: GET /api/horarios devuelve los descansos como arreglo de dos', '09:00-09:15,15:00-15:10',
    listaDe(horarios.find(h => h.id === horarioId)?.franjas[0]?.descansos));

  const editado = await enviar('PUT', `/api/horarios/${horarioId}`, horarioCon([{ ...ejemplo, descansos: [V('09:00', '09:15'), V('15:00', '15:10')] }]));
  comprobar('horario: editarlo con los descansos y sin mandar la foto responde 200', 200, editado.statusCode);
  comprobar('horario: y la foto sigue apagada', 'false', String((await leerHorario())?.fotoEnDescanso));

  // La pantalla de horarios de producción (67d6fe6) arma las franjas SIN la clave
  // `descansos`. Como las franjas se reemplazan enteras, guardar desde ahí borraría los
  // descansos que otro configuró.
  const franjaVieja = { dias: LABORABLES, horaEntrada: '07:00', horaSalida: '16:00', tieneAlmuerzo: true, almuerzoInicio: '12:00', almuerzoFin: '13:00' };
  const vieja = await enviar('PUT', `/api/horarios/${horarioId}`, horarioCon([franjaVieja], { toleranciaMin: 5 }));
  comprobar('horario: la pantalla de antes sobre un horario con descansos responde 400 FORMATO_VIEJO', '400 FORMATO_VIEJO',
    `${vieja.statusCode} ${vieja.json<{ codigo?: string }>().codigo}`);
  const h2 = await leerHorario();
  comprobar('horario: y la base sigue con los dos descansos y la tolerancia de antes', `${DOS_TEXTO} tolerancia:0`,
    `${h2?.franjas[0]?.descansos} tolerancia:${h2?.toleranciaMin}`);
  const sinDescansos = await enviar('POST', '/api/horarios', horarioCon([franjaVieja], { nombre: 'Sin descansos' }));
  const viejaSin = await enviar('PUT', `/api/horarios/${sinDescansos.json<{ id: string }>().id}`, horarioCon([franjaVieja], { nombre: 'Sin descansos', toleranciaMin: 5 }));
  comprobar('horario: la misma pantalla de antes sobre un horario sin descansos guarda como siempre', '201 200',
    `${sinDescansos.statusCode} ${viejaSin.statusCode}`);

  // ===================== 2. EL KIOSCO (REMOTO) =====================
  const horarioDirecto = async (nombre: string, franja: object, empresaId = empresa.id, fotoEnDescanso = false) => (await prisma.horario.create({
    data: {
      // Tolerancias de un día entero para que la llegada tarde y la salida temprana
      // no se atraviesen: aquí se miden las pausas.
      empresaId, nombre, activo: true, toleranciaMin: 1440, toleranciaSalidaMin: 1440, almuerzoMin: 0, fotoEnDescanso,
      franjas: { create: [{ dias: [hoyDia], horaEntrada: '00:00', horaSalida: aHHMM(M + 60), tieneAlmuerzo: false, ...franja }] },
    },
    select: { id: true },
  })).id;
  const colaboradorCon = (etiqueta: string, horario: string) => prisma.colaborador.create({
    data: {
      empresaId: empresa.id, nombre: etiqueta, apellido: 'Prueba', cedula: nuevaCedula(),
      salarioMensual: 1_500_000, modalidad: 'REMOTO', horarioId: horario,
    },
    select: { id: true, cedula: true },
  });
  const diaDeHoy = (colaboradorId: string) =>
    prisma.diaEsperado.findFirst({ where: { colaboradorId, fecha: { gte: hoy, lt: new Date(hoy.getTime() + UN_DIA_MS) } } });
  const entrarAlKiosco = async (marcadorToken: string, cedula: string) => {
    const login = await app.inject({ method: 'POST', url: '/api/worker/login', payload: { marcadorToken, cedula } });
    if (login.statusCode !== 200) throw new Error(`login del kiosco: ${login.statusCode} ${login.body}`);
    const headers = { authorization: `Bearer ${login.json<{ token: string }>().token}` };
    return {
      marcar: async (payload: object) => {
        const r = await app.inject({ method: 'POST', url: '/api/worker/marcar', headers, payload });
        return { estado: r.statusCode, c: r.json<RespMarca>() };
      },
      estado: async () => (await app.inject({ method: 'GET', url: '/api/worker/estado', headers })).json<RespEstado>(),
    };
  };
  const txt = (r: { estado: number; c: RespMarca }) =>
    `${r.estado} ${r.c.accion ?? r.c.codigo}${r.c.accion === 'SALIDA' ? ` descanso:${r.c.salidaDescanso}` : ''}`;
  const ofrecido = (d: RespEstado['descanso']) => (d ? `${clave(d)} ahora:${d.ahora}` : 'null');

  const W1 = V(aHHMM(M - 10), aHHMM(M + 5));
  const W2 = V(aHHMM(M + 20), aHHMM(M + 30));
  const hKiosco = await horarioDirecto('Kiosco', { descansos: JSON.stringify([W2, W1]) });
  const kiosco = await colaboradorCon('kiosco', hKiosco);
  await asegurarDiaMaterializado(kiosco.id, hoy);
  comprobar('kiosco · precondición: el día de hoy congeló las dos ventanas, en orden', JSON.stringify([W1, W2]), (await diaDeHoy(kiosco.id))?.descansos);

  // Ayer salió a esa misma ventana hace 17 horas y cerró normal a las 16 h 30. Contado
  // por 18 horas, ese descanso le gastaría el de hoy.
  const ahoraMs = enMinuto(M).getTime();
  const ayer = new Date(hoy.getTime() - UN_DIA_MS);
  await prisma.registro.create({
    data: { colaboradorId: kiosco.id, fecha: ayer, entrada: new Date(ahoraMs - 18 * 3_600_000), salida: new Date(ahoraMs - 17 * 3_600_000), salidaDescanso: true, descansoVentana: clave(W1) },
  });
  await prisma.registro.create({
    data: { colaboradorId: kiosco.id, fecha: ayer, entrada: new Date(ahoraMs - 16 * 3_600_000 - 50 * MS_MIN), salida: new Date(ahoraMs - 16 * 3_600_000 - 30 * MS_MIN) },
  });

  const k = await entrarAlKiosco(empresa.marcadorToken!, kiosco.cedula);
  comprobar('kiosco: entra', '200 ENTRADA', txt(await k.marcar({ foto: FOTO })));
  const e1 = await k.estado();
  comprobar('kiosco: /estado ofrece el primer descanso y dice que es ahora, aunque ayer salió a esa ventana hace 17 horas', `${clave(W1)} ahora:true`, ofrecido(e1.descanso));
  comprobar('kiosco: /estado no ofrece almuerzo, porque la franja no tiene', 'null', JSON.stringify(e1.almuerzo));

  const s1 = await k.marcar({ foto: FOTO, descanso: true });
  comprobar('kiosco: sale al descanso que toca, y la respuesta dice cuál', `200 SALIDA descanso:true ${clave(W1)}`, `${txt(s1)} ${s1.c.descanso ? clave(s1.c.descanso) : 'null'}`);
  const deHoy = () => prisma.registro.findMany({
    where: { colaboradorId: kiosco.id, fecha: { gte: hoy } }, orderBy: { creadoEn: 'asc' },
    select: { id: true, fecha: true, salidaAlmuerzo: true, salidaDescanso: true, descansoVentana: true, fotoEntrada: true, fotoSalida: true },
  });
  const [primera] = await deHoy();
  comprobar('kiosco: la marcación queda como salida al descanso, con su ventana', `descanso:true almuerzo:false ${clave(W1)}`,
    primera && `descanso:${primera.salidaDescanso} almuerzo:${primera.salidaAlmuerzo} ${primera.descansoVentana}`);
  comprobar('kiosco: la entrada guardó su foto (control: la foto de prueba sirve)', 'true', String(!!primera?.fotoEntrada));
  comprobar('kiosco: con la foto del descanso apagada, la salida al descanso no la guarda', 'false', String(!!primera?.fotoSalida));

  const e2 = await k.estado();
  comprobar('kiosco: /estado dice que está en su descanso, no adentro ni almorzando', 'enDescanso:true dentro:false enAlmuerzo:false',
    `enDescanso:${e2.enDescanso} dentro:${e2.dentroAhora} enAlmuerzo:${e2.enAlmuerzo}`);
  const tablero = await leer<RespTablero>('/api/dashboard/empresa');
  comprobar('tablero: sale en pausa, y la pausa es el descanso', 'DESCANSO', tablero.enDescanso?.find(p => p.id === kiosco.id)?.pausa);

  comprobar('kiosco: vuelve del descanso', '200 ENTRADA', txt(await k.marcar({ foto: FOTO })));
  const [, segunda] = await deHoy();
  comprobar('kiosco: el regreso queda en el mismo día de la entrada, y sin foto', `${primera?.fecha.toISOString()} foto:false`,
    `${segunda?.fecha.toISOString()} foto:${!!segunda?.fotoEntrada}`);

  const e3 = await k.estado();
  comprobar('kiosco: /estado ofrece ahora el segundo descanso, que todavía no empieza', `${clave(W2)} ahora:false`, ofrecido(e3.descanso));
  const s2 = await k.marcar({ foto: FOTO, descanso: true });
  comprobar('kiosco: sale al segundo descanso', `200 SALIDA descanso:true ${clave(W2)}`, `${txt(s2)} ${s2.c.descanso ? clave(s2.c.descanso) : 'null'}`);
  comprobar('kiosco: vuelve del segundo', '200 ENTRADA', txt(await k.marcar({ foto: FOTO })));
  const e4 = await k.estado();
  comprobar('kiosco: tomados los dos, /estado ya no ofrece descanso', 'null', JSON.stringify(e4.descanso ?? null));
  comprobar('kiosco: si igual lo pide, es una salida normal y nunca un error', '200 SALIDA descanso:false', txt(await k.marcar({ foto: FOTO, descanso: true })));

  const filasHoy = await leer<FilaTabla[]>(`/api/registros?colaboradorId=${kiosco.id}&desde=${hoyTxt}&hasta=${hoyTxt}`);
  comprobar('registros: la jornada del kiosco es UNA fila de tres marcaciones, con los dos descansos marcados', '1 fila · 3 marcaciones · MARCADO,MARCADO',
    `${filasHoy.length} fila · ${filasHoy[0]?.marcaciones?.length} marcaciones · ${(filasHoy[0]?.descansos ?? []).map(d => d.estado).join(',')}`);

  // El tope de la hora de regreso que la persona declara, con las filas escritas como
  // las deja el kiosco. Cada colaborador con la ventana dentro de su día congelado.
  const regresoDeclarado = async (etiqueta: string, ventana: Ventana, salidaMin: number, regresoMin: number) => {
    const h = await horarioDirecto(`Tope ${etiqueta}`, { descansos: JSON.stringify([ventana]) });
    const c = await colaboradorCon(`tope-${etiqueta}`, h);
    await asegurarDiaMaterializado(c.id, hoy);
    const dia = await diaDeHoy(c.id);
    await prisma.registro.create({
      data: { colaboradorId: c.id, fecha: dia?.fecha ?? hoy, entrada: enMinuto(M - 120), salida: enMinuto(salidaMin), salidaDescanso: true, descansoVentana: clave(ventana) },
    });
    const kk = await entrarAlKiosco(empresa.marcadorToken!, c.cedula);
    const r = await kk.marcar({ foto: FOTO, regresoA: enMinuto(regresoMin).toISOString() });
    const nueva = await prisma.registro.findFirst({ where: { colaboradorId: c.id, salida: null }, select: { entrada: true, entradaEstimada: true } });
    return {
      precondicion: dia?.descansos === JSON.stringify([ventana]),
      resultado: `${r.estado} ${r.c.accion} estimada:${nueva?.entradaEstimada}`,
      hora: nueva?.entrada ? horaBogota(nueva.entrada) : '—',
    };
  };
  const dentro = await regresoDeclarado('dentro', V(aHHMM(M - 40), aHHMM(M - 30)), M - 40, M - 32);
  comprobar('tope · salió al empezar su ventana: la hora declarada vale hasta el fin de la ventana', `true 200 ENTRADA estimada:true ${aHHMM(M - 32)}`,
    `${dentro.precondicion} ${dentro.resultado} ${dentro.hora}`);
  const fueraATiempo = await regresoDeclarado('fuera-a-tiempo', V(aHHMM(M - 100), aHHMM(M - 90)), M - 40, M - 35);
  comprobar('tope · salió fuera de su ventana: vale hasta la salida más lo que dura ese descanso (control positivo)', `true 200 ENTRADA estimada:true ${aHHMM(M - 35)}`,
    `${fueraATiempo.precondicion} ${fueraATiempo.resultado} ${fueraATiempo.hora}`);
  const fueraTarde = await regresoDeclarado('fuera-tarde', V(aHHMM(M - 100), aHHMM(M - 90)), M - 40, M - 25);
  comprobar('tope · fuera de su ventana, cinco minutos después de la salida más la duración ya no se cree: entra a la hora de ahora', 'true 200 ENTRADA estimada:false',
    `${fueraTarde.precondicion} ${fueraTarde.resultado}`);

  // La tableta de producción (67d6fe6): su cuerpo solo trae `almuerzo`, nunca `descanso`.
  const hTableta = await horarioDirecto('Tableta', {
    tieneAlmuerzo: true, almuerzoInicio: aHHMM(M - 10), almuerzoFin: aHHMM(M + 20), descansos: JSON.stringify([V(aHHMM(M + 30), aHHMM(M + 40))]),
  });
  const tableta = await colaboradorCon('tableta', hTableta);
  await asegurarDiaMaterializado(tableta.id, hoy);
  const t = await entrarAlKiosco(empresa.marcadorToken!, tableta.cedula);
  comprobar('tableta de producción: entra con el cuerpo de siempre', '200 ENTRADA', txt(await t.marcar({ foto: FOTO })));
  const ta = await t.marcar({ foto: FOTO, almuerzo: true });
  const tFila = await prisma.registro.findFirst({
    where: { colaboradorId: tableta.id }, orderBy: { creadoEn: 'asc' },
    select: { fecha: true, salidaAlmuerzo: true, salidaDescanso: true, descansoVentana: true },
  });
  comprobar('tableta de producción: { almuerzo: true } dentro de la ventana sale a almorzar, sin ventana de descanso', '200 SALIDA almuerzo:true descanso:false ventana:null',
    `${ta.estado} ${ta.c.accion} almuerzo:${tFila?.salidaAlmuerzo} descanso:${tFila?.salidaDescanso} ventana:${tFila?.descansoVentana}`);
  const tv = await t.marcar({ foto: FOTO });
  const tRegreso = await prisma.registro.findFirst({ where: { colaboradorId: tableta.id, salida: null }, select: { fecha: true } });
  comprobar('tableta de producción: vuelve con {} en la misma fecha', `200 ENTRADA ${tFila?.fecha.toISOString()}`,
    `${tv.estado} ${tv.c.accion} ${tRegreso?.fecha.toISOString()}`);

  // ===================== 2c. EL DESCANSO QUE NO VOLVIÓ AYER =====================
  // Un descanso sin regreso espera solo hasta el fin del turno de su día más la gracia, y
  // nunca más de 18 horas (12 de septiembre de 2026). La ruta toma la hora del reloj, así
  // que todo se arma desde ahora: ayer salió al descanso hace 17 horas, dentro de las 18
  // que antes bastaban para tomar la entrada de hoy como su regreso. Hoy su franja entra
  // a las M − 30, con tolerancia 0.
  //   · Caso: la franja de ayer terminó con esa salida al descanso, así que ya no espera.
  //   · Control: lo mismo, pero ayer cerró con una salida normal.
  //   · Todavía espera: la franja de ayer cruza la medianoche y terminó hace 30 minutos.
  const ayerDia = DIAS_SEMANA[(ahoraBog.getDay() + 6) % 7];
  const reloj = (m: number) => aHHMM(((m % 1440) + 1440) % 1440);
  const salidaDeAyer = new Date(ahoraMs - 17 * 3_600_000);
  const S = M + 7 * 60; // la salida de ayer, en minutos desde la medianoche de ayer
  const ventanaDeAyer = V(reloj(S), reloj(S + 10));
  const conAyer = async (etiqueta: string, horaSalidaDeAyer: string, alDescanso: boolean) => {
    const horario = (await prisma.horario.create({
      data: {
        empresaId: empresa.id, nombre: `Ayer ${etiqueta}`, activo: true, toleranciaMin: 0, toleranciaSalidaMin: 1440, almuerzoMin: 0, fotoEnDescanso: true,
        franjas: {
          create: [
            { dias: [ayerDia], horaEntrada: reloj(M), horaSalida: horaSalidaDeAyer, tieneAlmuerzo: false, descansos: JSON.stringify([ventanaDeAyer]) },
            { dias: [hoyDia], horaEntrada: aHHMM(M - 30), horaSalida: aHHMM(M + 60), tieneAlmuerzo: false },
          ],
        },
      },
      select: { id: true },
    })).id;
    const c = await colaboradorCon(`ayer-${etiqueta}`, horario);
    await asegurarDiaMaterializado(c.id, ayer);
    await asegurarDiaMaterializado(c.id, hoy);
    await prisma.registro.create({
      data: {
        colaboradorId: c.id, fecha: ayer, entrada: new Date(salidaDeAyer.getTime() - 60 * MS_MIN), salida: salidaDeAyer,
        salidaDescanso: alDescanso, descansoVentana: alDescanso ? clave(ventanaDeAyer) : null,
      },
    });
    return { c, k: await entrarAlKiosco(empresa.marcadorToken!, c.cedula) };
  };
  const casoAyer = await conAyer('caso', reloj(S + 10), true);
  const controlAyer = await conAyer('control', reloj(S + 10), false);
  const esperaAyer = await conAyer('espera', reloj(M - 30), true);
  const diaDeAyer = await prisma.diaEsperado.findFirst({ where: { colaboradorId: casoAyer.c.id, fecha: { gte: ayer, lt: hoy } } });
  comprobar('ayer · precondición: el día de ayer congeló la franja que terminó con su salida al descanso',
    `${reloj(M)}-${reloj(S + 10)}`, diaDeAyer && `${diaDeAyer.horaEntrada}-${diaDeAyer.horaSalida}`);

  const eCaso = await casoAyer.k.estado() as RespEstado & { regresoSugerido?: string | null };
  comprobar('ayer · caso: /estado no lo da en su descanso ni le propone regreso', 'enDescanso:false regreso:null',
    `enDescanso:${eCaso.enDescanso} regreso:${eCaso.regresoSugerido ?? null}`);
  const mControl = await controlAyer.k.marcar({ foto: FOTO });
  comprobar('ayer · control: quien cerró ayer con una salida normal y hoy llega 30 minutos tarde tiene que decir el motivo', '409 REQUIERE_MOTIVO_TARDANZA',
    `${mControl.estado} ${mControl.c.codigo}`);
  const mCaso = await casoAyer.k.marcar({ foto: FOTO });
  comprobar('ayer · caso: quien salió ayer al descanso y no volvió recibe lo mismo, y no se escribe nada', '409 REQUIERE_MOTIVO_TARDANZA · 1 fila',
    `${mCaso.estado} ${mCaso.c.codigo} · ${await prisma.registro.count({ where: { colaboradorId: casoAyer.c.id } })} fila`);
  const conMotivo = await casoAyer.k.marcar({ foto: FOTO, novedadTipo: 'PERSONAL', novedadDescripcion: 'Prueba', regresoA: new Date(salidaDeAyer.getTime() + 10 * MS_MIN).toISOString() });
  const entradaDeHoy = await prisma.registro.findFirst({ where: { colaboradorId: casoAyer.c.id, salida: null }, select: { fecha: true, entrada: true, entradaEstimada: true } });
  comprobar('ayer · caso: con el motivo entra como la entrada de hoy, con la fecha de hoy y a la hora de ahora, aunque mande la hora del regreso de ayer',
    `200 ENTRADA · estimada:false · fecha:${hoy.toISOString()} · hace menos de 5 min`,
    `${conMotivo.estado} ${conMotivo.c.accion} · estimada:${entradaDeHoy?.entradaEstimada} · fecha:${entradaDeHoy?.fecha.toISOString()} · ${entradaDeHoy?.entrada && Math.abs(Date.now() - entradaDeHoy.entrada.getTime()) < 5 * 60_000 ? 'hace menos de 5 min' : horaDe(entradaDeHoy?.entrada)}`);
  const eEspera = await esperaAyer.k.estado();
  const mEspera = await esperaAyer.k.marcar({ foto: FOTO });
  const regresoDeAyer = await prisma.registro.findFirst({ where: { colaboradorId: esperaAyer.c.id, salida: null }, select: { fecha: true } });
  comprobar('ayer · todavía espera: su franja de ayer terminó hace 30 minutos, así que sigue en su descanso y vuelve con la fecha de ayer',
    `enDescanso:true · 200 ENTRADA · fecha:${ayer.toISOString()}`,
    `enDescanso:${eEspera.enDescanso} · ${mEspera.estado} ${mEspera.c.accion} · fecha:${regresoDeAyer?.fecha.toISOString()}`);

  // ===================== 2b. EL KIOSCO (PRESENCIAL CON SEDE) =====================
  // En otra empresa: una sede con coordenadas cambia lo que el kiosco le pide a todos.
  const empresaP = await prisma.empresa.create({
    data: { nombre: `Prueba ${SUFIJO}-p`, nit: `${SUFIJO}-p`, email: `${SUFIJO}-p@prueba.local`, marcadorToken: `${SUFIJO}-p` },
    select: { id: true, marcadorToken: true },
  });
  const NORTE = { lat: 6.2518, lng: -75.5636 };
  const norte = await prisma.sede.create({
    data: { empresaId: empresaP.id, nombre: 'Prueba Norte', lat: NORTE.lat, lng: NORTE.lng, radio: 150, activa: true },
    select: { id: true },
  });
  const hPresencial = await horarioDirecto('Presencial', { descansos: JSON.stringify([W1, W2]) }, empresaP.id, true);
  const presencial = await prisma.colaborador.create({
    data: {
      empresaId: empresaP.id, nombre: 'Presencial', apellido: 'Prueba', cedula: nuevaCedula(), salarioMensual: 1_500_000,
      modalidad: 'PRESENCIAL', horarioId: hPresencial, sedes: { create: [{ sedeId: norte.id }] },
    },
    select: { id: true, cedula: true },
  });
  await asegurarDiaMaterializado(presencial.id, hoy);
  const DENTRO = { lat: NORTE.lat, lng: NORTE.lng };
  const FUERA = { lat: NORTE.lat + 0.05, lng: NORTE.lng }; // unos cinco kilómetros al norte
  const sedeDe = (id: string | null | undefined) => (id === norte.id ? 'Norte' : id ?? 'sin sede');
  const abiertaP = () => prisma.registro.findFirst({ where: { colaboradorId: presencial.id, salida: null }, select: { id: true, sedeId: true } });
  const p = await entrarAlKiosco(empresaP.marcadorToken!, presencial.cedula);
  const pe = await p.marcar({ foto: FOTO, ...DENTRO });
  comprobar('presencial: entra dentro de Norte', '200 ENTRADA Norte', `${txt(pe)} ${sedeDe((await abiertaP())?.sedeId)}`);
  const pf = await p.marcar({ foto: FOTO, descanso: true, ...FUERA });
  comprobar('presencial: salir al descanso desde fuera de la sede se rechaza, y la fila sigue abierta', '403 FUERA_DE_UBICACION abierta',
    `${pf.estado} ${pf.c.codigo} ${(await abiertaP()) ? 'abierta' : 'cerrada'}`);
  const ps = await p.marcar({ foto: FOTO, descanso: true });
  comprobar('presencial: salir al descanso sin ubicación se rechaza', '400 UBICACION_REQUERIDA', `${ps.estado} ${ps.c.codigo}`);
  const pd = await p.marcar({ foto: FOTO, descanso: true, ...DENTRO });
  const pPrimera = await prisma.registro.findFirst({ where: { colaboradorId: presencial.id }, orderBy: { creadoEn: 'asc' }, select: { sedeSalidaId: true, descansoVentana: true } });
  comprobar('presencial: sale al descanso dentro de Norte, con su sede de salida y su ventana', `200 SALIDA descanso:true Norte ${clave(W1)}`,
    `${txt(pd)} ${sedeDe(pPrimera?.sedeSalidaId)} ${pPrimera?.descansoVentana}`);
  const pv = await p.marcar({ foto: FOTO, ...DENTRO });
  comprobar('presencial: vuelve dentro de Norte', '200 ENTRADA Norte', `${txt(pv)} ${sedeDe((await abiertaP())?.sedeId)}`);
  comprobar('presencial: sale definitivo dentro de Norte', '200 SALIDA descanso:false', txt(await p.marcar({ foto: FOTO, ...DENTRO })));
  const adminP = cabeceras(empresaP.id);
  const jornadaP = async () => {
    const filas = await leer<FilaTabla[]>(`/api/registros?colaboradorId=${presencial.id}&desde=${hoyTxt}&hasta=${hoyTxt}`, adminP);
    return `${filas.length} fila · ${filas[0]?.marcaciones?.length} marcaciones · ${filas[0]?.sede?.nombre ?? 'sin sede'}`;
  };
  comprobar('presencial · registros: una fila de dos marcaciones, que abrió en Norte', '1 fila · 2 marcaciones · Prueba Norte', await jornadaP());
  const enNorte = async () => {
    const r = await leer<RespExtras>(`/api/reportes/extras-resumen?desde=${hoyTxt}&hasta=${hoyTxt}&sedeId=${norte.id}`, adminP);
    const persona = r.colaboradores?.find(c => c.colaboradorId === presencial.id);
    return `${persona ? 'aparece' : 'no aparece'} · ${(persona?.sedes ?? []).map(s => `${s.nombre ?? 'Sin sede'}${s.porDefecto ? ' (por defecto)' : ''}`).join(' · ') || 'sin lugares'}`;
  };
  comprobar('presencial · extras filtrado por Norte: aparece, y solo en Norte, sin mixto', 'aparece · Prueba Norte', await enNorte());

  // ===================== 3. EL CASO DEL DUEÑO =====================
  const LUNES = medianocheBogota('2026-09-07');
  const MARTES = medianocheBogota('2026-09-08');
  const persona = (nombre: string, horario = horarioId) => prisma.colaborador.create({
    data: { empresaId: empresa.id, nombre, apellido: 'Prueba', cedula: nuevaCedula(), salarioMensual: 1_500_000, horarioId: horario },
    select: { id: true },
  });
  const marca = (colaboradorId: string, dia: Date, d: number, h1: number, m1: number, h2: number, m2: number, pausa: 'A' | 'D' | null, ventana: string | null = null) =>
    prisma.registro.create({
      data: {
        colaboradorId, fecha: dia, entrada: bog(2026, 9, d, h1, m1), salida: bog(2026, 9, d, h2, m2),
        salidaAlmuerzo: pausa === 'A', salidaDescanso: pausa === 'D', descansoVentana: ventana,
      },
    });
  const ana = await persona('Ana');
  const beto = await persona('Beto');
  const carla = await persona('Carla');
  for (const c of [ana, beto, carla]) await asegurarDiaMaterializado(c.id, LUNES);
  const diaAna = await prisma.diaEsperado.findFirst({ where: { colaboradorId: ana.id, fecha: { gte: LUNES, lt: MARTES } } });
  comprobar('caso · precondición: el lunes pide 07:00–16:00, almuerzo 12:00–13:00, los dos descansos congelados y 455 min',
    `07:00–16:00 12:00–13:00 ${DOS_TEXTO} 455`,
    diaAna && `${diaAna.horaEntrada}–${diaAna.horaSalida} ${diaAna.almuerzoInicio}–${diaAna.almuerzoFin} ${diaAna.descansos} ${diaAna.minutosEsperados}`);
  // Ana marca todo a tiempo.
  await marca(ana.id, LUNES, 7, 7, 0, 9, 0, 'D', '09:00-09:15');
  await marca(ana.id, LUNES, 7, 9, 15, 12, 0, 'A');
  await marca(ana.id, LUNES, 7, 13, 0, 15, 0, 'D', '15:00-15:10');
  await marca(ana.id, LUNES, 7, 15, 10, 16, 0, null);
  // Beto no marca ninguna pausa.
  await marca(beto.id, LUNES, 7, 7, 0, 16, 0, null);
  // Carla toma el de la mañana de 10:00 a 10:15. El kiosco anota esa salida en el de
  // las 15:00 (el próximo que empieza) y la de las 15:00 en el de las 09:00.
  const carlaPrimera = await marca(carla.id, LUNES, 7, 7, 0, 10, 0, 'D', '15:00-15:10');
  await marca(carla.id, LUNES, 7, 10, 15, 12, 0, 'A');
  await marca(carla.id, LUNES, 7, 13, 0, 15, 0, 'D', '09:00-09:15');
  await marca(carla.id, LUNES, 7, 15, 10, 16, 0, null);

  console.log(`
Calculado a mano, franja 07:00–16:00, almuerzo 12:00–13:00, descansos 09:00–09:15 y 15:00–15:10:
  el día pide   540 − 60 − 15 − 10 = 455
  Ana           07–09 + 09:15–12 + 13–15 + 15:10–16 = 120 + 165 + 120 + 50 = 455; nada dentro de pausas → 455, saldo 0
  Beto          07–16 = 540; dentro del almuerzo 60 y de los descansos 25 → 455, saldo 0
  Carla         07–10 + 10:15–12 + 13–15 + 15:10–16 = 180 + 105 + 120 + 50 = 455; dentro de 09:00–09:15 → −15 → 440, debe 15
  tardanzas     las tres entran a las 07:00 con tolerancia 0 → 0`);

  const q = (colaboradorId: string, desde: string, hasta: string) => `colaboradorId=${colaboradorId}&desde=${desde}&hasta=${hasta}`;
  // El saldo es esperadas menos trabajadas: POSITIVO es lo que debe (saldoTiempo.ts, `minutosSaldo`).
  const esperado: [string, { id: string }, string, string, string][] = [
    ['Ana', ana, '455 455 0', '1 fila · 4 marcaciones · 455 · descanso aquí 0',
      '09:00-09:15 MARCADO 09:00→09:15 desc:0 más:0 | 15:00-15:10 MARCADO 15:00→15:10 desc:0 más:0'],
    ['Beto', beto, '455 455 0', '1 fila · 1 marcaciones · 455 · descanso aquí 25',
      '09:00-09:15 NO_MARCADO desc:15 más:0 | 15:00-15:10 NO_MARCADO desc:10 más:0'],
    ['Carla', carla, '455 440 15', '1 fila · 4 marcaciones · 440 · descanso aquí 15',
      '09:00-09:15 MARCADO 15:00→15:10 desc:15 más:0 | 15:00-15:10 MARCADO 10:00→10:15 desc:0 más:5'],
  ];
  for (const [nombre, c, liquidacion, fila, porVentana] of esperado) {
    const liq = await leer<RespLiquidacion>(`/api/reportes/liquidacion?${q(c.id, '2026-09-07', '2026-09-07')}`);
    comprobar(`${nombre} · liquidación: esperadas, trabajadas y saldo`, liquidacion, `${liq.saldo.minutosEsperados} ${liq.saldo.minutosTrabajados} ${liq.saldo.minutosSaldo}`);
    const tar = await leer<RespTardanzas>(`/api/reportes/tardanzas?${q(c.id, '2026-09-07', '2026-09-07')}`);
    comprobar(`${nombre} · tardanzas: días tarde`, 0, tar.diasTarde);
    const filas = await leer<FilaTabla[]>(`/api/registros?${q(c.id, '2026-09-07', '2026-09-07')}`);
    comprobar(`${nombre} · registros: la fila del día`, fila,
      `${filas.length} fila · ${filas[0]?.marcaciones?.length} marcaciones · ${filas[0]?.minutosContados} · descanso aquí ${filas[0]?.minutosDescansoAqui}`);
    comprobar(`${nombre} · registros: un resumen por ventana, en orden`, porVentana, estados(filas[0]?.descansos));
  }
  const detalleCarla = await leer<RespDetalle>(`/api/registros/${carlaPrimera.id}/jornada`);
  comprobar('Carla · detalle: el día viaja con los descansos como arreglo, el día contó 440, y los resúmenes dicen lo mismo que la tabla',
    '09:00-09:15,15:00-15:10 · 440 · 09:00-09:15 MARCADO 15:00→15:10 desc:15 más:0 | 15:00-15:10 MARCADO 10:00→10:15 desc:0 más:5',
    `${listaDe(detalleCarla.dia?.descansos)} · ${detalleCarla.minutosDelDia} · ${estados(detalleCarla.descansos)}`);

  // El caso de UN solo descanso que ya estaba (ee7a0c7), con la lista de uno: franja
  // 08:00–17:00, almuerzo 12:00–13:00 y descanso 09:00–09:15.
  const unDescanso = await enviar('POST', '/api/horarios', horarioCon([{
    dias: LABORABLES, horaEntrada: '08:00', horaSalida: '17:00', tieneAlmuerzo: true, almuerzoInicio: '12:00', almuerzoFin: '13:00',
    descansos: [V('09:00', '09:15')],
  }], { nombre: 'Un descanso' }));
  if (unDescanso.statusCode !== 201) throw new Error(`crear el horario de un descanso: ${unDescanso.statusCode} ${unDescanso.body}`);
  const oficina = await persona('Oficina', unDescanso.json<{ id: string }>().id);
  await asegurarDiaMaterializado(oficina.id, LUNES);
  await asegurarDiaMaterializado(oficina.id, MARTES);
  const diaLunes = await prisma.diaEsperado.findFirst({ where: { colaboradorId: oficina.id, fecha: { gte: LUNES, lt: MARTES } } });
  comprobar('un descanso · precondición: el lunes pedía 465 min con la lista de uno', '[{"inicio":"09:00","fin":"09:15"}] 465',
    diaLunes && `${diaLunes.descansos} ${diaLunes.minutosEsperados}`);
  await marca(oficina.id, LUNES, 7, 8, 0, 9, 0, 'D', '09:00-09:15');
  await marca(oficina.id, LUNES, 7, 9, 15, 12, 0, 'A');
  await marca(oficina.id, LUNES, 7, 13, 0, 17, 0, null);
  const martesManana = await marca(oficina.id, MARTES, 8, 8, 0, 12, 0, 'A');
  const martesTarde = await marca(oficina.id, MARTES, 8, 13, 0, 17, 0, null);
  const liqLunes = await leer<RespLiquidacion>(`/api/reportes/liquidacion?${q(oficina.id, '2026-09-07', '2026-09-07')}`);
  comprobar('un descanso · lunes: esperadas y trabajadas', '465 465', `${liqLunes.saldo.minutosEsperados} ${liqLunes.saldo.minutosTrabajados}`);
  const liqMartes = await leer<RespLiquidacion>(`/api/reportes/liquidacion?${q(oficina.id, '2026-09-08', '2026-09-08')}`);
  comprobar('un descanso · martes: trabajadas, sin los 15 min del descanso', 465, liqMartes.saldo.minutosTrabajados);
  const liqDos = await leer<RespLiquidacion>(`/api/reportes/liquidacion?${q(oficina.id, '2026-09-07', '2026-09-08')}`);
  comprobar('un descanso · los dos días: esperadas, trabajadas y saldo', '930 930 0',
    `${liqDos.saldo.minutosEsperados} ${liqDos.saldo.minutosTrabajados} ${liqDos.saldo.minutosSaldo}`);
  const tarDos = await leer<RespTardanzas>(`/api/reportes/tardanzas?${q(oficina.id, '2026-09-07', '2026-09-08')}`);
  comprobar('un descanso · los dos días: días tarde', 0, tarDos.diasTarde);
  const filasOficina = await leer<FilaTabla[]>(`/api/registros?${q(oficina.id, '2026-09-07', '2026-09-08')}`);
  const filaDel = (dia: string) => filasOficina.filter(f => diaBogota(new Date(f.fecha)) === dia);
  const lunesOf = filaDel('2026-09-07');
  comprobar('un descanso · registros del lunes: una fila de tres marcaciones que contó 465, con las dos pausas marcadas', '1 fila · 3 · 465 · almuerzo:MARCADO descansos:MARCADO',
    `${lunesOf.length} fila · ${lunesOf[0]?.marcaciones?.length} · ${lunesOf[0]?.minutosContados} · almuerzo:${lunesOf[0]?.almuerzo?.estado} descansos:${(lunesOf[0]?.descansos ?? []).map(d => d.estado).join(',')}`);
  const martesOf = filaDel('2026-09-08');
  comprobar('un descanso · registros del martes: una fila que contó 465 y le descontó 15 de descanso', '1 fila · 465 · descanso aquí 15',
    `${martesOf.length} fila · ${martesOf[0]?.minutosContados} · descanso aquí ${martesOf[0]?.minutosDescansoAqui}`);
  const detalleMartes = await leer<RespDetalle>(`/api/registros/${martesManana.id}/jornada`);
  comprobar('un descanso · detalle del martes: el descanso descontó 15 min y el día contó 465', '15 · 465',
    `${detalleMartes.descansos?.[0]?.minutosDescontados} · ${detalleMartes.minutosDelDia}`);

  // ===================== 3b. EL DESCUENTO INCOMPLETO =====================
  // Se encontró aquí mismo el 12 de septiembre de 2026: la liquidación le cobraba las
  // pausas del día a la primera fila que pudiera pagar algo y daba el día por cobrado,
  // así que Darío quedaba liquidado con 515 minutos.
  const dario = await persona('Dario');
  await asegurarDiaMaterializado(dario.id, LUNES);
  await marca(dario.id, LUNES, 7, 6, 50, 7, 0, null); // creada PRIMERO: diez minutos
  await marca(dario.id, LUNES, 7, 7, 0, 16, 0, null);
  const liqDario = await leer<RespLiquidacion>(`/api/reportes/liquidacion?${q(dario.id, '2026-09-07', '2026-09-07')}`);
  const detalleDario = await leer<FilaTabla[]>(`/api/registros?${q(dario.id, '2026-09-07', '2026-09-07')}`);
  // A mano: trabajó 10 + 540 = 550; dentro del almuerzo 60 y de los descansos 25 → 465.
  comprobar('3b · Darío, 06:50–07:00 creada primero y 07:00–16:00: la tabla y la liquidación cuentan 465', 'tabla 465 · liquidación 465',
    `tabla ${detalleDario.reduce((s, f) => s + Number(f.minutosContados ?? 0), 0)} · liquidación ${liqDario.saldo.minutosTrabajados}`);

  // El panel de inicio tenía la misma cuenta copiada, con el almuerzo fijo del horario.
  // En una empresa aparte, para que nadie más sume horas, y HOY, porque el panel suma la
  // semana en curso: 550 trabajados menos 60 de almuerzo son 490 minutos, 8,2 horas. Con
  // el defecto daba 540, 9 horas. El panel no le descuenta almuerzo a una hora dominical,
  // así que un domingo o un festivo no hay nada que comprobar.
  const festivoHoy = await prisma.diaFestivo.findFirst({
    where: { empresaId: null, fecha: { gte: new Date(hoy.getTime() - 12 * 3600_000), lt: new Date(hoy.getTime() + 12 * 3600_000) } },
    select: { id: true },
  });
  if (ahoraBog.getDay() === 0 || festivoHoy) {
    console.log('\n3b · panel de inicio: NO SE COMPROBÓ, hoy es domingo o festivo.');
  } else {
    const empresaD = await prisma.empresa.create({
      data: { nombre: `Prueba ${SUFIJO}-d`, nit: `${SUFIJO}-d`, email: `${SUFIJO}-d@prueba.local`, marcadorToken: `${SUFIJO}-d` },
      select: { id: true },
    });
    const horarioPanel = await prisma.horario.create({
      data: {
        empresaId: empresaD.id, nombre: 'Panel', activo: true, toleranciaMin: 0, toleranciaSalidaMin: 0, almuerzoMin: 60,
        franjas: { create: [{ dias: DIAS_SEMANA, horaEntrada: '07:00', horaSalida: '16:00', tieneAlmuerzo: true }] },
      },
      select: { id: true },
    });
    const darioPanel = await prisma.colaborador.create({
      data: { empresaId: empresaD.id, nombre: 'DarioPanel', apellido: 'Prueba', cedula: nuevaCedula(), salarioMensual: 1_500_000, horarioId: horarioPanel.id },
      select: { id: true },
    });
    await prisma.registro.create({ data: { colaboradorId: darioPanel.id, fecha: hoy, entrada: enMinuto(6 * 60 + 50), salida: enMinuto(7 * 60) } });
    await prisma.registro.create({ data: { colaboradorId: darioPanel.id, fecha: hoy, entrada: enMinuto(7 * 60), salida: enMinuto(16 * 60) } });
    const panel = await leer<{ totales: { horasSemana: number } }>('/api/dashboard/empresa', cabeceras(empresaD.id));
    comprobar('3b · panel de inicio: la marca corta primero no deja sin cobrar el almuerzo fijo (550 − 60 = 490 min)', 8.2, panel.totales.horasSemana);
  }

  // ===================== 4. EL EDITOR =====================
  const editor = await persona('Editor');
  await asegurarDiaMaterializado(editor.id, MARTES);
  const unica = await prisma.registro.create({ data: { colaboradorId: editor.id, fecha: MARTES, entrada: bog(2026, 9, 8, 7, 0), salida: bog(2026, 9, 8, 16, 0) } });
  const filasEditor = () => prisma.registro.findMany({
    where: { colaboradorId: editor.id, fecha: { gte: MARTES, lt: new Date(MARTES.getTime() + UN_DIA_MS) } }, orderBy: { entrada: 'asc' },
    select: { id: true, entrada: true, salida: true, salidaAlmuerzo: true, salidaDescanso: true, descansoVentana: true, fotoEntrada: true, fotoSalida: true },
  });
  const editarEditor = (payload: object) => enviar('PUT', `/api/registros/jornada/${unica.id}`,
    { colaboradorId: editor.id, fecha: '2026-09-08', tipo: 'NORMAL', observacion: '', ...payload });
  const ALMUERZO = { entrada: '07:00', almuerzo: { salida: '12:00', regreso: '13:00' }, salida: '16:00' };
  const conLosDos = { ...ALMUERZO, descansos: [{ salida: '09:00', regreso: '09:15' }, { salida: '15:00', regreso: '15:10' }] };
  const CUATRO = '07:00-09:00 D(09:00-09:15) | 09:15-12:00 A | 13:00-15:00 D(15:00-15:10) | 15:10-16:00 -';

  const viejaE = await editarEditor({ entrada: '07:00', descansoSalida: '12:00', descansoRegreso: '13:00', salida: '16:00' });
  comprobar('editor: el formato del editor de producción se rechaza con FORMATO_VIEJO y no toca nada', '400 FORMATO_VIEJO · 07:00-16:00 -',
    `${viejaE.statusCode} ${viejaE.json<{ codigo?: string }>().codigo} · ${describir(await filasEditor())}`);

  // Desordenados a propósito.
  const conDos = await editarEditor({ ...ALMUERZO, descansos: [{ salida: '15:00', regreso: '15:10' }, { salida: '09:00', regreso: '09:15' }] });
  comprobar('editor: con el almuerzo y dos descansos, 200 y cuatro filas, cada salida al descanso con su ventana', `200 · ${CUATRO}`,
    `${conDos.statusCode} · ${describir(await filasEditor())}`);

  // Fotos marcadoras escritas directo, como si cada marca viniera del kiosco.
  const ponerFoto = async (hora: string, campo: 'fotoEntrada' | 'fotoSalida', marcaFoto: string) => {
    const f = (await filasEditor()).find(x => {
      const instante = campo === 'fotoEntrada' ? x.entrada : x.salida;
      return instante && horaBogota(instante) === hora;
    });
    if (!f) throw new Error(`no hay marcación con ${campo === 'fotoEntrada' ? 'entrada' : 'salida'} a las ${hora}`);
    await prisma.registro.update({ where: { id: f.id }, data: campo === 'fotoSalida' ? { fotoSalida: marcaFoto, metodoSalida: 'ROSTRO' } : { fotoEntrada: marcaFoto } });
  };
  const fotoDe = async (hora: string, campo: 'fotoEntrada' | 'fotoSalida') => {
    const f = (await filasEditor()).find(x => {
      const instante = campo === 'fotoEntrada' ? x.entrada : x.salida;
      return instante && horaBogota(instante) === hora;
    });
    return f ? f[campo] ?? 'sin foto' : 'no hay fila';
  };
  await ponerFoto('09:00', 'fotoSalida', 'F0900');
  await ponerFoto('09:15', 'fotoEntrada', 'F0915');
  await ponerFoto('15:00', 'fotoSalida', 'F1500');
  await ponerFoto('15:10', 'fotoEntrada', 'F1510');

  const sinLaManana = { ...ALMUERZO, descansos: [{ salida: '15:00', regreso: '15:10' }] };
  const q1 = await editarEditor(sinLaManana);
  const pierde = (q1.json<{ fotos?: { momento: string; hora: string | null }[] }>().fotos ?? []).map(f => `${f.momento} ${horaDe(f.hora)}`).join(' · ');
  comprobar('editor: quitar el descanso de las 09:00 pregunta antes de borrar exactamente la foto de esa salida y la de su regreso',
    '409 BORRA_FOTOS · SALIDA_DESCANSO 09:00 · REGRESO_DESCANSO 09:15', `${q1.statusCode} ${q1.json<{ codigo?: string }>().codigo} · ${pierde}`);
  comprobar('editor: y sin confirmar no escribió nada', CUATRO, describir(await filasEditor()));
  const q2 = await editarEditor({ ...sinLaManana, confirmarBorrarFotos: true });
  comprobar('editor: al confirmar quedan tres filas; la salida de las 15:00 conserva su foto y su ventana, y la entrada de las 15:10 la suya',
    '200 · 07:00-12:00 A | 13:00-15:00 D(15:00-15:10) | 15:10-16:00 - · F1500 F1510',
    `${q2.statusCode} · ${describir(await filasEditor())} · ${await fotoDe('15:00', 'fotoSalida')} ${await fotoDe('15:10', 'fotoEntrada')}`);

  const devuelto = await editarEditor(conLosDos);
  comprobar('editor: volver a poner el de las 09:00 da 200 y cuatro filas, y la foto del regreso de las 15:10 no se muda a las 09:15',
    `200 · ${CUATRO} · 09:15:sin foto 15:10:F1510`,
    `${devuelto.statusCode} · ${describir(await filasEditor())} · 09:15:${await fotoDe('09:15', 'fotoEntrada')} 15:10:${await fotoDe('15:10', 'fotoEntrada')}`);
  await ponerFoto('09:00', 'fotoSalida', 'F0900');
  const movido = await editarEditor({ ...ALMUERZO, descansos: [{ salida: '14:40', regreso: '14:50' }, { salida: '15:00', regreso: '15:10' }] });
  comprobar('editor: mover el de las 09:00 a las 14:40 sin tocar el de las 15:00: la de las 15:00 conserva su foto y su ventana, y la de las 14:40 hereda la de las 09:00',
    '200 · 07:00-12:00 A | 13:00-14:40 D(09:00-09:15) | 14:50-15:00 D(15:00-15:10) | 15:10-16:00 - · 14:40:F0900 15:00:F1500',
    `${movido.statusCode} · ${describir(await filasEditor())} · 14:40:${await fotoDe('14:40', 'fotoSalida')} 15:00:${await fotoDe('15:00', 'fotoSalida')}`);

  // El regreso de un descanso solo va a la fila de ESE descanso (12 de septiembre de 2026).
  // Ana tiene almuerzo y el descanso de las 15:00, con regreso a las 15:10:40 y foto. En un
  // solo guardado el administrador le agrega el de las 09:00 y corrige el regreso de la
  // tarde a las 15:12: la foto de las 15:10:40 no puede quedar en la fila de las 09:15.
  const anaEditor = await persona('AnaEditor');
  await asegurarDiaMaterializado(anaEditor.id, MARTES);
  const anaPrimera = await prisma.registro.create({
    data: { colaboradorId: anaEditor.id, fecha: MARTES, entrada: bog(2026, 9, 8, 7, 0), salida: bog(2026, 9, 8, 12, 0), salidaAlmuerzo: true, fotoEntrada: 'A0700', fotoSalida: 'A1200' },
  });
  await prisma.registro.create({
    data: { colaboradorId: anaEditor.id, fecha: MARTES, entrada: bog(2026, 9, 8, 13, 0), salida: bog(2026, 9, 8, 15, 0), salidaDescanso: true, descansoVentana: '15:00-15:10', fotoEntrada: 'A1300', fotoSalida: 'A1500' },
  });
  await prisma.registro.create({
    data: { colaboradorId: anaEditor.id, fecha: MARTES, entrada: new Date(bog(2026, 9, 8, 15, 10).getTime() + 40_000), salida: bog(2026, 9, 8, 16, 0), fotoEntrada: 'A151040', fotoSalida: 'A1600' },
  });
  const filasAna = () => prisma.registro.findMany({
    where: { colaboradorId: anaEditor.id }, orderBy: { entrada: 'asc' },
    select: { entrada: true, salida: true, salidaAlmuerzo: true, salidaDescanso: true, descansoVentana: true, fotoEntrada: true },
  });
  const anaGuardada = await enviar('PUT', `/api/registros/jornada/${anaPrimera.id}`, {
    colaboradorId: anaEditor.id, fecha: '2026-09-08', tipo: 'NORMAL', observacion: '', entrada: '07:00',
    almuerzo: { salida: '12:00', regreso: '13:00' }, descansos: [{ salida: '09:00', regreso: '09:15' }, { salida: '15:00', regreso: '15:12' }], salida: '16:00',
  });
  const fotosDeAna = (await filasAna()).map(f => `${horaDe(f.entrada)}:${f.fotoEntrada ?? 'sin foto'}`).join(' ');
  comprobar('editor · Ana: poner el de las 09:00 y corregir el regreso a las 15:12 da 200 sin pedir confirmación, y la foto de las 15:10:40 queda en la fila de las 15:12, no en la de las 09:15',
    '200 · 07:00-09:00 D(09:00-09:15) | 09:15-12:00 A | 13:00-15:00 D(15:00-15:10) | 15:12-16:00 - · 07:00:A0700 09:15:sin foto 13:00:A1300 15:12:A151040',
    `${anaGuardada.statusCode} · ${describir(await filasAna())} · ${fotosDeAna}`);

  const antesDeLosRechazos = describir(await filasEditor());
  const cuatroDescansos = await editarEditor({ ...ALMUERZO, descansos: ['08:00', '09:00', '10:00', '14:00'].map(s => ({ salida: s, regreso: `${s.slice(0, 2)}:10` })) });
  comprobar('editor: cuatro descansos se rechazan con su código', '400 DEMASIADOS_DESCANSOS',
    `${cuatroDescansos.statusCode} ${cuatroDescansos.json<{ codigo?: string }>().codigo}`);
  const cruzados = await editarEditor({ ...ALMUERZO, descansos: [{ salida: '12:30', regreso: '12:45' }] });
  comprobar('editor: un descanso de 12:30 a 12:45 dentro del almuerzo se rechaza porque la jornada no cabe en un día',
    '400 La jornada no cabe en un día: revisa que las pausas no se crucen y que la salida sea posterior a la entrada.',
    `${cruzados.statusCode} ${cruzados.json<{ error?: string }>().error}`);
  const regresoSinSalida = await editarEditor({ ...ALMUERZO, descansos: [{ salida: '09:00', regreso: '09:15' }, { salida: '', regreso: '15:10' }] });
  comprobar('editor: un regreso sin su salida dice cuál descanso', '400 Para registrar el regreso del descanso 2 hace falta la hora en que salió.',
    `${regresoSinSalida.statusCode} ${regresoSinSalida.json<{ error?: string }>().error}`);
  // El editor manda todas sus filas, también las vacías, y la pantalla numera por posición
  // (12 de septiembre de 2026): el mensaje tiene que nombrar la misma fila que ve la persona.
  const conFilaVacia = await editarEditor({ ...ALMUERZO, descansos: [{ salida: '', regreso: '' }, { salida: '', regreso: '15:10' }] });
  comprobar('editor: con una fila vacía antes, el regreso sin su salida nombra la fila 2, la misma que numera la pantalla',
    '400 Para registrar el regreso del descanso 2 hace falta la hora en que salió.',
    `${conFilaVacia.statusCode} ${conFilaVacia.json<{ error?: string }>().error}`);
  comprobar('editor: ninguno de los rechazos tocó la jornada, y ninguna fila rodó de día', antesDeLosRechazos, describir(await filasEditor()));

  // Seis marcaciones encadenadas por pausas son una sola jornada: no se editan en bloque.
  const seis = await persona('Seis');
  let primeraDeSeis = '';
  for (const [i, [h1, m1, h2, m2, pausa]] of ([[7, 0, 8, 0, 'D'], [8, 10, 9, 0, 'D'], [9, 10, 10, 0, 'D'], [10, 10, 11, 0, 'A'], [11, 10, 12, 0, 'D'], [12, 10, 13, 0, null]] as [number, number, number, number, 'A' | 'D' | null][]).entries()) {
    const r = await marca(seis.id, MARTES, 8, h1, m1, h2, m2, pausa);
    if (i === 0) primeraDeSeis = r.id;
  }
  const seisR = await enviar('PUT', `/api/registros/jornada/${primeraDeSeis}`, { colaboradorId: seis.id, fecha: '2026-09-08', tipo: 'NORMAL', entrada: '07:00', salida: '13:00' });
  comprobar('editor: una jornada de seis marcaciones no se edita en bloque', '400 DEMASIADAS_MARCACIONES',
    `${seisR.statusCode} ${seisR.json<{ codigo?: string }>().codigo}`);

  // Las novedades siguen a su salida, sobre el caso de un descanso del martes.
  const filasMartes = async () => describir(await prisma.registro.findMany({
    where: { colaboradorId: oficina.id, fecha: { gte: MARTES, lt: new Date(MARTES.getTime() + UN_DIA_MS) } },
    orderBy: { entrada: 'asc' }, select: { entrada: true, salida: true, salidaAlmuerzo: true, salidaDescanso: true, descansoVentana: true },
  }));
  const editar = (payload: object) => enviar('PUT', `/api/registros/jornada/${martesManana.id}`,
    { colaboradorId: oficina.id, fecha: '2026-09-08', tipo: 'NORMAL', observacion: '', ...payload });
  comprobar('novedades · precondición: el martes son dos marcaciones', '08:00-12:00 A | 13:00-17:00 -', await filasMartes());
  const novedadEn = (registroId: string, descripcion: string) => prisma.permiso.create({
    data: { colaboradorId: oficina.id, registroId, tipo: 'MEDICO', descripcion, fechaInicio: MARTES, fechaFin: MARTES, aprobado: false },
    select: { id: true },
  });
  const novTarde = await novedadEn(martesTarde.id, 'Novedad de la salida del día');
  const novManana = await novedadEn(martesManana.id, 'Novedad de la salida a almorzar');
  const entradaDeSuFila = async (permisoId: string) => {
    const pm = await prisma.permiso.findUnique({ where: { id: permisoId }, select: { registroId: true } });
    const r = pm?.registroId ? await prisma.registro.findUnique({ where: { id: pm.registroId }, select: { entrada: true } }) : null;
    return r?.entrada ? horaBogota(r.entrada) : 'sin fila';
  };
  const conDescanso = await editar({ entrada: '08:00', descansos: [{ salida: '09:00', regreso: '09:15' }], almuerzo: { salida: '12:00', regreso: '13:00' }, salida: '17:00' });
  comprobar('novedades · agregarle el descanso: 200 y tres filas, la salida al descanso con su ventana', '200 · 08:00-09:00 D(09:00-09:15) | 09:15-12:00 A | 13:00-17:00 -',
    `${conDescanso.statusCode} · ${await filasMartes()}`);
  comprobar('novedades · la de la salida del día sigue en la fila de las 13:00', '13:00', await entradaDeSuFila(novTarde.id));
  comprobar('novedades · la de la salida a almorzar se va con esa salida, a la fila de las 09:15', '09:15', await entradaDeSuFila(novManana.id));
  const cambios = await prisma.registroCambio.findMany({ where: { registroId: martesManana.id }, select: { campo: true, antes: true, despues: true } });
  comprobar('novedades · la bitácora dice que esa salida pasó de almuerzo a descanso', 'salidaAlmuerzo sí→no · salidaDescanso no→sí',
    ['salidaAlmuerzo', 'salidaDescanso'].map(c => { const x = cambios.find(kk => kk.campo === c); return x ? `${c} ${x.antes}→${x.despues}` : `${c} sin anotar`; }).join(' · '));
  const novDescanso = await novedadEn(martesManana.id, 'Novedad de la salida al descanso');
  const novedades = async () =>
    `almuerzo ${await entradaDeSuFila(novManana.id)} · descanso ${await entradaDeSuFila(novDescanso.id)} · tarde ${await entradaDeSuFila(novTarde.id)}`;
  const trocadas = await editar({ entrada: '08:00', almuerzo: { salida: '09:00', regreso: '09:15' }, descansos: [{ salida: '12:00', regreso: '13:00' }], salida: '17:00' });
  // Cada novedad se queda con su salida, y cambiarle el papel a una marca no la mueve de
  // minuto: la de la salida a almorzar sigue en la de las 12:00, que ahora es el descanso, y
  // la del descanso en la de las 09:00, que ahora es el almuerzo (12 de septiembre de 2026).
  comprobar('novedades · cambiar cuál pausa es cuál: 200, las filas trocadas y cada novedad con su salida, que no se movió de minuto',
    '200 · 08:00-09:00 A | 09:15-12:00 D(09:00-09:15) | 13:00-17:00 - · almuerzo 09:15 · descanso 08:00 · tarde 13:00',
    `${trocadas.statusCode} · ${await filasMartes()} · ${await novedades()}`);
  const devueltas = await editar({ entrada: '08:00', descansos: [{ salida: '09:00', regreso: '09:15' }], almuerzo: { salida: '12:00', regreso: '13:00' }, salida: '17:00' });
  comprobar('novedades · devolverlas deja las filas y las novedades como estaban',
    '200 · 08:00-09:00 D(09:00-09:15) | 09:15-12:00 A | 13:00-17:00 - · almuerzo 09:15 · descanso 08:00 · tarde 13:00',
    `${devueltas.statusCode} · ${await filasMartes()} · ${await novedades()}`);
  const sinRegreso = await editar({ entrada: '08:00', descansos: [{ salida: '09:00' }], almuerzo: { salida: '12:00', regreso: '13:00' }, salida: '17:00' });
  comprobar('novedades · un descanso sin regreso seguido del almuerzo se rechaza', '400 no puede haber otra pausa después',
    `${sinRegreso.statusCode} ${/no puede haber otra pausa después/.test(sinRegreso.json<{ error?: string }>().error ?? '') ? 'no puede haber otra pausa después' : sinRegreso.body}`);
  const sinDescansoOf = await editar({ entrada: '08:00', almuerzo: { salida: '12:00', regreso: '13:00' }, salida: '17:00' });
  comprobar('novedades · quitarle el descanso: 200, dos filas, y cada novedad queda donde quedó su salida',
    '200 · 08:00-12:00 A | 13:00-17:00 - · almuerzo 08:00 · descanso 08:00 · tarde 13:00',
    `${sinDescansoOf.statusCode} · ${await filasMartes()} · ${await novedades()}`);

  // El editor sobre la jornada del presencial de la parte 2b: escribe filas sin sede,
  // como el kiosco de producción y la carga manual, y la sede se sigue viendo al leer.
  const [primeraP] = await prisma.registro.findMany({ where: { colaboradorId: presencial.id }, orderBy: { entrada: 'asc' }, select: { id: true } });
  const editadoP = await app.inject({
    method: 'PUT', url: `/api/registros/jornada/${primeraP.id}`, headers: adminP,
    payload: {
      colaboradorId: presencial.id, fecha: hoyTxt, tipo: 'NORMAL', confirmarBorrarFotos: true,
      entrada: aHHMM(M - 60), descansos: [{ salida: aHHMM(M - 50), regreso: aHHMM(M - 45) }, { salida: aHHMM(M - 30), regreso: aHHMM(M - 25) }], salida: aHHMM(M - 15),
    },
  });
  const filasP = await prisma.registro.findMany({ where: { colaboradorId: presencial.id }, orderBy: { entrada: 'asc' }, select: { sedeId: true, metodoEntrada: true } });
  comprobar('presencial · editor: 200 y tres filas; las que creó el editor no escriben sede', '200 · 3 filas · nuevas sin sede: sí',
    `${editadoP.statusCode} · ${filasP.length} filas · nuevas sin sede: ${filasP.filter(f => f.metodoEntrada === 'MANUAL').every(f => f.sedeId === null) && filasP.some(f => f.metodoEntrada === 'MANUAL') ? 'sí' : 'no'}`);
  comprobar('presencial · editor: la jornada sigue abriendo en Norte en la tabla', '1 fila · 3 marcaciones · Prueba Norte', await jornadaP());
  comprobar('presencial · editor: y el reporte por Norte la sigue contando en Norte, sin mixto', 'aparece · Prueba Norte', await enNorte());

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
    const empresas = await prisma.empresa.findMany({ where: { nit: { in: [SUFIJO, `${SUFIJO}-p`, `${SUFIJO}-d`] } }, select: { id: true } });
    const idsEmpresas = empresas.map(e => e.id);
    const ids = (await prisma.colaborador.findMany({ where: { empresaId: { in: idsEmpresas } }, select: { id: true } })).map(c => c.id);
    const horarios = (await prisma.horario.findMany({ where: { empresaId: { in: idsEmpresas } }, select: { id: true } })).map(h => h.id);
    const registros = (await prisma.registro.findMany({ where: { colaboradorId: { in: ids } }, select: { id: true } })).map(r => r.id);
    await prisma.registroCambio.deleteMany({ where: { registroId: { in: registros } } });
    await prisma.permiso.deleteMany({ where: { colaboradorId: { in: ids } } });
    await prisma.registro.deleteMany({ where: { colaboradorId: { in: ids } } });
    await prisma.diaEsperado.deleteMany({ where: { colaboradorId: { in: ids } } });
    await prisma.colaboradorSede.deleteMany({ where: { colaboradorId: { in: ids } } });
    await prisma.colaborador.deleteMany({ where: { id: { in: ids } } });
    await prisma.franjaHorario.deleteMany({ where: { horarioId: { in: horarios } } });
    await prisma.horario.deleteMany({ where: { id: { in: horarios } } });
    await prisma.sede.deleteMany({ where: { empresaId: { in: idsEmpresas } } });
    await prisma.notificacion.deleteMany({ where: { empresaId: { in: idsEmpresas } } });
    await prisma.empresa.deleteMany({ where: { id: { in: idsEmpresas } } });
    const quedan = await Promise.all([
      prisma.empresa.count({ where: { nit: { in: [SUFIJO, `${SUFIJO}-p`, `${SUFIJO}-d`] } } }),
      prisma.colaborador.count({ where: { id: { in: ids } } }),
      prisma.horario.count({ where: { id: { in: horarios } } }),
      prisma.permiso.count({ where: { colaboradorId: { in: ids } } }),
      prisma.registro.count({ where: { colaboradorId: { in: ids } } }),
      prisma.registroCambio.count({ where: { registroId: { in: registros } } }),
      prisma.diaEsperado.count({ where: { colaboradorId: { in: ids } } }),
      prisma.colaboradorSede.count({ where: { colaboradorId: { in: ids } } }),
      prisma.sede.count({ where: { empresaId: { in: idsEmpresas } } }),
      prisma.notificacion.count({ where: { empresaId: { in: idsEmpresas } } }),
    ]);
    console.log(empresas.length > 0 && quedan.every(n => n === 0)
      ? `Limpieza: no quedó ninguna fila de la prueba (${empresas.length} empresas, ${ids.length} colaboradores, ${registros.length} registros borrados).`
      : `Limpieza INCOMPLETA o sin empresas (empresa/colaboradores/horarios/permisos/registros/cambios/días/asignaciones/sedes/notificaciones): ${quedan.join('/')}`);
    await prisma.$disconnect();
    process.exit(salida);
  });
