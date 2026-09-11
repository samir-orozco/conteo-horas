import { FastifyInstance } from 'fastify';
import { prisma } from '../prisma';
import { capacidadesEmpresa } from '../utils/capacidades';
import { sedePrincipal } from '../utils/sedePrincipal';
import { asegurarSedeDePresencial } from '../utils/sedesDeEmpresa';

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

  // `principal` le dice a la pantalla cuál es la Sede principal: la que reciben
  // los presenciales a los que nadie les eligió sede (utils/sedePrincipal.ts).
  app.get('/', auth, async (request) => {
    const sedes = await prisma.sede.findMany({
      where: { empresaId: request.empresaId, activa: true },
      include: { _count: { select: { colaboradores: true } } },
      orderBy: { nombre: 'asc' },
    });
    const principal = sedePrincipal(sedes);
    return sedes.map(s => ({ ...s, principal: s.id === principal }));
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
  //
  // Y como un presencial siempre tiene sede (11 de septiembre de 2026): la última
  // sede activa no se desactiva, porque dejaría a todos sin ninguna, y quien
  // trabaja presencial y se queda sin sede pasa a la principal en la misma
  // transacción.
  app.delete('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const empresaId = request.empresaId!;
    const resultado = await prisma.$transaction(async (tx) => {
      // Candado sobre la empresa: dos pestañas desactivando a la vez las dos
      // últimas sedes verían cada una que queda la otra, y la empresa terminaría
      // sin ninguna.
      await tx.$queryRaw`SELECT id FROM empresas WHERE id = ${empresaId} FOR UPDATE`;
      const existente = await tx.sede.findFirst({ where: { id, empresaId }, select: { activa: true } });
      if (!existente) return 'NO_EXISTE' as const;
      const otras = await tx.sede.count({ where: { empresaId, activa: true, id: { not: id } } });
      if (existente.activa && otras === 0) return 'ES_LA_ULTIMA' as const;

      const asignados = await tx.colaboradorSede.findMany({ where: { sedeId: id }, select: { colaboradorId: true } });
      await tx.colaboradorSede.deleteMany({ where: { sedeId: id } });
      await tx.sede.update({ where: { id }, data: { activa: false } });
      await asegurarSedeDePresencial(tx, empresaId, asignados.map(a => a.colaboradorId));
      return 'DESACTIVADA' as const;
    }, { timeout: 30_000 });

    if (resultado === 'NO_EXISTE') return reply.status(404).send({ error: 'Sede no encontrada' });
    if (resultado === 'ES_LA_ULTIMA') {
      return reply.status(400).send({
        error: 'Es la única sede de la empresa, y quien trabaja presencial siempre necesita una. Cámbiale el nombre o la ubicación en vez de eliminarla.',
        codigo: 'ULTIMA_SEDE',
      });
    }
    return { ok: true };
  });
}
