/**
 * Verificación de la COSTURA del registro del sistema, contra MySQL de verdad.
 * 23 de septiembre de 2026.
 *
 *   npx ts-node prisma/verificar-registro-sistema.ts
 *
 * Por qué existe: la decisión —qué se agrupa, qué se audita, qué se oculta, cómo se anclan las
 * fechas— está probada en la suite, sobre funciones puras. Lo que la suite NO toca es el trozo que
 * va de un error real a una fila en la base: el enganche, el `upsert` que incrementa, el cuerpo de
 * la petición ya limpio, el `trustProxy`. Eso es lo que comprueba este script (CLAUDE.md §8.6).
 *
 * Crea sus propios eventos, comprueba lo que quedó escrito y BORRA lo que creó. No toca nada más.
 *
 * Límite que conviene tener claro: monta una app Fastify con el MISMO cableado que `index.ts`,
 * pero no es `index.ts`. Que el arranque de verdad esté bien enganchado se comprueba levantando el
 * servidor y provocando un error por HTTP, que es el otro paso de la verificación.
 */
import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { prisma } from '../src/prisma';
import { esErrorInesperado, manejarError } from '../src/utils/respuestaDeError';
import { registrarError, registrarAuditoria, registrarAccesoPorRespuesta, registrarAcceso, registrarReporteDelNavegador } from '../src/utils/registrarEvento';

const IP_DE_PRUEBA = '203.0.113.9';
const MARCA = '/api/__verificacion__';

let fallos = 0;
function comprobar(queSeEspera: string, condicion: boolean, visto?: unknown) {
  if (condicion) {
    console.log(`  OK   ${queSeEspera}`);
  } else {
    fallos++;
    console.log(`  FALLA ${queSeEspera}`);
    if (visto !== undefined) console.log(`        visto: ${JSON.stringify(visto)}`);
  }
}

async function montar() {
  const app = Fastify({ trustProxy: 'loopback', logger: false });
  await app.register(rateLimit, { global: false });
  app.setErrorHandler((error: Error & { statusCode?: number }, request, reply) => {
    if (esErrorInesperado(error)) registrarError(error, request);
    return manejarError(error, request, reply);
  });
  app.addHook('onResponse', async (request, reply) => {
    registrarAccesoPorRespuesta(request, reply);
    registrarAuditoria(request, reply);
  });

  // Una ruta que revienta como revienta una de verdad: con un error de Prisma, que es el que trae
  // la consulta y la ruta del archivo dentro del mensaje.
  app.post(`${MARCA}/revienta/:id`, async () => {
    throw new Error("Invalid `prisma.registro.create()` invocation:\n\nUnique constraint failed on the fields: (`colaboradorId`,`fecha`)");
  });
  app.post(`${MARCA}/rechaza`, async (_req, reply) => reply.status(403).send({ error: 'Requiere super administrador' }));
  // Con sesión: la auditoría necesita a quién atribuirle la acción.
  app.post(`${MARCA}/guarda`, async (request, reply) => {
    (request as { user?: unknown }).user = { id: 'u-verif', email: 'verificacion@prueba.local', nombre: 'Verificación', empresaId: null };
    return reply.status(201).send({ ok: true });
  });
  app.post('/api/worker/marcar', async (request, reply) => {
    (request as { user?: unknown }).user = { id: 'u-verif', email: 'verificacion@prueba.local', nombre: 'Kiosco', empresaId: null };
    return reply.status(201).send({ ok: true });
  });
  app.post(`${MARCA}/login-falso`, async (request, reply) => {
    registrarAcceso({ motivo: 'CREDENCIALES', email: 'noexiste@prueba.local', correoConocido: false }, request);
    return reply.status(401).send({ error: 'Credenciales inválidas' });
  });
  // Un login con límite de intentos, como el de verdad. Es el caso que se coló en la primera
  // versión: el 429 no llega nunca a la ruta, así que si el enganche global no lo registra, un
  // ataque de fuerza bruta no deja ni una fila.
  app.post(`${MARCA}/login-con-limite`, { config: { rateLimit: { max: 2, timeWindow: '1 minute' } } }, async (request, reply) => {
    registrarAcceso({ motivo: 'CREDENCIALES', email: 'bot@prueba.local', correoConocido: false }, request);
    return reply.status(401).send({ error: 'Credenciales inválidas' });
  });

  app.post(`${MARCA}/navegador`, async (request, reply) => {
    registrarReporteDelNavegador(request.body as Record<string, string>, request);
    return reply.status(204).send();
  });

  await app.ready();
  return app;
}

// Las escrituras salen sin esperar (registrar un evento no puede frenar la petición), así que hay
// que darles un momento antes de leer. Un sondeo y no un sleep a ciegas.
async function esperarA(cuantas: number, intentos = 40): Promise<number> {
  for (let i = 0; i < intentos; i++) {
    const n = await prisma.eventoSistema.count({ where: { OR: [{ ruta: { startsWith: MARCA } }, { ip: IP_DE_PRUEBA }] } });
    if (n >= cuantas) return n;
    await new Promise(r => setTimeout(r, 100));
  }
  return prisma.eventoSistema.count({ where: { OR: [{ ruta: { startsWith: MARCA } }, { ip: IP_DE_PRUEBA }] } });
}

async function main() {
  const app = await montar();
  const cabeceras = { 'x-forwarded-for': IP_DE_PRUEBA, 'user-agent': 'VerificadorHoraPro/1.0' };
  const enviar = (url: string, payload: unknown = {}) =>
    app.inject({ method: 'POST', url, payload: payload as object, headers: cabeceras });

  console.log('\n=== 1. Un error inesperado queda registrado ===');
  const r1 = await enviar(`${MARCA}/revienta/ckv123abc456def789ghi012j`);
  comprobar('al usuario le responde 500 sin el mensaje interno', r1.statusCode === 500 && !r1.body.includes('prisma.registro'), r1.body);

  console.log('\n=== 2. El mismo error dos veces es UNA fila con veces=2 ===');
  await enviar(`${MARCA}/revienta/cm4x8k2p90001abcdefghijkl`); // otro id: tiene que agruparse igual

  console.log('\n=== 3. Un rechazo por permisos, un login fallido, una acción y el kiosco ===');
  await enviar(`${MARCA}/rechaza`);
  await enviar(`${MARCA}/login-falso`);
  await enviar(`${MARCA}/guarda`, { nombre: 'Ana', password: 'LaClaveDeAna123', foto: 'data:image/jpeg;base64,' + 'A'.repeat(4000) });
  await enviar('/api/worker/marcar', { tipo: 'ENTRADA' });
  await enviar(`${MARCA}/navegador`, { mensaje: 'La cámara no respondió', rastro: 'at Marcador.tsx:88', pantalla: '/marcador/abc123def456' });

  console.log('\n=== 4. Un login aporreado hasta que el límite lo corta ===');
  const respuestas: number[] = [];
  for (let i = 0; i < 4; i++) respuestas.push((await enviar(`${MARCA}/login-con-limite`)).statusCode);
  comprobar('el límite llegó a cortar (hay al menos un 429)', respuestas.includes(429), respuestas);

  await esperarA(6);
  await new Promise(r => setTimeout(r, 600)); // margen para que llegue lo que no esperamos que llegue

  const filas = await prisma.eventoSistema.findMany({
    where: { OR: [{ ruta: { startsWith: MARCA } }, { ip: IP_DE_PRUEBA }] },
    orderBy: { primeraVez: 'asc' },
  });

  console.log(`\n=== Lo que quedó escrito: ${filas.length} filas ===`);
  for (const f of filas) {
    console.log(`  [${f.tipo}/${f.origen}] veces=${f.veces} ip=${f.ip} ${f.metodo ?? ''} ${f.ruta ?? ''}`);
    console.log(`      ${f.mensaje}`);
  }

  const error = filas.find(f => f.tipo === 'ERROR' && f.origen === 'SERVIDOR');
  const navegador = filas.find(f => f.origen === 'NAVEGADOR');
  const permiso = filas.find(f => f.tipo === 'ACCESO' && f.mensaje.includes('permiso'));
  const credenciales = filas.find(f => f.tipo === 'ACCESO' && f.mensaje.includes('Contraseña'));
  const accion = filas.find(f => f.tipo === 'AUDITORIA');
  const corte = filas.find(f => f.mensaje.includes('Demasiados intentos'));
  const aporreado = filas.filter(f => f.ruta?.includes('login-con-limite'));

  console.log('\n=== Comprobaciones ===');
  comprobar('el error quedó guardado', Boolean(error));
  comprobar('las dos ocurrencias se agruparon en una fila (veces=2)', error?.veces === 2, error?.veces);
  comprobar('guardó la ruta real, con el id, para poder reproducirlo', Boolean(error?.ruta?.includes('ckv123abc456def789ghi012j') || error?.ruta?.includes('cm4x8k2p90001abcdefghijkl')), error?.ruta);
  comprobar('el detalle conserva la consulta de Prisma', Boolean(error?.detalle?.includes('Unique constraint failed')), error?.detalle?.slice(0, 80));
  comprobar('la IP es la de quien llama y NO la del proxy (trustProxy)', error?.ip === IP_DE_PRUEBA, error?.ip);
  comprobar('guardó el navegador', Boolean(error?.navegador?.includes('VerificadorHoraPro')), error?.navegador);

  comprobar('el 403 quedó como intento de acceso', Boolean(permiso), permiso?.mensaje);
  // Se probaron DOS correos inventados distintos (noexiste@ y bot@) desde la misma IP, en dos
  // rutas distintas. Que caigan en UNA fila es lo diseñado y es la pieza que hace sostenible un
  // registro sin borrado automático: un bot con diez mil correos al azar deja una fila, no diez
  // mil. El correo concreto del último intento sigue estando en el detalle.
  comprobar('un barrido de correos inventados desde una IP cabe en UNA fila',
    filas.filter(f => f.mensaje.startsWith('Contraseña incorrecta')).length === 1,
    filas.filter(f => f.mensaje.startsWith('Contraseña incorrecta')).map(f => f.mensaje));
  comprobar('esa fila cuenta los tres intentos que llegaron a la ruta', credenciales?.veces === 3, credenciales?.veces);
  comprobar('y guarda en el detalle el correo del último intento', Boolean(credenciales?.detalle?.includes('@prueba.local')), credenciales?.detalle);

  comprobar('la acción con sesión quedó auditada', Boolean(accion), accion?.mensaje);
  comprobar('la auditoría NO agrupa: cada acción es su propia fila', accion?.huella === null, accion?.huella);
  comprobar('la contraseña NO está guardada', !accion?.detalle?.includes('LaClaveDeAna123'), accion?.detalle?.slice(0, 120));
  comprobar('la foto NO está guardada entera', !accion?.detalle?.includes('AAAAAAAAAA'), accion?.detalle?.slice(0, 120));
  comprobar('el nombre sí, que es lo que se quiere auditar', Boolean(accion?.detalle?.includes('Ana')), accion?.detalle?.slice(0, 120));

  comprobar('una marcación del kiosco NO deja fila de auditoría', !filas.some(f => f.ruta === '/api/worker/marcar'), filas.map(f => f.ruta));

  comprobar('el corte por exceso de intentos quedó registrado', Boolean(corte), filas.map(f => f.mensaje));
  comprobar('con la IP del que aporreaba', corte?.ip === IP_DE_PRUEBA, corte?.ip);
  // Cuatro intentos contra el login con límite: los dos primeros llegan a la ruta y se suman a la
  // fila de contraseña incorrecta de esa IP; los otros dos los corta el límite antes de llegar, y
  // esos son los que el enganche global registra aparte.
  comprobar('los intentos cortados se cuentan juntos y aparte de los que sí llegaron',
    corte?.veces === 2, corte?.veces);
  comprobar('en total, cuatro intentos no escriben cuatro filas', aporreado.length <= 1, aporreado.map(f => f.mensaje));

  comprobar('el error del navegador llegó', Boolean(navegador), navegador?.mensaje);
  comprobar('con la pantalla donde pasó', navegador?.ruta === '/marcador/abc123def456', navegador?.ruta);
  comprobar('y con su rastro', Boolean(navegador?.detalle?.includes('at Marcador.tsx:88')), navegador?.detalle);

  console.log('\n=== Limpieza: se borra TODO lo que creó este script ===');
  const { count } = await prisma.eventoSistema.deleteMany({
    where: { OR: [{ ruta: { startsWith: MARCA } }, { ip: IP_DE_PRUEBA }] },
  });
  console.log(`  borradas ${count} filas`);
  const quedan = await prisma.eventoSistema.count({ where: { OR: [{ ruta: { startsWith: MARCA } }, { ip: IP_DE_PRUEBA }] } });
  comprobar('no quedó nada de la prueba en la base', quedan === 0, quedan);

  await app.close();
  await prisma.$disconnect();
  console.log(fallos === 0 ? '\nTODO CORRECTO\n' : `\n${fallos} COMPROBACIONES FALLARON\n`);
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch(async e => { console.error(e); await prisma.$disconnect(); process.exit(1); });
