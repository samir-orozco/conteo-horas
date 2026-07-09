import { FastifyInstance } from 'fastify';
import { prisma } from '../index';
import { festivosDelAnio } from '../utils/festivosColombia';

export default async function festivoRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.requireEmpresa] };

  // Festivos legales (globales) + propios de la empresa
  app.get('/', auth, async (request) => {
    const { anio } = request.query as any;
    const where: any = { OR: [{ empresaId: null }, { empresaId: request.empresaId }] };
    if (anio) {
      where.fecha = {
        gte: new Date(Date.UTC(Number(anio), 0, 1)),
        lt: new Date(Date.UTC(Number(anio) + 1, 0, 1)),
      };
    }
    return prisma.diaFestivo.findMany({ where, orderBy: { fecha: 'asc' } });
  });

  // Agrega un día no laboral propio de la empresa (ej. día cívico)
  app.post('/', auth, async (request, reply) => {
    const data = request.body as any;
    const festivo = await prisma.diaFestivo.create({
      data: { nombre: data.nombre, fecha: new Date(data.fecha), empresaId: request.empresaId! },
    });
    return reply.status(201).send(festivo);
  });

  // Solo se pueden borrar los festivos propios; los legales son de la plataforma
  app.delete('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const festivo = await prisma.diaFestivo.findFirst({ where: { id, empresaId: request.empresaId } });
    if (!festivo) return reply.status(404).send({ error: 'Solo puedes eliminar festivos propios de tu empresa' });
    return prisma.diaFestivo.delete({ where: { id } });
  });

  // Genera (si faltan) los festivos legales de un año — útil para años futuros
  app.post('/generar/:anio', auth, async (request) => {
    const { anio } = request.params as { anio: string };
    const festivos = festivosDelAnio(Number(anio));
    let creados = 0;
    for (const f of festivos) {
      const existente = await prisma.diaFestivo.findFirst({ where: { empresaId: null, fecha: f.fecha } });
      if (!existente) {
        await prisma.diaFestivo.create({ data: { fecha: f.fecha, nombre: f.nombre } });
        creados++;
      }
    }
    return { anio: Number(anio), creados, total: festivos.length };
  });
}
