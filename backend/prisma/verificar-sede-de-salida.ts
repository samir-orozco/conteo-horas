// Verifica la COSTURA de la sede de salida en las rutas, que las pruebas de
// `sedesDeLaJornada` y `salidasTrasEditar` no cubren: que el detalle mande
// las sedes de la JORNADA, que editar a mano mueva o borre la sede de salida, y
// que el kiosco la escriba siempre, null incluido. Es lo que pide CLAUDE.md §8.6.
//
//   npx tsx prisma/verificar-sede-de-salida.ts
//
// NO necesita el backend corriendo. Arma un Fastify en este mismo proceso con las
// rutas de verdad (registros y worker) y les pega con `inject`, así que no arranca
// las tareas diarias de `index.ts` ni ocupa un puerto. Lo que NO verifica, por lo
// mismo, es el cableado de `index.ts`: los dos decoradores de autenticación de
// aquí son una copia mínima, que valida el token y pone la empresa en la petición
// sin revisar la suscripción.
//
// Crea una empresa de prueba con dos sedes y tres colaboradores, comprueba lo que
// quedó escrito en la base, y BORRA todo lo que creó.
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import jwt from '@fastify/jwt';
import { prisma } from '../src/prisma';
import registroRoutes from '../src/routes/registros';
import workerRoutes from '../src/routes/worker';

const SUFIJO = `sedesal-${Date.now()}`;
const POBLADO = { lat: 6.2087, lng: -75.5674, radio: 150 };
const LAURELES = { lat: 6.2447, lng: -75.5916, radio: 150 };
const EN_POBLADO = { lat: 6.2087, lng: -75.5674 };
const EN_LAURELES = { lat: 6.2447, lng: -75.5916 };
const LEJOS = { lat: 6.33, lng: -75.5 }; // a más de diez kilómetros de las dos

// Un día pasado y fijo para las ediciones, lejos del kiosco de hoy.
const DIA = '2026-09-01';
const hora = (hhmm: string) => new Date(`${DIA}T${hhmm}:00.000-05:00`);

type Caso = { nombre: string; espera: string; ok: boolean; obtenido: string };
const casos: Caso[] = [];
function comprobar(nombre: string, espera: string, obtenido: string) {
  casos.push({ nombre, espera, obtenido, ok: espera === obtenido });
}

type Sesion = { id: string; empresaId: string; nombre: string };
type SedeCorta = { nombre: string } | null;

async function main() {
  const app = Fastify();
  await app.register(jwt, { secret: `verificacion-${SUFIJO}` });
  app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try { await request.jwtVerify(); } catch { reply.status(401).send({ error: 'No autorizado' }); }
  });
  app.decorate('requireEmpresa', async (request: FastifyRequest, reply: FastifyReply) => {
    try { await request.jwtVerify(); } catch { return reply.status(401).send({ error: 'No autorizado' }); }
    const u = request.user as Sesion;
    Object.assign(request, { empresaId: u.empresaId, usuarioId: u.id, usuarioNombre: u.nombre });
  });
  await app.register(registroRoutes, { prefix: '/api/registros' });
  await app.register(workerRoutes, { prefix: '/api/worker' });
  await app.ready();

  const pedir = async (method: 'GET' | 'PUT' | 'POST', url: string, token: string | null, payload?: object) => {
    const r = await app.inject({
      method, url, payload,
      headers: token ? { authorization: `Bearer ${token}` } : {},
    });
    return { estado: r.statusCode, cuerpo: r.json() as Record<string, unknown> };
  };

  const empresa = await prisma.empresa.create({
    data: { nombre: `Prueba ${SUFIJO}`, nit: SUFIJO, email: `${SUFIJO}@prueba.local`, marcadorToken: SUFIJO, activa: true },
    select: { id: true, marcadorToken: true },
  });
  const sedeA = await prisma.sede.create({ data: { empresaId: empresa.id, nombre: 'El Poblado', ...POBLADO, activa: true }, select: { id: true } });
  const sedeB = await prisma.sede.create({ data: { empresaId: empresa.id, nombre: 'Laureles', ...LAURELES, activa: true }, select: { id: true } });
  const nombre = (id: string | null | undefined) => (id === sedeA.id ? 'Poblado' : id === sedeB.id ? 'Laureles' : 'sin sede');
  const admin = app.jwt.sign({ id: `admin-${SUFIJO}`, email: `${SUFIJO}@prueba.local`, rol: 'ADMIN', nombre: 'Verificación', empresaId: empresa.id });

  const crear = async (etiqueta: string, modalidad: 'PRESENCIAL' | 'HIBRIDO', permiso: boolean) => {
    const c = await prisma.colaborador.create({
      data: {
        empresaId: empresa.id, nombre: etiqueta, apellido: 'Prueba', cedula: `${SUFIJO}-${etiqueta}`,
        salarioMensual: 1_500_000, modalidad, puedeCerrarEnOtraSede: permiso,
      },
      select: { id: true, cedula: true },
    });
    await prisma.colaboradorSede.createMany({ data: [{ colaboradorId: c.id, sedeId: sedeA.id }, { colaboradorId: c.id, sedeId: sedeB.id }] });
    return c;
  };

  // ---- El detalle: las sedes de la JORNADA, no las de la marcación suelta ----
  // Entró en Poblado, salió a almorzar en Laureles, volvió en Laureles y cerró en Poblado.
  const sup = await crear('Supervisor', 'PRESENCIAL', true);
  const fecha = new Date(`${DIA}T05:00:00.000Z`);
  const A = await prisma.registro.create({
    data: { colaboradorId: sup.id, fecha, entrada: hora('08:00'), salida: hora('12:00'), salidaAlmuerzo: true, sedeId: sedeA.id, sedeSalidaId: sedeB.id },
    select: { id: true },
  });
  const B = await prisma.registro.create({
    data: { colaboradorId: sup.id, fecha, entrada: hora('13:00'), salida: hora('17:00'), sedeId: sedeB.id, sedeSalidaId: sedeA.id },
    select: { id: true },
  });
  const sedesDe = (c: Record<string, unknown>) => {
    const s = c.sedes as { abrio: SedeCorta; cerro: SedeCorta } | undefined;
    return s ? `${s.abrio?.nombre ?? 'nada'} -> ${s.cerro?.nombre ?? 'nada'}` : 'no vino';
  };
  const d1 = await pedir('GET', `/api/registros/${A.id}/jornada`, admin);
  comprobar('detalle desde la primera marcación: abrió y cerró en Poblado', '200 El Poblado -> El Poblado', `${d1.estado} ${sedesDe(d1.cuerpo)}`);
  const d2 = await pedir('GET', `/api/registros/${B.id}/jornada`, admin);
  comprobar('detalle desde el regreso: la misma jornada', '200 El Poblado -> El Poblado', `${d2.estado} ${sedesDe(d2.cuerpo)}`);

  const sedeSalidaDe = async (id: string) =>
    nombre((await prisma.registro.findUnique({ where: { id }, select: { sedeSalidaId: true } }))?.sedeSalidaId);

  // ---- Editar la jornada: quitar el descanso ----
  const e1 = await pedir('PUT', `/api/registros/jornada/${A.id}`, admin, { fecha: DIA, entrada: '08:00', salida: '17:00', tipo: 'NORMAL' });
  comprobar('quitar el descanso: la ruta acepta', '200', `${e1.estado}`);
  comprobar('quitar el descanso: la que queda cierra donde se cerró de verdad', 'Poblado', await sedeSalidaDe(A.id));
  comprobar('quitar el descanso: el regreso se borró', '0', `${await prisma.registro.count({ where: { id: B.id } })}`);

  // ---- Editar la jornada: poner el descanso ----
  const e2 = await pedir('PUT', `/api/registros/jornada/${A.id}`, admin,
    { fecha: DIA, entrada: '08:00', almuerzo: { salida: '12:00', regreso: '13:00' }, salida: '17:00', tipo: 'NORMAL' });
  comprobar('poner el descanso: la ruta acepta', '200', `${e2.estado}`);
  comprobar('poner el descanso: la salida al descanso no se sabe dónde fue', 'sin sede', await sedeSalidaDe(A.id));
  const nueva = await prisma.registro.findFirst({ where: { colaboradorId: sup.id, entrada: hora('13:00') }, select: { id: true, sedeSalidaId: true } });
  comprobar('poner el descanso: la salida del día pasa con su sede a la marcación nueva', 'Poblado', nombre(nueva?.sedeSalidaId));

  // ---- Reabrir con PUT /:id ----
  // Una marcación propia, cerrada en Laureles y en otro día, para que el caso no
  // dependa de lo que dejaron los pasos de arriba. La primera versión reabría la
  // marcación nueva, que con las rutas viejas ya nacía sin sede: pasaba igual.
  const C = await prisma.registro.create({
    data: {
      colaboradorId: sup.id, fecha: new Date('2026-09-02T05:00:00.000Z'),
      entrada: new Date('2026-09-02T08:00:00.000-05:00'), salida: new Date('2026-09-02T17:00:00.000-05:00'),
      sedeId: sedeA.id, sedeSalidaId: sedeB.id,
    },
    select: { id: true },
  });
  const e3 = await pedir('PUT', `/api/registros/${C.id}`, admin, { salida: null });
  comprobar('reabrir: la ruta acepta', '200', `${e3.estado}`);
  comprobar('reabrir: sin salida no queda sede de salida', 'sin sede', await sedeSalidaDe(C.id));

  // ---- Kiosco ----
  const login = async (cedula: string) => {
    const r = await pedir('POST', '/api/worker/login', null, { marcadorToken: empresa.marcadorToken, cedula });
    if (r.estado !== 200) throw new Error(`login falló para ${cedula}: ${r.estado} ${JSON.stringify(r.cuerpo)}`);
    return r.cuerpo.token as string;
  };
  const marcar = async (token: string, coords: { lat: number; lng: number }) => {
    const r = await pedir('POST', '/api/worker/marcar', token, coords);
    return `${r.estado} ${r.cuerpo.accion ?? r.cuerpo.codigo ?? ''}`.trim();
  };
  const abiertoDe = (colaboradorId: string) =>
    prisma.registro.findFirst({ where: { colaboradorId }, orderBy: { creadoEn: 'desc' }, select: { id: true, sedeSalidaId: true } });

  // Con sede identificada se sigue escribiendo, como antes.
  const hib1 = await crear('Hibrido1', 'HIBRIDO', false);
  const t1 = await login(hib1.cedula);
  comprobar('kiosco: entra en Poblado', '200 ENTRADA', await marcar(t1, EN_POBLADO));
  comprobar('kiosco: sale en Laureles', '200 SALIDA', await marcar(t1, EN_LAURELES));
  comprobar('kiosco: con sede identificada la escribe', 'Laureles', nombre((await abiertoDe(hib1.id))?.sedeSalidaId));

  // Un turno que arrastra la sede de una salida anterior (lo que dejaba reabrirlo
  // antes de este arreglo) y se cierra desde lejos: tiene que quedar sin sede.
  const hib2 = await crear('Hibrido2', 'HIBRIDO', false);
  const t2 = await login(hib2.cedula);
  comprobar('kiosco: entra en Poblado', '200 ENTRADA', await marcar(t2, EN_POBLADO));
  const abierto = await abiertoDe(hib2.id);
  if (abierto) await prisma.registro.update({ where: { id: abierto.id }, data: { sedeSalidaId: sedeB.id } });
  comprobar('kiosco: sale desde lejos', '200 SALIDA', await marcar(t2, LEJOS));
  comprobar('kiosco: sin sede identificada escribe null, no deja la vieja', 'sin sede', nombre((await abiertoDe(hib2.id))?.sedeSalidaId));

  await app.close();
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
    // Limpieza: se borra todo lo creado, pase lo que pase.
    const empresa = await prisma.empresa.findFirst({ where: { marcadorToken: SUFIJO }, select: { id: true } });
    if (empresa) {
      const cols = await prisma.colaborador.findMany({ where: { empresaId: empresa.id }, select: { id: true } });
      const ids = cols.map(c => c.id);
      await prisma.registro.deleteMany({ where: { colaboradorId: { in: ids } } });
      await prisma.diaEsperado.deleteMany({ where: { colaboradorId: { in: ids } } });
      await prisma.colaboradorSede.deleteMany({ where: { colaboradorId: { in: ids } } });
      await prisma.colaborador.deleteMany({ where: { id: { in: ids } } });
      await prisma.sede.deleteMany({ where: { empresaId: empresa.id } });
      await prisma.notificacion.deleteMany({ where: { empresaId: empresa.id } });
      await prisma.empresa.delete({ where: { id: empresa.id } });
      console.log('Limpieza: borrada la empresa de prueba y todo lo suyo.');
    }
    await prisma.$disconnect();
    process.exit(salida);
  });
