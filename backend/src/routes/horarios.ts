import { FastifyInstance } from 'fastify';
import { prisma } from '../prisma';
import { jornadaVigente } from '../utils/vigencias';
import { capacidadesEmpresa } from '../utils/capacidades';
import { regenerarDiasDeHorario, regenerarDiasDeVarios } from '../utils/materializarDias';
import {
  FranjaConVentanas, franjasConVentanaImposible, franjaParaGuardar, franjaBasicaValida,
  franjaParaResponder, pantallaViejaBorraDescansos,
} from '../utils/ventanasDeHorario';

// Cada franja: al menos un día y horas de verdad. La regla vive en
// `franjaBasicaValida`, con sus pruebas: aquí había una regex propia que dejaba
// pasar «99:99» (12 de septiembre de 2026).
function validarFranjas(franjas: unknown): franjas is FranjaConVentanas[] {
  if (!Array.isArray(franjas) || franjas.length === 0) return false;
  return franjas.every(franjaBasicaValida);
}

const mensajeVentanasImposibles = (imposibles: string[]) =>
  `El almuerzo o los descansos no caben dentro de la jornada: ${imposibles.join(', ')}. ` +
  'Revisa que cada hora de inicio sea anterior a la de fin, que ninguna pausa se cruce con otra y que no haya más de 3 descansos por franja.';

// Horarios de trabajo de la empresa (se asignan a cada colaborador). Un horario
// agrupa varias franjas: ej. "Oficina" = L-V 08:00-17:00 + Sáb 08:00-12:00.
//
// Las franjas viajan con sus descansos como ARREGLO (`franjaParaResponder`), nunca
// con el texto que se guarda (12 de septiembre de 2026).
export default async function horarioRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.requireEmpresa] };

  app.get('/', auth, async (request) => {
    const horarios = await prisma.horario.findMany({
      where: { empresaId: request.empresaId, activo: true },
      include: {
        franjas: true,
        _count: { select: { colaboradores: { where: { activo: true } } } },
      },
      orderBy: { nombre: 'asc' },
    });
    return horarios.map(h => ({ ...h, franjas: h.franjas.map(franjaParaResponder) }));
  });

  // Norma de jornada máxima semanal vigente hoy (Ley 2101), para la etiqueta de cumplimiento
  app.get('/norma', auth, async () => {
    const jornadas = await prisma.jornadaVigencia.findMany();
    return { horasSemanales: jornadaVigente(new Date(), jornadas) };
  });

  app.post('/', auth, async (request, reply) => {
    const { nombre, toleranciaMin, almuerzoMin, toleranciaSalidaMin, ajustaEntrada, fotoEnDescanso, franjas } = request.body as any;
    if (!nombre) return reply.status(400).send({ error: 'El nombre es obligatorio' });
    if (!validarFranjas(franjas)) {
      return reply.status(400).send({ error: 'Agrega al menos una franja con días y horas válidas (HH:MM)' });
    }
    const imposibles = franjasConVentanaImposible(franjas);
    if (imposibles.length > 0) {
      return reply.status(400).send({ error: mensajeVentanasImposibles(imposibles) });
    }
    // Gating: varios horarios requieren plan Profesional o superior
    const cap = await capacidadesEmpresa(request.empresaId!);
    if (!cap.features.multiHorario) {
      const existentes = await prisma.horario.count({ where: { empresaId: request.empresaId } });
      if (existentes >= 1) {
        return reply.status(403).send({ error: 'Tu plan permite un solo horario. Sube de plan para crear más.', codigo: 'FUNCION_PLAN', funcion: 'multiHorario' });
      }
    }
    const horario = await prisma.horario.create({
      data: {
        empresaId: request.empresaId!,
        nombre,
        toleranciaMin: toleranciaMin ?? 10,
        almuerzoMin: Math.max(0, Number(almuerzoMin) || 0),
        toleranciaSalidaMin: Math.max(0, Number(toleranciaSalidaMin) || 0),
        ajustaEntrada: ajustaEntrada === true,
        // Por defecto se guarda la foto, igual que en cualquier otra marcación.
        fotoEnDescanso: fotoEnDescanso !== false,
        franjas: { create: franjas.map(franjaParaGuardar) },
      },
      include: { franjas: true },
    });
    return reply.status(201).send({ ...horario, franjas: horario.franjas.map(franjaParaResponder) });
  });

  app.put('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const existente = await prisma.horario.findFirst({
      where: { id, empresaId: request.empresaId },
      include: { franjas: { select: { descansos: true } } },
    });
    if (!existente) return reply.status(404).send({ error: 'Horario no encontrado' });
    const { nombre, toleranciaMin, almuerzoMin, toleranciaSalidaMin, ajustaEntrada, fotoEnDescanso, franjas } = request.body as any;
    // Una pantalla de horarios abierta antes de los descansos manda las franjas sin
    // la clave `descansos`. Como las franjas se reemplazan enteras, guardar desde ahí
    // borraría los descansos que otro ya configuró. Se le pide recargar ANTES de
    // tocar nada (12 de septiembre de 2026).
    if (Array.isArray(franjas) && pantallaViejaBorraDescansos(existente.franjas, franjas)) {
      return reply.status(400).send({
        error: 'Esta pantalla quedó desactualizada. Recarga la página y vuelve a guardar el horario.',
        codigo: 'FORMATO_VIEJO',
      });
    }
    if (!validarFranjas(franjas)) {
      return reply.status(400).send({ error: 'Agrega al menos una franja con días y horas válidas (HH:MM)' });
    }
    const imposibles = franjasConVentanaImposible(franjas);
    if (imposibles.length > 0) {
      return reply.status(400).send({ error: mensajeVentanasImposibles(imposibles) });
    }
    // Las franjas se reemplazan completas: es la forma simple y sin ambigüedad
    const actualizado = await prisma.horario.update({
      where: { id },
      data: {
        nombre,
        toleranciaMin,
        almuerzoMin: Math.max(0, Number(almuerzoMin) || 0),
        toleranciaSalidaMin: Math.max(0, Number(toleranciaSalidaMin) || 0),
        ajustaEntrada: ajustaEntrada === true,
        // Solo si viene: una pantalla vieja que no lo manda no puede volver a
        // encender la foto que el administrador apagó.
        ...(typeof fotoEnDescanso === 'boolean' ? { fotoEnDescanso } : {}),
        franjas: {
          deleteMany: {},
          create: franjas.map(franjaParaGuardar),
        },
      },
      include: { franjas: true },
    });

    // El cambio aplica desde HOY para quien todavía no ha marcado, y desde
    // mañana para quien ya empezó su día: nadie puede llegar tarde según una
    // regla que no existía cuando marcó. Los días anteriores no se tocan nunca;
    // son los que sostienen las liquidaciones ya entregadas.
    //
    // El resultado viaja en la respuesta para poder decírselo al administrador.
    // Sin eso, el cambio que "no aplicó" a dos personas es invisible, que es
    // exactamente la confusión que esto viene a quitar.
    //
    // Si falla, el horario igual quedó guardado. Ojo: la pasada diaria
    // `mantenerVentana` NO repara esto —llama sin `pisarExistentes`, así que solo
    // rellena huecos—, o sea que un fallo aquí deja los días viejos hasta que
    // alguien vuelva a guardar el horario.
    let regeneracion = null;
    try {
      regeneracion = await regenerarDiasDeHorario(id, app.log);
    } catch (err) {
      app.log.error(err, 'No se pudieron regenerar los días del horario');
    }

    return { ...actualizado, franjas: actualizado.franjas.map(franjaParaResponder), regeneracion };
  });

  // Desactiva el horario y lo desasigna de los colaboradores
  app.delete('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const existente = await prisma.horario.findFirst({ where: { id, empresaId: request.empresaId } });
    if (!existente) return reply.status(404).send({ error: 'Horario no encontrado' });

    // Hay que quedarse con ellos ANTES de desasignarlos: después de la
    // transacción ya no hay forma de saber a quiénes afectaba este horario.
    const afectados = await prisma.colaborador.findMany({
      where: { horarioId: id, activo: true },
      select: { id: true, nombre: true, apellido: true },
    });

    await prisma.$transaction([
      prisma.colaborador.updateMany({ where: { horarioId: id }, data: { horarioId: null } }),
      prisma.horario.update({ where: { id }, data: { activo: false } }),
    ]);

    // Sin esto quedaban hasta 60 días por delante exigiendo un horario que ya no
    // existe, y el kiosco seguía pidiendo su almuerzo.
    let regeneracion = null;
    try {
      regeneracion = await regenerarDiasDeVarios(afectados, app.log);
    } catch (err) {
      app.log.error(err, 'No se pudieron regenerar los días tras borrar el horario');
    }

    return { ok: true, regeneracion };
  });
}
