import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { prisma } from '../index';
import { estadoEfectivo, sincronizarEstado, DIAS_PRUEBA, obtenerPrecios } from '../utils/suscripcion';

const DIA_MS = 24 * 60 * 60 * 1000;

export default async function authRoutes(app: FastifyInstance) {
  // Precios públicos para la landing (se leen de la config del super admin)
  app.get('/precios', async () => {
    const p = await obtenerPrecios(prisma);
    return { ...p, diasPrueba: DIAS_PRUEBA };
  });

  // Registro self-service: crea empresa + 7 días de prueba + usuario admin,
  // y devuelve el token para entrar de inmediato.
  app.post('/registro', async (request, reply) => {
    const { empresa, nit, nombre, email, password, telefono } = request.body as {
      empresa: string; nit: string; nombre: string; email: string; password: string; telefono?: string;
    };
    if (!empresa || !nit || !nombre || !email || !password) {
      return reply.status(400).send({ error: 'Faltan datos obligatorios' });
    }
    if (password.length < 6) {
      return reply.status(400).send({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const [emailExiste, nitExiste] = await Promise.all([
      prisma.usuario.findUnique({ where: { email } }),
      prisma.empresa.findUnique({ where: { nit } }),
    ]);
    if (emailExiste) return reply.status(409).send({ error: 'Ya existe una cuenta con ese correo' });
    if (nitExiste) return reply.status(409).send({ error: 'Ya hay una empresa registrada con ese NIT' });

    const hash = await bcrypt.hash(password, 10);
    const nuevo = await prisma.$transaction(async (tx) => {
      const emp = await tx.empresa.create({ data: { nombre: empresa, nit, email, telefono } });
      await tx.suscripcion.create({
        data: { empresaId: emp.id, estado: 'PRUEBA', finPrueba: new Date(Date.now() + DIAS_PRUEBA * DIA_MS) },
      });
      const user = await tx.usuario.create({
        data: { email, password: hash, nombre, rol: 'ADMIN', empresaId: emp.id },
      });
      return { emp, user };
    });

    const token = app.jwt.sign({
      id: nuevo.user.id, email: nuevo.user.email, rol: 'ADMIN', nombre: nuevo.user.nombre, empresaId: nuevo.emp.id,
    });
    return reply.status(201).send({
      token,
      usuario: {
        id: nuevo.user.id, email: nuevo.user.email, nombre: nuevo.user.nombre, rol: 'ADMIN',
        empresaId: nuevo.emp.id, empresaNombre: nuevo.emp.nombre, estadoSuscripcion: 'PRUEBA',
      },
    });
  });

  app.post('/login', async (request, reply) => {
    const { email, password } = request.body as { email: string; password: string };
    const usuario = await prisma.usuario.findUnique({
      where: { email },
      include: { empresa: { include: { suscripcion: true } } },
    });
    if (!usuario || !usuario.activo || !(await bcrypt.compare(password, usuario.password))) {
      return reply.status(401).send({ error: 'Credenciales inválidas' });
    }
    if (usuario.empresaId && !usuario.empresa?.activa) {
      return reply.status(403).send({ error: 'Empresa inactiva. Contacta a HoraPro.' });
    }

    // El login se permite incluso suspendido: el admin necesita ver el aviso de pago.
    // Las rutas de negocio sí se bloquean (requireEmpresa).
    let estadoSuscripcion: string | null = null;
    if (usuario.empresa?.exentaPago) {
      estadoSuscripcion = 'ILIMITADA';
    } else if (usuario.empresa?.suscripcion) {
      const sync = await sincronizarEstado(prisma, usuario.empresa.suscripcion);
      estadoSuscripcion = estadoEfectivo(sync);
    }

    const token = app.jwt.sign({
      id: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
      nombre: usuario.nombre,
      empresaId: usuario.empresaId,
    });
    return {
      token,
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        rol: usuario.rol,
        empresaId: usuario.empresaId,
        empresaNombre: usuario.empresa?.nombre ?? null,
        estadoSuscripcion,
      },
    };
  });

  app.get('/me', { preHandler: [app.authenticate] }, async (request) => {
    const payload = request.user as any;
    const usuario = await prisma.usuario.findUnique({
      where: { id: payload.id },
      select: {
        id: true, email: true, nombre: true, rol: true, empresaId: true,
        empresa: { select: { nombre: true, exentaPago: true, suscripcion: true } },
      },
    });
    if (!usuario) return null;
    return {
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      rol: usuario.rol,
      empresaId: usuario.empresaId,
      empresaNombre: usuario.empresa?.nombre ?? null,
      estadoSuscripcion: usuario.empresa?.exentaPago
        ? 'ILIMITADA'
        : usuario.empresa?.suscripcion
          ? estadoEfectivo(usuario.empresa.suscripcion)
          : null,
    };
  });

  // Usuarios internos de la empresa (solo ADMIN gestiona)
  app.get('/usuarios', { preHandler: [app.requireEmpresa] }, async (request) => {
    return prisma.usuario.findMany({
      where: { empresaId: request.empresaId },
      select: { id: true, email: true, nombre: true, rol: true, activo: true, creadoEn: true },
      orderBy: { nombre: 'asc' },
    });
  });

  app.post('/usuarios', { preHandler: [app.requireEmpresa] }, async (request, reply) => {
    const payload = request.user as any;
    if (payload.rol !== 'ADMIN') return reply.status(403).send({ error: 'Solo el administrador crea usuarios' });
    const { email, password, nombre, rol } = request.body as any;
    if (rol === 'SUPER_ADMIN') return reply.status(403).send({ error: 'Rol no permitido' });
    const hash = await bcrypt.hash(password, 10);
    const usuario = await prisma.usuario.create({
      data: { email, password: hash, nombre, rol: rol ?? 'SUPERVISOR', empresaId: request.empresaId! },
      select: { id: true, email: true, nombre: true, rol: true, activo: true },
    });
    return reply.status(201).send(usuario);
  });

  app.put('/usuarios/:id', { preHandler: [app.requireEmpresa] }, async (request, reply) => {
    const payload = request.user as any;
    if (payload.rol !== 'ADMIN') return reply.status(403).send({ error: 'Solo el administrador edita usuarios' });
    const { id } = request.params as { id: string };
    const { nombre, rol, activo, password } = request.body as any;
    const existente = await prisma.usuario.findFirst({ where: { id, empresaId: request.empresaId } });
    if (!existente) return reply.status(404).send({ error: 'Usuario no encontrado' });
    const data: any = { nombre, rol, activo };
    if (password) data.password = await bcrypt.hash(password, 10);
    return prisma.usuario.update({
      where: { id },
      data,
      select: { id: true, email: true, nombre: true, rol: true, activo: true },
    });
  });
}
