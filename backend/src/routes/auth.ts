import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../index';
import { estadoEfectivo, sincronizarEstado, DIAS_PRUEBA, obtenerPrecios } from '../utils/suscripcion';
import { enviarCorreo, plantillaCorreo, correoConfigurado } from '../utils/correo';

const DIA_MS = 24 * 60 * 60 * 1000;
// Vencimiento de la sesión del panel (el kiosco usa su propio token de 12h)
const SESION = '7d';
// Límite anti fuerza bruta para endpoints sensibles
const limite = (max: number) => ({ rateLimit: { max, timeWindow: '1 minute' } });

const MIN_VERIFICACION = 15;

function generarCodigo(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

async function enviarCorreoCodigo(email: string, nombre: string, codigo: string) {
  const digitos = codigo.split('').map(d => `
    <td style="width:40px;height:48px;border:1.5px solid #e5e5e3;border-radius:10px;font-size:22px;font-weight:800;color:#303030;text-align:center;font-family:monospace">${d}</td>
  `).join('<td style="width:6px"></td>');
  await enviarCorreo({
    para: email,
    asunto: `${codigo} — Tu código de verificación de HoraPro`,
    html: plantillaCorreo('Confirma tu correo', `
      <p style="font-size:14px;color:#303030">Hola ${nombre},</p>
      <p style="font-size:14px;color:#303030">Este es tu código para activar tu cuenta en HoraPro. Vence en ${MIN_VERIFICACION} minutos:</p>
      <table style="margin:24px auto" cellpadding="0" cellspacing="0"><tr>${digitos}</tr></table>
      <p style="font-size:12px;color:#898989;text-align:center">Escríbelo en la ventana de verificación de tu panel.</p>
      <p style="font-size:12px;color:#898989">Si no creaste esta cuenta, ignora este correo.</p>
    `),
  });
}

export default async function authRoutes(app: FastifyInstance) {
  // Precios públicos para la landing (se leen de la config del super admin)
  app.get('/precios', async () => {
    const p = await obtenerPrecios(prisma);
    return { ...p, diasPrueba: DIAS_PRUEBA };
  });

  // Registro self-service: crea empresa + 7 días de prueba + usuario admin,
  // y devuelve el token para entrar de inmediato.
  app.post('/registro', { config: limite(5) }, async (request, reply) => {
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
    // Verificación de correo: si el SMTP no está configurado (ej. desarrollo),
    // la cuenta nace verificada para no bloquear a nadie sin poder enviar el código.
    const codigo = correoConfigurado ? generarCodigo() : null;
    const nuevo = await prisma.$transaction(async (tx) => {
      const emp = await tx.empresa.create({ data: { nombre: empresa, nit, email, telefono } });
      await tx.suscripcion.create({
        data: { empresaId: emp.id, estado: 'PRUEBA', finPrueba: new Date(Date.now() + DIAS_PRUEBA * DIA_MS) },
      });
      const user = await tx.usuario.create({
        data: {
          email, password: hash, nombre, rol: 'ADMIN', empresaId: emp.id,
          emailVerificado: !codigo,
          verificacionCodigo: codigo,
          verificacionExpira: codigo ? new Date(Date.now() + MIN_VERIFICACION * 60 * 1000) : null,
        },
      });
      return { emp, user };
    });

    if (codigo) await enviarCorreoCodigo(email, nombre, codigo);

    const token = app.jwt.sign({
      id: nuevo.user.id, email: nuevo.user.email, rol: 'ADMIN', nombre: nuevo.user.nombre, empresaId: nuevo.emp.id,
    }, { expiresIn: SESION });
    return reply.status(201).send({
      token,
      usuario: {
        id: nuevo.user.id, email: nuevo.user.email, nombre: nuevo.user.nombre, rol: 'ADMIN',
        empresaId: nuevo.emp.id, empresaNombre: nuevo.emp.nombre, estadoSuscripcion: 'PRUEBA',
        emailVerificado: nuevo.user.emailVerificado,
      },
    });
  });

  // Confirma el correo con el código de 6 dígitos enviado al registrarse.
  // Requiere sesión: el código se valida contra EL usuario logueado (no hace
  // falta mandar el email, y evita que alguien pruebe códigos a lo loco).
  app.post('/verificar-email', { preHandler: [app.authenticate], config: limite(10) }, async (request, reply) => {
    const payload = request.user as any;
    const { codigo } = request.body as { codigo: string };
    if (!codigo) return reply.status(400).send({ error: 'Falta el código' });
    const usuario = await prisma.usuario.findUnique({ where: { id: payload.id } });
    if (!usuario) return reply.status(404).send({ error: 'Usuario no encontrado' });
    if (usuario.emailVerificado) return { ok: true };
    if (!usuario.verificacionCodigo || !usuario.verificacionExpira || usuario.verificacionExpira < new Date()) {
      return reply.status(400).send({ error: 'El código venció. Pide uno nuevo.' });
    }
    if (usuario.verificacionCodigo !== codigo) {
      return reply.status(400).send({ error: 'El código no es correcto' });
    }
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { emailVerificado: true, verificacionCodigo: null, verificacionExpira: null },
    });
    return { ok: true };
  });

  // Reenvía el código de verificación al usuario logueado
  app.post('/reenviar-verificacion', { preHandler: [app.authenticate], config: limite(3) }, async (request, reply) => {
    const payload = request.user as any;
    const usuario = await prisma.usuario.findUnique({ where: { id: payload.id } });
    if (!usuario) return reply.status(404).send({ error: 'Usuario no encontrado' });
    if (usuario.emailVerificado) return { ok: true, yaVerificado: true };
    if (!correoConfigurado) {
      // Sin SMTP no podemos enviar: verificamos directo para no dejarlo atrapado
      await prisma.usuario.update({ where: { id: usuario.id }, data: { emailVerificado: true, verificacionCodigo: null, verificacionExpira: null } });
      return { ok: true, yaVerificado: true };
    }
    const codigo = generarCodigo();
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { verificacionCodigo: codigo, verificacionExpira: new Date(Date.now() + MIN_VERIFICACION * 60 * 1000) },
    });
    await enviarCorreoCodigo(usuario.email, usuario.nombre, codigo);
    return { ok: true };
  });

  app.post('/login', { config: limite(10) }, async (request, reply) => {
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
    }, { expiresIn: SESION });
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
        emailVerificado: usuario.emailVerificado,
      },
    };
  });

  app.get('/me', { preHandler: [app.authenticate] }, async (request) => {
    const payload = request.user as any;
    const usuario = await prisma.usuario.findUnique({
      where: { id: payload.id },
      select: {
        id: true, email: true, nombre: true, rol: true, empresaId: true, emailVerificado: true,
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
      emailVerificado: usuario.emailVerificado,
      estadoSuscripcion: usuario.empresa?.exentaPago
        ? 'ILIMITADA'
        : usuario.empresa?.suscripcion
          ? estadoEfectivo(usuario.empresa.suscripcion)
          : null,
    };
  });

  // Recuperación de contraseña, paso 1: enviar el link al correo.
  // Siempre responde ok (no revela si el correo existe o no).
  app.post('/olvide-password', { config: limite(3) }, async (request) => {
    const { email } = request.body as { email: string };
    const usuario = email ? await prisma.usuario.findUnique({ where: { email } }) : null;
    if (usuario && usuario.activo) {
      const token = crypto.randomBytes(32).toString('hex');
      await prisma.usuario.update({
        where: { id: usuario.id },
        data: { resetToken: token, resetExpira: new Date(Date.now() + 30 * 60 * 1000) },
      });
      const base = process.env.FRONTEND_ORIGIN?.split(',')[0] ?? 'http://localhost:5173';
      const link = `${base}/restablecer?token=${token}`;
      await enviarCorreo({
        para: usuario.email,
        asunto: 'Restablece tu contraseña de HoraPro',
        html: plantillaCorreo('Restablece tu contraseña', `
          <p style="font-size:14px;color:#303030">Hola ${usuario.nombre},</p>
          <p style="font-size:14px;color:#303030">Recibimos una solicitud para restablecer tu contraseña. El link vence en 30 minutos:</p>
          <p style="margin:24px 0"><a href="${link}" style="background:#FFD85E;color:#303030;font-weight:700;padding:12px 24px;border-radius:12px;text-decoration:none">Crear nueva contraseña</a></p>
          <p style="font-size:12px;color:#898989">Si no fuiste tú, ignora este correo: tu contraseña actual sigue siendo válida.</p>
        `),
      });
    }
    return { ok: true };
  });

  // Recuperación de contraseña, paso 2: guardar la nueva con el token del correo
  app.post('/restablecer', { config: limite(5) }, async (request, reply) => {
    const { token, password } = request.body as { token: string; password: string };
    if (!token || !password) return reply.status(400).send({ error: 'Datos incompletos' });
    if (password.length < 6) return reply.status(400).send({ error: 'La contraseña debe tener al menos 6 caracteres' });

    const usuario = await prisma.usuario.findUnique({ where: { resetToken: token } });
    if (!usuario || !usuario.resetExpira || usuario.resetExpira < new Date()) {
      return reply.status(400).send({ error: 'El link ya venció o no es válido. Solicita uno nuevo.' });
    }
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { password: await bcrypt.hash(password, 10), resetToken: null, resetExpira: null },
    });
    return { ok: true };
  });

  // Mi cuenta: el usuario logueado edita su nombre/email y opcionalmente su contraseña
  app.put('/me', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as any;
    const { nombre, email, passwordActual, passwordNueva } = request.body as {
      nombre?: string; email?: string; passwordActual?: string; passwordNueva?: string;
    };
    const usuario = await prisma.usuario.findUnique({ where: { id: payload.id } });
    if (!usuario) return reply.status(404).send({ error: 'Usuario no encontrado' });

    const data: any = {};
    if (nombre) data.nombre = nombre;
    if (email && email !== usuario.email) {
      const existe = await prisma.usuario.findUnique({ where: { email } });
      if (existe) return reply.status(409).send({ error: 'Ya existe una cuenta con ese correo' });
      data.email = email;
    }
    if (passwordNueva) {
      if (!passwordActual || !(await bcrypt.compare(passwordActual, usuario.password))) {
        // 400 y no 401: el interceptor del frontend trata cualquier 401 como sesión inválida y cierra sesión
        return reply.status(400).send({ error: 'La contraseña actual no es correcta' });
      }
      if (passwordNueva.length < 6) return reply.status(400).send({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
      data.password = await bcrypt.hash(passwordNueva, 10);
    }

    const actualizado = await prisma.usuario.update({
      where: { id: payload.id },
      data,
      select: { id: true, email: true, nombre: true, rol: true },
    });
    return { ok: true, usuario: actualizado };
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
