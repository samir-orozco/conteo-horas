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
import festivoRoutes from './routes/festivos';
import configuracionRoutes from './routes/configuracion';
import reporteRoutes from './routes/reportes';
import workerRoutes from './routes/worker';
import adminRoutes from './routes/admin';
import afiliadoAdminRoutes from './routes/afiliados';
import afiliadoPanelRoutes from './routes/afiliado-panel';
import wompiRoutes from './routes/wompi';
import suscripcionRoutes from './routes/suscripcion';
import horarioRoutes from './routes/horarios';
import sedeRoutes from './routes/sedes';
import dashboardRoutes from './routes/dashboard';
import telegramRoutes from './routes/telegram';
import notificacionRoutes from './routes/notificaciones';
import { configurarWebhook } from './utils/telegram';
import { cerrarTurnosOlvidados } from './utils/cierreTurnos';
import { avisarAlmuerzosSinRegreso } from './utils/cierreAlmuerzo';
import { mantenerVentana } from './utils/materializarDias';
import { estadoEfectivo, accesoPermitido } from './utils/suscripcion';

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
  logger: true,
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
  if (!empresa?.activa) {
    return reply.status(403).send({ error: 'Empresa inactiva' });
  }
  if (!empresa.exentaPago && suscripcion && !accesoPermitido(estadoEfectivo(suscripcion))) {
    return reply.status(402).send({
      error: 'Suscripción suspendida por falta de pago. Contacta a HoraPro.',
      codigo: 'SUSCRIPCION_SUSPENDIDA',
    });
  }
  request.empresaId = payload.empresaId;
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

app.register(authRoutes, { prefix: '/api/auth' });
app.register(colaboradorRoutes, { prefix: '/api/colaboradores' });
app.register(registroRoutes, { prefix: '/api/registros' });
app.register(permisoRoutes, { prefix: '/api/permisos' });
app.register(festivoRoutes, { prefix: '/api/festivos' });
app.register(configuracionRoutes, { prefix: '/api/configuracion' });
app.register(reporteRoutes, { prefix: '/api/reportes' });
app.register(sedeRoutes, { prefix: '/api/sedes' });
app.register(workerRoutes, { prefix: '/api/worker' });
app.register(adminRoutes, { prefix: '/api/admin' });
app.register(afiliadoAdminRoutes, { prefix: '/api/admin/afiliados' });
app.register(afiliadoPanelRoutes, { prefix: '/api/afiliado' });
app.register(wompiRoutes, { prefix: '/api/wompi' });
app.register(suscripcionRoutes, { prefix: '/api/suscripcion' });
app.register(horarioRoutes, { prefix: '/api/horarios' });
app.register(dashboardRoutes, { prefix: '/api/dashboard' });
app.register(telegramRoutes, { prefix: '/api/telegram' });
app.register(notificacionRoutes, { prefix: '/api/notificaciones' });

app.get('/api/health', async () => ({ status: 'ok' }));

// Retención de fotos de verificación facial: 2 meses. Corre al arrancar y cada 24h
// para que las imágenes base64 no crezcan sin límite en la base de datos.
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
    console.log('HoraPro API corriendo en puerto 3001');
    limpiarFotosAntiguas();
    setInterval(limpiarFotosAntiguas, 24 * 60 * 60 * 1000);
    // Cierra turnos que quedaron sin salida (marca "No marcó salida" para revisar).
    // Al arrancar y cada 24h; es idempotente y solo actúa sobre días ya pasados.
    cerrarTurnosOlvidados(app.log);
    setInterval(() => cerrarTurnosOlvidados(app.log), 24 * 60 * 60 * 1000);

    // Almuerzos que quedaron sin regreso. No se cierran solos: la evidencia de
    // quien volvió y no marcó es idéntica a la de quien se fue para la casa, así
    // que darle la tarde por buena sería fabricar horas pagadas. Se avisa.
    avisarAlmuerzosSinRegreso(app.log);
    setInterval(() => avisarAlmuerzosSinRegreso(app.log), 24 * 60 * 60 * 1000);
    // Materializa el día esperado de cada colaborador para hoy y las próximas
    // semanas. Sin esto la tabla se queda vacía y todo se resuelve con el
    // horario VIGENTE, que es justo lo que reescribía el pasado.
    // Es idempotente y solo escribe donde falta, así que correr de más no daña.
    mantenerVentana(app.log);
    setInterval(() => mantenerVentana(app.log), 24 * 60 * 60 * 1000);
    // Registra el webhook del bot de Telegram (si hay URL configurada)
    if (process.env.TELEGRAM_WEBHOOK_URL) configurarWebhook(process.env.TELEGRAM_WEBHOOK_URL);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
