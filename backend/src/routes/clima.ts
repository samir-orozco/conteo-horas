import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { exigeFuncion } from '../utils/capacidades';
import { rangoReporte } from '../utils/fechas';
import { sedesPorDefecto } from '../utils/sedesDeEmpresa';
import {
  CATALOGO_DE_MOTIVOS, MAX_MOTIVOS, MOTIVOS_PREDETERMINADOS, MOTIVO_OTRO,
  necesitanAtencion, ordenRevuelto, promedioPorSede, resumenDelClima, semanaDe, validarMotivosDeEmpresa,
  variacionDelPromedio, filasParaLaRacha, CARITA_MAX_DE_ATENCION, type CalificacionDelDia,
} from '../utils/clima';
import { CLAVE_MOTIVOS, SALIDAS_QUE_ABREN_LA_VENTANA, motivosDeEmpresa } from '../utils/climaDelKiosco';

// EL PANEL DEL CLIMA LABORAL (4 de octubre de 2026). docs/CLIMA_LABORAL.md §3.6.
// Las cuentas están en utils/clima.ts, con sus pruebas; esto lee la base y las conecta.

const DIA_MS = 24 * 60 * 60 * 1000;
const SEMANAS_DEL_BUZON = 12;
// Las últimas respuestas de una persona en su historial: unos tres meses de jornadas.
const HISTORIAL = 60;
const RECIENTES = 30;

// SOLO EL ADMINISTRADOR (decisión del dueño del 3 de octubre de 2026). Las calificaciones van con
// nombre, así que un supervisor no las ve hasta que se trabaje el tema de usuarios y permisos.
async function soloAdministrador(request: FastifyRequest, reply: FastifyReply) {
  const rol = (request.user as { rol?: string } | undefined)?.rol;
  if (rol !== 'ADMIN') {
    return reply.status(403).send({ error: 'Solo el administrador ve el clima laboral.', codigo: 'SOLO_ADMIN' });
  }
}

const comoLista = (v: Prisma.JsonValue): string[] => (Array.isArray(v) ? v.filter((m): m is string => typeof m === 'string') : []);
const fechaValida = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

export default async function climaRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.requireEmpresa, exigeFuncion('clima'), soloAdministrador] };

  // La sede de cada persona, atribuida al LEER con la regla de los reportes: sus sedes asignadas, o la
  // principal si es presencial y no tiene ninguna. Null («Sin sede») solo para híbridos y remotos.
  async function sedesDeLaGente(empresaId: string) {
    const [colaboradores, asignadas, sedes, defecto] = await Promise.all([
      prisma.colaborador.findMany({ where: { empresaId }, select: { id: true, nombre: true, apellido: true, cargo: true, modalidad: true, activo: true } }),
      prisma.colaboradorSede.findMany({ where: { sede: { empresaId, activa: true } }, select: { colaboradorId: true, sedeId: true } }),
      prisma.sede.findMany({ where: { empresaId, activa: true }, select: { id: true, nombre: true }, orderBy: { creadoEn: 'asc' } }),
      sedesPorDefecto(prisma, empresaId),
    ]);
    const sedesDe = new Map<string, (string | null)[]>();
    for (const a of asignadas) sedesDe.set(a.colaboradorId, [...(sedesDe.get(a.colaboradorId) ?? []), a.sedeId]);
    for (const c of colaboradores) {
      if (sedesDe.has(c.id)) continue;
      sedesDe.set(c.id, [c.modalidad === 'PRESENCIAL' ? defecto(c.id) : null]);
    }
    return { colaboradores, sedes, sedesDe };
  }

  app.get('/resumen', auth, async (request, reply) => {
    const empresaId = request.empresaId!;
    const { desde, hasta, sedeId } = request.query as { desde?: unknown; hasta?: unknown; sedeId?: unknown };
    if (!fechaValida(desde) || !fechaValida(hasta) || desde > hasta) {
      return reply.status(400).send({ error: 'El rango de fechas no es válido.' });
    }
    const sede = typeof sedeId === 'string' && sedeId !== '' ? sedeId : null;
    const { desdeF, finExclusivo } = rangoReporte(desde, hasta);
    // El período anterior, del mismo largo, para la variación del promedio.
    const desdeAnterior = new Date(desdeF.getTime() - (finExclusivo.getTime() - desdeF.getTime()));

    const { colaboradores, sedes, sedesDe } = await sedesDeLaGente(empresaId);
    const enLaSede = (colaboradorId: string) => sede === null || (sedesDe.get(colaboradorId) ?? []).includes(sede);
    const persona = new Map(colaboradores.map(c => [c.id, c]));
    const nombreDe = (id: string) => { const c = persona.get(id); return c ? `${c.nombre} ${c.apellido}` : 'Persona eliminada'; };
    const nombreDeSede = new Map<string | null, string>([...sedes.map(s => [s.id, s.nombre] as [string, string]), [null, 'Sin sede']]);

    const filas = await prisma.calificacionClima.findMany({
      where: { empresaId, fecha: { gte: desdeAnterior, lt: finExclusivo } },
      select: { colaboradorId: true, fecha: true, carita: true, motivos: true, observacion: true, actualizadoEn: true },
    });
    const todas = filas.map(f => ({ ...f, motivos: comoLista(f.motivos) }));
    const delPeriodo = (d: Date, h: Date) => (c: CalificacionDelDia) => c.fecha >= d && c.fecha < h;
    const actualTodas = todas.filter(delPeriodo(desdeF, finExclusivo));
    const actual = actualTodas.filter(c => enLaSede(c.colaboradorId));
    const anterior = todas.filter(delPeriodo(desdeAnterior, desdeF)).filter(c => enLaSede(c.colaboradorId));

    const resumen = resumenDelClima(actual);
    const resumenAnterior = resumenDelClima(anterior);

    // Cuántas JORNADAS (persona y día) se cerraron en el kiosco en el período: es contra qué se compara
    // «respondieron». Por jornadas y no por personas: por personas, en un rango largo casi todos responden
    // alguna vez y el porcentaje se quedaba en 100. Solo las salidas que abren la ventana: ni pausas, ni
    // el cierre automático, ni las cargadas a mano (revisión adversarial del 4 de octubre de 2026). Un
    // turno partido son dos salidas pero una sola jornada, por eso se agrupa por persona y día.
    //
    // Se leen las de TODA la empresa: con ellas sale también la participación de cada sede.
    const ids = colaboradores.map(c => c.id);
    const jornadasTodas = ids.length === 0 ? [] : await prisma.registro.groupBy({
      by: ['colaboradorId', 'fecha'],
      where: {
        colaboradorId: { in: ids }, fecha: { gte: desdeF, lt: finExclusivo },
        ...SALIDAS_QUE_ABREN_LA_VENTANA,
      },
    });
    const jornadas = jornadasTodas.filter(j => enLaSede(j.colaboradorId));

    // «Necesitan atención» es cómo está cada uno HOY, no en el período: mira lo malo que vino después de
    // su último buen día, por viejo que sea. Una ventana fija de fechas dejaba fuera a quien responde poco.
    const [buenos, malas] = await Promise.all([
      prisma.calificacionClima.groupBy({ by: ['colaboradorId'], where: { empresaId, carita: { gt: CARITA_MAX_DE_ATENCION } }, _max: { fecha: true } }),
      prisma.calificacionClima.findMany({
        where: { empresaId, carita: { lte: CARITA_MAX_DE_ATENCION } },
        select: { colaboradorId: true, fecha: true, carita: true, motivos: true },
      }),
    ]);
    const ultimoBueno = new Map(buenos.filter(b => b._max.fecha).map(b => [b.colaboradorId, b._max.fecha as Date]));
    const atencion = necesitanAtencion(
      filasParaLaRacha(malas.map(m => ({ ...m, motivos: comoLista(m.motivos) })), ultimoBueno)
        .filter(c => enLaSede(c.colaboradorId) && persona.get(c.colaboradorId)?.activo),
    ).map(a => ({
      ...a,
      nombre: nombreDe(a.colaboradorId),
      cargo: persona.get(a.colaboradorId)?.cargo ?? null,
      sedes: (sedesDe.get(a.colaboradorId) ?? []).map(s => nombreDeSede.get(s) ?? 'Sin sede'),
    }));

    const recientes = [...actual]
      .sort((a, b) => b.fecha.getTime() - a.fecha.getTime() || b.actualizadoEn.getTime() - a.actualizadoEn.getTime())
      .slice(0, RECIENTES)
      .map(c => ({ colaboradorId: c.colaboradorId, nombre: nombreDe(c.colaboradorId), fecha: c.fecha, carita: c.carita, motivos: c.motivos, observacion: c.observacion }));

    return {
      ...resumen,
      variacion: variacionDelPromedio(resumen.promedio, resumenAnterior.promedio),
      jornadas: jornadas.length,
      porSede: promedioPorSede(actualTodas, jornadasTodas, sedesDe, sedes),
      atencion,
      recientes,
    };
  });

  // EL HISTORIAL DE UNA PERSONA, para «Revisar» en «Necesitan atención» (4 de octubre de 2026). Va con
  // nombre, como todo lo del panel salvo el buzón: sus caritas, sus motivos y sus observaciones DIRECTAS.
  // Las confidenciales no se tocan aquí: ni siquiera se consultan. La persona se busca dentro de la
  // empresa de quien pregunta; la de otra empresa, para este panel, no existe.
  app.get('/persona/:id', auth, async (request, reply) => {
    const empresaId = request.empresaId!;
    const { id } = request.params as { id: string };
    const persona = await prisma.colaborador.findFirst({
      where: { id, empresaId },
      select: { id: true, nombre: true, apellido: true, cargo: true, modalidad: true },
    });
    if (!persona) return reply.status(404).send({ error: 'No encontramos a esa persona.' });
    const [asignadas, defecto, filas] = await Promise.all([
      prisma.colaboradorSede.findMany({ where: { colaboradorId: id, sede: { empresaId, activa: true } }, select: { sede: { select: { nombre: true } } } }),
      sedesPorDefecto(prisma, empresaId, id),
      prisma.calificacionClima.findMany({
        where: { colaboradorId: id, empresaId },
        orderBy: { fecha: 'desc' },
        take: HISTORIAL,
        select: { fecha: true, carita: true, motivos: true, observacion: true },
      }),
    ]);
    let sedes = asignadas.map(a => a.sede.nombre);
    if (sedes.length === 0 && persona.modalidad === 'PRESENCIAL' && defecto(id)) {
      const principal = await prisma.sede.findFirst({ where: { id: defecto(id)!, empresaId }, select: { nombre: true } });
      if (principal) sedes = [principal.nombre];
    }
    return {
      nombre: `${persona.nombre} ${persona.apellido}`,
      cargo: persona.cargo,
      sedes: sedes.length > 0 ? sedes : ['Sin sede'],
      respuestas: filas.map(f => ({ fecha: f.fecha, carita: f.carita, motivos: comoLista(f.motivos), observacion: f.observacion })),
    };
  });

  // EL BUZÓN CONFIDENCIAL: solo el texto, sin nada que diga quién ni cuándo. Ni el id sale de aquí.
  app.get('/buzon', auth, async (request) => {
    const empresaId = request.empresaId!;
    const ahora = new Date();
    const desde = new Date(semanaDe(ahora).getTime() - (SEMANAS_DEL_BUZON - 1) * 7 * DIA_MS);
    const notas = await prisma.observacionConfidencial.findMany({
      where: { empresaId, visibleDesde: { lte: ahora }, semana: { gte: desde } },
      select: { id: true, semana: true, texto: true },
    });
    const porSemana = new Map<number, { id: string; texto: string }[]>();
    for (const n of notas) porSemana.set(n.semana.getTime(), [...(porSemana.get(n.semana.getTime()) ?? []), n]);
    return {
      semanas: [...porSemana]
        .sort(([a], [b]) => b - a)
        .map(([semana, lista]) => ({ semana: new Date(semana), notas: ordenRevuelto(lista).map(n => n.texto) })),
    };
  });

  app.get('/motivos', auth, async (request) => {
    const motivos = await motivosDeEmpresa(request.empresaId!);
    return { motivos, otro: MOTIVO_OTRO, predeterminados: MOTIVOS_PREDETERMINADOS, catalogo: CATALOGO_DE_MOTIVOS, maximo: MAX_MOTIVOS };
  });

  app.put('/motivos', auth, async (request, reply) => {
    const v = validarMotivosDeEmpresa((request.body as { motivos?: unknown } | null)?.motivos);
    if (!v.ok) return reply.status(400).send({ error: v.error });
    const empresaId = request.empresaId!;
    await prisma.configuracion.upsert({
      where: { empresaId_clave: { empresaId, clave: CLAVE_MOTIVOS } },
      create: { empresaId, clave: CLAVE_MOTIVOS, valor: JSON.stringify(v.motivos) },
      update: { valor: JSON.stringify(v.motivos) },
    });
    return { motivos: v.motivos };
  });
}
