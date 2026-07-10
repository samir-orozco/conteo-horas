import { FastifyInstance } from 'fastify';
import { toZonedTime } from 'date-fns-tz';
import { prisma } from '../index';
import { franjaDelDia, minutosDe, DIAS_SEMANA } from '../utils/tardanzas';

const TZ = 'America/Bogota';

export default async function registroRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.requireEmpresa] };

  // Verifica que el colaborador pertenezca a la empresa del token
  async function colaboradorDeEmpresa(colaboradorId: string, empresaId: string) {
    return prisma.colaborador.findFirst({ where: { id: colaboradorId, empresaId } });
  }

  app.get('/', auth, async (request) => {
    const { colaboradorId, desde, hasta } = request.query as any;
    const where: any = { colaborador: { empresaId: request.empresaId } };
    if (colaboradorId) where.colaboradorId = colaboradorId;
    if (desde || hasta) {
      where.fecha = {};
      if (desde) where.fecha.gte = new Date(desde);
      if (hasta) where.fecha.lte = new Date(hasta);
    }
    const registros = await prisma.registro.findMany({
      where,
      include: { colaborador: { include: { horario: { include: { franjas: true } } } } },
      orderBy: { fecha: 'desc' },
    });

    // La tardanza solo se evalúa en la PRIMERA entrada del día de cada colaborador
    // (un reingreso después del almuerzo no es una llegada tarde).
    const primeraEntradaDia = new Map<string, string>(); // colaboradorId|día -> registro.id
    for (const r of registros) {
      if (!r.entrada) continue;
      const clave = `${r.colaboradorId}|${toZonedTime(r.fecha, TZ).toDateString()}`;
      const actual = registros.find(x => x.id === primeraEntradaDia.get(clave));
      if (!actual || r.entrada < actual.entrada!) primeraEntradaDia.set(clave, r.id);
    }

    // Las fotos (base64) no viajan en la lista: solo un indicador; se piden con /:id/fotos.
    // La llegada se evalúa contra el horario asignado (null si no aplica ese día).
    return registros.map(r => {
      const { fotoEntrada, fotoSalida, colaborador, ...resto } = r;
      const h = colaborador.horario;
      let minutosTarde: number | null = null;
      const clave = `${r.colaboradorId}|${toZonedTime(r.fecha, TZ).toDateString()}`;
      const esPrimeraDelDia = primeraEntradaDia.get(clave) === r.id;
      if (r.entrada && esPrimeraDelDia && r.tipo !== 'FESTIVO' && h && h.activo) {
        const diaSemana = DIAS_SEMANA[toZonedTime(r.fecha, TZ).getDay()];
        const franja = franjaDelDia(h, diaSemana);
        if (franja) {
          const z = toZonedTime(r.entrada, TZ);
          const tarde = z.getHours() * 60 + z.getMinutes() - (minutosDe(franja.horaEntrada) + h.toleranciaMin);
          minutosTarde = Math.max(0, tarde);
        }
      }
      return {
        ...resto,
        colaborador: { id: colaborador.id, nombre: colaborador.nombre, apellido: colaborador.apellido },
        minutosTarde,
        tieneFotoEntrada: !!fotoEntrada,
        tieneFotoSalida: !!fotoSalida,
      };
    });
  });

  // Fotos de verificación facial de un registro (se conservan 2 meses)
  app.get('/:id/fotos', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const registro = await prisma.registro.findFirst({
      where: { id, colaborador: { empresaId: request.empresaId } },
      select: { fotoEntrada: true, fotoSalida: true },
    });
    if (!registro) return reply.status(404).send({ error: 'Registro no encontrado' });
    return registro;
  });

  // Registrar entrada (reloj - usa hora actual de Bogotá)
  app.post('/entrada', auth, async (request, reply) => {
    const { colaboradorId } = request.body as { colaboradorId: string };
    if (!(await colaboradorDeEmpresa(colaboradorId, request.empresaId!))) {
      return reply.status(404).send({ error: 'Colaborador no encontrado' });
    }
    const ahora = new Date();
    const fechaBogota = toZonedTime(ahora, TZ);
    fechaBogota.setHours(0, 0, 0, 0);

    const existente = await prisma.registro.findFirst({
      where: { colaboradorId, fecha: { gte: fechaBogota, lt: new Date(fechaBogota.getTime() + 86400000) }, salida: null },
    });
    if (existente) return reply.status(400).send({ error: 'Ya tiene una entrada activa hoy' });

    const registro = await prisma.registro.create({
      data: { colaboradorId, fecha: ahora, entrada: ahora, tipo: 'NORMAL' },
    });
    return reply.status(201).send(registro);
  });

  // Registrar salida
  app.post('/salida', auth, async (request, reply) => {
    const { colaboradorId } = request.body as { colaboradorId: string };
    if (!(await colaboradorDeEmpresa(colaboradorId, request.empresaId!))) {
      return reply.status(404).send({ error: 'Colaborador no encontrado' });
    }
    const ahora = new Date();
    const fechaBogota = toZonedTime(ahora, TZ);
    fechaBogota.setHours(0, 0, 0, 0);

    const registro = await prisma.registro.findFirst({
      where: { colaboradorId, fecha: { gte: fechaBogota, lt: new Date(fechaBogota.getTime() + 86400000) }, salida: null },
      orderBy: { entrada: 'desc' },
    });
    if (!registro) return reply.status(400).send({ error: 'No hay entrada activa hoy' });

    return prisma.registro.update({ where: { id: registro.id }, data: { salida: ahora } });
  });

  // Registro manual (admin)
  app.post('/', auth, async (request, reply) => {
    const data = request.body as any;
    if (!(await colaboradorDeEmpresa(data.colaboradorId, request.empresaId!))) {
      return reply.status(404).send({ error: 'Colaborador no encontrado' });
    }
    const registro = await prisma.registro.create({ data });
    return reply.status(201).send(registro);
  });

  // Corrección manual — deja rastro de auditoría
  app.put('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const payload = request.user as any;
    const existente = await prisma.registro.findFirst({
      where: { id, colaborador: { empresaId: request.empresaId } },
    });
    if (!existente) return reply.status(404).send({ error: 'Registro no encontrado' });
    const data = request.body as any;
    return prisma.registro.update({
      where: { id },
      data: { ...data, editadoPor: payload.email ?? payload.id, editadoEn: new Date() },
    });
  });

  app.delete('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const existente = await prisma.registro.findFirst({
      where: { id, colaborador: { empresaId: request.empresaId } },
    });
    if (!existente) return reply.status(404).send({ error: 'Registro no encontrado' });
    return prisma.registro.delete({ where: { id } });
  });
}
