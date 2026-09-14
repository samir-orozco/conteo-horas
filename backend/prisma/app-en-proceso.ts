// Las rutas REALES montadas en un Fastify dentro del proceso, sin escuchar en
// ningún puerto, para que los scripts de verificación las llamen con `inject`.
//
// Por qué no contra `npm run dev`: ese servidor corre lo que tenga checkout su
// árbol, que no es necesariamente el código que se está verificando, y al
// arrancar dispara los barridos periódicos contra la base. Aquí no corre ninguno.
//
// Lo único que no es de verdad son las guardas de autenticación: copian las de
// `index.ts` salvo la comprobación de suscripción, que no tiene que ver con lo
// que estos scripts miden. Por eso los reportes se piden con un token de ADMIN
// firmado aquí mismo, mientras que el kiosco entra por su login real.
import Fastify, { FastifyReply, FastifyRequest } from 'fastify';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import workerRoutes from '../src/routes/worker';
import reporteRoutes from '../src/routes/reportes';
import permisoRoutes from '../src/routes/permisos';
import dashboardRoutes from '../src/routes/dashboard';
import colaboradorRoutes from '../src/routes/colaboradores';
import registroRoutes from '../src/routes/registros';
import sedeRoutes from '../src/routes/sedes';
import adminRoutes from '../src/routes/admin';
import horarioRoutes from '../src/routes/horarios';
import registroFacialRoutes from '../src/routes/registroFacial';

type Sesion = { id: string; rol: string; nombre?: string; empresaId?: string | null };

export async function montarApp() {
  const app = Fastify({ logger: false });
  await app.register(jwt, { secret: `verificacion-${process.pid}` });
  await app.register(rateLimit, { global: false });

  app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      reply.status(401).send({ error: 'No autorizado' });
    }
  });
  app.decorate('requireEmpresa', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      reply.status(401).send({ error: 'No autorizado' });
      return;
    }
    const sesion = request.user as Sesion;
    if (!sesion.empresaId || sesion.rol !== 'ADMIN') {
      reply.status(403).send({ error: 'Requiere usuario de empresa' });
      return;
    }
    request.empresaId = sesion.empresaId;
    request.usuarioId = sesion.id;
    request.usuarioNombre = sesion.nombre;
  });
  app.decorate('requireSuperAdmin', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      reply.status(401).send({ error: 'No autorizado' });
      return;
    }
    if ((request.user as Sesion).rol !== 'SUPER_ADMIN') {
      reply.status(403).send({ error: 'Requiere super administrador' });
    }
  });

  await app.register(workerRoutes, { prefix: '/api/worker' });
  await app.register(reporteRoutes, { prefix: '/api/reportes' });
  await app.register(permisoRoutes, { prefix: '/api/permisos' });
  await app.register(dashboardRoutes, { prefix: '/api/dashboard' });
  await app.register(colaboradorRoutes, { prefix: '/api/colaboradores' });
  await app.register(registroRoutes, { prefix: '/api/registros' });
  await app.register(sedeRoutes, { prefix: '/api/sedes' });
  await app.register(adminRoutes, { prefix: '/api/admin' });
  await app.register(horarioRoutes, { prefix: '/api/horarios' });
  await app.register(registroFacialRoutes, { prefix: '/api/registro-facial' });
  await app.ready();

  const tokenAdmin = (empresaId: string) =>
    app.jwt.sign({ id: 'verificacion', rol: 'ADMIN', nombre: 'Verificación', empresaId });
  return { app, tokenAdmin };
}
