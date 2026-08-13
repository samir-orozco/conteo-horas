import { FastifyInstance } from 'fastify';
import { prisma } from '../index';
import { capacidadesEmpresa } from '../utils/capacidades';

// Sedes de la empresa: cada local con su propia geocerca.
//
// Antes la geocerca era UNA sola por empresa, guardada en `Configuracion`
// (GEO_LAT/LNG/RADIO). Una empresa con tres locales tenía que elegir uno o
// apagar el GPS. Con sedes, cada local tiene su punto y su radio, y cada
// colaborador puede marcar en las que tenga asignadas.
//
// Gating: la SEGUNDA sede en adelante exige plan Empresarial (`multiSede`), el
// mismo criterio con el que se gatean los horarios. La primera siempre se
// permite porque es la que hereda la geocerca que la empresa ya tenía: cobrar
// por conservar lo que ya funcionaba sería quitarles algo.

type SedeInput = {
  nombre?: string; direccion?: string | null;
  lat?: unknown; lng?: unknown; radio?: unknown; activa?: unknown;
};

// Coordenada válida o null. Una sede sin coordenadas no exige ubicación, que es
// una configuración legítima (oficina sin GPS, o sede recién creada).
function coordenada(v: unknown, min: number, max: number): number | null {
  const n = Number(v);
  if (v === null || v === '' || v === undefined || !Number.isFinite(n)) return null;
  return n >= min && n <= max ? n : null;
}

function camposSede(body: SedeInput) {
  const lat = coordenada(body.lat, -90, 90);
  const lng = coordenada(body.lng, -180, 180);
  const radio = Math.min(5000, Math.max(20, Number(body.radio) || 150));
  return {
    direccion: body.direccion?.trim() || null,
    // Las dos coordenadas van juntas o no va ninguna: media coordenada no ubica
    // nada y dejaría una geocerca imposible de cumplir.
    lat: lat !== null && lng !== null ? lat : null,
    lng: lat !== null && lng !== null ? lng : null,
    radio,
  };
}

export default async function sedeRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.requireEmpresa] };

  app.get('/', auth, async (request) => {
    return prisma.sede.findMany({
      where: { empresaId: request.empresaId, activa: true },
      include: { _count: { select: { colaboradores: true } } },
      orderBy: { nombre: 'asc' },
    });
  });

  app.post('/', auth, async (request, reply) => {
    const body = (request.body ?? {}) as SedeInput;
    const nombre = body.nombre?.trim();
    if (!nombre) return reply.status(400).send({ error: 'El nombre de la sede es obligatorio' });

    const existentes = await prisma.sede.count({ where: { empresaId: request.empresaId, activa: true } });
    if (existentes >= 1) {
      const cap = await capacidadesEmpresa(request.empresaId!);
      if (!cap.features.multiSede) {
        return reply.status(403).send({
          error: 'Tu plan permite una sola sede. Sube a Empresarial para manejar varias.',
          codigo: 'FUNCION_PLAN', funcion: 'multiSede',
        });
      }
    }

    const sede = await prisma.sede.create({
      data: { empresaId: request.empresaId!, nombre, ...camposSede(body) },
    });
    return reply.status(201).send(sede);
  });

  app.put('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const existente = await prisma.sede.findFirst({ where: { id, empresaId: request.empresaId } });
    if (!existente) return reply.status(404).send({ error: 'Sede no encontrada' });

    const body = (request.body ?? {}) as SedeInput;
    const nombre = body.nombre?.trim();
    if (!nombre) return reply.status(400).send({ error: 'El nombre de la sede es obligatorio' });

    return prisma.sede.update({ where: { id }, data: { nombre, ...camposSede(body) } });
  });

  // Se desactiva en vez de borrarse: los registros ya marcados apuntan a ella y
  // el reporte histórico tiene que poder seguir diciendo dónde ocurrió cada
  // marcación. Sí se sueltan los colaboradores, o quedarían asignados a una sede
  // donde ya no pueden marcar.
  app.delete('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const existente = await prisma.sede.findFirst({ where: { id, empresaId: request.empresaId } });
    if (!existente) return reply.status(404).send({ error: 'Sede no encontrada' });

    await prisma.$transaction([
      prisma.colaboradorSede.deleteMany({ where: { sedeId: id } }),
      prisma.sede.update({ where: { id }, data: { activa: false } }),
    ]);
    return { ok: true };
  });
}
