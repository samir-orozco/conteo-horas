import { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { aplicarPagoAprobado, aplicarPlanDelPago } from '../utils/suscripcion';
import { empresaIdDeReferencia, WOMPI_EVENTS_SECRET } from '../utils/wompi';

// Webhook de eventos Wompi (transaction.updated).
// En producción: registrar https://<dominio>/api/wompi/eventos en comercios.wompi.co
// y poner el secreto de eventos (test_events_* / prod_events_*) en WOMPI_EVENTS_SECRET.
// La empresa del pago ya no existe: se eliminó antes de que Wompi confirmara, o
// justo mientras confirmaba. P2003 es la llave hacia la suscripción que ya no
// está al hacer commit; P2025, la suscripción que desapareció entre leerla y
// actualizarla. Cualquier otro error no es esto, y ahí sí conviene que Wompi
// reintente.
const esEmpresaQueYaNoExiste = (e: unknown) =>
  e instanceof Prisma.PrismaClientKnownRequestError && (e.code === 'P2003' || e.code === 'P2025');

export default async function wompiRoutes(app: FastifyInstance) {
  app.post('/eventos', async (request, reply) => {
    const body = request.body as any;

    // Verificación de firma (checksum) según docs de Wompi.
    //
    // La firma es lo único que distingue un aviso de Wompi de uno fabricado por
    // cualquiera. Antes solo se comprobaba SI venía: un evento sin `signature` se
    // aceptaba, y con la referencia de una empresa real registraba un pago
    // APROBADO que nadie hizo. Wompi firma todos sus eventos, así que con el
    // secreto puesto, un evento sin firma se rechaza.
    if (!WOMPI_EVENTS_SECRET) {
      request.log.warn('WOMPI_EVENTS_SECRET vacío: el evento de Wompi se aceptó sin verificar su firma');
    } else {
      if (typeof body?.signature?.checksum !== 'string') {
        return reply.status(401).send({ error: 'Firma inválida' });
      }
      const props: string[] = Array.isArray(body.signature.properties) ? body.signature.properties : [];
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
        let aplicado: unknown = null;
        try {
          aplicado = await aplicarPagoAprobado(prisma, empresaId, {
            monto: tx.amount_in_cents / 100,
            metodo: 'LINK_WOMPI',
            wompiTransaccionId: tx.id,
          });
        } catch (e) {
          if (!esEmpresaQueYaNoExiste(e)) throw e;
        }
        if (!aplicado) {
          // Wompi ya cobró y en HoraPro no hay dónde anotarlo. Se responde 200
          // igual: un 500 solo provoca tres reintentos en 24 horas contra una
          // empresa que no va a volver. Lo que no puede pasar es el silencio
          // (CLAUDE.md 8.3): esta línea es lo único con qué devolver la plata
          // desde el panel de Wompi.
          request.log.error({
            empresaId,
            wompiTransaccionId: tx.id,
            referencia: tx.reference,
            montoCentavos: tx.amount_in_cents,
          }, 'Pago de Wompi APROBADO de una empresa que ya no existe: antes de devolverlo, cotejar en el panel de Wompi que la referencia y el monto de esta transacción son estos');
        } else {
          // Si era un pago de cambio de plan, aplica el plan destino, igual que /confirmar.
          await aplicarPlanDelPago(prisma, empresaId, tx.reference);
        }
      }
    }

    return { ok: true };
  });
}
