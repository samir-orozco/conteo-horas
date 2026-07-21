"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = adminRoutes;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const index_1 = require("../index");
const suscripcion_1 = require("../utils/suscripcion");
const planes_1 = require("../utils/planes");
const DIA_MS = 24 * 60 * 60 * 1000;
async function adminRoutes(app) {
    const auth = { preHandler: [app.requireSuperAdmin] };
    // Empresa con su estado real de suscripción y tarifa actual
    async function empresaConEstado(empresaId) {
        const [precios, planes] = await Promise.all([(0, suscripcion_1.obtenerPrecios)(index_1.prisma), (0, planes_1.obtenerPlanes)(index_1.prisma)]);
        const empresa = await index_1.prisma.empresa.findUnique({
            where: { id: empresaId },
            include: {
                suscripcion: { include: { pagos: { orderBy: { creadoEn: 'desc' } } } },
                usuarios: { select: { id: true, email: true, nombre: true, rol: true, activo: true, emailVerificado: true } },
                _count: { select: { colaboradores: { where: { activo: true } } } },
            },
        });
        if (!empresa)
            return null;
        const susc = empresa.suscripcion ? await (0, suscripcion_1.sincronizarEstado)(index_1.prisma, empresa.suscripcion) : null;
        const colaboradoresActivos = empresa._count.colaboradores;
        return {
            ...empresa,
            colaboradoresActivos,
            tarifaMensual: (0, suscripcion_1.tarifaEmpresa)(colaboradoresActivos, precios, susc, empresa.exentaPago, planes),
            capacidades: (0, planes_1.capacidadesDe)(susc, empresa.exentaPago, planes),
            suscripcion: susc
                ? { ...susc, estadoEfectivo: (0, suscripcion_1.estadoEfectivo)(susc), diasMora: (0, suscripcion_1.diasDeMora)(susc), pagos: empresa.suscripcion.pagos }
                : null,
        };
    }
    // ===== Configuración de precios de la plataforma =====
    app.get('/configuracion', auth, async () => {
        return (0, suscripcion_1.obtenerPrecios)(index_1.prisma);
    });
    app.put('/configuracion', auth, async (request, reply) => {
        const { precioTramo1, limiteTramo1, precioTramo2 } = request.body;
        if ([precioTramo1, limiteTramo1, precioTramo2].some(v => typeof v !== 'number' || v < 0)) {
            return reply.status(400).send({ error: 'Valores de precio inválidos' });
        }
        return index_1.prisma.configuracionPlataforma.upsert({
            where: { id: 1 },
            update: { precioTramo1, limiteTramo1, precioTramo2 },
            create: { id: 1, precioTramo1, limiteTramo1, precioTramo2 },
        });
    });
    // ===== Planes editables (precio, límite, funciones) =====
    app.get('/planes', auth, async () => {
        const planes = await (0, planes_1.obtenerPlanes)(index_1.prisma);
        return { planes, funciones: planes_1.FEATURES, orden: planes_1.PLAN_IDS };
    });
    app.put('/planes', auth, async (request, reply) => {
        const body = (request.body ?? {});
        const clavesFuncion = new Set(planes_1.FEATURES.map(f => f.key));
        const overrides = {};
        for (const id of planes_1.PLAN_IDS) {
            const p = body[id];
            if (!p || typeof p !== 'object')
                continue;
            const limpio = {};
            if (Number.isFinite(p.precioMensual) && p.precioMensual >= 0)
                limpio.precioMensual = Math.round(p.precioMensual);
            if (Number.isFinite(p.precioAnual) && p.precioAnual >= 0)
                limpio.precioAnual = Math.round(p.precioAnual);
            if (Number.isFinite(p.limite) && p.limite >= 1)
                limpio.limite = Math.round(p.limite);
            if (p.features && typeof p.features === 'object') {
                const f = {};
                for (const [k, v] of Object.entries(p.features))
                    if (clavesFuncion.has(k))
                        f[k] = !!v;
                limpio.features = f;
            }
            overrides[id] = limpio;
        }
        await index_1.prisma.configuracionPlataforma.upsert({
            where: { id: 1 },
            update: { planes: overrides },
            create: { id: 1, planes: overrides },
        });
        // Devuelve ya combinado (defaults + overrides) para refrescar la UI
        return { planes: (0, planes_1.combinarPlanes)(overrides), funciones: planes_1.FEATURES, orden: planes_1.PLAN_IDS };
    });
    // ===== Dashboard =====
    app.get('/dashboard', auth, async () => {
        const [precios, planes, empresas, suscripciones, pagos] = await Promise.all([
            (0, suscripcion_1.obtenerPrecios)(index_1.prisma),
            (0, planes_1.obtenerPlanes)(index_1.prisma),
            index_1.prisma.empresa.findMany({ include: { _count: { select: { colaboradores: { where: { activo: true } } } } } }),
            index_1.prisma.suscripcion.findMany(),
            index_1.prisma.pago.findMany({ where: { estado: 'APROBADO' } }),
        ]);
        const ahora = new Date();
        const inicioMes = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), 1));
        const estados = suscripciones.map(s => (0, suscripcion_1.estadoEfectivo)(s));
        const ingresosMes = pagos.filter(p => p.creadoEn >= inicioMes).reduce((s, p) => s + p.monto, 0);
        const ingresosTotales = pagos.reduce((s, p) => s + p.monto, 0);
        // Ingreso mensual recurrente proyectado con las empresas activas/en prueba
        const suscPorEmpresa = new Map(suscripciones.map(s => [s.empresaId, s]));
        const mrrProyectado = empresas
            .filter((e) => e.activa && !e.exentaPago && ['PRUEBA', 'ACTIVA', 'EN_MORA'].includes(estados[suscripciones.findIndex(s => s.empresaId === e.id)] ?? ''))
            .reduce((s, e) => s + (0, suscripcion_1.tarifaEmpresa)(e._count.colaboradores, precios, suscPorEmpresa.get(e.id), false, planes), 0);
        return {
            totalEmpresas: empresas.length,
            empresasActivas: empresas.filter(e => e.activa).length,
            colaboradoresTotales: empresas.reduce((s, e) => s + e._count.colaboradores, 0),
            suscripciones: {
                prueba: estados.filter(e => e === 'PRUEBA').length,
                activas: estados.filter(e => e === 'ACTIVA').length,
                enMora: estados.filter(e => e === 'EN_MORA').length,
                suspendidas: estados.filter(e => e === 'SUSPENDIDA').length,
            },
            ingresosMes,
            ingresosTotales,
            mrrProyectado,
            precios,
        };
    });
    // ===== Empresas =====
    app.get('/empresas', auth, async () => {
        const [precios, planes] = await Promise.all([(0, suscripcion_1.obtenerPrecios)(index_1.prisma), (0, planes_1.obtenerPlanes)(index_1.prisma)]);
        const empresas = await index_1.prisma.empresa.findMany({
            include: {
                suscripcion: true,
                _count: { select: { colaboradores: { where: { activo: true } } } },
            },
            orderBy: { creadoEn: 'desc' },
        });
        return Promise.all(empresas.map(async (e) => {
            const susc = e.suscripcion ? await (0, suscripcion_1.sincronizarEstado)(index_1.prisma, e.suscripcion) : null;
            return {
                id: e.id,
                nombre: e.nombre,
                nit: e.nit,
                email: e.email,
                telefono: e.telefono,
                marcadorToken: e.marcadorToken,
                exentaPago: e.exentaPago,
                activa: e.activa,
                creadoEn: e.creadoEn,
                colaboradoresActivos: e._count.colaboradores,
                tarifaMensual: (0, suscripcion_1.tarifaEmpresa)(e._count.colaboradores, precios, susc, e.exentaPago, planes),
                precioModo: susc?.precioModo ?? null,
                plan: susc?.plan ?? null,
                cicloPago: susc?.cicloPago ?? 'MENSUAL',
                estadoSuscripcion: e.exentaPago ? 'ILIMITADA' : susc ? (0, suscripcion_1.estadoEfectivo)(susc) : null,
                diasMora: e.exentaPago ? 0 : susc ? (0, suscripcion_1.diasDeMora)(susc) : 0,
                pagadoHasta: susc?.pagadoHasta ?? null,
                finPrueba: susc?.finPrueba ?? null,
            };
        }));
    });
    app.get('/empresas/:id', auth, async (request, reply) => {
        const { id } = request.params;
        const empresa = await empresaConEstado(id);
        if (!empresa)
            return reply.status(404).send({ error: 'Empresa no encontrada' });
        return empresa;
    });
    // Crea empresa + suscripción en prueba (7 días) + usuario admin inicial
    app.post('/empresas', auth, async (request, reply) => {
        const { nombre, nit, email, telefono, admin } = request.body;
        if (!admin?.email || !admin?.password) {
            return reply.status(400).send({ error: 'Falta el usuario administrador inicial' });
        }
        const hash = await bcryptjs_1.default.hash(admin.password, 10);
        try {
            const empresa = await index_1.prisma.$transaction(async (tx) => {
                const emp = await tx.empresa.create({ data: { nombre, nit, email, telefono } });
                await tx.suscripcion.create({
                    data: { empresaId: emp.id, estado: 'PRUEBA', finPrueba: new Date(Date.now() + suscripcion_1.DIAS_PRUEBA * DIA_MS) },
                });
                await tx.usuario.create({
                    data: { email: admin.email, password: hash, nombre: admin.nombre, rol: 'ADMIN', empresaId: emp.id },
                });
                return emp;
            });
            return reply.status(201).send(await empresaConEstado(empresa.id));
        }
        catch (e) {
            if (e.code === 'P2002')
                return reply.status(409).send({ error: 'NIT o email de administrador ya registrado' });
            throw e;
        }
    });
    app.put('/empresas/:id', auth, async (request, reply) => {
        const { id } = request.params;
        const { nombre, nit, email, telefono, activa, exentaPago } = request.body;
        const existente = await index_1.prisma.empresa.findUnique({ where: { id } });
        if (!existente)
            return reply.status(404).send({ error: 'Empresa no encontrada' });
        await index_1.prisma.empresa.update({ where: { id }, data: { nombre, nit, email, telefono, activa, exentaPago } });
        return empresaConEstado(id);
    });
    // Ampliar / fijar el fin de la prueba gratuita. Si la empresa estaba en mora o
    // suspendida (y nunca ha pagado), la reactiva volviéndola a PRUEBA.
    app.put('/empresas/:id/prueba', auth, async (request, reply) => {
        const { id } = request.params;
        const { finPrueba } = request.body;
        const nueva = finPrueba ? new Date(finPrueba) : null;
        if (!nueva || isNaN(nueva.getTime()))
            return reply.status(400).send({ error: 'Fecha inválida' });
        const susc = await index_1.prisma.suscripcion.findUnique({ where: { empresaId: id } });
        if (!susc)
            return reply.status(404).send({ error: 'La empresa no tiene suscripción' });
        // Reactivar solo si aún está en fase de prueba (nunca pagó un período)
        const reactivar = !susc.pagadoHasta;
        await index_1.prisma.suscripcion.update({
            where: { empresaId: id },
            data: {
                finPrueba: nueva,
                ...(reactivar ? { estado: 'PRUEBA', suspendidaEn: null } : {}),
            },
        });
        return empresaConEstado(id);
    });
    // Plan del cliente + personalización (límite y funciones extra) para casos a la medida
    app.put('/empresas/:id/plan', auth, async (request, reply) => {
        const { id } = request.params;
        const { plan, cicloPago, limiteOverride, funcionesOverride } = request.body;
        const susc = await index_1.prisma.suscripcion.findUnique({ where: { empresaId: id } });
        if (!susc)
            return reply.status(404).send({ error: 'La empresa no tiene suscripción' });
        if (plan !== undefined && !(0, planes_1.esPlan)(plan))
            return reply.status(400).send({ error: 'Plan inválido' });
        // Solo se guardan flags de funciones conocidas
        let funcionesLimpias = funcionesOverride;
        if (funcionesOverride && typeof funcionesOverride === 'object') {
            const validas = new Set(planes_1.FEATURES.map(f => f.key));
            funcionesLimpias = {};
            for (const [k, v] of Object.entries(funcionesOverride)) {
                if (validas.has(k))
                    funcionesLimpias[k] = !!v;
            }
        }
        await index_1.prisma.suscripcion.update({
            where: { empresaId: id },
            data: {
                ...(plan !== undefined ? { plan } : {}),
                ...(cicloPago !== undefined ? { cicloPago: cicloPago === 'ANUAL' ? 'ANUAL' : 'MENSUAL' } : {}),
                ...(limiteOverride !== undefined ? { limiteOverride: limiteOverride === null ? null : Math.max(1, Number(limiteOverride)) } : {}),
                ...(funcionesOverride !== undefined ? { funcionesOverride: funcionesLimpias } : {}),
            },
        });
        return empresaConEstado(id);
    });
    // Precio personalizado del cliente: GLOBAL (usa el del plan) o FIJO
    app.put('/empresas/:id/precio', auth, async (request, reply) => {
        const { modo, precioFijo, precioTramo1, limiteTramo1, precioTramo2 } = request.body;
        const { id } = request.params;
        const susc = await index_1.prisma.suscripcion.findUnique({ where: { empresaId: id } });
        if (!susc)
            return reply.status(404).send({ error: 'La empresa no tiene suscripción' });
        if (modo === 'GLOBAL' || modo == null) {
            await index_1.prisma.suscripcion.update({
                where: { empresaId: id },
                data: { precioModo: null, precioFijo: null, precioTramo1: null, limiteTramo1: null, precioTramo2: null },
            });
        }
        else if (modo === 'FIJO') {
            if (typeof precioFijo !== 'number' || precioFijo < 0)
                return reply.status(400).send({ error: 'Precio fijo inválido' });
            await index_1.prisma.suscripcion.update({
                where: { empresaId: id },
                data: { precioModo: 'FIJO', precioFijo: Math.round(precioFijo), precioTramo1: null, limiteTramo1: null, precioTramo2: null },
            });
        }
        else if (modo === 'TRAMOS') {
            if ([precioTramo1, limiteTramo1, precioTramo2].some(v => typeof v !== 'number' || v < 0)) {
                return reply.status(400).send({ error: 'Tramos inválidos' });
            }
            await index_1.prisma.suscripcion.update({
                where: { empresaId: id },
                data: { precioModo: 'TRAMOS', precioFijo: null, precioTramo1, limiteTramo1, precioTramo2 },
            });
        }
        else {
            return reply.status(400).send({ error: 'Modo de precio inválido' });
        }
        return empresaConEstado(id);
    });
    // Verificar manualmente el correo de un usuario (cuando el correo falla).
    // Deja al usuario entrar al sistema sin el código de verificación.
    app.put('/usuarios/:id/verificar', auth, async (request, reply) => {
        const { id } = request.params;
        const usuario = await index_1.prisma.usuario.findUnique({ where: { id } });
        if (!usuario)
            return reply.status(404).send({ error: 'Usuario no encontrado' });
        await index_1.prisma.usuario.update({
            where: { id },
            data: { emailVerificado: true, verificacionCodigo: null, verificacionExpira: null },
        });
        // Devuelve la ficha de la empresa para refrescar la lista de usuarios
        return usuario.empresaId ? empresaConEstado(usuario.empresaId) : { ok: true };
    });
    // Cobro sugerido hoy (para prellenar el modal de registro de pago)
    app.get('/empresas/:id/cobro', auth, async (request, reply) => {
        const { id } = request.params;
        const empresa = await index_1.prisma.empresa.findUnique({ where: { id } });
        if (!empresa)
            return reply.status(404).send({ error: 'Empresa no encontrada' });
        const precios = await (0, suscripcion_1.obtenerPrecios)(index_1.prisma);
        return (0, suscripcion_1.calcularCobro)(index_1.prisma, id, precios);
    });
    // ===== Pagos =====
    // Registra un pago recibido por fuera de Wompi (transferencia, efectivo).
    // Si no llega monto, se cobra lo que se debe hoy (mes o adición prorrateada).
    app.post('/empresas/:id/pagos', auth, async (request, reply) => {
        const { id } = request.params;
        const { monto, metodo, wompiTransaccionId, nota, comprobanteBase64 } = request.body;
        const susc = await index_1.prisma.suscripcion.findUnique({ where: { empresaId: id } });
        if (!susc)
            return reply.status(404).send({ error: 'La empresa no tiene suscripción' });
        const payload = request.user;
        const precios = await (0, suscripcion_1.obtenerPrecios)(index_1.prisma);
        const cobro = await (0, suscripcion_1.calcularCobro)(index_1.prisma, id, precios);
        const pago = await (0, suscripcion_1.aplicarPagoAprobado)(index_1.prisma, id, {
            monto: monto ?? cobro.monto,
            metodo: metodo ?? 'MANUAL',
            wompiTransaccionId,
            nota,
            comprobanteBase64,
            registradoPor: payload?.email,
        });
        return reply.status(201).send({ ...pago, comprobanteBase64: undefined });
    });
    // Listado liviano: el comprobante (imagen) solo viaja en el detalle
    app.get('/pagos', auth, async () => {
        const pagos = await index_1.prisma.pago.findMany({
            select: {
                id: true, monto: true, colaboradoresFacturados: true, periodoInicio: true, periodoFin: true,
                metodo: true, estado: true, wompiTransaccionId: true, nota: true, registradoPor: true, creadoEn: true,
                suscripcion: { select: { empresa: { select: { nombre: true, nit: true, email: true } } } },
            },
            orderBy: { creadoEn: 'desc' },
        });
        const conFlag = await index_1.prisma.pago.findMany({
            where: { comprobanteBase64: { not: null } },
            select: { id: true },
        });
        const ids = new Set(conFlag.map(p => p.id));
        return pagos.map(p => ({ ...p, tieneComprobante: ids.has(p.id) }));
    });
    app.get('/pagos/:id', auth, async (request, reply) => {
        const { id } = request.params;
        const pago = await index_1.prisma.pago.findUnique({
            where: { id },
            include: { suscripcion: { include: { empresa: { select: { nombre: true, nit: true, email: true, telefono: true } } } } },
        });
        if (!pago)
            return reply.status(404).send({ error: 'Pago no encontrado' });
        return pago;
    });
    // ===== Reporte de ingresos (por mes de un año) =====
    app.get('/ingresos', auth, async (request) => {
        const { anio } = request.query;
        const year = Number(anio) || new Date().getUTCFullYear();
        const pagos = await index_1.prisma.pago.findMany({
            where: {
                estado: 'APROBADO',
                creadoEn: { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) },
            },
            include: { suscripcion: { include: { empresa: { select: { nombre: true } } } } },
        });
        const porMes = Array.from({ length: 12 }, (_, m) => ({
            mes: m + 1,
            total: 0,
            pagos: 0,
        }));
        for (const p of pagos) {
            const m = p.creadoEn.getUTCMonth();
            porMes[m].total += p.monto;
            porMes[m].pagos += 1;
        }
        return { anio: year, total: pagos.reduce((s, p) => s + p.monto, 0), porMes };
    });
    // ===== Morosos =====
    app.get('/morosos', auth, async () => {
        const precios = await (0, suscripcion_1.obtenerPrecios)(index_1.prisma);
        const suscripciones = await index_1.prisma.suscripcion.findMany({
            include: {
                empresa: {
                    include: { _count: { select: { colaboradores: { where: { activo: true } } } } },
                },
            },
        });
        const morosos = [];
        for (const s of suscripciones) {
            if (s.empresa.exentaPago)
                continue; // ilimitadas nunca son morosas
            const sync = await (0, suscripcion_1.sincronizarEstado)(index_1.prisma, s);
            const estado = (0, suscripcion_1.estadoEfectivo)(sync);
            if (estado === 'EN_MORA' || estado === 'SUSPENDIDA') {
                morosos.push({
                    empresaId: s.empresaId,
                    empresa: s.empresa.nombre,
                    nit: s.empresa.nit,
                    email: s.empresa.email,
                    telefono: s.empresa.telefono,
                    estado,
                    diasMora: (0, suscripcion_1.diasDeMora)(sync),
                    vencioEl: sync.pagadoHasta ?? sync.finPrueba,
                    montoAdeudado: (0, suscripcion_1.calcularTarifaMensual)(s.empresa._count.colaboradores, precios),
                });
            }
        }
        return morosos.sort((a, b) => b.diasMora - a.diasMora);
    });
}
