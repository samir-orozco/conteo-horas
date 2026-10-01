import { FastifyInstance } from 'fastify';
import { prisma } from '../prisma';
import { exigeFuncion } from '../utils/capacidades';
import { limpiarPlantilla } from '../utils/cuerpoDePlantilla';
import { franjaParaResponder } from '../utils/ventanasDeHorario';

// EL CATÁLOGO DE TURNOS DE LA EMPRESA (19 de septiembre de 2026, turnos rotativos paso 1).
//
// Una plantilla es una franja sin días: «Mañana 06:00-14:00», «Noche 22:00-06:00»,
// «Descanso». El planificador las usa después como brocha para pintar el calendario, y por
// eso el catálogo se construye y se enseña ANTES que él: ya es demostrable sin nada más.
//
// Toda la revisión del cuerpo vive en `limpiarPlantilla`, que es pura y tiene sus pruebas.
// Aquí solo queda la plomería: el alcance por empresa, la sede que tiene que ser suya, y el
// 404 de lo que no existe.
//
// Las plantillas viajan con sus descansos como ARREGLO (`franjaParaResponder`), nunca con el
// texto que se guarda, igual que las franjas del horario.
export default async function plantillaTurnoRoutes(app: FastifyInstance) {
  // LAS DOS GUARDAS JUNTAS, y la segunda cubre TODAS las rutas de este archivo de una vez: el módulo
  // de turnos es del plan Empresarial (30 de septiembre de 2026, decisión del dueño), y el super admin
  // puede prendérselo o apagárselo a un cliente suelto desde su ficha. El porqué de que viva aquí y no
  // dentro de cada manejador está en `utils/capacidades.ts`.
  const auth = { preHandler: [app.requireEmpresa, exigeFuncion('turnos')] };

  // Los turnos de trabajo primero y los descansos al final: en una lista que se usa para
  // elegir, el día libre es la excepción y no compite con los turnos.
  app.get('/', auth, async (request) => {
    const plantillas = await prisma.plantillaTurno.findMany({
      where: { empresaId: request.empresaId, activa: true },
      orderBy: [{ esDescanso: 'asc' }, { nombre: 'asc' }],
    });
    return plantillas.map(franjaParaResponder);
  });

  // La sede tiene que ser de ESTA empresa. Sin esta comprobación, mandar el id de la sede de
  // otra empresa la dejaría pegada a un turno ajeno: el cuerpo lo escribe el navegador y un
  // id de sede no se adivina, pero tampoco es un secreto.
  async function sedeAjena(sedeId: string | null, empresaId: string): Promise<boolean> {
    if (!sedeId) return false;
    const sede = await prisma.sede.findFirst({ where: { id: sedeId, empresaId }, select: { id: true } });
    return sede === null;
  }

  app.post('/', auth, async (request, reply) => {
    const limpia = limpiarPlantilla((request.body ?? {}) as Record<string, unknown>);
    if (!limpia.ok) return reply.status(400).send({ error: limpia.motivo });
    if (await sedeAjena(limpia.datos.sedeId, request.empresaId!)) {
      return reply.status(400).send({ error: 'La sede elegida no existe en esta empresa.' });
    }

    const plantilla = await prisma.plantillaTurno.create({
      data: { empresaId: request.empresaId!, ...limpia.datos },
    });
    return reply.status(201).send(franjaParaResponder(plantilla));
  });

  // Se manda ENTERA, sin distinguir crear de editar: `esDescanso` y las horas están
  // acopladas, así que un cuerpo parcial dejaría un descanso con horas de antes. Es la misma
  // razón por la que las franjas del horario se reemplazan completas.
  app.put('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const existente = await prisma.plantillaTurno.findFirst({
      where: { id, empresaId: request.empresaId }, select: { id: true },
    });
    if (!existente) return reply.status(404).send({ error: 'Plantilla no encontrada' });

    const limpia = limpiarPlantilla((request.body ?? {}) as Record<string, unknown>);
    if (!limpia.ok) return reply.status(400).send({ error: limpia.motivo });
    if (await sedeAjena(limpia.datos.sedeId, request.empresaId!)) {
      return reply.status(400).send({ error: 'La sede elegida no existe en esta empresa.' });
    }

    const actualizada = await prisma.plantillaTurno.update({ where: { id }, data: limpia.datos });
    return franjaParaResponder(actualizada);
  });

  // Se desactiva en vez de borrarse, igual que las sedes: cuando exista el planificador, los
  // días ya pintados apuntarán a ella y el calendario histórico tiene que poder seguir
  // diciendo qué turno se planificó.
  app.delete('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const existente = await prisma.plantillaTurno.findFirst({
      where: { id, empresaId: request.empresaId }, select: { id: true },
    });
    if (!existente) return reply.status(404).send({ error: 'Plantilla no encontrada' });

    await prisma.plantillaTurno.update({ where: { id }, data: { activa: false } });
    return { ok: true };
  });
}
