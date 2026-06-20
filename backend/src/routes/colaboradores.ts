import { FastifyInstance } from 'fastify';
import { prisma } from '../index';
import { calcularValorHora } from '../utils/horasColombiana';

export default async function colaboradorRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  app.get('/', auth, async () => {
    return prisma.colaborador.findMany({ where: { activo: true }, orderBy: { nombre: 'asc' } });
  });

  app.get('/:id', auth, async (request) => {
    const { id } = request.params as { id: string };
    return prisma.colaborador.findUnique({ where: { id } });
  });

  app.post('/', auth, async (request, reply) => {
    const data = request.body as any;
    const colaborador = await prisma.colaborador.create({ data });
    return reply.status(201).send(colaborador);
  });

  app.put('/:id', auth, async (request) => {
    const { id } = request.params as { id: string };
    const data = request.body as any;
    return prisma.colaborador.update({ where: { id }, data });
  });

  app.delete('/:id', auth, async (request) => {
    const { id } = request.params as { id: string };
    return prisma.colaborador.update({ where: { id }, data: { activo: false } });
  });

  app.get('/:id/valor-hora', auth, async (request) => {
    const { id } = request.params as { id: string };
    const config = await prisma.configuracion.findUnique({ where: { clave: 'HORAS_MES' } });
    const horasMes = config ? Number(config.valor) : 200;
    const colaborador = await prisma.colaborador.findUnique({ where: { id } });
    if (!colaborador) return { error: 'No encontrado' };
    return {
      salarioMensual: colaborador.salarioMensual,
      horasMes,
      valorHora: calcularValorHora(colaborador.salarioMensual, horasMes),
    };
  });
}
