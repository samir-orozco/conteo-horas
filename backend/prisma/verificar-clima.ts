// Verifica la COSTURA del clima laboral contra MySQL (CLAUDE.md §8.6): lo que las pruebas unitarias
// no ven porque usan una base falsa.
//
//   npx tsx prisma/verificar-clima.ts
//
// Crea una empresa de mentira con plan ilimitado (trae el módulo), una persona y su turno abierto, y
// otra empresa SIN el módulo. Ejercita de verdad:
//   - `climaDeLaSalida`: cuándo abre la ventana y cuándo no;
//   - las rutas del kiosco con un token firmado de verdad: la carita, la observación directa y la
//     confidencial, mirando lo que quedó ESCRITO en la base;
//   - las rutas del panel: el resumen y el buzón (que no muestra la nota hasta el día siguiente);
//   - el comando del super admin: busca la nota, la revela y deja la constancia.
// Imprime el plan de las consultas del panel (§8.4). Pase lo que pase, al final borra lo que creó.
import { execFileSync } from 'child_process';
import Fastify from 'fastify';
import jwt from '@fastify/jwt';
import { prisma } from '../src/prisma';
import { climaDeLaSalida, DURACION_TOKEN_CLIMA } from '../src/utils/climaDelKiosco';
import climaDelKioscoRoutes from '../src/routes/climaDelKiosco';
import climaRoutes from '../src/routes/clima';
import { descifrar, leerClave } from '../src/utils/cifradoConfidencial';
import { rangoDiaBogota, hoyEnBogota } from '../src/utils/fechas';

const SUFIJO = `clima-${Date.now()}`;
let fallas = 0;
const marca = (ok: boolean, texto: string, detalle = '') => {
  if (!ok) fallas++;
  console.log(`  ${ok ? 'ok   ' : 'FALLA'} ${texto}${detalle ? `  (${detalle})` : ''}`);
};

let adminId = '';
async function montar(empresaIdDelAdmin: string) {
  const app = Fastify();
  await app.register(jwt, { secret: 'verificar-clima' });
  app.decorate('authenticate', async (request: { jwtVerify: () => Promise<unknown> }) => { await request.jwtVerify(); });
  app.decorate('requireEmpresa', async (request: { user?: unknown; empresaId?: string; usuarioId?: string; usuarioNombre?: string }) => {
    request.user = { rol: 'ADMIN', empresaId: empresaIdDelAdmin };
    request.empresaId = empresaIdDelAdmin;
    request.usuarioId = adminId;
    request.usuarioNombre = 'Admin Verificación';
  });
  await app.register(climaDelKioscoRoutes, { prefix: '/api/worker/clima' });
  await app.register(climaRoutes, { prefix: '/api/clima' });
  await app.ready();
  return app;
}

async function main() {
  const clave = leerClave(process.env.CLAVE_CONFIDENCIAL);
  if (!clave) throw new Error('Falta CLAVE_CONFIDENCIAL en backend/.env');
  const creadas: string[] = [];

  try {
    const con = await prisma.empresa.create({ data: { nombre: `Con clima ${SUFIJO}`, nit: `con-${SUFIJO}`, email: `con-${SUFIJO}@ejemplo.co`, exentaPago: true } });
    const sin = await prisma.empresa.create({ data: { nombre: `Sin clima ${SUFIJO}`, nit: `sin-${SUFIJO}`, email: `sin-${SUFIJO}@ejemplo.co` } });
    creadas.push(con.id, sin.id);
    await prisma.suscripcion.create({ data: { empresaId: sin.id, finPrueba: new Date(), plan: 'PROFESIONAL' } });
    const sede = await prisma.sede.create({ data: { empresaId: con.id, nombre: 'Principal' } });
    const ana = await prisma.colaborador.create({
      data: { empresaId: con.id, nombre: 'Ana', apellido: `Prueba ${SUFIJO}`, cedula: `c-${SUFIJO}`, salarioMensual: 1300000 },
    });
    const beto = await prisma.colaborador.create({
      data: { empresaId: sin.id, nombre: 'Beto', apellido: 'Prueba', cedula: `b-${SUFIJO}`, salarioMensual: 1300000 },
    });
    const { inicioDia } = rangoDiaBogota(new Date());
    // El turno que Ana acaba de cerrar en el kiosco: es contra quién cuenta «respondieron».
    const turnoAna = await prisma.registro.create({ data: { colaboradorId: ana.id, sedeId: sede.id, fecha: inicioDia, entrada: new Date(Date.now() - 8 * 3600e3), salida: new Date(), metodoSalida: 'CEDULA' } });
    // Dos personas que cerraron hoy SIN pasar por la ventana: una por el cierre automático y otra cargada a
    // mano. No pueden contar en «respondieron».
    const sinVentana = [];
    for (const [n, extra] of [['Auto', { salidaEstimada: true }], ['Manual', { metodoSalida: 'MANUAL' as const }]] as const) {
      const c = await prisma.colaborador.create({ data: { empresaId: con.id, nombre: n, apellido: SUFIJO, cedula: `${n}-${SUFIJO}`, salarioMensual: 1300000 } });
      await prisma.registro.create({ data: { colaboradorId: c.id, fecha: inicioDia, entrada: new Date(Date.now() - 8 * 3600e3), salida: new Date(), ...extra } });
      sinVentana.push(c);
    }
    // Carla responde poco: tres caritas malas en tres meses, sin ningún buen día. Su racha es de 3.
    const carla = await prisma.colaborador.create({ data: { empresaId: con.id, nombre: 'Carla', apellido: SUFIJO, cedula: `carla-${SUFIJO}`, salarioMensual: 1300000 } });
    for (const diasAtras of [90, 50, 1]) {
      await prisma.calificacionClima.create({ data: { empresaId: con.id, colaboradorId: carla.id, fecha: new Date(inicioDia.getTime() - diasAtras * 864e5), carita: 1, motivos: ['Compañeros'] } });
    }

    adminId = (await prisma.usuario.create({ data: { empresaId: con.id, email: `admin-${SUFIJO}@ejemplo.co`, password: 'x', nombre: 'Admin Verificación', rol: 'ADMIN' } })).id;
    const app = await montar(con.id);
    const firmar = (t: object) => app.jwt.sign(t, { expiresIn: DURACION_TOKEN_CLIMA });

    console.log('\n  La ventana al marcar la salida');
    const ventana = await climaDeLaSalida({ colaboradorId: ana.id, empresaId: con.id, registroId: turnoAna.id, fechaJornada: inicioDia, pausa: false }, firmar);
    marca(!!ventana, 'con el módulo y sin calificar hoy, abre la ventana');
    marca(JSON.stringify(ventana?.motivos) === JSON.stringify(['Mucho trabajo', 'Jefe o supervisor', 'Compañeros', 'Me tocó quedarme más tiempo', 'Algo personal']),
      'con los cinco motivos predeterminados');
    const enPausa = await climaDeLaSalida({ colaboradorId: ana.id, empresaId: con.id, registroId: turnoAna.id, fechaJornada: inicioDia, pausa: true }, firmar);
    marca(enPausa === null, 'al salir a una pausa no abre');
    const sinModulo = await climaDeLaSalida({ colaboradorId: beto.id, empresaId: sin.id, registroId: 'x', fechaJornada: inicioDia, pausa: false }, firmar);
    marca(sinModulo === null, 'una empresa de plan Profesional no la ve');
    // Turno partido: Ana ya cerró una jornada hoy en el kiosco y OMITIÓ la ventana (no calificó). La
    // segunda salida del día no vuelve a preguntar.
    const segundoTurno = await prisma.registro.create({ data: { colaboradorId: ana.id, fecha: inicioDia, entrada: new Date(), salida: new Date(), metodoSalida: 'CEDULA' } });
    const segunda = await climaDeLaSalida({ colaboradorId: ana.id, empresaId: con.id, registroId: segundoTurno.id, fechaJornada: inicioDia, pausa: false }, firmar);
    marca(segunda === null, 'turno partido: la segunda salida no pregunta aunque la primera se omitiera');
    await prisma.registro.delete({ where: { id: segundoTurno.id } });
    const payload = app.jwt.decode(ventana!.token) as { rol: string; id: string; fecha: string; exp: number; iat: number };
    marca(payload.rol === 'CLIMA' && payload.id === ana.id && payload.fecha === inicioDia.toISOString(), 'el token dice de quién y de qué jornada');
    marca(payload.exp - payload.iat === 900, 'y dura 15 minutos', `${payload.exp - payload.iat} s`);

    const auth = { authorization: `Bearer ${ventana!.token}` };
    console.log('\n  La carita, de verdad en la base');
    let r = await app.inject({ method: 'PUT', url: '/api/worker/clima', headers: auth, payload: { carita: 2, motivos: ['Compañeros'] } });
    marca(r.statusCode === 200, 'PUT de la carita', `${r.statusCode}`);
    r = await app.inject({ method: 'PUT', url: '/api/worker/clima', headers: auth, payload: { carita: 1, motivos: ['Compañeros', 'Otro'] } });
    const filas = await prisma.calificacionClima.findMany({ where: { colaboradorId: ana.id } });
    marca(JSON.stringify(filas[0]?.motivos) === JSON.stringify(['Compañeros']), '«Otro» no queda guardado con la carita', JSON.stringify(filas[0]?.motivos));
    marca(filas.length === 1 && filas[0].carita === 1, 'un segundo toque actualiza la misma fila, no crea otra', `${filas.length} fila(s), carita ${filas[0]?.carita}`);
    marca(filas[0]?.fecha.getTime() === inicioDia.getTime(), 'en el día de la jornada');
    const otraVez = await climaDeLaSalida({ colaboradorId: ana.id, empresaId: con.id, fechaJornada: inicioDia, pausa: false }, firmar);
    marca(otraVez === null, 'ya calificó hoy: un turno partido no vuelve a preguntar');

    console.log('\n  Las observaciones');
    r = await app.inject({ method: 'POST', url: '/api/worker/clima/observacion', headers: auth, payload: { texto: 'Faltó gente en el cierre', confidencial: false } });
    const directa = await prisma.calificacionClima.findFirst({ where: { colaboradorId: ana.id } });
    marca(r.statusCode === 200 && directa?.observacion === 'Faltó gente en el cierre', 'la directa queda en la calificación, con nombre');
    const texto = `El microondas ${SUFIJO}`;
    r = await app.inject({ method: 'POST', url: '/api/worker/clima/observacion', headers: auth, payload: { texto, confidencial: true } });
    marca(r.statusCode === 200, 'la confidencial se guarda', `${r.statusCode}`);
    const [cruda] = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      'SELECT * FROM observaciones_confidenciales WHERE empresaId = ?', con.id);
    marca(!!cruda, 'hay una fila en observaciones_confidenciales');
    marca(Object.keys(cruda ?? {}).sort().join(',') === 'autorCifrado,empresaId,id,semana,texto,visibleDesde',
      'la fila no tiene ni persona ni hora de creación', Object.keys(cruda ?? {}).sort().join(','));
    marca(!JSON.stringify(cruda).includes(ana.id), 'el id de la persona no aparece en claro en ninguna columna');
    marca(descifrar(String(cruda?.autorCifrado), clave) === ana.id, 'el autor cifrado se descifra con la clave del .env');
    marca(/^[0-9a-f-]{36}$/.test(String(cruda?.id)), 'el id es un uuid al azar, no un cuid con la hora', String(cruda?.id));
    const vis = cruda?.visibleDesde as Date;
    marca(vis.getTime() === rangoDiaBogota(new Date()).finDia.getTime(), 'se ve desde la medianoche siguiente de Bogotá', vis.toISOString());
    r = await app.inject({ method: 'POST', url: '/api/worker/clima/observacion', headers: auth, payload: { texto: 'otra', confidencial: true } });
    marca(r.statusCode === 409, 'una segunda confidencial con la misma salida se rechaza', `${r.statusCode}`);

    console.log('\n  El panel');
    // Ana tuvo turno partido: dos salidas del kiosco el mismo día son UNA jornada para «respondieron».
    await prisma.registro.create({ data: { colaboradorId: ana.id, fecha: inicioDia, entrada: new Date(), salida: new Date(), metodoSalida: 'CEDULA' } });
    const hoy = hoyEnBogota();
    r = await app.inject({ method: 'GET', url: `/api/clima/resumen?desde=${hoy}&hasta=${hoy}` });
    const res = r.json();
    marca(r.statusCode === 200 && res.total === 1 && res.promedio === 1 && res.jornadas === 1 && res.personas === 1,
      'el resumen cuenta la calificación de hoy, contra la única jornada que abrió la ventana', `total ${res.total}, promedio ${res.promedio}, jornadas ${res.jornadas}`);
    marca(res.recientes?.[0]?.nombre === `Ana Prueba ${SUFIJO}` && res.recientes?.[0]?.observacion === 'Faltó gente en el cierre',
      'las recientes van con nombre y la observación directa');
    marca(!JSON.stringify(res).includes('microondas'), 'la confidencial NO aparece en el resumen');
    const enAtencion = (res.atencion ?? []).find((a: { nombre: string }) => a.nombre === `Carla ${SUFIJO}`);
    marca(enAtencion?.dias === 3, 'quien responde poco igual sale en «Necesitan atención», con su racha completa', `${enAtencion?.dias ?? 'no sale'} días`);
    marca(!JSON.stringify(res.recientes).includes('"Otro"'), 'y «Otro» no sale en las calificaciones recientes');
    r = await app.inject({ method: 'GET', url: `/api/clima/persona/${ana.id}` });
    const historial = r.json();
    marca(r.statusCode === 200 && historial.respuestas?.length === 1 && historial.respuestas[0].observacion === 'Faltó gente en el cierre',
      'el historial de Ana trae su respuesta con la observación directa');
    marca(!JSON.stringify(historial).includes('microondas'), 'y no trae la confidencial');
    r = await app.inject({ method: 'GET', url: `/api/clima/persona/${beto.id}` });
    marca(r.statusCode === 404, 'la persona de otra empresa no existe para este panel', `${r.statusCode}`);
    r = await app.inject({ method: 'GET', url: '/api/clima/buzon' });
    marca(r.statusCode === 200 && r.json().semanas.length === 0, 'el buzón no la muestra el mismo día');
    await prisma.observacionConfidencial.updateMany({ where: { empresaId: con.id }, data: { visibleDesde: new Date(Date.now() - 1000) } });
    r = await app.inject({ method: 'GET', url: '/api/clima/buzon' });
    const buzon = r.json();
    marca(buzon.semanas?.[0]?.notas?.[0] === texto, 'al día siguiente sí, solo el texto');
    marca(!JSON.stringify(buzon).includes(String(cruda?.id)), 'sin el id de la nota');
    console.log('\n  El seguimiento de los casos');
    const casoCarla = await prisma.seguimientoClima.findMany({ where: { colaboradorId: carla.id } });
    marca(casoCarla.length === 1 && casoCarla[0].estado === 'SIN_REVISAR', 'leer el resumen le abrió un caso a Carla, sin revisar');
    const enLaLista = (res.atencion ?? []).find((a: { colaboradorId: string }) => a.colaboradorId === carla.id);
    marca(enLaLista?.seguimiento?.id === casoCarla[0]?.id, 'y la lista de atención lo muestra con su caso');
    await app.inject({ method: 'GET', url: `/api/clima/resumen?desde=${hoy}&hasta=${hoy}` });
    marca((await prisma.seguimientoClima.count({ where: { colaboradorId: carla.id } })) === 1, 'leer otra vez no abre un segundo caso');
    const idCaso = casoCarla[0].id;
    r = await app.inject({ method: 'PATCH', url: `/api/clima/seguimientos/${idCaso}`, payload: { estado: 'EN_SEGUIMIENTO', responsableId: adminId } });
    marca(r.statusCode === 200 && r.json().estado === 'EN_SEGUIMIENTO' && r.json().responsableId === adminId, 'pasa a «En seguimiento» con responsable');
    r = await app.inject({ method: 'POST', url: `/api/clima/seguimientos/${idCaso}/comentarios`, payload: { texto: 'Hablé con Carla' } });
    const idComentario = r.json().id;
    marca(r.statusCode === 201 && r.json().autorNombre === 'Admin Verificación', 'el comentario queda con quien lo escribió');
    r = await app.inject({ method: 'PUT', url: `/api/clima/seguimientos/${idCaso}/comentarios/${idComentario}`, payload: { texto: 'Hablé con Carla y su jefe' } });
    marca(r.statusCode === 200 && r.json().editadoEn !== null, 'se puede editar, y queda la marca de cuándo');
    r = await app.inject({ method: 'GET', url: '/api/clima/seguimientos' });
    const listado = r.json().casos.find((c: { id: string }) => c.id === idCaso);
    marca(listado?.estado === 'EN_SEGUIMIENTO' && listado?.responsable === 'Admin Verificación' && listado?.comentarios === 1
      && listado?.ultimoComentario?.texto === 'Hablé con Carla y su jefe', 'la pestaña «Seguimiento» lo lista con su estado, responsable y último comentario');
    r = await app.inject({ method: 'GET', url: `/api/clima/persona/${carla.id}` });
    marca(r.json().seguimiento?.comentarios?.[0]?.texto === 'Hablé con Carla y su jefe', 'el panel de «Revisar» trae el caso con sus comentarios');
    r = await app.inject({ method: 'PATCH', url: `/api/clima/seguimientos/${idCaso}`, payload: { estado: 'CERRADO' } });
    marca(r.json().cerradoEn !== null, 'al cerrarlo queda cuándo');
    await app.inject({ method: 'GET', url: '/api/clima/seguimientos' });
    marca((await prisma.seguimientoClima.count({ where: { colaboradorId: carla.id } })) === 1, 'cerrar el caso de una racha que sigue no lo reabre');
    // Carla tiene un buen día y después otra racha: se abre un caso nuevo.
    for (const [d, carita] of [[40, 5], [30, 1], [20, 2], [10, 1]] as const) {
      await prisma.calificacionClima.upsert({
        where: { colaboradorId_fecha: { colaboradorId: carla.id, fecha: new Date(inicioDia.getTime() - d * 864e5) } },
        create: { empresaId: con.id, colaboradorId: carla.id, fecha: new Date(inicioDia.getTime() - d * 864e5), carita, motivos: [] },
        update: { carita },
      });
    }
    await prisma.calificacionClima.deleteMany({ where: { colaboradorId: carla.id, fecha: { gt: new Date(inicioDia.getTime() - 5 * 864e5) } } });
    await app.inject({ method: 'GET', url: '/api/clima/seguimientos' });
    const deCarla = await prisma.seguimientoClima.findMany({ where: { colaboradorId: carla.id }, orderBy: { abiertoEn: 'asc' } });
    marca(deCarla.length === 2 && deCarla[1].estado === 'SIN_REVISAR', 'una racha NUEVA después del cierre abre otro caso', `${deCarla.length} caso(s)`);
    r = await app.inject({ method: 'DELETE', url: `/api/clima/seguimientos/${idCaso}/comentarios/${idComentario}` });
    marca(r.statusCode === 200 && (await prisma.comentarioSeguimientoClima.count({ where: { seguimientoId: idCaso } })) === 0, 'el comentario se puede borrar');
    r = await app.inject({ method: 'PATCH', url: `/api/clima/seguimientos/${idCaso}`, payload: { responsableId: 'usuario-de-otra-empresa' } });
    marca(r.statusCode === 400, 'un responsable que no es de la empresa se rechaza');

    r = await app.inject({ method: 'PUT', url: '/api/clima/motivos', payload: { motivos: ['Clientes difíciles', 'Turno largo'] } });
    const cfg = await prisma.configuracion.findUnique({ where: { empresaId_clave: { empresaId: con.id, clave: 'climaMotivos' } } });
    marca(r.statusCode === 200 && cfg?.valor === JSON.stringify(['Clientes difíciles', 'Turno largo']), 'los motivos se guardan en la configuración de la empresa');
    await app.close();

    console.log('\n  El comando del super admin (como se corre en el servidor)');
    const correr = (args: string[]) => execFileSync('npx', ['ts-node', '--transpile-only', 'src/scripts/revelar-autor-confidencial.ts', ...args], { encoding: 'utf8' });
    const busqueda = correr(['buscar', '--nit', `con-${SUFIJO}`, '--texto', 'microondas']);
    marca(busqueda.includes(String(cruda?.id)) && !busqueda.includes('Ana'), 'buscar da el id de la nota y no revela a nadie');
    let rechazo = '';
    try { correr(['revelar', '--nota', String(cruda?.id), '--motivo', 'porque sí', '--quien', 'Verificación']); } catch (e) { rechazo = String((e as { stderr?: string }).stderr ?? e); }
    marca(rechazo.includes('mínimo'), 'sin un motivo de verdad no revela');
    const motivo = `Verificación automática ${SUFIJO}`;
    const revelado = correr(['revelar', '--nota', String(cruda?.id), '--motivo', motivo, '--quien', 'Verificación']);
    marca(revelado.includes(`Ana Prueba ${SUFIJO}`) && revelado.includes(`c-${SUFIJO}`), 'revelar da el nombre y la cédula');
    const constancia = await prisma.eventoSistema.findFirst({ where: { empresaId: con.id, tipo: 'AUDITORIA' } });
    marca(!!constancia && constancia.detalle!.includes(motivo) && constancia.usuarioNombre === 'Verificación', 'y deja la constancia con el motivo y quién lo corrió');

    console.log('\n  El plan de las consultas del panel (§8.4)');
    for (const [nombre, sql] of [
      ['calificaciones de una empresa en un rango', `EXPLAIN FORMAT=TREE SELECT colaboradorId, fecha, carita FROM calificaciones_clima WHERE empresaId = '${con.id}' AND fecha >= '2026-09-01' AND fecha < '2026-11-01'`],
      ['buzón de una empresa', `EXPLAIN FORMAT=TREE SELECT id, semana, texto FROM observaciones_confidenciales WHERE empresaId = '${con.id}' AND visibleDesde <= NOW(3) AND semana >= '2026-07-01'`],
      ['¿ya calificó hoy?', `EXPLAIN FORMAT=TREE SELECT id FROM calificaciones_clima WHERE colaboradorId = '${ana.id}' AND fecha >= '2026-10-04' AND fecha < '2026-10-05'`],
    ] as const) {
      const [fila] = await prisma.$queryRawUnsafe<Record<string, string>[]>(sql);
      console.log(`    ${nombre}:\n      ${Object.values(fila)[0].split('\n').join('\n      ')}`);
    }
  } finally {
    // La constancia de auditoría también es de esta verificación: se borra con lo demás.
    await prisma.eventoSistema.deleteMany({ where: { empresaId: { in: creadas } } });
    for (const id of creadas) {
      const { borrarEmpresaEnCascada } = await import('../src/utils/borrarEmpresaEnCascada');
      await prisma.$transaction(tx => borrarEmpresaEnCascada(tx, id));
    }
    const sobras = await prisma.empresa.count({ where: { id: { in: creadas } } });
    console.log(`\n${fallas === 0 ? 'TODO EN VERDE.' : `${fallas} FALLA(S).`} Limpieza: ${sobras === 0 ? 'sin sobras' : `${sobras} empresa(s) sin borrar`}.`);
    await prisma.$disconnect();
    if (fallas > 0 || sobras > 0) process.exitCode = 1;
  }
}

main().catch(e => { console.error('FALLÓ:', e); process.exitCode = 1; });
