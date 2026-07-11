"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = wompiRoutes;
const crypto_1 = __importDefault(require("crypto"));
const index_1 = require("../index");
const suscripcion_1 = require("../utils/suscripcion");
const wompi_1 = require("../utils/wompi");
// Webhook de eventos Wompi (transaction.updated).
// En producción: registrar https://<dominio>/api/wompi/eventos en comercios.wompi.co
// y poner el secreto de eventos (test_events_* / prod_events_*) en WOMPI_EVENTS_SECRET.
async function wompiRoutes(app) {
    app.post('/eventos', async (request, reply) => {
        const body = request.body;
        // Verificación de firma (checksum) según docs de Wompi
        if (wompi_1.WOMPI_EVENTS_SECRET && body?.signature?.checksum) {
            const props = body.signature.properties ?? [];
            const concatenado = props.map((p) => p.split('.').reduce((o, k) => o?.[k], body.data)).join('') +
                body.timestamp +
                wompi_1.WOMPI_EVENTS_SECRET;
            const checksum = crypto_1.default.createHash('sha256').update(concatenado).digest('hex');
            if (checksum !== body.signature.checksum) {
                return reply.status(401).send({ error: 'Firma inválida' });
            }
        }
        const tx = body?.data?.transaction;
        if (body?.event === 'transaction.updated' && tx?.status === 'APPROVED' && tx?.reference) {
            const empresaId = (0, wompi_1.empresaIdDeReferencia)(tx.reference);
            if (empresaId) {
                await (0, suscripcion_1.aplicarPagoAprobado)(index_1.prisma, empresaId, {
                    monto: tx.amount_in_cents / 100,
                    metodo: 'LINK_WOMPI',
                    wompiTransaccionId: tx.id,
                });
            }
        }
        return { ok: true };
    });
}
