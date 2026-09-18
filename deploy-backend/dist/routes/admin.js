"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = adminRoutes;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = require("../prisma");
const suscripcion_1 = require("../utils/suscripcion");
const planes_1 = require("../utils/planes");
const comprobantes_1 = require("../utils/comprobantes");
const eliminarEmpresa_1 = require("../utils/eliminarEmpresa");
const borrarEmpresaEnCascada_1 = require("../utils/borrarEmpresaEnCascada");
const sedesDeEmpresa_1 = require("../utils/sedesDeEmpresa");
const vigenciaDelAuxilio_1 = require("../utils/vigenciaDelAuxilio");
const DIA_MS = 24 * 60 * 60 * 1000;
async function adminRoutes(app) {
    const auth = { preHandler: [app.requireSuperAdmin] };
    // ===== Auxilio de transporte: las vigencias del decreto =====
    //
    // Cada enero el gobierno fija el salario mínimo y el auxilio. Hasta hoy vivían en el `seed`, así
    // que actualizarlos exigía un despliegue completo; ahora se agregan desde la pantalla de la
    // plataforma.
    //
    // Se AGREGA una fila por año y las anteriores no se tocan. Editar la vieja reescribiría la
    // historia: un reporte de diciembre pasaría a liquidarse con el decreto de enero. El upsert va por
    // fecha, así que reenviar la misma fecha corrige esa fila (una digitación mal puesta) y una fecha
    // nueva es un año nuevo.
    app.get('/auxilios', auth, async () => {
        return prisma_1.prisma.auxilioVigencia.findMany({ orderBy: { vigenteDesde: 'desc' } });
    });
    app.post('/auxilios', auth, async (request, reply) => {
        const vigencia = (0, vigenciaDelAuxilio_1.normalizarVigencia)((request.body ?? {}));
        if (vigencia === vigenciaDelAuxilio_1.VIGENCIA_INVALIDA) {
            return reply.status(400).send({
                error: 'Revisa los datos: la fecha va como AAAA-MM-DD, el auxilio no puede ser negativo y el tope tiene que ser mayor que el auxilio.',
            });
        }
        return prisma_1.prisma.auxilioVigencia.upsert({
            where: { vigenteDesde: vigencia.vigenteDesde },
            update: { valor: vigencia.valor, tope: vigencia.tope },
            create: vigencia,
        });
    });
    // Empresa con su estado real de suscripción y tarifa actual
    async function empresaConEstado(empresaId) {
        const [precios, planes] = await Promise.all([(0, suscripcion_1.obtenerPrecios)(prisma_1.prisma), (0, planes_1.obtenerPlanes)(prisma_1.prisma)]);
        const empresa = await prisma_1.prisma.empresa.findUnique({
            where: { id: empresaId },
            include: {
                suscripcion: { include: { pagos: { orderBy: { creadoEn: 'desc' } } } },
                usuarios: { select: { id: true, email: true, nombre: true, rol: true, activo: true, emailVerificado: true } },
                _count: { select: { colaboradores: { where: { activo: true } } } },
            },
        });
        if (!empresa)
            return null;
        const susc = empresa.suscripcion ? await (0, suscripcion_1.sincronizarEstado)(prisma_1.prisma, empresa.suscripcion) : null;
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
        return (0, suscripcion_1.obtenerPrecios)(prisma_1.prisma);
    });
    app.put('/configuracion', auth, async (request, reply) => {
        const { precioTramo1, limiteTramo1, precioTramo2 } = request.body;
        if ([precioTramo1, limiteTramo1, precioTramo2].some(v => typeof v !== 'number' || v < 0)) {
            return reply.status(400).send({ error: 'Valores de precio inválidos' });
        }
        return prisma_1.prisma.configuracionPlataforma.upsert({
            where: { id: 1 },
            update: { precioTramo1, limiteTramo1, precioTramo2 },
            create: { id: 1, precioTramo1, limiteTramo1, precioTramo2 },
        });
    });
    // ===== Planes editables (precio, límite, funciones) =====
    app.get('/planes', auth, async () => {
        const planes = await (0, planes_1.obtenerPlanes)(prisma_1.prisma);
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
        await prisma_1.prisma.configuracionPlataforma.upsert({
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
            (0, suscripcion_1.obtenerPrecios)(prisma_1.prisma),
            (0, planes_1.obtenerPlanes)(prisma_1.prisma),
            prisma_1.prisma.empresa.findMany({ include: { _count: { select: { colaboradores: { where: { activo: true } } } } } }),
            prisma_1.prisma.suscripcion.findMany(),
            prisma_1.prisma.pago.findMany({ where: { estado: 'APROBADO' } }),
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
        const [precios, planes] = await Promise.all([(0, suscripcion_1.obtenerPrecios)(prisma_1.prisma), (0, planes_1.obtenerPlanes)(prisma_1.prisma)]);
        const empresas = await prisma_1.prisma.empresa.findMany({
            include: {
                suscripcion: true,
                _count: { select: { colaboradores: { where: { activo: true } } } },
            },
            orderBy: { creadoEn: 'desc' },
        });
        return Promise.all(empresas.map(async (e) => {
            const susc = e.suscripcion ? await (0, suscripcion_1.sincronizarEstado)(prisma_1.prisma, e.suscripcion) : null;
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
            const empresa = await prisma_1.prisma.$transaction(async (tx) => {
                // Nace revisada, igual que en el registro: sus colaboradores se capturan con el salario
                // básico y el auxilio ya separados, así que no tiene nada que corregir.
                const emp = await tx.empresa.create({ data: { nombre, nit, email, telefono, auxilioRevisadoEn: new Date() } });
                await tx.suscripcion.create({
                    data: { empresaId: emp.id, estado: 'PRUEBA', finPrueba: new Date(Date.now() + suscripcion_1.DIAS_PRUEBA * DIA_MS) },
                });
                // Quien trabaja presencial siempre tiene sede, así que la empresa nace con una.
                await (0, sedesDeEmpresa_1.crearSedePrincipal)(tx, emp.id);
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
        const existente = await prisma_1.prisma.empresa.findUnique({ where: { id } });
        if (!existente)
            return reply.status(404).send({ error: 'Empresa no encontrada' });
        await prisma_1.prisma.empresa.update({ where: { id }, data: { nombre, nit, email, telefono, activa, exentaPago } });
        return empresaConEstado(id);
    });
    // ===== Eliminar empresa (irreversible) =====
    //
    // Se lleva por delante colaboradores, marcaciones, contratos, pagos y
    // comisiones, en veinte tablas. DECISIÓN DEL DUEÑO (10 de septiembre de 2026):
    // cualquier empresa se puede borrar; el modal advierte qué se pierde, incluida
    // la plata, y se confirma escribiendo el NIT. La decisión vive en
    // utils/eliminarEmpresa.ts; la cascada en utils/borrarEmpresaEnCascada.ts,
    // verificada contra MySQL con prisma/verificar-eliminar-empresa.ts (CLAUDE.md
    // 8.6); y lo que responden estas dos rutas, en admin.eliminar.test.ts.
    // Qué se llevaría por delante, para el modal.
    async function resumenEliminacion(id) {
        const empresa = await prisma_1.prisma.empresa.findUnique({
            where: { id },
            select: { id: true, nombre: true, nit: true },
        });
        if (!empresa)
            return null;
        const [colaboradores, registros, pagos, comisiones] = await Promise.all([
            prisma_1.prisma.colaborador.count({ where: { empresaId: id } }),
            prisma_1.prisma.registro.count({ where: { colaborador: { empresaId: id } } }),
            // Solo los APROBADO: son los que suma /admin/ingresos.
            prisma_1.prisma.pago.aggregate({
                where: { estado: 'APROBADO', suscripcion: { empresaId: id } },
                _count: { _all: true }, _sum: { monto: true },
            }),
            prisma_1.prisma.comision.aggregate({ where: { empresaId: id }, _count: { _all: true }, _sum: { monto: true } }),
        ]);
        return {
            ...empresa,
            colaboradores,
            registros,
            pagosAprobados: pagos._count._all,
            montoPagosAprobados: pagos._sum.monto ?? 0,
            comisiones: comisiones._count._all,
            montoComisiones: comisiones._sum.monto ?? 0,
        };
    }
    app.get('/empresas/:id/eliminacion', auth, async (request, reply) => {
        const { id } = request.params;
        const resumen = await resumenEliminacion(id);
        if (!resumen)
            return reply.status(404).send({ error: 'Empresa no encontrada' });
        return resumen;
    });
    // POST y no DELETE porque lleva cuerpo (el NIT escrito a mano). Un DELETE con
    // cuerpo funciona en Fastify, pero no siempre sobrevive al proxy del hosting,
    // y eso no es algo que uno quiera descubrir en producción.
    app.post('/empresas/:id/eliminar', auth, async (request, reply) => {
        const { id } = request.params;
        // El cuerpo lo arma quien llama, no la pantalla: puede no venir, o venir con
        // cualquier cosa. Antes, sin cuerpo, la ruta respondía 500 al desestructurar.
        const confirmacion = request.body?.confirmacion;
        // El token de super admin dura 7 días y requireSuperAdmin solo mira su firma.
        // Para lo único que no tiene vuelta atrás se comprueba además que la cuenta
        // siga existiendo, activa y con ese rol.
        const quien = request.user;
        const cuenta = quien?.id
            ? await prisma_1.prisma.usuario.findUnique({ where: { id: quien.id }, select: { rol: true, activo: true } })
            : null;
        if (!cuenta || cuenta.rol !== 'SUPER_ADMIN' || !cuenta.activo) {
            return reply.status(403).send({ error: 'Tu cuenta ya no puede eliminar empresas. Vuelve a iniciar sesión.' });
        }
        const resumen = await resumenEliminacion(id);
        if (!resumen)
            return reply.status(404).send({ error: 'Empresa no encontrada' });
        const veredicto = (0, eliminarEmpresa_1.decidirEliminacion)(resumen.nit, confirmacion);
        if (!veredicto.permitido)
            return reply.status(400).send({ error: veredicto.mensaje });
        let borrado;
        try {
            // Una empresa con historial largo borra decenas de miles de filas y no cabe
            // en los 5 segundos que Prisma da por defecto. Medido el 10 de septiembre
            // de 2026: 30.000 marcaciones se borran en 1 a 2 segundos.
            borrado = await prisma_1.prisma.$transaction(tx => (0, borrarEmpresaEnCascada_1.borrarEmpresaEnCascada)(tx, id), { timeout: 60000 });
        }
        catch (e) {
            // La transacción se revierte entera: no se borró nada. Se dice así, en vez
            // del error genérico, que no dice si se alcanzó a borrar algo.
            request.log.error({ err: e, empresaId: id, nit: resumen.nit }, 'Falló la eliminación de la empresa; la transacción se revirtió');
            return reply.status(500).send({ error: 'No se pudo eliminar la empresa y no se borró nada. Intenta de nuevo en un momento.' });
        }
        // La empresa ya no estaba al pedir el candado: otra pestaña la borró primero.
        if (!borrado)
            return reply.status(404).send({ error: 'Empresa no encontrada' });
        // Queda huella siempre: es irreversible y no hay forma de reconstruir qué
        // había. Lleva la plata porque el reporte de ingresos y la billetera del
        // afiliado cambian con este borrado, y esta línea es lo que explica por qué.
        request.log.warn({
            empresaId: id,
            nit: resumen.nit,
            nombre: resumen.nombre,
            colaboradores: resumen.colaboradores,
            registros: resumen.registros,
            pagosAprobados: resumen.pagosAprobados,
            montoPagosAprobados: resumen.montoPagosAprobados,
            comisiones: resumen.comisiones,
            montoComisiones: resumen.montoComisiones,
            filasBorradas: borrado,
            porEmail: quien?.email,
        }, 'Empresa eliminada por el super admin');
        return reply.status(204).send();
    });
    // Ampliar / fijar el fin de la prueba gratuita. Si la empresa estaba en mora o
    // suspendida (y nunca ha pagado), la reactiva volviéndola a PRUEBA.
    app.put('/empresas/:id/prueba', auth, async (request, reply) => {
        const { id } = request.params;
        const { finPrueba } = request.body;
        const nueva = finPrueba ? new Date(finPrueba) : null;
        if (!nueva || isNaN(nueva.getTime()))
            return reply.status(400).send({ error: 'Fecha inválida' });
        const susc = await prisma_1.prisma.suscripcion.findUnique({ where: { empresaId: id } });
        if (!susc)
            return reply.status(404).send({ error: 'La empresa no tiene suscripción' });
        // Reactivar solo si aún está en fase de prueba (nunca pagó un período)
        const reactivar = !susc.pagadoHasta;
        await prisma_1.prisma.suscripcion.update({
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
        const susc = await prisma_1.prisma.suscripcion.findUnique({ where: { empresaId: id } });
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
        await prisma_1.prisma.suscripcion.update({
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
        const susc = await prisma_1.prisma.suscripcion.findUnique({ where: { empresaId: id } });
        if (!susc)
            return reply.status(404).send({ error: 'La empresa no tiene suscripción' });
        if (modo === 'GLOBAL' || modo == null) {
            await prisma_1.prisma.suscripcion.update({
                where: { empresaId: id },
                data: { precioModo: null, precioFijo: null, precioTramo1: null, limiteTramo1: null, precioTramo2: null },
            });
        }
        else if (modo === 'FIJO') {
            if (typeof precioFijo !== 'number' || precioFijo < 0)
                return reply.status(400).send({ error: 'Precio fijo inválido' });
            await prisma_1.prisma.suscripcion.update({
                where: { empresaId: id },
                data: { precioModo: 'FIJO', precioFijo: Math.round(precioFijo), precioTramo1: null, limiteTramo1: null, precioTramo2: null },
            });
        }
        else if (modo === 'TRAMOS') {
            if ([precioTramo1, limiteTramo1, precioTramo2].some(v => typeof v !== 'number' || v < 0)) {
                return reply.status(400).send({ error: 'Tramos inválidos' });
            }
            await prisma_1.prisma.suscripcion.update({
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
        const usuario = await prisma_1.prisma.usuario.findUnique({ where: { id } });
        if (!usuario)
            return reply.status(404).send({ error: 'Usuario no encontrado' });
        await prisma_1.prisma.usuario.update({
            where: { id },
            data: { emailVerificado: true, verificacionCodigo: null, verificacionExpira: null },
        });
        // Devuelve la ficha de la empresa para refrescar la lista de usuarios
        return usuario.empresaId ? empresaConEstado(usuario.empresaId) : { ok: true };
    });
    // Cobro sugerido hoy (para prellenar el modal de registro de pago)
    app.get('/empresas/:id/cobro', auth, async (request, reply) => {
        const { id } = request.params;
        const empresa = await prisma_1.prisma.empresa.findUnique({ where: { id } });
        if (!empresa)
            return reply.status(404).send({ error: 'Empresa no encontrada' });
        const precios = await (0, suscripcion_1.obtenerPrecios)(prisma_1.prisma);
        return (0, suscripcion_1.calcularCobro)(prisma_1.prisma, id, precios);
    });
    // ===== Pagos =====
    // Registra un pago recibido por fuera de Wompi (transferencia, efectivo).
    // Si no llega monto, se cobra lo que se debe hoy (mes o adición prorrateada).
    app.post('/empresas/:id/pagos', auth, async (request, reply) => {
        const { id } = request.params;
        const { monto, metodo, wompiTransaccionId, nota, comprobanteBase64 } = request.body;
        // El comprobante se comprueba antes de tocar la suscripción. Es la única
        // columna de archivo que no se validaba, y el archivo lo termina viendo el
        // admin de la empresa, no solo quien lo sube.
        const soporte = (0, comprobantes_1.comprobanteAGuardar)(comprobanteBase64, null);
        if (!soporte.ok)
            return reply.status(400).send({ error: soporte.motivo });
        const susc = await prisma_1.prisma.suscripcion.findUnique({ where: { empresaId: id } });
        if (!susc)
            return reply.status(404).send({ error: 'La empresa no tiene suscripción' });
        const payload = request.user;
        const precios = await (0, suscripcion_1.obtenerPrecios)(prisma_1.prisma);
        const cobro = await (0, suscripcion_1.calcularCobro)(prisma_1.prisma, id, precios);
        const pago = await (0, suscripcion_1.aplicarPagoAprobado)(prisma_1.prisma, id, {
            monto: monto ?? cobro.monto,
            metodo: metodo ?? 'MANUAL',
            wompiTransaccionId,
            nota,
            comprobanteBase64: soporte.comprobante ?? undefined,
            registradoPor: payload?.email,
        });
        return reply.status(201).send({ ...pago, comprobanteBase64: undefined });
    });
    // Listado liviano: el comprobante (imagen) solo viaja en el detalle
    app.get('/pagos', auth, async () => {
        const pagos = await prisma_1.prisma.pago.findMany({
            select: {
                id: true, monto: true, colaboradoresFacturados: true, periodoInicio: true, periodoFin: true,
                metodo: true, estado: true, wompiTransaccionId: true, nota: true, registradoPor: true, creadoEn: true,
                suscripcion: { select: { empresa: { select: { nombre: true, nit: true, email: true } } } },
            },
            orderBy: { creadoEn: 'desc' },
        });
        const conFlag = await prisma_1.prisma.pago.findMany({
            where: { comprobanteBase64: { not: null } },
            select: { id: true },
        });
        const ids = new Set(conFlag.map(p => p.id));
        return pagos.map(p => ({ ...p, tieneComprobante: ids.has(p.id) }));
    });
    app.get('/pagos/:id', auth, async (request, reply) => {
        const { id } = request.params;
        const pago = await prisma_1.prisma.pago.findUnique({
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
        const pagos = await prisma_1.prisma.pago.findMany({
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
        const precios = await (0, suscripcion_1.obtenerPrecios)(prisma_1.prisma);
        const suscripciones = await prisma_1.prisma.suscripcion.findMany({
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
            const sync = await (0, suscripcion_1.sincronizarEstado)(prisma_1.prisma, s);
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
