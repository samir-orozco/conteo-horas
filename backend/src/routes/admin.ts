import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { prisma } from '../index';
import {
  calcularTarifaMensual, estadoEfectivo, diasDeMora, sincronizarEstado,
  obtenerPrecios, calcularCobro, aplicarPagoAprobado, DIAS_PRUEBA,
} from '../utils/suscripcion';

const DIA_MS = 24 * 60 * 60 * 1000;

export default async function adminRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.requireSuperAdmin] };

  // Empresa con su estado real de suscripción y tarifa actual
  async function empresaConEstado(empresaId: string) {
    const precios = await obtenerPrecios(prisma);
    const empresa = await prisma.empresa.findUnique({
      where: { id: empresaId },
      include: {
        suscripcion: { include: { pagos: { orderBy: { creadoEn: 'desc' } } } },
        usuarios: { select: { id: true, email: true, nombre: true, rol: true, activo: true } },
        _count: { select: { colaboradores: { where: { activo: true } } } },
      },
    });
    if (!empresa) return null;
    const susc = empresa.suscripcion ? await sincronizarEstado(prisma, empresa.suscripcion) : null;
    const colaboradoresActivos = empresa._count.colaboradores;
    return {
      ...empresa,
      colaboradoresActivos,
      tarifaMensual: calcularTarifaMensual(colaboradoresActivos, precios),
      suscripcion: susc
        ? { ...susc, estadoEfectivo: estadoEfectivo(susc), diasMora: diasDeMora(susc), pagos: empresa.suscripcion!.pagos }
        : null,
    };
  }

  // ===== Configuración de precios de la plataforma =====
  app.get('/configuracion', auth, async () => {
    return obtenerPrecios(prisma);
  });

  app.put('/configuracion', auth, async (request, reply) => {
    const { precioTramo1, limiteTramo1, precioTramo2 } = request.body as any;
    if ([precioTramo1, limiteTramo1, precioTramo2].some(v => typeof v !== 'number' || v < 0)) {
      return reply.status(400).send({ error: 'Valores de precio inválidos' });
    }
    return prisma.configuracionPlataforma.upsert({
      where: { id: 1 },
      update: { precioTramo1, limiteTramo1, precioTramo2 },
      create: { id: 1, precioTramo1, limiteTramo1, precioTramo2 },
    });
  });

  // ===== Dashboard =====
  app.get('/dashboard', auth, async () => {
    const [precios, empresas, suscripciones, pagos] = await Promise.all([
      obtenerPrecios(prisma),
      prisma.empresa.findMany({ include: { _count: { select: { colaboradores: { where: { activo: true } } } } } }),
      prisma.suscripcion.findMany(),
      prisma.pago.findMany({ where: { estado: 'APROBADO' } }),
    ]);

    const ahora = new Date();
    const inicioMes = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), 1));
    const estados = suscripciones.map(s => estadoEfectivo(s));

    const ingresosMes = pagos.filter(p => p.creadoEn >= inicioMes).reduce((s, p) => s + p.monto, 0);
    const ingresosTotales = pagos.reduce((s, p) => s + p.monto, 0);
    // Ingreso mensual recurrente proyectado con las empresas activas/en prueba
    const mrrProyectado = empresas
      .filter((e) => e.activa && !e.exentaPago && ['PRUEBA', 'ACTIVA', 'EN_MORA'].includes(estados[suscripciones.findIndex(s => s.empresaId === e.id)] ?? ''))
      .reduce((s, e) => s + calcularTarifaMensual(e._count.colaboradores, precios), 0);

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
    const precios = await obtenerPrecios(prisma);
    const empresas = await prisma.empresa.findMany({
      include: {
        suscripcion: true,
        _count: { select: { colaboradores: { where: { activo: true } } } },
      },
      orderBy: { creadoEn: 'desc' },
    });
    return Promise.all(empresas.map(async e => {
      const susc = e.suscripcion ? await sincronizarEstado(prisma, e.suscripcion) : null;
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
        tarifaMensual: calcularTarifaMensual(e._count.colaboradores, precios),
        estadoSuscripcion: e.exentaPago ? 'ILIMITADA' : susc ? estadoEfectivo(susc) : null,
        diasMora: e.exentaPago ? 0 : susc ? diasDeMora(susc) : 0,
        pagadoHasta: susc?.pagadoHasta ?? null,
        finPrueba: susc?.finPrueba ?? null,
      };
    }));
  });

  app.get('/empresas/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const empresa = await empresaConEstado(id);
    if (!empresa) return reply.status(404).send({ error: 'Empresa no encontrada' });
    return empresa;
  });

  // Crea empresa + suscripción en prueba (7 días) + usuario admin inicial
  app.post('/empresas', auth, async (request, reply) => {
    const { nombre, nit, email, telefono, admin } = request.body as {
      nombre: string; nit: string; email: string; telefono?: string;
      admin: { email: string; password: string; nombre: string };
    };
    if (!admin?.email || !admin?.password) {
      return reply.status(400).send({ error: 'Falta el usuario administrador inicial' });
    }
    const hash = await bcrypt.hash(admin.password, 10);
    try {
      const empresa = await prisma.$transaction(async (tx) => {
        const emp = await tx.empresa.create({ data: { nombre, nit, email, telefono } });
        await tx.suscripcion.create({
          data: { empresaId: emp.id, estado: 'PRUEBA', finPrueba: new Date(Date.now() + DIAS_PRUEBA * DIA_MS) },
        });
        await tx.usuario.create({
          data: { email: admin.email, password: hash, nombre: admin.nombre, rol: 'ADMIN', empresaId: emp.id },
        });
        return emp;
      });
      return reply.status(201).send(await empresaConEstado(empresa.id));
    } catch (e: any) {
      if (e.code === 'P2002') return reply.status(409).send({ error: 'NIT o email de administrador ya registrado' });
      throw e;
    }
  });

  app.put('/empresas/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { nombre, nit, email, telefono, activa, exentaPago } = request.body as any;
    const existente = await prisma.empresa.findUnique({ where: { id } });
    if (!existente) return reply.status(404).send({ error: 'Empresa no encontrada' });
    await prisma.empresa.update({ where: { id }, data: { nombre, nit, email, telefono, activa, exentaPago } });
    return empresaConEstado(id);
  });

  // Cobro sugerido hoy (para prellenar el modal de registro de pago)
  app.get('/empresas/:id/cobro', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const empresa = await prisma.empresa.findUnique({ where: { id } });
    if (!empresa) return reply.status(404).send({ error: 'Empresa no encontrada' });
    const precios = await obtenerPrecios(prisma);
    return calcularCobro(prisma, id, precios);
  });

  // ===== Pagos =====
  // Registra un pago recibido por fuera de Wompi (transferencia, efectivo).
  // Si no llega monto, se cobra lo que se debe hoy (mes o adición prorrateada).
  app.post('/empresas/:id/pagos', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { monto, metodo, wompiTransaccionId, nota, comprobanteBase64 } = request.body as {
      monto?: number; metodo?: 'TARJETA_RECURRENTE' | 'LINK_WOMPI' | 'MANUAL';
      wompiTransaccionId?: string; nota?: string; comprobanteBase64?: string;
    };

    const susc = await prisma.suscripcion.findUnique({ where: { empresaId: id } });
    if (!susc) return reply.status(404).send({ error: 'La empresa no tiene suscripción' });

    const payload = request.user as any;
    const precios = await obtenerPrecios(prisma);
    const cobro = await calcularCobro(prisma, id, precios);
    const pago = await aplicarPagoAprobado(prisma, id, {
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
    const pagos = await prisma.pago.findMany({
      select: {
        id: true, monto: true, colaboradoresFacturados: true, periodoInicio: true, periodoFin: true,
        metodo: true, estado: true, wompiTransaccionId: true, nota: true, registradoPor: true, creadoEn: true,
        suscripcion: { select: { empresa: { select: { nombre: true, nit: true, email: true } } } },
      },
      orderBy: { creadoEn: 'desc' },
    });
    const conFlag = await prisma.pago.findMany({
      where: { comprobanteBase64: { not: null } },
      select: { id: true },
    });
    const ids = new Set(conFlag.map(p => p.id));
    return pagos.map(p => ({ ...p, tieneComprobante: ids.has(p.id) }));
  });

  app.get('/pagos/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const pago = await prisma.pago.findUnique({
      where: { id },
      include: { suscripcion: { include: { empresa: { select: { nombre: true, nit: true, email: true, telefono: true } } } } },
    });
    if (!pago) return reply.status(404).send({ error: 'Pago no encontrado' });
    return pago;
  });

  // ===== Reporte de ingresos (por mes de un año) =====
  app.get('/ingresos', auth, async (request) => {
    const { anio } = request.query as any;
    const year = Number(anio) || new Date().getUTCFullYear();
    const pagos = await prisma.pago.findMany({
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
    const precios = await obtenerPrecios(prisma);
    const suscripciones = await prisma.suscripcion.findMany({
      include: {
        empresa: {
          include: { _count: { select: { colaboradores: { where: { activo: true } } } } },
        },
      },
    });
    const morosos = [];
    for (const s of suscripciones) {
      if ((s.empresa as any).exentaPago) continue; // ilimitadas nunca son morosas
      const sync = await sincronizarEstado(prisma, s);
      const estado = estadoEfectivo(sync);
      if (estado === 'EN_MORA' || estado === 'SUSPENDIDA') {
        morosos.push({
          empresaId: s.empresaId,
          empresa: s.empresa.nombre,
          nit: s.empresa.nit,
          email: s.empresa.email,
          telefono: s.empresa.telefono,
          estado,
          diasMora: diasDeMora(sync),
          vencioEl: sync.pagadoHasta ?? sync.finPrueba,
          montoAdeudado: calcularTarifaMensual(s.empresa._count.colaboradores, precios),
        });
      }
    }
    return morosos.sort((a, b) => b.diasMora - a.diasMora);
  });
}
