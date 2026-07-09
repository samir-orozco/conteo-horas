import { FastifyInstance } from 'fastify';
import { toZonedTime } from 'date-fns-tz';
import crypto from 'crypto';
import { prisma } from '../index';

const TZ = 'America/Bogota';

// ¿La empresa exige dispositivos autorizados para el kiosco?
async function exigeDispositivo(empresaId: string): Promise<boolean> {
  const cfg = await prisma.configuracion.findUnique({
    where: { empresaId_clave: { empresaId, clave: 'KIOSCO_SOLO_DISPOSITIVOS' } },
  });
  return cfg?.valor === '1';
}

async function dispositivoValido(empresaId: string, deviceToken?: string): Promise<boolean> {
  if (!deviceToken) return false;
  const disp = await prisma.dispositivoKiosco.findUnique({ where: { token: deviceToken } });
  if (!disp || disp.empresaId !== empresaId) return false;
  await prisma.dispositivoKiosco.update({ where: { id: disp.id }, data: { ultimoUso: new Date() } });
  return true;
}

// Nota: el kiosco NUNCA se bloquea por mora o suspensión — los colaboradores
// siguen marcando sus horas; el cobro se gestiona en el panel del admin.
export default async function workerRoutes(app: FastifyInstance) {
  // Info del kiosco a partir del token del link único de la empresa
  app.get('/kiosco/:token', async (request, reply) => {
    const { token } = request.params as { token: string };
    const empresa = await prisma.empresa.findUnique({ where: { marcadorToken: token } });
    if (!empresa || !empresa.activa) return reply.code(404).send({ error: 'Link de marcación inválido' });
    return { empresa: empresa.nombre, requiereDispositivo: await exigeDispositivo(empresa.id) };
  });

  // Vincula este dispositivo al kiosco con el código de 6 dígitos que genera el admin
  app.post('/vincular', async (request, reply) => {
    const { marcadorToken, codigo } = request.body as { marcadorToken: string; codigo: string };
    const empresa = await prisma.empresa.findUnique({ where: { marcadorToken } });
    if (!empresa || !empresa.activa) return reply.code(404).send({ error: 'Link de marcación inválido' });

    const cfg = await prisma.configuracion.findUnique({
      where: { empresaId_clave: { empresaId: empresa.id, clave: 'CODIGO_KIOSCO' } },
    });
    const guardado = cfg ? JSON.parse(cfg.valor) as { codigo: string; expira: number } : null;
    if (!guardado || guardado.codigo !== codigo || Date.now() > guardado.expira) {
      return reply.code(401).send({ error: 'Código inválido o vencido. Genera uno nuevo en el panel.' });
    }

    const cantidad = await prisma.dispositivoKiosco.count({ where: { empresaId: empresa.id } });
    const dispositivo = await prisma.dispositivoKiosco.create({
      data: {
        empresaId: empresa.id,
        nombre: `Dispositivo ${cantidad + 1}`,
        token: crypto.randomBytes(24).toString('hex'),
      },
    });
    // El código es de un solo uso
    await prisma.configuracion.delete({ where: { id: cfg!.id } });
    return { deviceToken: dispositivo.token, nombre: dispositivo.nombre };
  });

  // Login del kiosco con cédula, amarrado al link único de la empresa (Fase 4: huella)
  app.post('/login', async (request, reply) => {
    const { cedula, marcadorToken, deviceToken } = request.body as { cedula: string; marcadorToken: string; deviceToken?: string };
    if (!marcadorToken) return reply.code(400).send({ error: 'Link de marcación inválido' });

    const empresa = await prisma.empresa.findUnique({ where: { marcadorToken } });
    if (!empresa || !empresa.activa) return reply.code(404).send({ error: 'Link de marcación inválido' });

    // Con la protección activa, solo dispositivos vinculados pueden marcar
    if (await exigeDispositivo(empresa.id)) {
      if (!(await dispositivoValido(empresa.id, deviceToken))) {
        return reply.code(401).send({ error: 'Este dispositivo no está autorizado para marcar', codigo: 'DISPOSITIVO_REQUERIDO' });
      }
    }

    const col = await prisma.colaborador.findFirst({
      where: { cedula, activo: true, empresaId: empresa.id },
    });
    if (!col) return reply.code(401).send({ error: 'Cédula no registrada en esta empresa' });

    const token = app.jwt.sign(
      { id: col.id, cedula: col.cedula, nombre: col.nombre, apellido: col.apellido, rol: 'WORKER', empresaId: col.empresaId },
      { expiresIn: '12h' }
    );
    return { token, colaborador: { id: col.id, nombre: col.nombre, apellido: col.apellido, cargo: col.cargo } };
  });

  // Estado del día: retorna si hay entrada abierta (sin salida)
  app.get('/estado', { preHandler: [app.authenticate] }, async (request) => {
    const payload = (request as any).user as { id: string; rol: string };
    if (payload.rol !== 'WORKER') return { error: 'No autorizado' };

    const ahoraBog = toZonedTime(new Date(), TZ);
    const inicioDia = new Date(Date.UTC(
      ahoraBog.getFullYear(), ahoraBog.getMonth(), ahoraBog.getDate(), 5, 0, 0
    )); // 00:00 Bogotá = 05:00 UTC
    const finDia = new Date(inicioDia.getTime() + 24 * 60 * 60 * 1000);

    const registrosHoy = await prisma.registro.findMany({
      where: {
        colaboradorId: payload.id,
        fecha: { gte: inicioDia, lt: finDia },
      },
      orderBy: { creadoEn: 'asc' },
    });

    const abierto = registrosHoy.find(r => r.entrada && !r.salida) ?? null;
    return {
      registrosHoy,
      entradaAbierta: abierto,
      dentroAhora: !!abierto,
    };
  });

  // Registrar entrada o salida
  app.post('/marcar', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = (request as any).user as { id: string; rol: string };
    if (payload.rol !== 'WORKER') return reply.code(403).send({ error: 'No autorizado' });

    const ahora = new Date();
    const ahoraBog = toZonedTime(ahora, TZ);
    const inicioDia = new Date(Date.UTC(
      ahoraBog.getFullYear(), ahoraBog.getMonth(), ahoraBog.getDate(), 5, 0, 0
    ));
    const finDia = new Date(inicioDia.getTime() + 24 * 60 * 60 * 1000);

    const abierto = await prisma.registro.findFirst({
      where: {
        colaboradorId: payload.id,
        fecha: { gte: inicioDia, lt: finDia },
        entrada: { not: null },
        salida: null,
      },
      orderBy: { creadoEn: 'asc' },
    });

    // Festivo legal (global) o propio de la empresa del colaborador
    const col = await prisma.colaborador.findUnique({ where: { id: payload.id } });
    const festHoy = await prisma.diaFestivo.findFirst({
      where: {
        fecha: { gte: inicioDia, lt: finDia },
        OR: [{ empresaId: null }, { empresaId: col?.empresaId }],
      },
    });
    const tipo = festHoy ? 'FESTIVO' : 'NORMAL';

    if (abierto) {
      const updated = await prisma.registro.update({
        where: { id: abierto.id },
        data: { salida: ahora },
      });
      return { accion: 'SALIDA', registro: updated, hora: ahora };
    } else {
      const nuevo = await prisma.registro.create({
        data: {
          colaboradorId: payload.id,
          fecha: inicioDia,
          entrada: ahora,
          tipo: tipo as any,
        },
      });
      return { accion: 'ENTRADA', registro: nuevo, hora: ahora };
    }
  });
}
