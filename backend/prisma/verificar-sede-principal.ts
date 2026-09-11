// Verifica la COSTURA de «quien trabaja presencial siempre tiene sede» contra
// MySQL (CLAUDE.md 8.6). La regla pura vive en src/utils/sedePrincipal.ts con sus
// pruebas; aquí se comprueba que CADA camino que crea una empresa, asigna sedes
// o escribe una marcación la aplique de verdad.
//
//   npx tsx prisma/verificar-sede-principal.ts
//
// Monta las rutas reales dentro del proceso (prisma/app-en-proceso.ts), sin
// servidor y sin barridos. Crea una empresa de prueba por la ruta del super
// admin, recorre los caminos, compara lo que quedó escrito y BORRA todo lo que
// creó, pase lo que pase.
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

async function main() {
  const { app } = await montarApp();
  const pedir = async (method: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, token: string, payload?: object) => {
    const r = await app.inject({ method, url, headers: { authorization: `Bearer ${token}` }, ...(payload ? { payload } : {}) });
    let cuerpo: any = r.body;
    try { cuerpo = r.json(); } catch { /* no era JSON */ }
    return { estado: r.statusCode, cuerpo };
  };
  const superAdmin = app.jwt.sign({ id: 'verificacion-super', rol: 'SUPER_ADMIN', nombre: 'Verificación' });

  // ---- 1. La empresa nace con su Sede principal ----
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
    `${iniciales.length} · ${iniciales[0]?.nombre} · ${iniciales[0]?.activa ? 'activa' : 'inactiva'} · ${iniciales[0]?.lat === null && iniciales[0]?.lng === null ? 'sin ubicación' : 'con ubicación'}`);
  const PRINCIPAL = iniciales[0].id;
  const NOMBRES = new Map<string, string>([[PRINCIPAL, 'principal']]);
  const nombreSede = (id: string | null | undefined) => (id ? NOMBRES.get(id) ?? id : 'sin sede');
  const token = app.jwt.sign({ id: admin.id, rol: 'ADMIN', nombre: 'Admin de prueba', empresaId: empresa.id });
  const principalSegunGet = async () =>
    ((await pedir('GET', '/api/sedes', token)).cuerpo as { id: string; principal: boolean }[]).filter(s => s.principal).map(s => nombreSede(s.id)).join(',');

  comprobar('GET /sedes marca la principal', 'principal', await principalSegunGet());

  // ---- 2. Crear y editar colaboradores ----
  let cedula = 7_000_000_000 + (Date.now() % 1_000_000);
  const crear = async (nombre: string, modalidad: string, extra: object = {}) => {
    const r = await pedir('POST', '/api/colaboradores', token, { nombre, apellido: 'Prueba', cedula: String(cedula++), salarioMensual: 1_750_905, modalidad, ...extra });
    if (r.estado !== 201) throw new Error(`crear ${nombre}: ${r.estado} ${JSON.stringify(r.cuerpo)}`);
    return r.cuerpo as { id: string; cedula: string };
  };
  const sedesDe = async (colaboradorId: string) => {
    const filas = await prisma.colaboradorSede.findMany({ where: { colaboradorId }, select: { sedeId: true } });
    return filas.map(f => nombreSede(f.sedeId)).sort().join(',') || 'ninguna';
  };

  const pA = await crear('Presencial A', 'PRESENCIAL');
  comprobar('presencial creado sin sedes: queda en la principal', 'principal', await sedesDe(pA.id));
  const pB = await crear('Presencial B', 'PRESENCIAL', { sedeIds: [] });
  comprobar('presencial creado con sedeIds vacío: igual queda en la principal', 'principal', await sedesDe(pB.id));
  const h = await crear('Hibrido', 'HIBRIDO');
  comprobar('híbrido creado sin sedes: sigue sin sede', 'ninguna', await sedesDe(h.id));
  const r = await crear('Remoto', 'REMOTO');
  comprobar('remoto creado sin sedes: sigue sin sede', 'ninguna', await sedesDe(r.id));
  const hp = await crear('Hibrido que pasa', 'HIBRIDO');
  const u1 = await pedir('PUT', `/api/colaboradores/${hp.id}`, token, { modalidad: 'PRESENCIAL' });
  comprobar('PUT de híbrido a presencial, sin tocar sedes: recibe la principal', '200 principal', `${u1.estado} ${await sedesDe(hp.id)}`);
  const u2 = await pedir('PUT', `/api/colaboradores/${pA.id}`, token, { sedeIds: [] });
  comprobar('PUT a un presencial quitándole todas: vuelve la principal', '200 principal', `${u2.estado} ${await sedesDe(pA.id)}`);

  // Una segunda sede, más nueva, directo en la base: POST /sedes exige plan Empresarial.
  const norte = await prisma.sede.create({ data: { empresaId: empresa.id, nombre: 'Norte', creadoEn: new Date(Date.now() + 1000) }, select: { id: true } });
  NOMBRES.set(norte.id, 'norte');
  comprobar('con dos sedes, la principal sigue siendo la más antigua', 'principal', await principalSegunGet());

  const pC = await crear('Presencial Norte', 'PRESENCIAL', { sedeIds: [norte.id] });
  comprobar('presencial creado con Norte: solo Norte, sin agregarle la principal', 'norte', await sedesDe(pC.id));
  const pD = await crear('Presencial dos sedes', 'PRESENCIAL', { sedeIds: [norte.id, PRINCIPAL] });
  comprobar('presencial con dos sedes: las dos', 'norte,principal', await sedesDe(pD.id));

  // ---- 3. Carga masiva ----
  const m = await pedir('POST', '/api/colaboradores/masivo', token, { filas: [
    { nombre: 'Masivo', apellido: 'Sin sede', cedula: String(cedula++), salarioMensual: '1750905' },
    { nombre: 'Masivo', apellido: 'Con Norte', cedula: String(cedula++), salarioMensual: '1750905', sedeId: norte.id },
  ] });
  comprobar('POST /colaboradores/masivo crea las dos filas', '200 2', `${m.estado} ${m.cuerpo?.creados}`);
  const m1 = await prisma.colaborador.findFirst({ where: { empresaId: empresa.id, apellido: 'Sin sede' }, select: { id: true } });
  const m2 = await prisma.colaborador.findFirst({ where: { empresaId: empresa.id, apellido: 'Con Norte' }, select: { id: true } });
  comprobar('importado sin sede: queda en la principal', 'principal', m1 ? await sedesDe(m1.id) : 'no se creó');
  comprobar('importado con Norte: solo Norte', 'norte', m2 ? await sedesDe(m2.id) : 'no se creó');

  // ---- 4. Kiosco: marcas sin ubicación (ninguna sede tiene coordenadas) ----
  const login = async (ced: string) => {
    const x = await app.inject({ method: 'POST', url: '/api/worker/login', payload: { marcadorToken: empresa.marcadorToken, cedula: ced } });
    if (x.statusCode !== 200) throw new Error(`login ${ced}: ${x.statusCode} ${x.body}`);
    return x.json().token as string;
  };
  const marcar = async (tokenKiosco: string) => {
    const x = await app.inject({ method: 'POST', url: '/api/worker/marcar', headers: { authorization: `Bearer ${tokenKiosco}` }, payload: {} });
    let cuerpo: any = x.body;
    try { cuerpo = x.json(); } catch { /* no era JSON */ }
    return { estado: x.statusCode, cuerpo };
  };
  const ultimaMarca = (colaboradorId: string) => prisma.registro.findFirst({
    where: { colaboradorId }, orderBy: { creadoEn: 'desc' }, select: { id: true, sedeId: true, sedeSalidaId: true },
  });

  const kiosco: [string, { id: string; cedula: string }, string][] = [
    ['presencial con la principal', pA, 'principal'],
    ['presencial solo con Norte', pC, 'norte'],
    ['presencial con Norte y la principal: la más antigua de las suyas', pD, 'principal'],
    ['híbrido sin sedes', h, 'sin sede'],
  ];
  for (const [quien, col, espera] of kiosco) {
    const x = await marcar(await login(col.cedula));
    comprobar(`kiosco, ${quien}`, `200 ENTRADA ${espera}`, `${x.estado} ${x.cuerpo?.accion} ${nombreSede((await ultimaMarca(col.id))?.sedeId)}`);
  }
  // La salida no cambia: sin ubicación sigue siendo «no se sabe», y la regla de
  // cerrar en la misma sede no la frena.
  const s1 = await marcar(await login(pC.cedula));
  comprobar('kiosco, salida del presencial de Norte: igual que antes, sin sede de salida', '200 SALIDA sin sede',
    `${s1.estado} ${s1.cuerpo?.accion} ${nombreSede((await ultimaMarca(pC.id))?.sedeSalidaId)}`);

  // ---- 5. Carga manual del administrador ----
  const e1 = await pedir('POST', '/api/registros/entrada', token, { colaboradorId: hp.id });
  comprobar('POST /registros/entrada de un presencial: queda en su sede', '201 principal', `${e1.estado} ${nombreSede((await ultimaMarca(hp.id))?.sedeId)}`);
  const e2 = await pedir('POST', '/api/registros/entrada', token, { colaboradorId: r.id });
  comprobar('POST /registros/entrada de un remoto: sin sede', '201 sin sede', `${e2.estado} ${nombreSede((await ultimaMarca(r.id))?.sedeId)}`);

  const DIA = '2026-09-01';
  if (m2) {
    const man = await pedir('POST', '/api/registros', token, { colaboradorId: m2.id, fecha: `${DIA}T05:00:00.000Z`, entrada: `${DIA}T13:00:00.000Z`, salida: `${DIA}T22:00:00.000Z`, tipo: 'NORMAL' });
    comprobar('POST /registros de un presencial con Norte: queda en Norte', '201 norte', `${man.estado} ${man.estado === 201 ? nombreSede((await ultimaMarca(m2.id))?.sedeId) : JSON.stringify(man.cuerpo)}`);
  }

  // ---- 6. Editor de jornada: la tarde que nace de una edición ----
  const DIA2 = '2026-09-02';
  const base = await pedir('POST', '/api/registros', token, { colaboradorId: pD.id, fecha: `${DIA2}T05:00:00.000Z`, entrada: `${DIA2}T13:00:00.000Z`, salida: `${DIA2}T22:00:00.000Z`, tipo: 'NORMAL' });
  if (base.estado === 201) {
    // Como si la mañana la hubiera marcado en Norte con ubicación: su respaldo
    // sería la principal, así que se ve si la tarde hereda o cae al respaldo.
    await prisma.registro.update({ where: { id: base.cuerpo.id }, data: { sedeId: norte.id } });
    // El editor recibe horas de pared de Bogotá, no instantes.
    const ed = await pedir('PUT', `/api/registros/jornada/${base.cuerpo.id}`, token, {
      fecha: DIA2, entrada: '08:00', descansoSalida: '12:00', descansoRegreso: '13:00', salida: '17:00', tipo: 'NORMAL',
    });
    const filas = await prisma.registro.findMany({
      where: { colaboradorId: pD.id, fecha: { gte: new Date(`${DIA2}T05:00:00.000Z`), lt: new Date('2026-09-03T05:00:00.000Z') } },
      orderBy: { entrada: 'asc' }, select: { sedeId: true },
    });
    comprobar('editor: la tarde nueva hereda la sede donde abrió la jornada, no la principal', '200 2 norte,norte',
      `${ed.estado} ${filas.length} ${filas.map(f => nombreSede(f.sedeId)).join(',')}${ed.estado !== 200 ? ` ${JSON.stringify(ed.cuerpo)}` : ''}`);
  } else {
    comprobar('editor: registro base creado', '201', `${base.estado} ${JSON.stringify(base.cuerpo)}`);
  }

  // ---- 6b. Cerrar en la misma sede: una sede deducida no ata a nadie ----
  // El caso que encontró la revisión: dos sedes CON coordenadas. Si el
  // administrador abre el turno, la entrada queda en la más antigua de las suyas,
  // deducida, y la persona tiene que poder salir desde la otra. Si el turno lo
  // abrió ella misma en el kiosco, la regla de siempre la frena.
  const POBLADO = { lat: 6.2087, lng: -75.5674 };
  const LAURELES = { lat: 6.2447, lng: -75.5916 };
  const poblado = await prisma.sede.create({ data: { empresaId: empresa.id, nombre: 'El Poblado', ...POBLADO, radio: 150, creadoEn: new Date(Date.now() + 2000) }, select: { id: true } });
  const laureles = await prisma.sede.create({ data: { empresaId: empresa.id, nombre: 'Laureles', ...LAURELES, radio: 150, creadoEn: new Date(Date.now() + 3000) }, select: { id: true } });
  NOMBRES.set(poblado.id, 'poblado');
  NOMBRES.set(laureles.id, 'laureles');
  const pE = await crear('Presencial que abre el admin', 'PRESENCIAL', { sedeIds: [poblado.id, laureles.id] });
  const pF = await crear('Presencial que abre solo', 'PRESENCIAL', { sedeIds: [poblado.id, laureles.id] });
  const marcarEn = async (tokenKiosco: string, coords: { lat: number; lng: number }) => {
    const x = await app.inject({ method: 'POST', url: '/api/worker/marcar', headers: { authorization: `Bearer ${tokenKiosco}` }, payload: coords });
    let cuerpo: any = x.body;
    try { cuerpo = x.json(); } catch { /* no era JSON */ }
    return { estado: x.statusCode, cuerpo };
  };
  const abreAdmin = await pedir('POST', '/api/registros/entrada', token, { colaboradorId: pE.id });
  comprobar('el admin abre el turno de un presencial con dos sedes con ubicación: queda en la más antigua, deducida', '201 poblado',
    `${abreAdmin.estado} ${nombreSede((await ultimaMarca(pE.id))?.sedeId)}`);
  const saleE = await marcarEn(await login(pE.cedula), LAURELES);
  comprobar('esa persona sale por el kiosco desde Laureles: la deja salir, y la salida dice Laureles', '200 SALIDA laureles',
    `${saleE.estado} ${saleE.cuerpo?.accion ?? saleE.cuerpo?.codigo} ${nombreSede((await ultimaMarca(pE.id))?.sedeSalidaId)}`);
  const tF = await login(pF.cedula);
  const abreF = await marcarEn(tF, POBLADO);
  comprobar('control: abre ella misma en El Poblado, con ubicación', '200 ENTRADA poblado',
    `${abreF.estado} ${abreF.cuerpo?.accion} ${nombreSede((await ultimaMarca(pF.id))?.sedeId)}`);
  const saleF = await marcarEn(tF, LAURELES);
  comprobar('control: e intenta salir desde Laureles: la regla de siempre la frena', '403 SEDE_DISTINTA', `${saleF.estado} ${saleF.cuerpo?.codigo}`);
  // Se apagan para no estorbar la sección 7, que cuenta las sedes activas.
  await prisma.sede.updateMany({ where: { id: { in: [poblado.id, laureles.id] } }, data: { activa: false } });

  // ---- 6c. Una fila sin hora de entrada que pasa a ser marcación ----
  const DIA3 = '2026-09-03';
  const sinEntrada = await pedir('POST', '/api/registros', token, { colaboradorId: pB.id, fecha: `${DIA3}T05:00:00.000Z`, tipo: 'PERMISO' });
  if (sinEntrada.estado === 201) {
    comprobar('una fila sin hora de entrada no lleva sede', 'sin sede', nombreSede(sinEntrada.cuerpo.sedeId));
    const put = await pedir('PUT', `/api/registros/${sinEntrada.cuerpo.id}`, token, { entrada: `${DIA3}T13:00:00.000Z`, salida: `${DIA3}T22:00:00.000Z` });
    const tras = await prisma.registro.findUniqueOrThrow({ where: { id: sinEntrada.cuerpo.id }, select: { sedeId: true } });
    comprobar('PUT /registros/:id le pone hora de entrada: queda en su sede', '200 principal',
      `${put.estado} ${nombreSede(tras.sedeId)}${put.estado !== 200 ? ` ${JSON.stringify(put.cuerpo)}` : ''}`);
  } else {
    comprobar('POST /registros crea una fila sin hora de entrada', '201', `${sinEntrada.estado} ${JSON.stringify(sinEntrada.cuerpo)}`);
  }
  const DIA4 = '2026-09-04';
  const sinEntrada2 = await pedir('POST', '/api/registros', token, { colaboradorId: pB.id, fecha: `${DIA4}T05:00:00.000Z`, tipo: 'PERMISO' });
  if (sinEntrada2.estado === 201) {
    const ed2 = await pedir('PUT', `/api/registros/jornada/${sinEntrada2.cuerpo.id}`, token, { fecha: DIA4, entrada: '08:00', salida: '17:00', tipo: 'NORMAL' });
    const tras2 = await prisma.registro.findUniqueOrThrow({ where: { id: sinEntrada2.cuerpo.id }, select: { sedeId: true } });
    comprobar('el editor de jornada sobre una fila sin hora de entrada: queda en su sede', '200 principal',
      `${ed2.estado} ${nombreSede(tras2.sedeId)}${ed2.estado !== 200 ? ` ${JSON.stringify(ed2.cuerpo)}` : ''}`);
  }

  // ---- 7. Desactivar sedes ----
  const d1 = await pedir('DELETE', `/api/sedes/${PRINCIPAL}`, token);
  comprobar('DELETE de la principal habiendo otra: 200', '200', d1.estado);
  comprobar('quien solo tenía la principal pasa a Norte, la nueva principal', 'norte', await sedesDe(pA.id));
  comprobar('también el que pasó de híbrido a presencial', 'norte', await sedesDe(hp.id));
  comprobar('el presencial que tenía las dos se queda con Norte, sin duplicar', 'norte', await sedesDe(pD.id));
  comprobar('el híbrido sin sedes sigue sin sede', 'ninguna', await sedesDe(h.id));
  comprobar('GET /sedes: Norte es ahora la principal', 'norte', await principalSegunGet());
  const d2 = await pedir('DELETE', `/api/sedes/${norte.id}`, token);
  const norteDespues = await prisma.sede.findUniqueOrThrow({ where: { id: norte.id }, select: { activa: true } });
  comprobar('DELETE de la última sede: 400 ULTIMA_SEDE y sigue activa', '400 ULTIMA_SEDE activa', `${d2.estado} ${d2.cuerpo?.codigo} ${norteDespues.activa ? 'activa' : 'inactiva'}`);

  // ---- 8. Reingreso ----
  if (m1) {
    await prisma.colaborador.update({ where: { id: m1.id }, data: { activo: false, fechaRetiro: new Date() } });
    await prisma.colaboradorSede.deleteMany({ where: { colaboradorId: m1.id } });
    const re = await pedir('POST', `/api/colaboradores/${m1.id}/reingresar`, token);
    comprobar('reingresa un presencial que perdió su sede: vuelve con la principal', '200 norte', `${re.estado} ${await sedesDe(m1.id)}`);
  }

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
