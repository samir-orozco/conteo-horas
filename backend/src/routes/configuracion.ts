import { FastifyInstance } from 'fastify';
import { prisma } from '../index';
import { jornadaVigente, tiposVigentes, horasMesDeJornada } from '../utils/vigencias';
import { enviarTelegram, telegramConfigurado } from '../utils/telegram';

export default async function configuracionRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.requireEmpresa] };

  // Envía un mensaje de prueba al chat de Telegram para verificar la conexión.
  app.post('/telegram/prueba', auth, async (request, reply) => {
    if (!telegramConfigurado) {
      return reply.status(400).send({ error: 'El bot de Telegram aún no está configurado en el servidor. Contacta a HoraPro.' });
    }
    const { chatId } = (request.body ?? {}) as { chatId?: string };
    let destino = (chatId || '').trim();
    if (!destino) {
      const cfg = await prisma.configuracion.findUnique({
        where: { empresaId_clave: { empresaId: request.empresaId!, clave: 'TELEGRAM_CHAT_ID' } },
      });
      destino = cfg?.valor || '';
    }
    if (!destino) return reply.status(400).send({ error: 'Falta el chat de Telegram.' });
    const r = await enviarTelegram(destino, '✅ <b>HoraPro</b> quedó conectado. Aquí llegarán las alertas de llegadas tarde.');
    if (!r.ok) return reply.status(400).send({ error: r.error });
    return { ok: true };
  });

  app.get('/', auth, async (request) => {
    const items = await prisma.configuracion.findMany({ where: { empresaId: request.empresaId } });
    return items.reduce((acc: any, item) => { acc[item.clave] = item.valor; return acc; }, {});
  });

  app.put('/', auth, async (request) => {
    const data = request.body as Record<string, string>;
    const empresaId = request.empresaId!;
    await Promise.all(
      Object.entries(data).map(([clave, valor]) =>
        prisma.configuracion.upsert({
          where: { empresaId_clave: { empresaId, clave } },
          update: { valor },
          create: { empresaId, clave, valor },
        })
      )
    );
    return { ok: true };
  });

  // Datos de la empresa (los ve cualquiera de la empresa, solo ADMIN los edita)
  app.get('/empresa', auth, async (request) => {
    return prisma.empresa.findUnique({
      where: { id: request.empresaId },
      select: { nombre: true, nit: true, email: true, telefono: true },
    });
  });

  app.put('/empresa', auth, async (request, reply) => {
    const payload = request.user as any;
    if (payload.rol !== 'ADMIN') return reply.status(403).send({ error: 'Solo el administrador edita los datos de la empresa' });
    const { nombre, nit, telefono } = request.body as { nombre?: string; nit?: string; telefono?: string };
    if (!nombre || !nit) return reply.status(400).send({ error: 'Nombre y NIT son obligatorios' });
    const conflicto = await prisma.empresa.findFirst({ where: { nit, NOT: { id: request.empresaId! } } });
    if (conflicto) return reply.status(409).send({ error: 'Ya hay otra empresa registrada con ese NIT' });
    return prisma.empresa.update({
      where: { id: request.empresaId },
      data: { nombre, nit, telefono },
      select: { nombre: true, nit: true, email: true, telefono: true },
    });
  });

  // Reglas legales vigentes (solo lectura para la empresa; las administra la plataforma)
  app.get('/legales', auth, async (request) => {
    const { fecha } = request.query as any;
    const ref = fecha ? new Date(fecha) : new Date();
    const [jornadas, tipos] = await Promise.all([
      prisma.jornadaVigencia.findMany({ orderBy: { vigenteDesde: 'asc' } }),
      prisma.tipoHora.findMany({ orderBy: [{ codigo: 'asc' }, { vigenteDesde: 'asc' }] }),
    ]);
    const jornada = jornadaVigente(ref, jornadas);
    return {
      fechaReferencia: ref,
      jornadaSemanal: jornada,
      horasMes: horasMesDeJornada(jornada),
      tiposHoraVigentes: tiposVigentes(ref, tipos),
      calendarioJornadas: jornadas,
    };
  });

  // Compat: lista de tipos de hora vigentes hoy
  app.get('/tipos-hora', auth, async () => {
    const tipos = await prisma.tipoHora.findMany({ orderBy: { codigo: 'asc' } });
    return tiposVigentes(new Date(), tipos);
  });

  // Token del link único del kiosco de marcación de la empresa
  app.get('/marcador-link', auth, async (request) => {
    const empresa = await prisma.empresa.findUnique({
      where: { id: request.empresaId },
      select: { marcadorToken: true, nombre: true },
    });
    const soloDispositivos = await prisma.configuracion.findUnique({
      where: { empresaId_clave: { empresaId: request.empresaId!, clave: 'KIOSCO_SOLO_DISPOSITIVOS' } },
    });
    return { ...empresa, soloDispositivos: soloDispositivos?.valor === '1' };
  });

  // ===== Dispositivos autorizados del kiosco =====

  app.get('/dispositivos', auth, async (request) => {
    return prisma.dispositivoKiosco.findMany({
      where: { empresaId: request.empresaId },
      orderBy: { creadoEn: 'asc' },
    });
  });

  // Genera un código de vinculación de 6 dígitos (un solo uso, 10 minutos)
  app.post('/dispositivos/codigo', auth, async (request) => {
    const codigo = String(Math.floor(100000 + Math.random() * 900000));
    const valor = JSON.stringify({ codigo, expira: Date.now() + 10 * 60 * 1000 });
    await prisma.configuracion.upsert({
      where: { empresaId_clave: { empresaId: request.empresaId!, clave: 'CODIGO_KIOSCO' } },
      update: { valor },
      create: { empresaId: request.empresaId!, clave: 'CODIGO_KIOSCO', valor },
    });
    return { codigo, expiraEnMinutos: 10 };
  });

  // Renombrar un dispositivo autorizado
  app.put('/dispositivos/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { nombre } = (request.body ?? {}) as { nombre?: string };
    const limpio = (nombre || '').trim();
    if (!limpio) return reply.status(400).send({ error: 'El nombre no puede estar vacío' });
    const disp = await prisma.dispositivoKiosco.findFirst({ where: { id, empresaId: request.empresaId } });
    if (!disp) return reply.status(404).send({ error: 'Dispositivo no encontrado' });
    return prisma.dispositivoKiosco.update({ where: { id }, data: { nombre: limpio.slice(0, 60) } });
  });

  app.delete('/dispositivos/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const disp = await prisma.dispositivoKiosco.findFirst({ where: { id, empresaId: request.empresaId } });
    if (!disp) return reply.status(404).send({ error: 'Dispositivo no encontrado' });
    await prisma.dispositivoKiosco.delete({ where: { id } });
    return { ok: true };
  });
}
