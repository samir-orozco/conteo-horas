import { FastifyInstance } from 'fastify';
import { prisma, JwtPayload } from '../index';
import {
  estadoEfectivo, diasDeMora, sincronizarEstado, aplicarPagoAprobado,
  obtenerPrecios, calcularCobro,
} from '../utils/suscripcion';
import {
  wompiConfigurado, referenciaPago, firmaIntegridad, empresaIdDeReferencia,
  consultarTransaccion, consultarPorReferencia, WOMPI_CHECKOUT_URL, WOMPI_PUBLIC_KEY, WOMPI_PRIVATE_KEY,
} from '../utils/wompi';

// Estado de cuenta y pago de la propia empresa.
// No usa requireEmpresa: una empresa SUSPENDIDA necesita entrar aquí para pagar.
export default async function suscripcionRoutes(app: FastifyInstance) {
  async function empresaDelToken(request: any, reply: any): Promise<string | null> {
    try {
      await request.jwtVerify();
    } catch {
      reply.status(401).send({ error: 'No autorizado' });
      return null;
    }
    const payload = request.user as JwtPayload;
    if (!payload.empresaId || (payload.rol !== 'ADMIN' && payload.rol !== 'SUPERVISOR')) {
      reply.status(403).send({ error: 'Requiere usuario de empresa' });
      return null;
    }
    return payload.empresaId;
  }

  // Estado de cuenta + cobro del período + datos para el Web Checkout de Wompi
  app.get('/', async (request, reply) => {
    const empresaId = await empresaDelToken(request, reply);
    if (!empresaId) return;

    const susc = await prisma.suscripcion.findUnique({
      where: { empresaId },
      include: { pagos: { orderBy: { creadoEn: 'desc' }, take: 12 } },
    });
    if (!susc) return reply.status(404).send({ error: 'Sin suscripción' });
    const sync = await sincronizarEstado(prisma, susc);

    const precios = await obtenerPrecios(prisma);
    const cobro = await calcularCobro(prisma, empresaId, precios);
    const empresa = await prisma.empresa.findUnique({ where: { id: empresaId } });
    const exenta = Boolean(empresa?.exentaPago);

    // El checkout solo existe si hay algo por pagar hoy
    let checkout: any = null;
    if (wompiConfigurado() && cobro.monto > 0) {
      const vencimiento = sync.pagadoHasta ?? sync.finPrueba;
      const reference = referenciaPago(empresaId, vencimiento);
      const amountInCents = cobro.monto * 100;
      checkout = {
        url: WOMPI_CHECKOUT_URL,
        publicKey: WOMPI_PUBLIC_KEY,
        currency: 'COP',
        amountInCents,
        reference,
        signature: firmaIntegridad(reference, amountInCents),
        verificacionDisponible: Boolean(WOMPI_PRIVATE_KEY),
      };
    }

    return {
      estado: exenta ? 'ILIMITADA' : estadoEfectivo(sync),
      diasMora: exenta ? 0 : diasDeMora(sync),
      finPrueba: sync.finPrueba,
      pagadoHasta: sync.pagadoHasta,
      colaboradoresActivos: cobro.colaboradoresActivos,
      tarifaMensual: cobro.tarifaMesCompleto,
      cobro,
      precios,
      pagos: susc.pagos,
      wompiConfigurado: wompiConfigurado(),
      checkout,
    };
  });

  // Confirma una transacción tras el redirect del checkout (?id=...).
  // Necesario en desarrollo: Wompi no puede llegar al webhook en localhost.
  app.post('/confirmar', async (request, reply) => {
    const empresaId = await empresaDelToken(request, reply);
    if (!empresaId) return;

    const { transaccionId } = request.body as { transaccionId: string };
    if (!transaccionId) return reply.status(400).send({ error: 'Falta transaccionId' });

    const tx = await consultarTransaccion(transaccionId);
    if (!tx) return reply.status(404).send({ error: 'Transacción no encontrada en Wompi' });
    if (empresaIdDeReferencia(tx.reference) !== empresaId) {
      return reply.status(403).send({ error: 'La transacción no corresponde a esta empresa' });
    }
    if (tx.status !== 'APPROVED') {
      return { estado: tx.status, mensaje: 'El pago no fue aprobado' };
    }

    const pago = await aplicarPagoAprobado(prisma, empresaId, {
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
    if (!empresaId) return;
    if (!WOMPI_PRIVATE_KEY) {
      return reply.status(503).send({ error: 'Configura WOMPI_PRIVATE_KEY para verificar pagos por referencia' });
    }

    const susc = await prisma.suscripcion.findUnique({ where: { empresaId } });
    if (!susc) return reply.status(404).send({ error: 'Sin suscripción' });

    const reference = referenciaPago(empresaId, susc.pagadoHasta ?? susc.finPrueba);
    const txs = await consultarPorReferencia(reference);
    const aprobada = txs.find(t => t.status === 'APPROVED');
    if (!aprobada) return { estado: 'SIN_PAGO', mensaje: 'No encontramos un pago aprobado con la referencia actual' };

    const pago = await aplicarPagoAprobado(prisma, empresaId, {
      monto: aprobada.amount_in_cents / 100,
      metodo: 'LINK_WOMPI',
      wompiTransaccionId: aprobada.id,
    });
    return { estado: 'APPROVED', pago };
  });
}
