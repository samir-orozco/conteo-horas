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

export const prisma = new PrismaClient();

const app = Fastify({ logger: true });

app.register(cors, { origin: true });
app.register(jwt, { secret: process.env.JWT_SECRET || 'conteo_horas_secret_2024' });

app.decorate('authenticate', async (request: any, reply: any) => {
  try {
    await request.jwtVerify();
  } catch {
    reply.status(401).send({ error: 'No autorizado' });
  }
});

app.register(authRoutes, { prefix: '/api/auth' });
app.register(colaboradorRoutes, { prefix: '/api/colaboradores' });
app.register(registroRoutes, { prefix: '/api/registros' });
app.register(permisoRoutes, { prefix: '/api/permisos' });
app.register(festivoRoutes, { prefix: '/api/festivos' });
app.register(configuracionRoutes, { prefix: '/api/configuracion' });
app.register(reporteRoutes, { prefix: '/api/reportes' });

app.get('/api/health', async () => ({ status: 'ok' }));

const start = async () => {
  try {
    await app.listen({ port: Number(process.env.PORT) || 3001, host: '0.0.0.0' });
    console.log('Servidor corriendo en puerto 3001');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
