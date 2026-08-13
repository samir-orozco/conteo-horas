import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { prisma } from '../index';
import { calcularBilletera, limpiarPago } from '../utils/afiliados';

// Panel propio del afiliado (prefijo /api/afiliado, guard requireAfiliado).
// Solo lectura: ve sus referidos, su link y su billetera. Los retiros (egreso)
// llegan en el Módulo 4.
export default async function afiliadoPanelRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.requireAfiliado] };

  app.get('/', auth, async (request, reply) => {
    const afiliadoId = request.afiliadoId!;
    const a = await prisma.afiliado.findUnique({
      where: { id: afiliadoId },
      include: {
        usuarios: { select: { email: true } },
        empresas: {
          select: { id: true, nombre: true, atribuidoEn: true, suscripcion: { select: { estado: true } } },
          orderBy: { atribuidoEn: 'desc' },
        },
        comisiones: { orderBy: { creadoEn: 'desc' }, include: { empresa: { select: { nombre: true } } } },
        retiros: { orderBy: { solicitadoEn: 'desc' } },
      },
    });
    if (!a) return reply.status(404).send({ error: 'Afiliado no encontrado' });

    return {
      nombre: a.nombre,
      email: a.usuarios[0]?.email ?? null,
      codigo: a.codigo,
      porcentaje: a.porcentaje,
      duracionMeses: a.duracionMeses,
      activo: a.activo,
      telefono: a.telefono,
      pago: { metodo: a.pagoMetodo, banco: a.pagoBanco, tipoCuenta: a.pagoTipoCuenta, numero: a.pagoNumero, titular: a.pagoTitular, documento: a.pagoDocumento },
      billetera: calcularBilletera(a.comisiones, a.retiros),
      referidos: a.empresas.map(e => ({ id: e.id, nombre: e.nombre, estado: e.suscripcion?.estado ?? null, atribuidoEn: e.atribuidoEn })),
      comisiones: a.comisiones.map(c => ({ id: c.id, empresa: c.empresa.nombre, monto: c.monto, porcentaje: c.porcentaje, montoBase: c.montoBase, estado: c.estado, creadoEn: c.creadoEn })),
      retiros: a.retiros,
    };
  });

  // El afiliado solicita un retiro (egreso). Valida contra su saldo disponible.
  app.post('/retiros', auth, async (request, reply) => {
    const afiliadoId = request.afiliadoId!;
    const { monto } = request.body as { monto?: number };
    const a = await prisma.afiliado.findUnique({
      where: { id: afiliadoId },
      include: { comisiones: true, retiros: true },
    });
    if (!a) return reply.status(404).send({ error: 'Afiliado no encontrado' });
    const { disponible } = calcularBilletera(a.comisiones, a.retiros);
    const m = Math.round(Number(monto));
    if (!Number.isFinite(m) || m <= 0) return reply.status(400).send({ error: 'Ingresa un monto válido' });
    if (m > disponible) return reply.status(400).send({ error: 'El monto supera tu saldo disponible' });
    const retiro = await prisma.solicitudRetiro.create({ data: { afiliadoId, monto: m, estado: 'SOLICITADO' } });
    return reply.status(201).send(retiro);
  });

  // El afiliado edita su propio perfil: nombre, teléfono, datos de pago y
  // (opcional) contraseña. NO puede tocar su % ni su duración (eso es del admin).
  app.put('/perfil', auth, async (request, reply) => {
    const afiliadoId = request.afiliadoId!;
    const b = request.body as any;
    const nombre = b.nombre?.trim();
    if (!nombre) return reply.status(400).send({ error: 'El nombre es obligatorio' });

    // Cambio de contraseña (opcional)
    if (b.passwordNueva) {
      const usuario = await prisma.usuario.findFirst({ where: { afiliadoId } });
      if (!usuario) return reply.status(404).send({ error: 'Cuenta no encontrada' });
      if (!b.passwordActual || !(await bcrypt.compare(b.passwordActual, usuario.password))) {
        return reply.status(400).send({ error: 'La contraseña actual no es correcta' });
      }
      if (String(b.passwordNueva).length < 6) return reply.status(400).send({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
      await prisma.usuario.update({ where: { id: usuario.id }, data: { password: await bcrypt.hash(b.passwordNueva, 10) } });
    }

    const pago = limpiarPago(b);
    await prisma.afiliado.update({ where: { id: afiliadoId }, data: { nombre, telefono: b.telefono?.trim() || null, ...pago } });
    await prisma.usuario.updateMany({ where: { afiliadoId }, data: { nombre } });
    return { ok: true };
  });
}
