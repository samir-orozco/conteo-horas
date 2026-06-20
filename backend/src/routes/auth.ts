import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { prisma } from '../index';

export default async function authRoutes(app: FastifyInstance) {
  app.post('/login', async (request, reply) => {
    const { email, password } = request.body as { email: string; password: string };
    const usuario = await prisma.usuario.findUnique({ where: { email } });
    if (!usuario || !(await bcrypt.compare(password, usuario.password))) {
      return reply.status(401).send({ error: 'Credenciales inválidas' });
    }
    const token = app.jwt.sign({ id: usuario.id, email: usuario.email, rol: usuario.rol, nombre: usuario.nombre });
    return { token, usuario: { id: usuario.id, email: usuario.email, nombre: usuario.nombre, rol: usuario.rol } };
  });

  app.get('/me', { preHandler: [app.authenticate] }, async (request) => {
    const payload = request.user as any;
    return prisma.usuario.findUnique({ where: { id: payload.id }, select: { id: true, email: true, nombre: true, rol: true } });
  });
}
