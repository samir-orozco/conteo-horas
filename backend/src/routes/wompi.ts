import { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import { prisma } from '../index';
import { aplicarPagoAprobado } from '../utils/suscripcion';
import { empresaIdDeReferencia, WOMPI_EVENTS_SECRET } from '../utils/wompi';

// Webhook de eventos Wompi (transaction.updated).
// En producción: registrar https://<dominio>/api/wompi/eventos en comercios.wompi.co
// y poner el secreto de eventos (test_events_* / prod_events_*) en WOMPI_EVENTS_SECRET.
export default async function wompiRoutes(app: FastifyInstance) {
  app.post('/eventos', async (request, reply) => {
    const body = request.body as any;

    // Verificación de firma (checksum) según docs de Wompi
    if (WOMPI_EVENTS_SECRET && body?.signature?.checksum) {
      const props: string[] = body.signature.properties ?? [];
      const concatenado =
        props.map((p: string) => p.split('.').reduce((o: any, k: string) => o?.[k], body.data)).join('') +
        body.timestamp +
        WOMPI_EVENTS_SECRET;
      const checksum = crypto.createHash('sha256').update(concatenado).digest('hex');
      if (checksum !== body.signature.checksum) {
        return reply.status(401).send({ error: 'Firma inválida' });
      }
    }

    const tx = body?.data?.transaction;
    if (body?.event === 'transaction.updated' && tx?.status === 'APPROVED' && tx?.reference) {
      const empresaId = empresaIdDeReferencia(tx.reference);
      if (empresaId) {
        await aplicarPagoAprobado(prisma, empresaId, {
          monto: tx.amount_in_cents / 100,
          metodo: 'LINK_WOMPI',
          wompiTransaccionId: tx.id,
        });
      }
    }

    return { ok: true };
  });
}
