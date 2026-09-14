// Verifica la COSTURA del registro facial por enlace contra MySQL (CLAUDE.md 8.6). Las decisiones
// puras viven en src/utils/registroFacial.ts con sus pruebas; aquí se comprueba que las rutas reales
// las cableen, que lo que escriben en la base sea lo que dicen, y que el ingreso facial del kiosco
// reconozca a quien se registró desde su enlace igual que a quien registra el administrador.
//
//   npx tsx prisma/verificar-registro-facial.ts
//
// Monta las rutas reales dentro del proceso (prisma/app-en-proceso.ts), sin servidor y sin barridos.
// Crea una empresa de prueba directo en la base, recorre los caminos y BORRA todo lo que creó, pase lo
// que pase. Tarda algo más de medio minuto: espera a que venza la caché de rostros del kiosco (30 s)
// para comprobar que quien retira su autorización deja de ser reconocido.
import { prisma } from '../src/prisma';
import { borrarEmpresaEnCascada } from '../src/utils/borrarEmpresaEnCascada';
import { hashDeToken, textoAutorizacionEnlace, TEXTO_AUTORIZACION_ADMINISTRADOR, TEXTO_MAYOR_DE_EDAD } from '../src/utils/registroFacial';
import { montarApp } from './app-en-proceso';

const SUFIJO = `rfe${Date.now()}`;
const NIT = SUFIJO;
const CORREO_ADMIN = `${SUFIJO}@prueba.local`;
const NOMBRE_EMPRESA = `Rosa de Prueba ${SUFIJO}`;
const HORA_MS = 60 * 60 * 1000;
const TEXTO_CON_CEDULA = textoAutorizacionEnlace(NOMBRE_EMPRESA, true);
const TEXTO_SIN_CEDULA = textoAutorizacionEnlace(NOMBRE_EMPRESA, false);

type Caso = { nombre: string; espera: string; obtenido: string; ok: boolean };
const casos: Caso[] = [];
const comprobar = (nombre: string, espera: string, obtenido: unknown) => {
  const o = String(obtenido);
  casos.push({ nombre, espera, obtenido: o, ok: espera === o });
};
const colaboradores: string[] = [];

// Tres caras que no se parecen. face-api.js da 128 números por toma; aquí se inventan lejos entre sí.
const cara = (f: (i: number) => number) => Array.from({ length: 128 }, (_, i) => Math.round(f(i) * 10_000) / 10_000);
const CARA_MARIA = cara(i => Math.sin(i + 1) * 0.1);
const CARA_MARIA_PERFIL = CARA_MARIA.map(v => v + 0.01);
const CARA_PEDRO = cara(i => Math.cos(3 * i + 2) * 0.1 + 0.05);
const CARA_LUCIA = cara(i => Math.sin(2 * i + 5) * 0.1 - 0.05);

const conPuntos = (cedula: string) => cedula.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const esperar = (ms: number) => new Promise(r => setTimeout(r, ms));

type Respuesta = { estado: number; cuerpo: Record<string, unknown> };
type FilaLista = { id: string; rostroEnroladoEn?: string | null; rostroRechazadoEn?: string | null; rostroDescriptor?: unknown };
type Ficha = {
  rostroEnroladoEn?: string | null; rostroRechazadoEn?: string | null; rostroDescriptor?: unknown;
  biometria?: {
    tomas: number; ultimaConstancia: { decision: string; origen: string } | null; enlaceVenceEn: string | null;
    permiteCedula: boolean; textoAutorizacionAdministrador: string;
  };
};

async function main() {
  const { app } = await montarApp();

  // Cada petición pública sale de una IP distinta: las rutas tienen un tope de 12 por minuto por IP y
  // este script hace muchas más. El tope se comprueba aparte, al final, desde una sola IP.
  let ultimaIp = 0;
  const ipNueva = () => { ultimaIp++; return `10.77.${Math.floor(ultimaIp / 250)}.${(ultimaIp % 250) + 1}`; };
  const pedir = async (method: 'GET' | 'POST', url: string, op: { token?: string; payload?: object; ip?: string } = {}): Promise<Respuesta> => {
    const r = await app.inject({
      method, url, remoteAddress: op.ip ?? ipNueva(),
      ...(op.token ? { headers: { authorization: `Bearer ${op.token}` } } : {}),
      ...(op.payload ? { payload: op.payload } : {}),
    });
    let cuerpo: Record<string, unknown> = {};
    try { cuerpo = r.json(); } catch { cuerpo = { texto: r.body }; }
    return { estado: r.statusCode, cuerpo };
  };
  const codigo = (r: Respuesta) => `${r.estado} ${String(r.cuerpo.codigo ?? '')}`.trim();

  // ---- La empresa, su administrador y tres personas ----
  const empresa = await prisma.empresa.create({
    data: { nombre: NOMBRE_EMPRESA, nit: NIT, email: CORREO_ADMIN, marcadorToken: SUFIJO }, select: { id: true },
  });
  const admin = await prisma.usuario.create({
    data: { empresaId: empresa.id, email: CORREO_ADMIN, password: 'x', nombre: 'Admin de prueba' }, select: { id: true },
  });
  const tokenAdmin = app.jwt.sign({ id: admin.id, rol: 'ADMIN', nombre: 'Admin de prueba', empresaId: empresa.id });
  let cedula = 7_300_000_000 + (Date.now() % 1_000_000);
  const persona = async (nombre: string, activo = true) => {
    const c = await prisma.colaborador.create({
      data: { empresaId: empresa.id, nombre, apellido: 'Prueba', cedula: String(cedula++), salarioMensual: 1_750_905, activo },
      select: { id: true, cedula: true },
    });
    colaboradores.push(c.id);
    return c;
  };
  const maria = await persona('María');
  const pedro = await persona('Pedro');
  const lucia = await persona('Lucía');
  const retirada = await persona('Retirada', false);
  // Pedro ya tenía rostro, de antes de las constancias: es el otro candidato del kiosco.
  await prisma.colaborador.update({ where: { id: pedro.id }, data: { rostroDescriptor: [CARA_PEDRO], rostroEnroladoEn: new Date() } });

  const crearEnlace = (colaboradorId: string) => pedir('POST', `/api/colaboradores/${colaboradorId}/enlace-rostro`, { token: tokenAdmin });
  const tokenDe = (r: Respuesta) => String(r.cuerpo.token ?? '');
  const enlaceEnBase = (token: string) => prisma.enlaceRegistroFacial.findUnique({
    where: { tokenHash: hashDeToken(token) },
    select: { id: true, venceEn: true, usadoEn: true, anuladoEn: true, intentosCedula: true, usuarioId: true },
  });
  const ficha = async (colaboradorId: string) => (await pedir('GET', `/api/colaboradores/${colaboradorId}`, { token: tokenAdmin })).cuerpo as Ficha;
  const lista = async (url: string) => {
    const r = await app.inject({ method: 'GET', url, headers: { authorization: `Bearer ${tokenAdmin}` } });
    const cuerpo: unknown = r.json();
    return (Array.isArray(cuerpo) ? cuerpo : []) as FilaLista[];
  };
  const constancias = (colaboradorId: string) => prisma.constanciaBiometrica.findMany({
    where: { colaboradorId }, orderBy: { creadoEn: 'asc' },
    select: { decision: true, origen: true, texto: true, mayorDeEdad: true, usuarioId: true, enlaceId: true },
  });
  const rostroEnBase = (colaboradorId: string) => prisma.colaborador.findUniqueOrThrow({
    where: { id: colaboradorId }, select: { rostroDescriptor: true, rostroEnroladoEn: true, rostroRechazadoEn: true },
  });
  const tomas = (d: unknown) => (Array.isArray(d) ? String(d.length) : d === null ? 'null' : 'otro');
  const verificar = (token: string, ced: string) => pedir('POST', `/api/registro-facial/${token}/verificar`, { payload: { cedula: ced } });
  const registrar = (token: string, cuerpo: object) => pedir('POST', `/api/registro-facial/${token}/registrar`, { payload: cuerpo });
  const noAutorizo = (token: string, cuerpo: object) => pedir('POST', `/api/registro-facial/${token}/no-autorizo`, { payload: cuerpo });
  const kiosco = (descriptor: number[]) => pedir('POST', '/api/worker/login-rostro', { payload: { descriptor, marcadorToken: SUFIJO } });
  const quienEntro = (r: Respuesta) => {
    if (r.estado !== 200) return String(r.estado);
    const id = app.jwt.decode<{ id: string }>(String(r.cuerpo.token))?.id;
    return id === maria.id ? '200 María' : id === pedro.id ? '200 Pedro' : `200 ${id}`;
  };

  // ---- 1. El administrador crea el enlace ----
  const antes = Date.now();
  const e1 = await crearEnlace(maria.id);
  const t1 = tokenDe(e1);
  const fila1 = await enlaceEnBase(t1);
  comprobar('POST enlace-rostro: 201 y un token largo', '201 largo', `${e1.estado} ${t1.length >= 40 ? 'largo' : `corto (${t1.length})`}`);
  comprobar('en la base queda la huella del token y no el token', 'huella sí · token no',
    `huella ${fila1 ? 'sí' : 'no'} · token ${(await prisma.enlaceRegistroFacial.count({ where: { tokenHash: t1 } })) ? 'sí' : 'no'}`);
  const vence = new Date(String(e1.cuerpo.venceEn)).getTime();
  comprobar('vence en una hora, y la base dice lo mismo que la respuesta', 'una hora · igual',
    `${Math.abs(vence - (antes + HORA_MS)) < 10_000 ? 'una hora' : `${Math.round((vence - antes) / 60_000)} min`} · ${fila1?.venceEn.getTime() === vence ? 'igual' : 'distinto'}`);
  comprobar('el enlace guarda quién lo creó', 'el admin', fila1?.usuarioId === admin.id ? 'el admin' : String(fila1?.usuarioId));

  const e2 = await crearEnlace(maria.id);
  const t2 = tokenDe(e2);
  comprobar('un segundo enlace anula el primero y queda vigente', 'anulado · vigente',
    `${(await enlaceEnBase(t1))?.anuladoEn ? 'anulado' : 'sin anular'} · ${(await enlaceEnBase(t2))?.anuladoEn ? 'anulado' : 'vigente'}`);
  comprobar('GET del primero: 410 ENLACE_ANULADO', '410 ENLACE_ANULADO', codigo(await pedir('GET', `/api/registro-facial/${t1}`)));
  comprobar('a una persona retirada no se le crea: 409', '409', (await crearEnlace(retirada.id)).estado);
  const deOtraEmpresa = app.jwt.sign({ id: admin.id, rol: 'ADMIN', nombre: 'Otra', empresaId: `otra-${SUFIJO}` });
  comprobar('el administrador de otra empresa no se lo crea: 404', '404',
    (await pedir('POST', `/api/colaboradores/${maria.id}/enlace-rostro`, { token: deOtraEmpresa })).estado);
  comprobar('sin sesión no se crea: 401', '401', (await pedir('POST', `/api/colaboradores/${maria.id}/enlace-rostro`)).estado);

  const f0 = await ficha(maria.id);
  comprobar('ficha sin registro: 0 tomas, sin constancia, el enlace vigente, con cédula, el texto del administrador y sin el descriptor',
    `0 · null · ${new Date(String(e2.cuerpo.venceEn)).toISOString()} · true · texto igual · sin descriptor`,
    `${f0.biometria?.tomas} · ${JSON.stringify(f0.biometria?.ultimaConstancia)} · ${f0.biometria?.enlaceVenceEn ? new Date(f0.biometria.enlaceVenceEn).toISOString() : 'null'} · ${f0.biometria?.permiteCedula} · ${f0.biometria?.textoAutorizacionAdministrador === TEXTO_AUTORIZACION_ADMINISTRADOR ? 'texto igual' : 'texto distinto'} · ${'rostroDescriptor' in f0 ? 'CON DESCRIPTOR' : 'sin descriptor'}`);

  // ---- 2. La persona abre el enlace y confirma su cédula ----
  const g = await pedir('GET', `/api/registro-facial/${t2}`);
  comprobar('GET del enlace: 200 con el nombre, la empresa, el texto con cédula y la casilla de edad, y sin la cédula',
    `200 · María · ${NOMBRE_EMPRESA} · texto con cédula · ${TEXTO_MAYOR_DE_EDAD} · true · sin cédula`,
    `${g.estado} · ${String(g.cuerpo.nombre)} · ${String(g.cuerpo.empresa)} · ${g.cuerpo.textoAutorizacion === TEXTO_CON_CEDULA ? 'texto con cédula' : String(g.cuerpo.textoAutorizacion)} · ${String(g.cuerpo.textoMayorDeEdad)} · ${String(g.cuerpo.permiteCedula)} · ${JSON.stringify(g.cuerpo).includes(maria.cedula) ? 'CON CÉDULA' : 'sin cédula'}`);
  comprobar('un token que no existe: 404 ENLACE_NO_EXISTE', '404 ENLACE_NO_EXISTE', codigo(await pedir('GET', `/api/registro-facial/${'x'.repeat(43)}`)));
  comprobar('un token demasiado corto lo frena el esquema: 400', '400', (await pedir('GET', '/api/registro-facial/corto')).estado);

  const mal = await verificar(t2, '123');
  comprobar('cédula equivocada: 400 con los intentos que quedan, y la base cuenta uno', '400 CEDULA_NO_COINCIDE · La cédula no coincide. Te quedan 4 intentos. · 1',
    `${codigo(mal)} · ${String(mal.cuerpo.error)} · ${(await enlaceEnBase(t2))?.intentosCedula}`);
  const bien = await verificar(t2, conPuntos(maria.cedula));
  comprobar('cédula escrita con puntos: 200, todavía sin registro', '200 · null · 0 · null · null',
    `${bien.estado} · ${String(bien.cuerpo.registradoEn)} · ${String(bien.cuerpo.tomas)} · ${String(bien.cuerpo.foto)} · ${String(bien.cuerpo.noAutorizoEn)}`);

  // ---- 3. Registra su rostro ----
  const cuerpoMaria = { cedula: maria.cedula, texto: TEXTO_CON_CEDULA, mayorDeEdad: true, descriptores: [CARA_MARIA, CARA_MARIA_PERFIL] };
  comprobar('registrar con un texto distinto del que rige: 409 TEXTO_CAMBIO', '409 TEXTO_CAMBIO', codigo(await registrar(t2, { ...cuerpoMaria, texto: `${TEXTO_CON_CEDULA} ` })));
  comprobar('registrar sin ser mayor de edad: 400 MENOR_DE_EDAD', '400 MENOR_DE_EDAD', codigo(await registrar(t2, { ...cuerpoMaria, mayorDeEdad: false })));
  comprobar('registrar con un rostro mal leído: 400 ROSTRO_INVALIDO', '400 ROSTRO_INVALIDO', codigo(await registrar(t2, { ...cuerpoMaria, descriptores: [[0.1, 0.2]] })));
  comprobar('ningún rechazo gastó el enlace ni dejó constancia', 'sin usar · 0',
    `${(await enlaceEnBase(t2))?.usadoEn ? 'usado' : 'sin usar'} · ${(await constancias(maria.id)).length}`);

  const reg = await registrar(t2, cuerpoMaria);
  const r1 = await rostroEnBase(maria.id);
  const c1 = await constancias(maria.id);
  const enlace2 = await enlaceEnBase(t2);
  comprobar('registrar: 200 con 2 tomas, y en la base el descriptor de 2 tomas, la fecha y sin rechazo', '200 · 2 · 2 · con fecha · sin rechazo',
    `${reg.estado} · ${String(reg.cuerpo.tomas)} · ${tomas(r1.rostroDescriptor)} · ${r1.rostroEnroladoEn ? 'con fecha' : 'sin fecha'} · ${r1.rostroRechazadoEn ? 'con rechazo' : 'sin rechazo'}`);
  comprobar('queda una constancia AUTORIZA desde el ENLACE, con el texto que leyó, mayor de edad, su enlace y sin usuario',
    '1 · AUTORIZA · ENLACE · texto con cédula · true · su enlace · sin usuario',
    `${c1.length} · ${c1[0]?.decision} · ${c1[0]?.origen} · ${c1[0]?.texto === TEXTO_CON_CEDULA ? 'texto con cédula' : 'otro texto'} · ${c1[0]?.mayorDeEdad} · ${c1[0]?.enlaceId === enlace2?.id ? 'su enlace' : 'otro enlace'} · ${c1[0]?.usuarioId === null ? 'sin usuario' : 'con usuario'}`);
  comprobar('el enlace quedó usado, y volver a usarlo da 410 ENLACE_USADO', 'usado · 410 ENLACE_USADO · 410 ENLACE_USADO',
    `${enlace2?.usadoEn ? 'usado' : 'sin usar'} · ${codigo(await pedir('GET', `/api/registro-facial/${t2}`))} · ${codigo(await registrar(t2, cuerpoMaria))}`);

  // ---- 4. El kiosco la reconoce, con Pedro también registrado ----
  comprobar('kiosco: la cara de María entra como María', '200 María', quienEntro(await kiosco(CARA_MARIA)));
  comprobar('kiosco: la cara de Pedro entra como Pedro', '200 Pedro', quienEntro(await kiosco(CARA_PEDRO)));
  const f1 = await ficha(maria.id);
  comprobar('ficha: 2 tomas, la constancia la dejó la persona desde el enlace, y ya no hay enlace vigente', '2 · AUTORIZA ENLACE · null',
    `${f1.biometria?.tomas} · ${f1.biometria?.ultimaConstancia?.decision} ${f1.biometria?.ultimaConstancia?.origen} · ${f1.biometria?.enlaceVenceEn}`);
  const enLista1 = (await lista('/api/colaboradores')).find(c => c.id === maria.id);
  comprobar('la lista trae la fecha del registro y el rechazo en null, sin el descriptor', 'con fecha · null · sin descriptor',
    `${enLista1?.rostroEnroladoEn ? 'con fecha' : String(enLista1?.rostroEnroladoEn)} · ${String(enLista1?.rostroRechazadoEn)} · ${enLista1 && 'rostroDescriptor' in enLista1 ? 'CON DESCRIPTOR' : 'sin descriptor'}`);

  // ---- 5. Con otro enlace, ve su registro y retira la autorización ----
  const t3 = tokenDe(await crearEnlace(maria.id));
  const v3 = await verificar(t3, maria.cedula);
  comprobar('con registro, verificar dice desde cuándo y cuántas tomas', '200 · con fecha · 2',
    `${v3.estado} · ${v3.cuerpo.registradoEn ? 'con fecha' : 'sin fecha'} · ${String(v3.cuerpo.tomas)}`);
  const no = await noAutorizo(t3, { cedula: maria.cedula, texto: TEXTO_CON_CEDULA });
  const r2 = await rostroEnBase(maria.id);
  const c2 = await constancias(maria.id);
  comprobar('no autoriza: 200, se borran el descriptor y la fecha, y queda la fecha del rechazo', '200 · null · sin fecha · con rechazo',
    `${no.estado} · ${tomas(r2.rostroDescriptor)} · ${r2.rostroEnroladoEn ? 'con fecha' : 'sin fecha'} · ${r2.rostroRechazadoEn ? 'con rechazo' : 'sin rechazo'}`);
  comprobar('queda una segunda constancia NO_AUTORIZA desde el ENLACE, con el texto y sin la casilla de edad', '2 · NO_AUTORIZA · ENLACE · texto con cédula · null',
    `${c2.length} · ${c2[1]?.decision} · ${c2[1]?.origen} · ${c2[1]?.texto === TEXTO_CON_CEDULA ? 'texto con cédula' : 'otro texto'} · ${c2[1]?.mayorDeEdad}`);
  const f2 = await ficha(maria.id);
  comprobar('ficha: 0 tomas, la fecha del rechazo y la última constancia NO_AUTORIZA', '0 · con rechazo · NO_AUTORIZA ENLACE',
    `${f2.biometria?.tomas} · ${f2.rostroRechazadoEn ? 'con rechazo' : 'sin rechazo'} · ${f2.biometria?.ultimaConstancia?.decision} ${f2.biometria?.ultimaConstancia?.origen}`);
  const enLista2 = (await lista('/api/colaboradores')).find(c => c.id === maria.id);
  comprobar('la lista trae la fecha del rechazo', 'null · con rechazo',
    `${String(enLista2?.rostroEnroladoEn)} · ${enLista2?.rostroRechazadoEn ? 'con rechazo' : String(enLista2?.rostroRechazadoEn)}`);
  console.log('Esperando 31 s a que venza la caché de rostros del kiosco...');
  await esperar(31_000);
  comprobar('kiosco, vencida la caché: la cara de María ya no entra, y la de Pedro sí', '401 · 200 Pedro',
    `${quienEntro(await kiosco(CARA_MARIA))} · ${quienEntro(await kiosco(CARA_PEDRO))}`);

  // ---- 6. Enlaces que dejan de servir ----
  const t4 = tokenDe(await crearEnlace(lucia.id));
  const intentos: string[] = [];
  for (let i = 0; i < 5; i++) intentos.push(codigo(await verificar(t4, '999')));
  comprobar('cinco cédulas equivocadas: cuatro 400 y la quinta 410 ENLACE_BLOQUEADO', '400 CEDULA_NO_COINCIDE ×4 · 410 ENLACE_BLOQUEADO',
    `${intentos.slice(0, 4).every(x => x === '400 CEDULA_NO_COINCIDE') ? '400 CEDULA_NO_COINCIDE ×4' : intentos.slice(0, 4).join(',')} · ${intentos[4]}`);
  comprobar('bloqueado, ni con la cédula correcta: 410, y la ficha no lo ofrece como vigente', '410 ENLACE_BLOQUEADO · null',
    `${codigo(await verificar(t4, lucia.cedula))} · ${(await ficha(lucia.id)).biometria?.enlaceVenceEn}`);

  const t5 = tokenDe(await crearEnlace(lucia.id));
  await prisma.enlaceRegistroFacial.update({ where: { tokenHash: hashDeToken(t5) }, data: { venceEn: new Date(Date.now() - 1_000) } });
  comprobar('un enlace vencido: 410 ENLACE_VENCIDO, y la ficha no lo ofrece', '410 ENLACE_VENCIDO · null',
    `${codigo(await pedir('GET', `/api/registro-facial/${t5}`))} · ${(await ficha(lucia.id)).biometria?.enlaceVenceEn}`);

  // Dos pestañas con el mismo enlace, a la vez: una sola decisión queda guardada.
  const t6 = tokenDe(await crearEnlace(lucia.id));
  const cuerpoLucia = { cedula: lucia.cedula, texto: TEXTO_CON_CEDULA, mayorDeEdad: true, descriptores: [CARA_LUCIA] };
  const [a, b] = await Promise.all([registrar(t6, cuerpoLucia), registrar(t6, cuerpoLucia)]);
  comprobar('dos registros a la vez con el mismo enlace: uno 200, el otro 410 ENLACE_USADO, y una sola constancia', '200 · 410 ENLACE_USADO · 1',
    `${[codigo(a), codigo(b)].sort().join(' · ')} · ${(await constancias(lucia.id)).length}`);

  const t7 = tokenDe(await crearEnlace(pedro.id));
  await prisma.colaborador.update({ where: { id: pedro.id }, data: { activo: false } });
  comprobar('si la persona se retira con un enlace vigente, el enlace deja de existir: 404', '404 ENLACE_NO_EXISTE',
    codigo(await pedir('GET', `/api/registro-facial/${t7}`)));
  const pedroRetirado = (await lista('/api/colaboradores/inactivos')).find(c => c.id === pedro.id);
  comprobar('la lista de retirados trae la fecha del registro facial y el rechazo', 'con fecha · null',
    `${pedroRetirado?.rostroEnroladoEn ? 'con fecha' : String(pedroRetirado?.rostroEnroladoEn)} · ${String(pedroRetirado?.rostroRechazadoEn)}`);

  // ---- 7. El administrador la registra desde la ficha después de que no autorizó ----
  const adm = await pedir('POST', `/api/colaboradores/${maria.id}/rostro`, { token: tokenAdmin, payload: { descriptores: [CARA_MARIA] } });
  const r3 = await rostroEnBase(maria.id);
  const c3 = await constancias(maria.id);
  comprobar('registro desde la ficha: 200, se quita el rechazo y queda 1 toma', '200 · sin rechazo · 1',
    `${adm.estado} · ${r3.rostroRechazadoEn ? 'con rechazo' : 'sin rechazo'} · ${tomas(r3.rostroDescriptor)}`);
  comprobar('queda una tercera constancia AUTORIZA del ADMINISTRADOR, con su usuario, el texto de la ficha y sin enlace',
    '3 · AUTORIZA · ADMINISTRADOR · el admin · texto de la ficha · sin enlace',
    `${c3.length} · ${c3[2]?.decision} · ${c3[2]?.origen} · ${c3[2]?.usuarioId === admin.id ? 'el admin' : String(c3[2]?.usuarioId)} · ${c3[2]?.texto === TEXTO_AUTORIZACION_ADMINISTRADOR ? 'texto de la ficha' : 'otro texto'} · ${c3[2]?.enlaceId === null ? 'sin enlace' : 'con enlace'}`);
  const f3 = await ficha(maria.id);
  comprobar('ficha: la última constancia es del administrador', 'AUTORIZA ADMINISTRADOR',
    `${f3.biometria?.ultimaConstancia?.decision} ${f3.biometria?.ultimaConstancia?.origen}`);

  // ---- 8. La empresa no deja marcar con cédula ----
  await prisma.configuracion.create({ data: { empresaId: empresa.id, clave: 'KIOSCO_PERMITE_CEDULA', valor: '0' } });
  const t8 = tokenDe(await crearEnlace(maria.id));
  const g8 = await pedir('GET', `/api/registro-facial/${t8}`);
  comprobar('sin cédula: el enlace lo dice y el texto no promete la cédula', 'false · texto sin cédula',
    `${String(g8.cuerpo.permiteCedula)} · ${g8.cuerpo.textoAutorizacion === TEXTO_SIN_CEDULA ? 'texto sin cédula' : String(g8.cuerpo.textoAutorizacion)}`);
  comprobar('quien leyó el texto de antes, con la cédula, no deja constancia de él: 409 TEXTO_CAMBIO y siguen 3', '409 TEXTO_CAMBIO · 3',
    `${codigo(await noAutorizo(t8, { cedula: maria.cedula, texto: TEXTO_CON_CEDULA }))} · ${(await constancias(maria.id)).length}`);
  comprobar('la ficha también lo sabe', 'false', (await ficha(maria.id)).biometria?.permiteCedula);

  // ---- 9. El tope por IP ----
  const estados: number[] = [];
  for (let i = 0; i < 13; i++) estados.push((await pedir('GET', `/api/registro-facial/${'y'.repeat(43)}`, { ip: '10.200.0.1' })).estado);
  comprobar('desde una misma IP responde 12 veces y la 13.ª es 429', '404×12 · 429',
    `${estados.slice(0, 12).every(e => e === 404) ? '404×12' : estados.slice(0, 12).join(',')} · ${estados[12]}`);

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
    const quedan = await prisma.empresa.count({ where: { nit: NIT } })
      + await prisma.usuario.count({ where: { email: CORREO_ADMIN } })
      + await prisma.colaborador.count({ where: { id: { in: colaboradores } } })
      + await prisma.constanciaBiometrica.count({ where: { colaboradorId: { in: colaboradores } } })
      + await prisma.enlaceRegistroFacial.count({ where: { colaboradorId: { in: colaboradores } } });
    console.log(quedan === 0 ? 'Limpieza: borrada la empresa de prueba y todo lo suyo.' : `LIMPIEZA INCOMPLETA: quedan ${quedan} filas con ${SUFIJO}`);
    await prisma.$disconnect();
    process.exit(salida);
  });
