"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = afiliadoAdminRoutes;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const index_1 = require("../index");
const correo_1 = require("../utils/correo");
const afiliados_1 = require("../utils/afiliados");
// Rutas de gestión de afiliados para el SUPER ADMIN (prefijo /api/admin/afiliados).
// La cuenta de acceso del afiliado reusa Usuario (rol AFILIADO + afiliadoId), y la
// contraseña la fija el propio afiliado con el flujo de invitación (resetToken).
const HORAS_INVITACION = 24;
function baseFrontend() {
    return process.env.FRONTEND_ORIGIN?.split(',')[0] ?? 'http://localhost:5173';
}
// Código de referido único, legible, derivado del nombre: JUAN4821
function slugNombre(nombre) {
    // NFD separa los acentos en marcas combinantes y el filtro [^A-Z0-9] las quita:
    // "Juan Pérez" -> "JUANPEREZ"
    const s = (nombre || '').normalize('NFD').toUpperCase().replace(/[^A-Z0-9]+/g, '').slice(0, 10);
    return s || 'AFIL';
}
async function codigoUnico(nombre) {
    const base = slugNombre(nombre);
    for (let i = 0; i < 12; i++) {
        const codigo = `${base}${String(crypto_1.default.randomInt(0, 10000)).padStart(4, '0')}`;
        if (!(await index_1.prisma.afiliado.findUnique({ where: { codigo } })))
            return codigo;
    }
    return `AFIL${crypto_1.default.randomBytes(5).toString('hex').toUpperCase()}`;
}
async function enviarInvitacion(email, nombre, token) {
    const link = `${baseFrontend()}/restablecer?token=${token}`;
    try {
        await (0, correo_1.enviarCorreo)({
            para: email,
            asunto: 'Te damos acceso al programa de afiliados de HoraPro',
            html: (0, correo_1.plantillaCorreo)('Activa tu cuenta de afiliado', `
        <p style="font-size:14px;color:#303030">Hola ${nombre},</p>
        <p style="font-size:14px;color:#303030">Tienes acceso al panel de afiliados de HoraPro. Crea tu contraseña para entrar (el enlace vence en ${HORAS_INVITACION} horas):</p>
        <p style="margin:24px 0;text-align:center"><a href="${link}" style="background:#FFD85E;color:#303030;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:700;display:inline-block">Crear mi contraseña</a></p>
        <p style="font-size:12px;color:#898989">Si no esperabas esta invitación, ignora este correo.</p>
      `),
        });
        return true;
    }
    catch {
        return false; // el afiliado ya quedó creado; el admin puede compartir el link manual
    }
}
function validarComercial(b) {
    if (typeof b.porcentaje !== 'number' || b.porcentaje < 0 || b.porcentaje > 100) {
        return 'El porcentaje debe estar entre 0 y 100';
    }
    if (b.duracionMeses != null && (!Number.isInteger(b.duracionMeses) || b.duracionMeses < 0)) {
        return 'La duración debe ser un número de meses (o vacío para indefinido)';
    }
    return null;
}
async function afiliadoAdminRoutes(app) {
    const auth = { preHandler: [app.requireSuperAdmin] };
    // Lista de afiliados con su cuenta y # de referidos
    app.get('/', auth, async () => {
        const afiliados = await index_1.prisma.afiliado.findMany({
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
        const b = request.body;
        const errComercial = validarComercial(b);
        if (errComercial)
            return reply.status(400).send({ error: errComercial });
        const nombreRef = b.nombre?.trim() || 'Registro pendiente';
        const codigo = await codigoUnico(b.nombre?.trim() || 'AFIL');
        const afiliado = await index_1.prisma.afiliado.create({
            data: { nombre: nombreRef, codigo, porcentaje: b.porcentaje, duracionMeses: b.duracionMeses ?? null },
        });
        const token = app.jwt.sign({ afiliadoId: afiliado.id, t: 'reg' }, { expiresIn: '30d' });
        return reply.status(201).send({ id: afiliado.id, inviteLink: `${baseFrontend()}/afiliado/registro?token=${token}` });
    });
    // Detalle: datos + referidos + billetera
    app.get('/:id', auth, async (request, reply) => {
        const { id } = request.params;
        const a = await index_1.prisma.afiliado.findUnique({
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
        if (!a)
            return reply.status(404).send({ error: 'Afiliado no encontrado' });
        const u = a.usuarios[0];
        return {
            id: a.id, nombre: a.nombre, codigo: a.codigo, porcentaje: a.porcentaje, duracionMeses: a.duracionMeses,
            activo: a.activo, telefono: a.telefono, creadoEn: a.creadoEn,
            pago: { metodo: a.pagoMetodo, banco: a.pagoBanco, tipoCuenta: a.pagoTipoCuenta, numero: a.pagoNumero, titular: a.pagoTitular, documento: a.pagoDocumento },
            email: u?.email ?? null,
            invitacionPendiente: u ? !!u.resetToken : false,
            cuentaActiva: u?.activo ?? false,
            referidos: a.empresas.map(e => ({ id: e.id, nombre: e.nombre, nit: e.nit, estado: e.suscripcion?.estado ?? null, atribuidoEn: e.atribuidoEn })),
            billetera: (0, afiliados_1.calcularBilletera)(a.comisiones, a.retiros),
            comisiones: a.comisiones,
            retiros: a.retiros,
        };
    });
    // Solicitudes de retiro pendientes (para pagar), con los datos de pago del afiliado
    app.get('/retiros/pendientes', auth, async () => {
        return index_1.prisma.solicitudRetiro.findMany({
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
        const { retiroId } = request.params;
        const { estado, comprobanteBase64, nota } = request.body;
        if (!['APROBADO', 'PAGADO', 'RECHAZADO'].includes(estado)) {
            return reply.status(400).send({ error: 'Estado inválido' });
        }
        const retiro = await index_1.prisma.solicitudRetiro.findUnique({ where: { id: retiroId } });
        if (!retiro)
            return reply.status(404).send({ error: 'Solicitud no encontrada' });
        if (retiro.estado === 'PAGADO' || retiro.estado === 'RECHAZADO') {
            return reply.status(409).send({ error: 'La solicitud ya fue procesada' });
        }
        const email = request.user?.email ?? null;
        const actualizado = await index_1.prisma.solicitudRetiro.update({
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
        const b = request.body;
        const nombre = b.nombre?.trim();
        const email = b.email?.trim().toLowerCase();
        if (!nombre || !email)
            return reply.status(400).send({ error: 'Nombre y correo son obligatorios' });
        const errComercial = validarComercial(b);
        if (errComercial)
            return reply.status(400).send({ error: errComercial });
        if (await index_1.prisma.usuario.findUnique({ where: { email } })) {
            return reply.status(409).send({ error: 'Ya existe una cuenta con ese correo' });
        }
        const codigo = await codigoUnico(nombre);
        const token = crypto_1.default.randomBytes(32).toString('hex');
        const placeholder = await bcryptjs_1.default.hash(crypto_1.default.randomBytes(16).toString('hex'), 10);
        const pago = (0, afiliados_1.limpiarPago)(b);
        const afiliado = await index_1.prisma.$transaction(async (tx) => {
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
        const invitacionEnviada = correo_1.correoConfigurado ? await enviarInvitacion(email, nombre, token) : false;
        return reply.status(201).send({
            id: afiliado.id, codigo, invitacionEnviada,
            inviteLink: `${baseFrontend()}/restablecer?token=${token}`,
        });
    });
    // Editar trato comercial, datos de pago y estado
    app.put('/:id', auth, async (request, reply) => {
        const { id } = request.params;
        const b = request.body;
        const errComercial = validarComercial(b);
        if (errComercial)
            return reply.status(400).send({ error: errComercial });
        const existe = await index_1.prisma.afiliado.findUnique({ where: { id } });
        if (!existe)
            return reply.status(404).send({ error: 'Afiliado no encontrado' });
        const pago = (0, afiliados_1.limpiarPago)(b);
        await index_1.prisma.afiliado.update({
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
            await index_1.prisma.usuario.updateMany({ where: { afiliadoId: id }, data: { activo: b.activo } });
        }
        return { id };
    });
    // Activar/desactivar sin tocar el resto (evita reescribir los datos de pago)
    app.put('/:id/activo', auth, async (request, reply) => {
        const { id } = request.params;
        const { activo } = request.body;
        if (typeof activo !== 'boolean')
            return reply.status(400).send({ error: 'Estado inválido' });
        if (!(await index_1.prisma.afiliado.findUnique({ where: { id } }))) {
            return reply.status(404).send({ error: 'Afiliado no encontrado' });
        }
        await index_1.prisma.afiliado.update({ where: { id }, data: { activo } });
        await index_1.prisma.usuario.updateMany({ where: { afiliadoId: id }, data: { activo } });
        return { id, activo };
    });
    // Eliminar: solo si nunca tuvo actividad real (sin referidos, comisiones ni
    // retiros). Si ya la tuvo, se pierde el historial de pagos — mejor desactivar.
    app.delete('/:id', auth, async (request, reply) => {
        const { id } = request.params;
        const a = await index_1.prisma.afiliado.findUnique({
            where: { id },
            include: { _count: { select: { empresas: true, comisiones: true, retiros: true } } },
        });
        if (!a)
            return reply.status(404).send({ error: 'Afiliado no encontrado' });
        if (a._count.empresas > 0 || a._count.comisiones > 0 || a._count.retiros > 0) {
            return reply.status(409).send({ error: 'No se puede eliminar: tiene referidos, comisiones o retiros asociados. Desactívalo en su lugar.' });
        }
        await index_1.prisma.$transaction([
            index_1.prisma.usuario.deleteMany({ where: { afiliadoId: id } }),
            index_1.prisma.afiliado.delete({ where: { id } }),
        ]);
        return reply.status(204).send();
    });
    // Reenviar invitación (regenera el token de "crear contraseña")
    app.post('/:id/reinvitar', auth, async (request, reply) => {
        const { id } = request.params;
        const [usuario, afiliado] = await Promise.all([
            index_1.prisma.usuario.findFirst({ where: { afiliadoId: id } }),
            index_1.prisma.afiliado.findUnique({ where: { id } }),
        ]);
        if (!usuario || !afiliado)
            return reply.status(404).send({ error: 'Afiliado no encontrado' });
        const token = crypto_1.default.randomBytes(32).toString('hex');
        await index_1.prisma.usuario.update({
            where: { id: usuario.id },
            data: { resetToken: token, resetExpira: new Date(Date.now() + HORAS_INVITACION * 60 * 60 * 1000) },
        });
        const invitacionEnviada = correo_1.correoConfigurado ? await enviarInvitacion(usuario.email, afiliado.nombre, token) : false;
        return { invitacionEnviada, inviteLink: `${baseFrontend()}/restablecer?token=${token}` };
    });
}
