import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../index';
import { enviarCorreo, plantillaCorreo, correoConfigurado } from '../utils/correo';
import { calcularBilletera, limpiarPago } from '../utils/afiliados';

// Rutas de gestión de afiliados para el SUPER ADMIN (prefijo /api/admin/afiliados).
// La cuenta de acceso del afiliado reusa Usuario (rol AFILIADO + afiliadoId), y la
// contraseña la fija el propio afiliado con el flujo de invitación (resetToken).

const HORAS_INVITACION = 24;

function baseFrontend(): string {
  return process.env.FRONTEND_ORIGIN?.split(',')[0] ?? 'http://localhost:5173';
}

// Código de referido único, legible, derivado del nombre: JUAN4821
function slugNombre(nombre: string): string {
  // NFD separa los acentos en marcas combinantes y el filtro [^A-Z0-9] las quita:
  // "Juan Pérez" -> "JUANPEREZ"
  const s = (nombre || '').normalize('NFD').toUpperCase().replace(/[^A-Z0-9]+/g, '').slice(0, 10);
  return s || 'AFIL';
}
async function codigoUnico(nombre: string): Promise<string> {
  const base = slugNombre(nombre);
  for (let i = 0; i < 12; i++) {
    const codigo = `${base}${String(crypto.randomInt(0, 10000)).padStart(4, '0')}`;
    if (!(await prisma.afiliado.findUnique({ where: { codigo } }))) return codigo;
  }
  return `AFIL${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
}

async function enviarInvitacion(email: string, nombre: string, token: string): Promise<boolean> {
  const link = `${baseFrontend()}/restablecer?token=${token}`;
  try {
    await enviarCorreo({
      para: email,
      asunto: 'Te damos acceso al programa de afiliados de HoraPro',
      html: plantillaCorreo('Activa tu cuenta de afiliado', `
        <p style="font-size:14px;color:#303030">Hola ${nombre},</p>
        <p style="font-size:14px;color:#303030">Tienes acceso al panel de afiliados de HoraPro. Crea tu contraseña para entrar (el enlace vence en ${HORAS_INVITACION} horas):</p>
        <p style="margin:24px 0;text-align:center"><a href="${link}" style="background:#FFD85E;color:#303030;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:700;display:inline-block">Crear mi contraseña</a></p>
        <p style="font-size:12px;color:#898989">Si no esperabas esta invitación, ignora este correo.</p>
      `),
    });
    return true;
  } catch {
    return false; // el afiliado ya quedó creado; el admin puede compartir el link manual
  }
}

function validarComercial(b: any): string | null {
  if (typeof b.porcentaje !== 'number' || b.porcentaje < 0 || b.porcentaje > 100) {
    return 'El porcentaje debe estar entre 0 y 100';
  }
  if (b.duracionMeses != null && (!Number.isInteger(b.duracionMeses) || b.duracionMeses < 0)) {
    return 'La duración debe ser un número de meses (o vacío para indefinido)';
  }
  return null;
}

export default async function afiliadoAdminRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.requireSuperAdmin] };

  // Lista de afiliados con su cuenta y # de referidos
  app.get('/', auth, async () => {
    const afiliados = await prisma.afiliado.findMany({
      orderBy: { creadoEn: 'desc' },
      include: {
        usuarios: { select: { email: true, activo: true, resetToken: true } },
        _count: { select: { empresas: true } },
      },
    });
    return afiliados.map(a => {
      const u = a.usuarios[0];
      return {
        id: a.id, nombre: a.nombre, codigo: a.codigo, porcentaje: a.porcentaje, duracionMeses: a.duracionMeses,
        activo: a.activo, telefono: a.telefono, creadoEn: a.creadoEn,
        email: u?.email ?? null,
        invitacionPendiente: u ? !!u.resetToken : false,
        autoRegistroPendiente: !u, // invitado a registrarse solo, aún sin cuenta
        referidos: a._count.empresas,
      };
    });
  });

  // Invitar a un afiliado a que se registre solo: crea el afiliado solo con el
  // trato (% + duración) y devuelve un link de auto-registro (token firmado).
  // El afiliado llena sus propios datos (nombre, correo, clave, datos de pago).
  app.post('/invitacion', auth, async (request, reply) => {
    const b = request.body as any;
    const errComercial = validarComercial(b);
    if (errComercial) return reply.status(400).send({ error: errComercial });
    const nombreRef = b.nombre?.trim() || 'Registro pendiente';
    const codigo = await codigoUnico(b.nombre?.trim() || 'AFIL');
    const afiliado = await prisma.afiliado.create({
      data: { nombre: nombreRef, codigo, porcentaje: b.porcentaje, duracionMeses: b.duracionMeses ?? null },
    });
    const token = app.jwt.sign({ afiliadoId: afiliado.id, t: 'reg' }, { expiresIn: '30d' });
    return reply.status(201).send({ id: afiliado.id, inviteLink: `${baseFrontend()}/afiliado/registro?token=${token}` });
  });

  // Detalle: datos + referidos + billetera
  app.get('/:id', auth, async (request, reply) => {
    const { id } = request.params as any;
    const a = await prisma.afiliado.findUnique({
      where: { id },
      include: {
        usuarios: { select: { email: true, activo: true, resetToken: true } },
        empresas: {
          select: { id: true, nombre: true, nit: true, atribuidoEn: true, suscripcion: { select: { estado: true } } },
          orderBy: { atribuidoEn: 'desc' },
        },
        comisiones: { orderBy: { creadoEn: 'desc' } },
        retiros: { orderBy: { solicitadoEn: 'desc' } },
      },
    });
    if (!a) return reply.status(404).send({ error: 'Afiliado no encontrado' });
    const u = a.usuarios[0];
    return {
      id: a.id, nombre: a.nombre, codigo: a.codigo, porcentaje: a.porcentaje, duracionMeses: a.duracionMeses,
      activo: a.activo, telefono: a.telefono, creadoEn: a.creadoEn,
      pago: { metodo: a.pagoMetodo, banco: a.pagoBanco, tipoCuenta: a.pagoTipoCuenta, numero: a.pagoNumero, titular: a.pagoTitular, documento: a.pagoDocumento },
      email: u?.email ?? null,
      invitacionPendiente: u ? !!u.resetToken : false,
      cuentaActiva: u?.activo ?? false,
      referidos: a.empresas.map(e => ({ id: e.id, nombre: e.nombre, nit: e.nit, estado: e.suscripcion?.estado ?? null, atribuidoEn: e.atribuidoEn })),
      billetera: calcularBilletera(a.comisiones, a.retiros),
      comisiones: a.comisiones,
      retiros: a.retiros,
    };
  });

  // Solicitudes de retiro pendientes (para pagar), con los datos de pago del afiliado
  app.get('/retiros/pendientes', auth, async () => {
    return prisma.solicitudRetiro.findMany({
      where: { estado: { in: ['SOLICITADO', 'APROBADO'] } },
      orderBy: { solicitadoEn: 'asc' },
      include: {
        afiliado: {
          select: { id: true, nombre: true, pagoMetodo: true, pagoBanco: true, pagoTipoCuenta: true, pagoNumero: true, pagoTitular: true, pagoDocumento: true },
        },
      },
    });
  });

  // Procesar un retiro: aprobar, pagar (con comprobante) o rechazar (con motivo)
  app.put('/retiros/:retiroId', auth, async (request, reply) => {
    const { retiroId } = request.params as any;
    const { estado, comprobanteBase64, nota } = request.body as any;
    if (!['APROBADO', 'PAGADO', 'RECHAZADO'].includes(estado)) {
      return reply.status(400).send({ error: 'Estado inválido' });
    }
    const retiro = await prisma.solicitudRetiro.findUnique({ where: { id: retiroId } });
    if (!retiro) return reply.status(404).send({ error: 'Solicitud no encontrada' });
    if (retiro.estado === 'PAGADO' || retiro.estado === 'RECHAZADO') {
      return reply.status(409).send({ error: 'La solicitud ya fue procesada' });
    }
    const email = (request.user as any)?.email ?? null;
    const actualizado = await prisma.solicitudRetiro.update({
      where: { id: retiroId },
      data: {
        estado,
        comprobanteBase64: comprobanteBase64 ?? retiro.comprobanteBase64,
        nota: nota ?? retiro.nota,
        procesadoEn: new Date(),
        procesadoPor: email,
      },
    });
    return { id: actualizado.id, estado: actualizado.estado };
  });

  // Crear afiliado + su cuenta de acceso (invitación para fijar contraseña)
  app.post('/', auth, async (request, reply) => {
    const b = request.body as any;
    const nombre = b.nombre?.trim();
    const email = b.email?.trim().toLowerCase();
    if (!nombre || !email) return reply.status(400).send({ error: 'Nombre y correo son obligatorios' });
    const errComercial = validarComercial(b);
    if (errComercial) return reply.status(400).send({ error: errComercial });
    if (await prisma.usuario.findUnique({ where: { email } })) {
      return reply.status(409).send({ error: 'Ya existe una cuenta con ese correo' });
    }

    const codigo = await codigoUnico(nombre);
    const token = crypto.randomBytes(32).toString('hex');
    const placeholder = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10);
    const pago = limpiarPago(b);

    const afiliado = await prisma.$transaction(async (tx) => {
      const af = await tx.afiliado.create({
        data: {
          nombre, codigo, porcentaje: b.porcentaje, duracionMeses: b.duracionMeses ?? null,
          telefono: b.telefono?.trim() || null, ...pago,
        },
      });
      await tx.usuario.create({
        data: {
          email, nombre, rol: 'AFILIADO', afiliadoId: af.id, password: placeholder,
          emailVerificado: true, // la crea el super admin
          resetToken: token, resetExpira: new Date(Date.now() + HORAS_INVITACION * 60 * 60 * 1000),
        },
      });
      return af;
    });

    const invitacionEnviada = correoConfigurado ? await enviarInvitacion(email, nombre, token) : false;
    return reply.status(201).send({
      id: afiliado.id, codigo, invitacionEnviada,
      inviteLink: `${baseFrontend()}/restablecer?token=${token}`,
    });
  });

  // Editar trato comercial, datos de pago y estado
  app.put('/:id', auth, async (request, reply) => {
    const { id } = request.params as any;
    const b = request.body as any;
    const errComercial = validarComercial(b);
    if (errComercial) return reply.status(400).send({ error: errComercial });
    const existe = await prisma.afiliado.findUnique({ where: { id } });
    if (!existe) return reply.status(404).send({ error: 'Afiliado no encontrado' });

    const pago = limpiarPago(b);
    await prisma.afiliado.update({
      where: { id },
      data: {
        nombre: b.nombre?.trim() || existe.nombre,
        porcentaje: b.porcentaje, duracionMeses: b.duracionMeses ?? null,
        telefono: b.telefono?.trim() || null, activo: typeof b.activo === 'boolean' ? b.activo : existe.activo,
        ...pago,
      },
    });
    // Refleja activo/inactivo también en la cuenta de acceso
    if (typeof b.activo === 'boolean') {
      await prisma.usuario.updateMany({ where: { afiliadoId: id }, data: { activo: b.activo } });
    }
    return { id };
  });

  // Activar/desactivar sin tocar el resto (evita reescribir los datos de pago)
  app.put('/:id/activo', auth, async (request, reply) => {
    const { id } = request.params as any;
    const { activo } = request.body as any;
    if (typeof activo !== 'boolean') return reply.status(400).send({ error: 'Estado inválido' });
    if (!(await prisma.afiliado.findUnique({ where: { id } }))) {
      return reply.status(404).send({ error: 'Afiliado no encontrado' });
    }
    await prisma.afiliado.update({ where: { id }, data: { activo } });
    await prisma.usuario.updateMany({ where: { afiliadoId: id }, data: { activo } });
    return { id, activo };
  });

  // Reenviar invitación (regenera el token de "crear contraseña")
  app.post('/:id/reinvitar', auth, async (request, reply) => {
    const { id } = request.params as any;
    const [usuario, afiliado] = await Promise.all([
      prisma.usuario.findFirst({ where: { afiliadoId: id } }),
      prisma.afiliado.findUnique({ where: { id } }),
    ]);
    if (!usuario || !afiliado) return reply.status(404).send({ error: 'Afiliado no encontrado' });
    const token = crypto.randomBytes(32).toString('hex');
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { resetToken: token, resetExpira: new Date(Date.now() + HORAS_INVITACION * 60 * 60 * 1000) },
    });
    const invitacionEnviada = correoConfigurado ? await enviarInvitacion(usuario.email, afiliado.nombre, token) : false;
    return { invitacionEnviada, inviteLink: `${baseFrontend()}/restablecer?token=${token}` };
  });
}
