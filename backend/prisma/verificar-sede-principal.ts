// Verifica la COSTURA de la decisión del dueño del 12 de septiembre de 2026 contra
// MySQL (CLAUDE.md 8.6): la sede de un presencial se MUESTRA al leer y no se guarda,
// y a un presencial sin sede no se le asigna la principal. La regla pura vive en
// src/utils/sedePrincipal.ts con sus pruebas; aquí se comprueba que las rutas reales
// la cableen al leer, y que las que escriben no guarden ninguna sede deducida, igual
// que en 75dc4d6.
//
//   npx tsx prisma/verificar-sede-principal.ts
//
// Monta las rutas reales dentro del proceso (prisma/app-en-proceso.ts), sin servidor
// y sin barridos. Crea una empresa de prueba por la ruta del super admin, recorre los
// caminos, compara lo que quedó escrito y lo que devuelven las lecturas, y BORRA todo
// lo que creó, pase lo que pase. No conviene arrancarlo cerca de la medianoche de
// Bogotá: el kiosco y la entrada manual usan el reloj.
import { prisma } from '../src/prisma';
import { borrarEmpresaEnCascada } from '../src/utils/borrarEmpresaEnCascada';
import { montarApp } from './app-en-proceso';

const SUFIJO = `sedep${Date.now()}`;
const NIT = SUFIJO;
const CORREO_ADMIN = `${SUFIJO}@prueba.local`;

type Caso = { nombre: string; espera: string; obtenido: string; ok: boolean };
const casos: Caso[] = [];
const comprobar = (nombre: string, espera: string, obtenido: unknown) => {
  const o = String(obtenido);
  casos.push({ nombre, espera, obtenido: o, ok: espera === o });
};

// Dos sedes con ubicación, a unos 4 km una de otra (las de modalidad.test.ts).
const EN_NORTE = { lat: 6.2447, lng: -75.5916 };
const EN_SUR = { lat: 6.2087, lng: -75.5674 };

// Las lecturas miran días PASADOS, con filas escritas directo en la base: así no
// dependen de la hora a la que corra el script.
const DESDE = '2026-09-01';
const HASTA = '2026-09-05';
const medianoche = (dia: string) => new Date(`${dia}T05:00:00.000Z`);
const bog = (dia: string, hhmm: string) => new Date(`${dia}T${hhmm}:00.000-05:00`);
const centavos = (n: number) => Math.round(n * 100) / 100;

type LugarDeFila = { id: string | null; nombre: string | null; porDefecto?: boolean };
type Atribuida = { id: string; nombre: string; porDefecto: boolean } | null | undefined;

async function main() {
  const { app } = await montarApp();
  const pedir = async (method: 'GET' | 'POST' | 'DELETE', url: string, token: string, payload?: object) => {
    const r = await app.inject({ method, url, headers: { authorization: `Bearer ${token}` }, ...(payload ? { payload } : {}) });
    let cuerpo: any = r.body;
    try { cuerpo = r.json(); } catch { /* no era JSON */ }
    return { estado: r.statusCode, cuerpo };
  };
  const superAdmin = app.jwt.sign({ id: 'verificacion-super', rol: 'SUPER_ADMIN', nombre: 'Verificación' });

  // ---- 1. La empresa nace con su Sede principal, y GET /sedes la marca ----
  const e = await pedir('POST', '/api/admin/empresas', superAdmin, {
    nombre: `Prueba sede principal ${SUFIJO}`, nit: NIT, email: CORREO_ADMIN, telefono: '3000000000',
    admin: { email: CORREO_ADMIN, password: `clave-${SUFIJO}`, nombre: 'Admin de prueba' },
  });
  comprobar('POST /admin/empresas crea la empresa', '201', e.estado);
  let empresa = await prisma.empresa.findUniqueOrThrow({ where: { nit: NIT }, select: { id: true, marcadorToken: true } });
  if (!empresa.marcadorToken) {
    empresa = await prisma.empresa.update({ where: { id: empresa.id }, data: { marcadorToken: SUFIJO }, select: { id: true, marcadorToken: true } });
  }
  const admin = await prisma.usuario.findUniqueOrThrow({ where: { email: CORREO_ADMIN }, select: { id: true } });
  const iniciales = await prisma.sede.findMany({ where: { empresaId: empresa.id }, select: { id: true, nombre: true, lat: true, lng: true, activa: true } });
  comprobar('nace con una sola sede, «Sede principal», activa y sin ubicación', '1 · Sede principal · activa · sin ubicación',
    `${iniciales.length} · ${iniciales[0]?.nombre} · ${iniciales[0]?.activa ? 'activa' : 'inactiva'} · ${iniciales[0] && iniciales[0].lat === null && iniciales[0].lng === null ? 'sin ubicación' : 'con ubicación'}`);
  const PRINCIPAL = iniciales[0]?.id ?? 'no-hay-principal';
  const NOMBRES = new Map<string, string>([[PRINCIPAL, 'principal']]);
  const nombreSede = (id: string | null | undefined) => (id ? NOMBRES.get(id) ?? id : 'sin sede');
  const token = app.jwt.sign({ id: admin.id, rol: 'ADMIN', nombre: 'Admin de prueba', empresaId: empresa.id });
  const principalSegunGet = async () => {
    const r = await pedir('GET', '/api/sedes', token);
    const sedes = (Array.isArray(r.cuerpo) ? r.cuerpo : []) as { id: string; principal?: boolean }[];
    return sedes.filter(s => s.principal === true).map(s => nombreSede(s.id)).join(',') || 'ninguna';
  };
  comprobar('GET /sedes marca la principal', 'principal', await principalSegunGet());

  // Dos sedes más, con ubicación y más nuevas, directo en la base: POST /sedes exige el
  // plan Empresarial desde la segunda.
  const t0 = Date.now();
  const norte = await prisma.sede.create({ data: { empresaId: empresa.id, nombre: 'Norte', ...EN_NORTE, radio: 150, creadoEn: new Date(t0 + 1_000) }, select: { id: true } });
  const sur = await prisma.sede.create({ data: { empresaId: empresa.id, nombre: 'Sur', ...EN_SUR, radio: 150, creadoEn: new Date(t0 + 2_000) }, select: { id: true } });
  NOMBRES.set(norte.id, 'norte');
  NOMBRES.set(sur.id, 'sur');
  comprobar('con tres sedes, GET /sedes sigue marcando la más antigua', 'principal', await principalSegunGet());

  // ---- 2. Crear a alguien sin sedes no le asigna ninguna ----
  let cedula = 7_100_000_000 + (Date.now() % 1_000_000);
  const crear = async (nombre: string, modalidad: string, extra: object = {}) => {
    const r = await pedir('POST', '/api/colaboradores', token, { nombre, apellido: 'Prueba', cedula: String(cedula++), salarioMensual: 1_750_905, modalidad, ...extra });
    if (r.estado !== 201) throw new Error(`crear ${nombre}: ${r.estado} ${JSON.stringify(r.cuerpo)}`);
    return r.cuerpo as { id: string; cedula: string };
  };
  const sedesDe = async (colaboradorId: string) => {
    const filas = await prisma.colaboradorSede.findMany({ where: { colaboradorId }, select: { sedeId: true } });
    return filas.map(f => nombreSede(f.sedeId)).sort().join(',') || 'ninguna';
  };

  const porDefecto = await crear('Presencial por defecto', 'PRESENCIAL');
  comprobar('POST /colaboradores de un presencial sin sedes: no le asigna ninguna, tampoco la principal', 'ninguna', await sedesDe(porDefecto.id));
  const sinSedes = await crear('Presencial con sedeIds vacio', 'PRESENCIAL', { sedeIds: [] });
  comprobar('POST /colaboradores de un presencial con sedeIds vacío: tampoco', 'ninguna', await sedesDe(sinSedes.id));
  const hibrido = await crear('Hibrido sin sede', 'HIBRIDO');
  comprobar('POST /colaboradores de un híbrido sin sedes: no le asigna ninguna', 'ninguna', await sedesDe(hibrido.id));
  const enNorte = await crear('Presencial asignado a Norte', 'PRESENCIAL', { sedeIds: [norte.id] });
  comprobar('POST /colaboradores de un presencial con Norte: solo Norte', 'norte', await sedesDe(enNorte.id));
  const mananaSur = await crear('Presencial manana en Sur', 'PRESENCIAL', { sedeIds: [norte.id] });
  const salidaNorte = await crear('Presencial con salida en Norte', 'PRESENCIAL');
  const enPrincipal = await crear('Presencial en la principal', 'PRESENCIAL', { sedeIds: [PRINCIPAL] });
  const norteYSur = await crear('Presencial Norte y Sur', 'PRESENCIAL', { sedeIds: [norte.id, sur.id] });
  const abreAdmin = await crear('Presencial que abre el admin', 'PRESENCIAL', { sedeIds: [norte.id, sur.id] });
  const soloSur = await crear('Presencial solo Sur', 'PRESENCIAL', { sedeIds: [sur.id] });
  const dosDias = await crear('Presencial dos dias', 'PRESENCIAL', { sedeIds: [norte.id] });
  // Revisión del 12 de septiembre de 2026 (arreglos 1 y 2).
  const soloPermiso = await crear('Presencial solo con permiso', 'PRESENCIAL', { sedeIds: [norte.id] });
  const tardeAbierta = await crear('Presencial con la tarde abierta', 'PRESENCIAL');

  // ---- 3. Kiosco: guarda solo la sede que probó la ubicación, como en 75dc4d6 ----
  const login = async (ced: string) => {
    const x = await app.inject({ method: 'POST', url: '/api/worker/login', payload: { marcadorToken: empresa.marcadorToken, cedula: ced } });
    if (x.statusCode !== 200) throw new Error(`login ${ced}: ${x.statusCode} ${x.body}`);
    return x.json().token as string;
  };
  const marcar = async (tokenKiosco: string, coords?: { lat: number; lng: number }) => {
    const x = await app.inject({ method: 'POST', url: '/api/worker/marcar', headers: { authorization: `Bearer ${tokenKiosco}` }, payload: coords ?? {} });
    let cuerpo: any = x.body;
    try { cuerpo = x.json(); } catch { /* no era JSON */ }
    return { estado: x.statusCode, cuerpo };
  };
  const ultimaMarca = (colaboradorId: string) => prisma.registro.findFirst({
    where: { colaboradorId }, orderBy: { creadoEn: 'desc' }, select: { id: true, sedeId: true, sedeSalidaId: true, salida: true },
  });
  const respuesta = (x: { estado: number; cuerpo: any }) => `${x.estado} ${x.cuerpo?.accion ?? x.cuerpo?.codigo}`;

  const k1 = await marcar(await login(enPrincipal.cedula));
  comprobar('kiosco, presencial cuya única sede no tiene coordenadas: la entrada guarda null', '200 ENTRADA sin sede',
    `${respuesta(k1)} ${nombreSede((await ultimaMarca(enPrincipal.id))?.sedeId)}`);
  const k2 = await marcar(await login(sinSedes.cedula));
  comprobar('kiosco, presencial sin ninguna sede: la entrada guarda null', '200 ENTRADA sin sede',
    `${respuesta(k2)} ${nombreSede((await ultimaMarca(sinSedes.id))?.sedeId)}`);
  const tNorteYSur = await login(norteYSur.cedula);
  const k3 = await marcar(tNorteYSur, EN_NORTE);
  comprobar('kiosco, presencial con sedes con coordenadas que entra en Norte: guarda Norte', '200 ENTRADA norte',
    `${respuesta(k3)} ${nombreSede((await ultimaMarca(norteYSur.id))?.sedeId)}`);
  const k4 = await marcar(tNorteYSur, EN_SUR);
  comprobar('kiosco, la misma persona sale desde Sur sin permiso: 403 y el turno sigue abierto, como en producción', '403 SEDE_DISTINTA abierto',
    `${respuesta(k4)} ${(await ultimaMarca(norteYSur.id))?.salida ? 'cerrado' : 'abierto'}`);

  // ---- 4. Carga manual: no escribe ninguna sede, como en 75dc4d6 ----
  const a1 = await pedir('POST', '/api/registros/entrada', token, { colaboradorId: abreAdmin.id });
  comprobar('POST /registros/entrada de un presencial con dos sedes con coordenadas: guarda null', '201 sin sede',
    `${a1.estado} ${nombreSede((await ultimaMarca(abreAdmin.id))?.sedeId)}`);
  const k5 = await marcar(await login(abreAdmin.cedula), EN_SUR);
  comprobar('kiosco, la entrada que abrió el admin sale desde Sur sin que la frene, y la salida dice Sur', '200 SALIDA sur',
    `${respuesta(k5)} ${nombreSede((await ultimaMarca(abreAdmin.id))?.sedeSalidaId)}`);
  const a2 = await pedir('POST', '/api/registros', token, {
    colaboradorId: porDefecto.id, fecha: medianoche('2026-08-20').toISOString(),
    entrada: bog('2026-08-20', '08:00').toISOString(), salida: bog('2026-08-20', '17:00').toISOString(), tipo: 'NORMAL',
  });
  const a2Fila = a2.estado === 201 ? await prisma.registro.findUnique({ where: { id: a2.cuerpo.id }, select: { sedeId: true } }) : null;
  comprobar('POST /registros de un presencial sin sedes: guarda null', '201 sin sede',
    `${a2.estado} ${a2Fila ? nombreSede(a2Fila.sedeId) : JSON.stringify(a2.cuerpo)}`);

  // ---- 5. Las filas del período, escritas directo en la base ----
  const fila = async (colaboradorId: string, dia: string, entrada: string, salida: string,
    extra: { sedeId?: string; sedeSalidaId?: string; salidaAlmuerzo?: boolean } = {}) =>
    (await prisma.registro.create({
      data: {
        colaboradorId, fecha: medianoche(dia), entrada: bog(dia, entrada), salida: bog(dia, salida), tipo: 'NORMAL',
        sedeId: extra.sedeId ?? null, sedeSalidaId: extra.sedeSalidaId ?? null, salidaAlmuerzo: extra.salidaAlmuerzo ?? false,
      },
      select: { id: true },
    })).id;
  // Con horas de noche, para que haya recargos que sumar en las líneas del resumen.
  const p1 = await fila(porDefecto.id, '2026-09-01', '18:00', '23:00');
  await fila(porDefecto.id, '2026-09-02', '18:00', '23:00');
  await fila(hibrido.id, '2026-09-01', '18:00', '23:00');
  await fila(enNorte.id, '2026-09-03', '18:00', '23:00');
  // El 2, la mañana marcada en Sur con ubicación y la tarde cargada a mano, en la
  // misma jornada. El 4, la mañana en Sur y aparte una jornada de noche sin sede.
  await fila(mananaSur.id, '2026-09-02', '08:00', '12:00', { sedeId: sur.id, sedeSalidaId: sur.id, salidaAlmuerzo: true });
  const tardeSur = await fila(mananaSur.id, '2026-09-02', '13:00', '17:00');
  await fila(mananaSur.id, '2026-09-04', '08:00', '12:00', { sedeId: sur.id, sedeSalidaId: sur.id });
  await fila(mananaSur.id, '2026-09-04', '18:00', '22:00');
  // Entrada sin sede y salida probada en Norte.
  await fila(salidaNorte.id, '2026-09-03', '14:00', '23:00', { sedeSalidaId: norte.id });
  // Un día marcado en Sur con ubicación y otro sin sede: la pista de un día no pasa
  // al otro, que cuenta en su sede por defecto, Norte.
  await fila(dosDias.id, '2026-09-01', '08:00', '12:00', { sedeId: sur.id, sedeSalidaId: sur.id });
  await fila(dosDias.id, '2026-09-03', '18:00', '23:00');
  // Arreglo 2: la mañana cargada a mano, cerrada y sin sede, y la tarde probada en Norte
  // que sigue ABIERTA. Extras liquida solo las cerradas, y la regla b) tiene que ver la tarde.
  await fila(tardeAbierta.id, '2026-09-03', '08:00', '12:00');
  const tardeEnNorte = (await prisma.registro.create({
    data: { colaboradorId: tardeAbierta.id, fecha: medianoche('2026-09-03'), entrada: bog('2026-09-03', '13:00'), salida: null, tipo: 'NORMAL', sedeId: norte.id },
    select: { id: true },
  })).id;
  // Arreglo 1: en un período aparte, la única fila es un permiso cargado sin horas de un
  // presencial asignado a Norte. Nadie más de la empresa tiene filas en ese período.
  const permiso = await prisma.registro.create({
    data: { colaboradorId: soloPermiso.id, fecha: medianoche('2026-08-26'), entrada: null, salida: null, tipo: 'PERMISO' },
    select: { entrada: true, salida: true },
  });
  comprobar('el permiso del arreglo 1 quedó sin horas (si tuviera entrada, el caso no probaría nada)', 'sin entrada · sin salida',
    `${permiso.entrada === null ? 'sin entrada' : 'con entrada'} · ${permiso.salida === null ? 'sin salida' : 'con salida'}`);

  // ---- 6. Reportes: el presencial cuenta en su sede, por defecto, y no en «Sin sede» ----
  const leerSedes = (sedes: LugarDeFila[] | undefined) =>
    (sedes ?? []).map(s => `${s.id === null ? 'Sin sede' : s.nombre}${s.porDefecto ? ' (por defecto)' : ''}`).join(' · ') || 'sin lugares';
  const reporte = (ruta: string, sedeId?: string, desde = DESDE, hasta = HASTA) =>
    pedir('GET', `/api/reportes/${ruta}?desde=${desde}&hasta=${hasta}${sedeId ? `&sedeId=${sedeId}` : ''}`, token);
  const personaEn = (r: { cuerpo: any }, id: string) => (r.cuerpo?.colaboradores ?? []).find((c: any) => c.colaboradorId === id);

  for (const [etiqueta, ruta] of [['extras', 'extras-resumen'], ['llegadas tarde', 'tardanzas-resumen']] as const) {
    const r = await reporte(ruta);
    comprobar(`${etiqueta}: responde 200`, '200', r.estado);
    comprobar(`${etiqueta}: el presencial sin sedes y sin marcas probadas cuenta en la principal, por defecto`,
      'Sede principal (por defecto)', leerSedes(personaEn(r, porDefecto.id)?.sedes));
    comprobar(`${etiqueta}: el presencial asignado a Norte sin marcas probadas cuenta en Norte, por defecto`,
      'Norte (por defecto)', leerSedes(personaEn(r, enNorte.id)?.sedes));
    comprobar(`${etiqueta}: el híbrido sin sede sigue en «Sin sede»`, 'Sin sede', leerSedes(personaEn(r, hibrido.id)?.sedes));
    comprobar(`${etiqueta}: la mañana probada en Sur y la tarde manual cuentan solo en Sur, sin mixto ni por defecto`,
      'Sur', leerSedes(personaEn(r, mananaSur.id)?.sedes));
    comprobar(`${etiqueta}: la entrada sin sede con la salida probada en Norte cuenta en Norte`, 'Norte', leerSedes(personaEn(r, salidaNorte.id)?.sedes));
    comprobar(`${etiqueta}: un día probado en Sur y otro sin pista es mixto, con Norte por defecto el día sin pista`,
      'Norte (por defecto) · Sur', leerSedes(personaEn(r, dosDias.id)?.sedes));
    const filtrado = await reporte(ruta, PRINCIPAL);
    comprobar(`${etiqueta}: el filtro por la principal trae al presencial que cuenta ahí por defecto, y no al híbrido`, 'sí · no',
      `${personaEn(filtrado, porDefecto.id) ? 'sí' : 'no'} · ${personaEn(filtrado, hibrido.id) ? 'sí' : 'no'}`);
    // Arreglo 2 (12 de septiembre de 2026): los dos reportes deciden con las mismas filas.
    comprobar(`${etiqueta}: la mañana manual sin sede y la tarde probada en Norte que sigue ABIERTA cuentan solo en Norte, sin por defecto`,
      'Norte', leerSedes(personaEn(r, tardeAbierta.id)?.sedes));
    // Arreglo 1: un presencial cuya única fila del período es un permiso sin horas.
    const conPermiso = await reporte(ruta, undefined, '2026-08-24', '2026-08-28');
    comprobar(`${etiqueta}, período con solo un permiso sin horas: el presencial asignado a Norte cuenta en Norte, por defecto`,
      'Norte (por defecto)', leerSedes(personaEn(conPermiso, soloPermiso.id)?.sedes));
    comprobar(`${etiqueta}, período con solo un permiso sin horas: responde 200 y el resumen no trae la línea «Sin sede»`, '200 · sin línea «Sin sede»',
      `${conPermiso.estado} · ${(conPermiso.cuerpo?.resumen?.porSede ?? []).some((l: any) => l.id === null) ? 'con línea «Sin sede»' : 'sin línea «Sin sede»'}`);
  }
  const tardeDespues = await prisma.registro.findUnique({ where: { id: tardeEnNorte }, select: { salida: true } });
  comprobar('la tarde en Norte seguía abierta al pedir los reportes (si el barrido la hubiera cerrado con hora, el caso no probaría nada)',
    'abierta', tardeDespues?.salida === null ? 'abierta' : 'cerrada');

  const extras = await reporte('extras-resumen');
  const monto = (id: string): number => personaEn(extras, id)?.totalAdicional ?? 0;
  const linea = (id: string | null) => (extras.cuerpo?.resumen?.porSede ?? []).find((l: any) => l.id === id)?.totalAdicional ?? 'sin línea';
  comprobar('extras: cada lugar tiene montos que sumar (si no, la comprobación de las líneas no probaría nada)', 'sí',
    [monto(porDefecto.id), monto(enNorte.id) + monto(salidaNorte.id), monto(mananaSur.id), monto(hibrido.id), monto(dosDias.id)].every(x => x > 0) ? 'sí' : 'no');
  comprobar('extras: cada presencial suma en la línea de su sede, el híbrido en «Sin sede», y en mixtos solo el de los dos días',
    `principal=${centavos(monto(porDefecto.id))} · norte=${centavos(monto(enNorte.id) + monto(salidaNorte.id))} · sur=${centavos(monto(mananaSur.id))} · sin sede=${centavos(monto(hibrido.id))} · mixtos=${centavos(monto(dosDias.id))}`,
    `principal=${linea(PRINCIPAL)} · norte=${linea(norte.id)} · sur=${linea(sur.id)} · sin sede=${linea(null)} · mixtos=${extras.cuerpo?.resumen?.mixtos?.totalAdicional}`);
  const sumaPersonas = centavos((extras.cuerpo?.colaboradores ?? []).reduce((s: number, c: any) => s + c.totalAdicional, 0));
  const sumaLineas = centavos((extras.cuerpo?.resumen?.porSede ?? []).reduce((s: number, l: any) => s + l.totalAdicional, 0)
    + (extras.cuerpo?.resumen?.mixtos?.totalAdicional ?? 0));
  comprobar('extras: «Todas» es la suma de las personas, y las líneas más los mixtos dan «Todas»',
    `${sumaPersonas} · ${sumaPersonas}`, `${extras.cuerpo?.resumen?.todas?.totalAdicional} · ${sumaLineas}`);

  // ---- 7. Registros: el listado, el detalle y las fotos traen la sede atribuida ----
  const leerAtribuida = (s: Atribuida) => (s === undefined ? 'sin campo' : s === null ? 'null' : `${nombreSede(s.id)}/${s.nombre}/${s.porDefecto}`);
  const listado = async (colaboradorId?: string) => {
    const r = await pedir('GET', `/api/registros?desde=${DESDE}&hasta=${HASTA}${colaboradorId ? `&colaboradorId=${colaboradorId}` : ''}`, token);
    return (Array.isArray(r.cuerpo) ? r.cuerpo : []) as any[];
  };
  const leerJornadas = (jornadas: any[]) =>
    jornadas.map(j => `${nombreSede(j.sede?.id)}→${leerAtribuida(j.sedeAtribuida)}`).join(' | ') || 'ninguna';

  comprobar('GET /registros del presencial por defecto: cada jornada trae la principal atribuida con porDefecto, y `sede` sigue en null',
    'sin sede→principal/Sede principal/true | sin sede→principal/Sede principal/true', leerJornadas(await listado(porDefecto.id)));
  comprobar('GET /registros del presencial asignado a Norte: su jornada trae Norte atribuida', 'sin sede→norte/Norte/true',
    leerJornadas(await listado(enNorte.id)));
  comprobar('GET /registros del híbrido: su jornada no trae sede atribuida', 'sin sede→null', leerJornadas(await listado(hibrido.id)));
  comprobar('GET /registros de la mañana en Sur: la jornada de la noche del 4 trae Sur por la mañana de ese día, y las que abrieron en Sur no atribuyen nada',
    'sin sede→sur/Sur/true | sur→null | sur→null', leerJornadas(await listado(mananaSur.id)));
  comprobar('GET /registros de la entrada sin sede con salida en Norte: trae Norte atribuida y conserva la sede de salida',
    'sin sede→norte/Norte/true · cerró norte',
    (await listado(salidaNorte.id)).map(j => `${leerJornadas([j])} · cerró ${nombreSede(j.sedeSalida?.id)}`).join(' | ') || 'ninguna');
  comprobar('GET /registros del presencial de los dos días: el día sin pista trae Norte, su sede por defecto, y no Sur, la del otro día',
    'sin sede→norte/Norte/true | sur→null', leerJornadas(await listado(dosDias.id)));
  const deLaEmpresa = await listado();
  comprobar('GET /registros de toda la empresa, sin filtro de persona: la misma atribución',
    'principal/Sede principal/true · norte/Norte/true',
    `${leerAtribuida(deLaEmpresa.find(j => j.colaboradorId === porDefecto.id)?.sedeAtribuida)} · ${leerAtribuida(deLaEmpresa.find(j => j.colaboradorId === enNorte.id)?.sedeAtribuida)}`);

  const det = (await pedir('GET', `/api/registros/${p1}/jornada`, token)).cuerpo;
  comprobar('GET /registros/:id/jornada del presencial por defecto: el registro, su tramo y la jornada traen la principal atribuida, y `sedes.abrio` sigue en null',
    'principal/Sede principal/true · principal/Sede principal/true · principal/Sede principal/true · abrio null',
    `${leerAtribuida(det?.registro?.sedeAtribuida)} · ${leerAtribuida(det?.tramos?.[0]?.sedeAtribuida)} · ${leerAtribuida(det?.sedes?.abrioAtribuida)} · abrio ${det?.sedes?.abrio === null ? 'null' : nombreSede(det?.sedes?.abrio?.id)}`);
  const detTarde = (await pedir('GET', `/api/registros/${tardeSur}/jornada`, token)).cuerpo;
  comprobar('GET /registros/:id/jornada de la tarde manual tras la mañana en Sur: la tarde trae Sur atribuida, y la jornada, que abrió en Sur, no atribuye',
    'mañana sur→null · tarde sin sede→sur/Sur/true · abrio sur · abrioAtribuida null',
    `mañana ${nombreSede(detTarde?.tramos?.[0]?.sede?.id)}→${leerAtribuida(detTarde?.tramos?.[0]?.sedeAtribuida)} · tarde ${nombreSede(detTarde?.tramos?.[1]?.sede?.id)}→${leerAtribuida(detTarde?.tramos?.[1]?.sedeAtribuida)} · abrio ${nombreSede(detTarde?.sedes?.abrio?.id)} · abrioAtribuida ${leerAtribuida(detTarde?.sedes?.abrioAtribuida)}`);

  const leerFotos = (cuerpo: any) => ((cuerpo?.fotos ?? []) as any[]).map(f => `${f.momento} ${leerAtribuida(f.sedeAtribuida)}`).join(' · ') || 'ninguna';
  comprobar('GET /registros/:id/jornada/fotos del presencial por defecto: la entrada trae la principal atribuida y la salida no',
    'ENTRADA principal/Sede principal/true · SALIDA null', leerFotos((await pedir('GET', `/api/registros/${p1}/jornada/fotos`, token)).cuerpo));
  comprobar('GET /registros/:id/jornada/fotos del día con la mañana en Sur: solo el regreso del descanso, que no tiene sede, trae Sur atribuida',
    'ENTRADA null · SALIDA_ALMUERZO null · REGRESO_ALMUERZO sur/Sur/true · SALIDA null',
    leerFotos((await pedir('GET', `/api/registros/${tardeSur}/jornada/fotos`, token)).cuerpo));

  // ---- 8. Desactivar sedes: suelta las asignaciones y no reasigna a nadie ----
  const d1 = await pedir('DELETE', `/api/sedes/${sur.id}`, token);
  comprobar('DELETE de Sur: 200, quien solo tenía Sur queda sin asignaciones, sin pasar a la principal, y quien tenía Norte y Sur se queda con Norte',
    '200 · ninguna · norte', `${d1.estado} · ${await sedesDe(soloSur.id)} · ${await sedesDe(norteYSur.id)}`);
  const d2 = await pedir('DELETE', `/api/sedes/${norte.id}`, token);
  const quedan = await prisma.colaboradorSede.findMany({ where: { sede: { empresaId: empresa.id } }, select: { sedeId: true } });
  comprobar('DELETE de Norte: 200, y en la empresa solo queda la asignación que ya tenía la principal', '200 · principal',
    `${d2.estado} · ${quedan.map(a => nombreSede(a.sedeId)).sort().join(',') || 'ninguna'}`);
  const d3 = await pedir('DELETE', `/api/sedes/${PRINCIPAL}`, token);
  const principalDespues = await prisma.sede.findUnique({ where: { id: PRINCIPAL }, select: { activa: true } });
  comprobar('DELETE de la última sede activa: 400 ULTIMA_SEDE, y sigue activa', '400 ULTIMA_SEDE activa',
    `${d3.estado} ${d3.cuerpo?.codigo} ${principalDespues?.activa ? 'activa' : 'inactiva'}`);

  console.log('\nRESULTADOS');
  for (const c of casos) {
    console.log(`  ${c.ok ? 'OK  ' : 'MAL '} ${c.nombre}`);
    if (!c.ok) console.log(`       esperaba "${c.espera}" y llegó "${c.obtenido}"`);
  }
  const malos = casos.filter(c => !c.ok).length;
  console.log(`\n${casos.length - malos} de ${casos.length} en verde.`);
  await app.close();
  return malos;
}

let salida = 1;
main()
  .then(malos => { salida = malos === 0 ? 0 : 1; })
  .catch(err => { console.error('EXPLOTÓ:', err); })
  .finally(async () => {
    // Limpieza: se borra todo lo creado, pase lo que pase.
    const emp = await prisma.empresa.findUnique({ where: { nit: NIT }, select: { id: true } });
    if (emp) await prisma.$transaction(tx => borrarEmpresaEnCascada(tx, emp.id), { timeout: 60_000 });
    await prisma.usuario.deleteMany({ where: { email: CORREO_ADMIN } });
    const quedan = await prisma.empresa.count({ where: { nit: NIT } }) + await prisma.usuario.count({ where: { email: CORREO_ADMIN } });
    console.log(quedan === 0 ? 'Limpieza: borrada la empresa de prueba y todo lo suyo.' : `LIMPIEZA INCOMPLETA: quedan ${quedan} filas con ${SUFIJO}`);
    await prisma.$disconnect();
    process.exit(salida);
  });
