import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import { prisma } from './prisma';

import authRoutes from './routes/auth';
import colaboradorRoutes from './routes/colaboradores';
import registroRoutes from './routes/registros';
import permisoRoutes from './routes/permisos';
import contratoRoutes from './routes/contratos';
import festivoRoutes from './routes/festivos';
import configuracionRoutes from './routes/configuracion';
import reporteRoutes from './routes/reportes';
import workerRoutes from './routes/worker';
import registroFacialRoutes from './routes/registroFacial';
import adminRoutes from './routes/admin';
import afiliadoAdminRoutes from './routes/afiliados';
import afiliadoPanelRoutes from './routes/afiliado-panel';
import wompiRoutes from './routes/wompi';
import suscripcionRoutes from './routes/suscripcion';
import horarioRoutes from './routes/horarios';
import sedeRoutes from './routes/sedes';
import plantillaTurnoRoutes from './routes/plantillasTurno';
import turnoRoutes from './routes/turnos';
import dashboardRoutes from './routes/dashboard';
import telegramRoutes from './routes/telegram';
import notificacionRoutes from './routes/notificaciones';
import { configurarWebhook } from './utils/telegram';
import { cerrarTurnosOlvidados } from './utils/cierreTurnos';
import { avisarContratosDeTodas } from './routes/contratos';
import { avisarPausasSinRegreso } from './utils/cierreAlmuerzo';
import { mantenerVentana } from './utils/materializarDias';
import { programarDiario } from './utils/programarDiario';
import { avisarSuscripcionesDeTodas } from './utils/avisosDeSuscripcion';
import { opcionesDeLog } from './utils/opcionesDeLog';
import { decidirAccesoEmpresa } from './utils/accesoEmpresa';
import { esErrorInesperado, manejarError } from './utils/respuestaDeError';
import { registrarError, registrarAuditoria, registrarAccesoPorRespuesta } from './utils/registrarEvento';
import eventoRoutes, { eventosAdminRoutes } from './routes/eventos';

// Reexportado por compatibilidad: media base de código hace `import { prisma }
// from '../index'`. El cliente ahora vive en `./prisma` (ver el porqué allí).
export { prisma };

export type JwtPayload = {
  id: string;
  email?: string;
  rol: 'SUPER_ADMIN' | 'ADMIN' | 'SUPERVISOR' | 'WORKER' | 'AFILIADO';
  nombre: string;
  empresaId: string | null;
  afiliadoId?: string | null;
};

const esProduccion = process.env.NODE_ENV === 'production';

// En producción los secretos NO pueden venir de valores por defecto del código
if (esProduccion && !process.env.JWT_SECRET) {
  console.error('FALTA JWT_SECRET: define un secreto largo y aleatorio en las variables de entorno.');
  process.exit(1);
}

// bodyLimit amplio: los comprobantes de pago viajan como imagen base64
// rewriteUrl: compatibilidad con hosting compartido (cPanel/Passenger) — si la
// app se monta en <dominio>/api, algunas configuraciones entregan la URL sin el
// prefijo. Todas nuestras rutas viven bajo /api, así que lo reponemos si falta.
const app = Fastify({
  // La IP que se ve en el registro del sistema es la de quien de verdad llama, y no la del propio
  // servidor (23 de septiembre de 2026). En este hosting la app Node corre detrás del proxy de
  // cPanel, que la alcanza desde 127.0.0.1: sin esta opción, `request.ip` devuelve esa dirección
  // para TODO el mundo y la columna de IP del módulo de accesos no valdría nada.
  //
  // 'loopback' y no `true`: solo se confía en la cabecera `X-Forwarded-For` cuando la conexión
  // viene del propio equipo, que es el único caso en que la puso el proxy. Con `true`, cualquiera
  // desde fuera podría mandar la cabecera y escribir la IP que quisiera en el registro, que es
  // justo lo contrario de lo que se quiere de un registro de intentos de acceso.
  //
  // PENDIENTE DE COMPROBAR EN PRODUCCIÓN: falta ver que el proxy mande de verdad esa cabecera. Si
  // no la manda, la IP seguirá siendo 127.0.0.1 y el registro lo dirá sin quejarse de nada. Se
  // comprueba con un intento de login fallido desde fuera y leyendo la fila que quedó.
  trustProxy: 'loopback',
  // Con LOG_FILE escribe a ese archivo y calla el registro de cada petición; sin ella, a consola
  // como siempre. Ver utils/opcionesDeLog.ts: cPanel descarta lo que la app imprime a stdout, así
  // que en producción sin esta variable no queda rastro de nada.
  ...opcionesDeLog(process.env.LOG_FILE),
  bodyLimit: 10 * 1024 * 1024,
  rewriteUrl(req) {
    const url = req.url ?? '/';
    return url.startsWith('/api') ? url : '/api' + url;
  },
});

// CORS: en producción se restringe al dominio del frontend (FRONTEND_ORIGIN,
// ej. https://horapro.co). Sin la variable, queda abierto (solo desarrollo).
// @fastify/cors v9+ solo permite GET/HEAD/POST por defecto: hay que declarar el resto
app.register(cors, {
  origin: process.env.FRONTEND_ORIGIN ? process.env.FRONTEND_ORIGIN.split(',') : true,
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],
});
app.register(jwt, { secret: process.env.JWT_SECRET || 'conteo_horas_secret_2024' });

// Límite de intentos contra fuerza bruta. Global generoso; los endpoints
// sensibles (login, registro, recuperar contraseña) declaran su propio límite.
app.register(rateLimit, { global: false });

app.decorate('authenticate', async (request: any, reply: any) => {
  try {
    await request.jwtVerify();
  } catch {
    reply.status(401).send({ error: 'No autorizado' });
  }
});

// Usuario de empresa (ADMIN/SUPERVISOR): exige tenant y suscripción con acceso
app.decorate('requireEmpresa', async (request: any, reply: any) => {
  try {
    await request.jwtVerify();
  } catch {
    return reply.status(401).send({ error: 'No autorizado' });
  }
  const payload = request.user as JwtPayload;
  if (!payload.empresaId || (payload.rol !== 'ADMIN' && payload.rol !== 'SUPERVISOR')) {
    return reply.status(403).send({ error: 'Requiere usuario de empresa' });
  }
  const [empresa, suscripcion] = await Promise.all([
    prisma.empresa.findUnique({ where: { id: payload.empresaId } }),
    prisma.suscripcion.findUnique({ where: { empresaId: payload.empresaId } }),
  ]);
  const negado = decidirAccesoEmpresa(empresa, suscripcion);
  if (negado) return reply.status(negado.status).send(negado.cuerpo);
  request.empresaId = payload.empresaId;
  request.usuarioId = payload.id;
  request.usuarioNombre = payload.nombre;
});

app.decorate('requireSuperAdmin', async (request: any, reply: any) => {
  try {
    await request.jwtVerify();
  } catch {
    return reply.status(401).send({ error: 'No autorizado' });
  }
  const payload = request.user as JwtPayload;
  if (payload.rol !== 'SUPER_ADMIN') {
    return reply.status(403).send({ error: 'Requiere super administrador' });
  }
});

// Afiliado (programa de referidos): exige rol AFILIADO con su afiliadoId
app.decorate('requireAfiliado', async (request: any, reply: any) => {
  try {
    await request.jwtVerify();
  } catch {
    return reply.status(401).send({ error: 'No autorizado' });
  }
  const payload = request.user as JwtPayload;
  if (payload.rol !== 'AFILIADO' || !payload.afiliadoId) {
    return reply.status(403).send({ error: 'Requiere cuenta de afiliado' });
  }
  request.afiliadoId = payload.afiliadoId;
});

// Lo que ninguna ruta atajó sale con un texto fijo y sin el mensaje interno; los 4xx salen como
// siempre. Va antes de registrar las rutas para que lo hereden todas. Ver utils/respuestaDeError.ts.
app.setErrorHandler((error: Error & { statusCode?: number }, request, reply) => {
  // Lo inesperado, además de responderse con el texto fijo, queda en el registro del sistema: es
  // de donde sale la pantalla que responde "qué error está dando el producto y por qué".
  if (esErrorInesperado(error)) registrarError(error, request);
  return manejarError(error, request, reply);
});

// El enganche global del registro del sistema. En `onResponse` (ya se respondió) para no añadir
// ni un milisegundo a lo que el usuario espera, y global para que una ruta escrita mañana quede
// cubierta sin que nadie tenga que acordarse de nada.
app.addHook('onResponse', async (request, reply) => {
  registrarAccesoPorRespuesta(request, reply);
  registrarAuditoria(request, reply);
});

app.register(authRoutes, { prefix: '/api/auth' });
app.register(colaboradorRoutes, { prefix: '/api/colaboradores' });
app.register(registroRoutes, { prefix: '/api/registros' });
app.register(permisoRoutes, { prefix: '/api/permisos' });
app.register(contratoRoutes, { prefix: '/api/contratos' });
app.register(festivoRoutes, { prefix: '/api/festivos' });
app.register(configuracionRoutes, { prefix: '/api/configuracion' });
app.register(reporteRoutes, { prefix: '/api/reportes' });
app.register(sedeRoutes, { prefix: '/api/sedes' });
app.register(workerRoutes, { prefix: '/api/worker' });
// Público, como el kiosco: la persona registra su rostro con el enlace que le mandó su empresa.
app.register(registroFacialRoutes, { prefix: '/api/registro-facial' });
app.register(adminRoutes, { prefix: '/api/admin' });
app.register(afiliadoAdminRoutes, { prefix: '/api/admin/afiliados' });
app.register(afiliadoPanelRoutes, { prefix: '/api/afiliado' });
app.register(wompiRoutes, { prefix: '/api/wompi' });
app.register(suscripcionRoutes, { prefix: '/api/suscripcion' });
app.register(horarioRoutes, { prefix: '/api/horarios' });
app.register(plantillaTurnoRoutes, { prefix: '/api/plantillas-turno' });
app.register(turnoRoutes, { prefix: '/api/turnos' });
app.register(dashboardRoutes, { prefix: '/api/dashboard' });
app.register(telegramRoutes, { prefix: '/api/telegram' });
app.register(notificacionRoutes, { prefix: '/api/notificaciones' });
app.register(eventoRoutes, { prefix: '/api/eventos' });
app.register(eventosAdminRoutes, { prefix: '/api/admin/eventos' });

app.get('/api/health', async () => ({ status: 'ok' }));

// Retención de fotos de verificación facial: 2 meses. Corre al arrancar y cada día
// a las 3 de la madrugada de Bogotá (ver utils/programarDiario.ts), para que las
// imágenes base64 no crezcan sin límite en la base de datos.
//
// PENDIENTE (19 de septiembre de 2026): es el único de los cuatro barridos que vive
// dentro de este archivo en vez de en su propio módulo, y captura `app.log` en lugar
// de recibirlo. Eso lo deja fuera del alcance de las pruebas: los otros tres se pueden
// ejercitar sin levantar el servidor y este no. Sacarlo a `utils/` es pequeño y no
// bloquea nada, pero mientras siga aquí su `catch` interno tampoco se puede comprobar.
// Hora de Bogotá a la que corren los barridos diarios. La madrugada es cuando
// menos gente marca, así que una consulta pesada no compite con el kiosco.
const HORA_BARRIDOS = 3;

const DOS_MESES_MS = 60 * 24 * 60 * 60 * 1000;
async function limpiarFotosAntiguas() {
  try {
    const corte = new Date(Date.now() - DOS_MESES_MS);
    const { count } = await prisma.registro.updateMany({
      where: {
        creadoEn: { lt: corte },
        OR: [{ fotoEntrada: { not: null } }, { fotoSalida: { not: null } }],
      },
      data: { fotoEntrada: null, fotoSalida: null },
    });
    if (count > 0) app.log.info(`Fotos de verificación eliminadas (retención 2 meses): ${count} registros`);
  } catch (err) {
    app.log.error(err, 'Error limpiando fotos antiguas');
  }
}

const start = async () => {
  try {
    // '::' escucha IPv6 e IPv4 (dual-stack); localhost puede resolver a ::1
    await app.listen({ port: Number(process.env.PORT) || 3001, host: '::' });
    // El puerto REAL, no uno escrito a mano: decía siempre «3001» aunque estuviera escuchando en
    // otro, y el 19 de septiembre de 2026 mandó un diagnóstico por el camino equivocado (se creyó
    // que había dos backends vivos). Un mensaje que afirma algo que no consultó es de la misma
    // familia del CLAUDE.md §12.
    console.log(`HoraPro API corriendo en puerto ${Number(process.env.PORT) || 3001}`);
    // Los cuatro barridos diarios van anclados al reloj de Bogotá y no al arranque
    // del proceso (19 de septiembre de 2026). Ver utils/programarDiario.ts y la
    // sección 8.3 del CLAUDE.md: con `setInterval` desde el arranque, la hora a la
    // que corrían era la hora del último despliegue, y una pasada vacía no dejaba
    // rastro. `cerrarTurnosOlvidados` se queda aparte: ya corre cada hora, que es
    // su propia cura al mismo problema.
    programarDiario('fotos-antiguas', HORA_BARRIDOS, limpiarFotosAntiguas, app.log);
    // Cierra turnos que quedaron sin salida (marca "No marcó salida" para revisar).
    //
    // Cada HORA, no cada 24: un turno olvidado solo se vuelve elegible a la
    // medianoche del día siguiente (el barrido solo toca días ya pasados), así
    // que con una pasada diaria la hora a la que se cierra es la hora a la que
    // arrancó el proceso. El despliegue del 31/08 reinició la app a las 22:12 y
    // dejó el barrido corriendo a las 22:12: los turnos olvidados del lunes se
    // vieron abiertos toda la jornada del martes y solo se habrían cerrado esa
    // noche. Con una pasada por hora se cierran poco después de medianoche, sin
    // importar cuándo arrancó la app.
    //
    // Cada hora y no una vez de madrugada porque un turno nocturno (21:00→05:00)
    // no es elegible hasta las 07:00 del día siguiente, cuando vence su gracia:
    // una única pasada a medianoche lo dejaría abierto un día entero más.
    //
    // Que corra 24 veces al día sale gratis solo por el índice
    // `(salidaEstimada, salida, entrada)`: sin él la consulta es un `Table scan`
    // sobre todo el historial de marcaciones. Ver `sql/indice-turnos-abiertos.sql`.
    cerrarTurnosOlvidados(app.log);
    setInterval(() => cerrarTurnosOlvidados(app.log), 60 * 60 * 1000);

    // Almuerzos que quedaron sin regreso. No se cierran solos: la evidencia de
    // quien volvió y no marcó es idéntica a la de quien se fue para la casa, así
    // que darle la tarde por buena sería fabricar horas pagadas. Se avisa.
    programarDiario('pausas-sin-regreso', HORA_BARRIDOS, () => avisarPausasSinRegreso(app.log), app.log);

    // Vencimientos de contratos. Antes esto solo corría cuando alguien abría el
    // tablero, así que la empresa que no entraba no se enteraba. Al arrancar y
    // cada 24h, como los demás: en un hosting que duerme la app, el arranque es
    // lo que de verdad garantiza el barrido, porque cualquier petición la
    // despierta (incluida una marcación del kiosco).
    programarDiario('contratos-por-vencer', HORA_BARRIDOS, () => avisarContratosDeTodas(app.log), app.log);
    // Materializa el día esperado de cada colaborador para hoy y las próximas
    // semanas. Sin esto la tabla se queda vacía y todo se resuelve con el
    // horario VIGENTE, que es justo lo que reescribía el pasado.
    // Es idempotente y solo escribe donde falta, así que correr de más no daña.
    programarDiario('ventana-dias-esperados', HORA_BARRIDOS, () => mantenerVentana(app.log), app.log);
    // Los correos de suscripción vencida y de kiosco por pausarse (4 de octubre de 2026). A las 7 y
    // no a la hora de los barridos: son para que los lea una persona.
    programarDiario('avisos-de-suscripcion', 7, () => avisarSuscripcionesDeTodas(app.log), app.log);
    // Registra el webhook del bot de Telegram (si hay URL configurada)
    if (process.env.TELEGRAM_WEBHOOK_URL) configurarWebhook(process.env.TELEGRAM_WEBHOOK_URL);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
