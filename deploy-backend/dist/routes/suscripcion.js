"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = suscripcionRoutes;
const index_1 = require("../index");
const suscripcion_1 = require("../utils/suscripcion");
const wompi_1 = require("../utils/wompi");
const capacidades_1 = require("../utils/capacidades");
const planes_1 = require("../utils/planes");
// Estado de cuenta y pago de la propia empresa.
// No usa requireEmpresa: una empresa SUSPENDIDA necesita entrar aquí para pagar.
async function suscripcionRoutes(app) {
    async function empresaDelToken(request, reply) {
        try {
            await request.jwtVerify();
        }
        catch {
            reply.status(401).send({ error: 'No autorizado' });
            return null;
        }
        const payload = request.user;
        if (!payload.empresaId || (payload.rol !== 'ADMIN' && payload.rol !== 'SUPERVISOR')) {
            reply.status(403).send({ error: 'Requiere usuario de empresa' });
            return null;
        }
        return payload.empresaId;
    }
    // Plan, cupo y funciones activas de la empresa (para bloquear/mostrar en la app)
    app.get('/mi-plan', async (request, reply) => {
        const empresaId = await empresaDelToken(request, reply);
        if (!empresaId)
            return;
        const [cap, colaboradores, planesMap] = await Promise.all([
            (0, capacidades_1.capacidadesEmpresa)(empresaId),
            index_1.prisma.colaborador.count({ where: { empresaId, activo: true } }),
            (0, planes_1.obtenerPlanes)(index_1.prisma),
        ]);
        return {
            ...cap,
            limite: cap.limite === Infinity ? null : cap.limite, // null = ilimitado (JSON no maneja Infinity)
            colaboradores,
            // Los 3 planes con precios/límites reales (para la pantalla de cambio de plan)
            planes: planes_1.PLAN_IDS.map(id => planesMap[id]),
        };
    });
    // Cambiar de plan. Si sube de plan estando al día, cobra la diferencia
    // prorrateada por los días que faltan del mes; si no, cambia directo.
    app.post('/cambiar-plan', async (request, reply) => {
        const empresaId = await empresaDelToken(request, reply);
        if (!empresaId)
            return;
        const { plan } = (request.body ?? {});
        if (!(0, planes_1.esPlan)(plan))
            return reply.status(400).send({ error: 'Plan inválido' });
        const empresa = await index_1.prisma.empresa.findUnique({ where: { id: empresaId }, include: { suscripcion: true } });
        if (!empresa?.suscripcion)
            return reply.status(404).send({ error: 'Sin suscripción' });
        if (empresa.exentaPago)
            return reply.status(400).send({ error: 'Esta empresa tiene acceso ilimitado; el plan lo maneja el administrador de HoraPro.' });
        const susc = empresa.suscripcion;
        if (susc.plan === plan)
            return reply.status(400).send({ error: 'Ya tienes ese plan' });
        const planes = await (0, planes_1.obtenerPlanes)(index_1.prisma);
        const ahora = new Date();
        const alDia = !!susc.pagadoHasta && susc.pagadoHasta > ahora;
        const precioActual = (0, planes_1.precioMensualDe)(susc, false, planes);
        const precioNuevo = planes[plan].precioMensual;
        // Cambio directo (sin cobro): en prueba, bajando de plan, o si Wompi no está configurado
        if (!alDia || precioNuevo <= precioActual || !(0, wompi_1.wompiConfigurado)()) {
            await index_1.prisma.suscripcion.update({ where: { empresaId }, data: { plan } });
            return { cambiado: true };
        }
        // Sube de plan estando al día → diferencia prorrateada
        const { factor, diasRestantes, diasMes } = (0, suscripcion_1.prorrateo)(ahora);
        const diferencia = Math.max(0, Math.round((precioNuevo - precioActual) * factor));
        if (diferencia <= 0) {
            await index_1.prisma.suscripcion.update({ where: { empresaId }, data: { plan } });
            return { cambiado: true };
        }
        const reference = (0, wompi_1.referenciaUpgrade)(empresaId, plan, susc.pagadoHasta);
        const amountInCents = diferencia * 100;
        return {
            requierePago: true, plan, nombrePlan: planes[plan].nombre, diferencia, diasRestantes, diasMes,
            checkout: {
                url: wompi_1.WOMPI_CHECKOUT_URL, publicKey: wompi_1.WOMPI_PUBLIC_KEY, currency: 'COP',
                amountInCents, reference, signature: (0, wompi_1.firmaIntegridad)(reference, amountInCents),
                verificacionDisponible: Boolean(wompi_1.WOMPI_PRIVATE_KEY),
            },
        };
    });
    // Estado de cuenta + cobro del período + datos para el Web Checkout de Wompi
    app.get('/', async (request, reply) => {
        const empresaId = await empresaDelToken(request, reply);
        if (!empresaId)
            return;
        const susc = await index_1.prisma.suscripcion.findUnique({
            where: { empresaId },
            include: { pagos: { orderBy: { creadoEn: 'desc' }, take: 12 } },
        });
        if (!susc)
            return reply.status(404).send({ error: 'Sin suscripción' });
        const sync = await (0, suscripcion_1.sincronizarEstado)(index_1.prisma, susc);
        const precios = await (0, suscripcion_1.obtenerPrecios)(index_1.prisma);
        const cobro = await (0, suscripcion_1.calcularCobro)(index_1.prisma, empresaId, precios);
        const empresa = await index_1.prisma.empresa.findUnique({ where: { id: empresaId } });
        const exenta = Boolean(empresa?.exentaPago);
        // El checkout solo existe si hay algo por pagar hoy
        let checkout = null;
        if ((0, wompi_1.wompiConfigurado)() && cobro.monto > 0) {
            const vencimiento = sync.pagadoHasta ?? sync.finPrueba;
            const reference = (0, wompi_1.referenciaPago)(empresaId, vencimiento);
            const amountInCents = cobro.monto * 100;
            checkout = {
                url: wompi_1.WOMPI_CHECKOUT_URL,
                publicKey: wompi_1.WOMPI_PUBLIC_KEY,
                currency: 'COP',
                amountInCents,
                reference,
                signature: (0, wompi_1.firmaIntegridad)(reference, amountInCents),
                verificacionDisponible: Boolean(wompi_1.WOMPI_PRIVATE_KEY),
            };
        }
        return {
            estado: exenta ? 'ILIMITADA' : (0, suscripcion_1.estadoEfectivo)(sync),
            diasMora: exenta ? 0 : (0, suscripcion_1.diasDeMora)(sync),
            finPrueba: sync.finPrueba,
            pagadoHasta: sync.pagadoHasta,
            colaboradoresActivos: cobro.colaboradoresActivos,
            tarifaMensual: cobro.tarifaMesCompleto,
            cobro,
            precios,
            pagos: susc.pagos,
            wompiConfigurado: (0, wompi_1.wompiConfigurado)(),
            checkout,
        };
    });
    // Confirma una transacción tras el redirect del checkout (?id=...).
    // Necesario en desarrollo: Wompi no puede llegar al webhook en localhost.
    app.post('/confirmar', async (request, reply) => {
        const empresaId = await empresaDelToken(request, reply);
        if (!empresaId)
            return;
        const { transaccionId } = request.body;
        if (!transaccionId)
            return reply.status(400).send({ error: 'Falta transaccionId' });
        const tx = await (0, wompi_1.consultarTransaccion)(transaccionId);
        if (!tx)
            return reply.status(404).send({ error: 'Transacción no encontrada en Wompi' });
        if ((0, wompi_1.empresaIdDeReferencia)(tx.reference) !== empresaId) {
            return reply.status(403).send({ error: 'La transacción no corresponde a esta empresa' });
        }
        if (tx.status !== 'APPROVED') {
            return { estado: tx.status, mensaje: 'El pago no fue aprobado' };
        }
        const pago = await (0, suscripcion_1.aplicarPagoAprobado)(index_1.prisma, empresaId, {
            monto: tx.amount_in_cents / 100,
            metodo: 'LINK_WOMPI',
            wompiTransaccionId: tx.id,
        });
        // Si era un pago de cambio de plan, aplica el plan destino
        const planUpg = (0, wompi_1.planDeReferencia)(tx.reference);
        if (planUpg && (0, planes_1.esPlan)(planUpg)) {
            await index_1.prisma.suscripcion.update({ where: { empresaId }, data: { plan: planUpg } });
        }
        return { estado: 'APPROVED', pago };
    });
    // Verifica el pago por referencia (para cuando Wompi no pudo redirigir,
    // p. ej. en desarrollo local). Requiere WOMPI_PRIVATE_KEY.
    app.post('/verificar', async (request, reply) => {
        const empresaId = await empresaDelToken(request, reply);
        if (!empresaId)
            return;
        if (!wompi_1.WOMPI_PRIVATE_KEY) {
            return reply.status(503).send({ error: 'Configura WOMPI_PRIVATE_KEY para verificar pagos por referencia' });
        }
        const susc = await index_1.prisma.suscripcion.findUnique({ where: { empresaId } });
        if (!susc)
            return reply.status(404).send({ error: 'Sin suscripción' });
        const reference = (0, wompi_1.referenciaPago)(empresaId, susc.pagadoHasta ?? susc.finPrueba);
        const txs = await (0, wompi_1.consultarPorReferencia)(reference);
        const aprobada = txs.find(t => t.status === 'APPROVED');
        if (!aprobada)
            return { estado: 'SIN_PAGO', mensaje: 'No encontramos un pago aprobado con la referencia actual' };
        const pago = await (0, suscripcion_1.aplicarPagoAprobado)(index_1.prisma, empresaId, {
            monto: aprobada.amount_in_cents / 100,
            metodo: 'LINK_WOMPI',
            wompiTransaccionId: aprobada.id,
        });
        return { estado: 'APPROVED', pago };
    });
}
