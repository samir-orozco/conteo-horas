import { FastifyInstance } from 'fastify';
import { prisma, JwtPayload } from '../index';
import {
  estadoEfectivo, diasDeMora, sincronizarEstado, aplicarPagoAprobado,
  obtenerPrecios, calcularCobro, prorrateo,
} from '../utils/suscripcion';
import {
  wompiConfigurado, referenciaPago, referenciaUpgrade, planDeReferencia, firmaIntegridad, empresaIdDeReferencia,
  consultarTransaccion, consultarPorReferencia, WOMPI_CHECKOUT_URL, WOMPI_PUBLIC_KEY, WOMPI_PRIVATE_KEY,
} from '../utils/wompi';
import { capacidadesEmpresa } from '../utils/capacidades';
import { esPlan, precioMensualDe, obtenerPlanes, PLAN_IDS } from '../utils/planes';

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

  // Plan, cupo y funciones activas de la empresa (para bloquear/mostrar en la app)
  app.get('/mi-plan', async (request, reply) => {
    const empresaId = await empresaDelToken(request, reply);
    if (!empresaId) return;
    const [cap, colaboradores, planesMap] = await Promise.all([
      capacidadesEmpresa(empresaId),
      prisma.colaborador.count({ where: { empresaId, activo: true } }),
      obtenerPlanes(prisma),
    ]);
    return {
      ...cap,
      limite: cap.limite === Infinity ? null : cap.limite, // null = ilimitado (JSON no maneja Infinity)
      colaboradores,
      // Los 3 planes con precios/límites reales (para la pantalla de cambio de plan)
      planes: PLAN_IDS.map(id => planesMap[id]),
    };
  });

  // Cambiar de plan. Si sube de plan estando al día, cobra la diferencia
  // prorrateada por los días que faltan del mes; si no, cambia directo.
  app.post('/cambiar-plan', async (request, reply) => {
    const empresaId = await empresaDelToken(request, reply);
    if (!empresaId) return;
    const { plan } = (request.body ?? {}) as { plan?: string };
    if (!esPlan(plan)) return reply.status(400).send({ error: 'Plan inválido' });

    const empresa = await prisma.empresa.findUnique({ where: { id: empresaId }, include: { suscripcion: true } });
    if (!empresa?.suscripcion) return reply.status(404).send({ error: 'Sin suscripción' });
    if (empresa.exentaPago) return reply.status(400).send({ error: 'Esta empresa tiene acceso ilimitado; el plan lo maneja el administrador de HoraPro.' });

    const susc = empresa.suscripcion;
    if (susc.plan === plan) return reply.status(400).send({ error: 'Ya tienes ese plan' });

    const planes = await obtenerPlanes(prisma);
    const ahora = new Date();
    const alDia = !!susc.pagadoHasta && susc.pagadoHasta > ahora;
    const precioActual = precioMensualDe(susc, false, planes);
    const precioNuevo = planes[plan].precioMensual;

    // Cambio directo (sin cobro): en prueba, bajando de plan, o si Wompi no está configurado
    if (!alDia || precioNuevo <= precioActual || !wompiConfigurado()) {
      await prisma.suscripcion.update({ where: { empresaId }, data: { plan } });
      return { cambiado: true };
    }

    // Sube de plan estando al día → diferencia prorrateada
    const { factor, diasRestantes, diasMes } = prorrateo(ahora);
    const diferencia = Math.max(0, Math.round((precioNuevo - precioActual) * factor));
    if (diferencia <= 0) {
      await prisma.suscripcion.update({ where: { empresaId }, data: { plan } });
      return { cambiado: true };
    }
    const reference = referenciaUpgrade(empresaId, plan, susc.pagadoHasta!);
    const amountInCents = diferencia * 100;
    return {
      requierePago: true, plan, nombrePlan: planes[plan].nombre, diferencia, diasRestantes, diasMes,
      checkout: {
        url: WOMPI_CHECKOUT_URL, publicKey: WOMPI_PUBLIC_KEY, currency: 'COP',
        amountInCents, reference, signature: firmaIntegridad(reference, amountInCents),
        verificacionDisponible: Boolean(WOMPI_PRIVATE_KEY),
      },
    };
  });

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
    // Si era un pago de cambio de plan, aplica el plan destino
    const planUpg = planDeReferencia(tx.reference);
    if (planUpg && esPlan(planUpg)) {
      await prisma.suscripcion.update({ where: { empresaId }, data: { plan: planUpg } });
    }
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
