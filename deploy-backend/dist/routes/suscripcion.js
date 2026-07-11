"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = suscripcionRoutes;
const index_1 = require("../index");
const suscripcion_1 = require("../utils/suscripcion");
const wompi_1 = require("../utils/wompi");
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
