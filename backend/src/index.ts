import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { PrismaClient } from '@prisma/client';

import authRoutes from './routes/auth';
import colaboradorRoutes from './routes/colaboradores';
import registroRoutes from './routes/registros';
import permisoRoutes from './routes/permisos';
import festivoRoutes from './routes/festivos';
import configuracionRoutes from './routes/configuracion';
import reporteRoutes from './routes/reportes';
import workerRoutes from './routes/worker';
import adminRoutes from './routes/admin';
import wompiRoutes from './routes/wompi';
import suscripcionRoutes from './routes/suscripcion';
import horarioRoutes from './routes/horarios';
import dashboardRoutes from './routes/dashboard';
import { estadoEfectivo, accesoPermitido } from './utils/suscripcion';

export const prisma = new PrismaClient();

export type JwtPayload = {
  id: string;
  email?: string;
  rol: 'SUPER_ADMIN' | 'ADMIN' | 'SUPERVISOR' | 'WORKER';
  nombre: string;
  empresaId: string | null;
};

// bodyLimit amplio: los comprobantes de pago viajan como imagen base64
const app = Fastify({ logger: true, bodyLimit: 10 * 1024 * 1024 });

// @fastify/cors v9+ solo permite GET/HEAD/POST por defecto: hay que declarar el resto
app.register(cors, { origin: true, methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'] });
app.register(jwt, { secret: process.env.JWT_SECRET || 'conteo_horas_secret_2024' });

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

app.register(authRoutes, { prefix: '/api/auth' });
app.register(colaboradorRoutes, { prefix: '/api/colaboradores' });
app.register(registroRoutes, { prefix: '/api/registros' });
app.register(permisoRoutes, { prefix: '/api/permisos' });
app.register(festivoRoutes, { prefix: '/api/festivos' });
app.register(configuracionRoutes, { prefix: '/api/configuracion' });
app.register(reporteRoutes, { prefix: '/api/reportes' });
app.register(workerRoutes, { prefix: '/api/worker' });
app.register(adminRoutes, { prefix: '/api/admin' });
app.register(wompiRoutes, { prefix: '/api/wompi' });
app.register(suscripcionRoutes, { prefix: '/api/suscripcion' });
app.register(horarioRoutes, { prefix: '/api/horarios' });
app.register(dashboardRoutes, { prefix: '/api/dashboard' });

app.get('/api/health', async () => ({ status: 'ok' }));

const start = async () => {
  try {
    // '::' escucha IPv6 e IPv4 (dual-stack); localhost puede resolver a ::1
    await app.listen({ port: Number(process.env.PORT) || 3001, host: '::' });
    console.log('HoraPro API corriendo en puerto 3001');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
