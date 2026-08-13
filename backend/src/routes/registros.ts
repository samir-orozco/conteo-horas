import { FastifyInstance } from 'fastify';
import { toZonedTime } from 'date-fns-tz';
import { prisma } from '../index';
import { minutosDe } from '../utils/tardanzas';
import { combinarDiasEsperados } from '../utils/diasEsperados';
import { asegurarDiaSinFallar } from '../utils/materializarDias';
import { rangoDiaBogota } from '../utils/fechas';
import { resumirAlmuerzoDelDia, type ResumenAlmuerzo } from '../utils/jornada';

const TZ = 'America/Bogota';
const TIPOS_REGISTRO = new Set(['NORMAL', 'PERMISO', 'FESTIVO']);

// Lista blanca de campos que la empresa puede escribir en un registro. Evita
// mass-assignment (inyectar fotos base64, editadoPor, creadoEn, etc. desde el body).
function camposRegistro(body: any, esNuevo: boolean) {
  const out: any = {};
  if (esNuevo || body.colaboradorId !== undefined) out.colaboradorId = body.colaboradorId;
  if (body.fecha !== undefined) out.fecha = body.fecha ? new Date(body.fecha) : undefined;
  if (body.entrada !== undefined) out.entrada = body.entrada ? new Date(body.entrada) : null;
  if (body.salida !== undefined) out.salida = body.salida ? new Date(body.salida) : null;
  if (body.tipo !== undefined && TIPOS_REGISTRO.has(body.tipo)) out.tipo = body.tipo;
  if (body.observacion !== undefined) out.observacion = body.observacion || null;
  return out;
}

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
      // "hasta" es inclusivo: los registros se guardan a las 05:00 UTC (medianoche
      // de Bogotá), así que cubrimos todo el día tomando hasta el inicio del día siguiente.
      if (hasta) where.fecha.lt = new Date(new Date(hasta).getTime() + 24 * 60 * 60 * 1000);
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

    // Lo que el horario exigía CADA día, congelado. Esta columna se calculaba
    // contra el horario vigente, así que adelantar la entrada llenaba de
    // tardanzas los días viejos aunque el reporte ya no lo hiciera.
    const diasPorColaborador = new Map<string, Map<string, any>>();
    if (registros.length > 0) {
      // El rango se abre a los límites del DÍA de Bogotá: el kiosco guarda
      // `Registro.fecha` con la hora real, y las filas están ancladas a
      // medianoche, así que filtrar por el instante crudo las dejaría fuera.
      const fechas = registros.map(r => r.fecha.getTime());
      const desdeDia = rangoDiaBogota(new Date(Math.min(...fechas))).inicioDia;
      const hastaDia = rangoDiaBogota(new Date(Math.max(...fechas))).finDia;
      const materializados = await prisma.diaEsperado.findMany({
        where: {
          colaboradorId: { in: [...new Set(registros.map(r => r.colaboradorId))] },
          fecha: { gte: desdeDia, lt: hastaDia },
        },
        select: {
          colaboradorId: true, fecha: true, programado: true, horaEntrada: true,
          horaSalida: true, toleranciaMin: true, almuerzoMin: true, minutosEsperados: true,
          toleranciaSalidaMin: true, ajustaEntrada: true, almuerzoInicio: true, almuerzoFin: true,
        },
      });
      for (const d of materializados) {
        if (!diasPorColaborador.has(d.colaboradorId)) diasPorColaborador.set(d.colaboradorId, new Map());
        diasPorColaborador.get(d.colaboradorId)!.set(toZonedTime(d.fecha, TZ).toDateString(), d);
      }
    }

    // Un día sin fila cae al horario vigente, igual que en los reportes: es lo
    // que el sistema hacía siempre, así que nadie ve un número distinto.
    const diaEsperadoDe = (registro: typeof registros[number]) => {
      const clave = toZonedTime(registro.fecha, TZ).toDateString();
      const congelado = diasPorColaborador.get(registro.colaboradorId)?.get(clave);
      const { inicioDia, finDia } = rangoDiaBogota(registro.fecha);
      const [dia] = combinarDiasEsperados(
        inicioDia, finDia,
        congelado ? [congelado] : [],
        registro.colaborador.horario as any,
      );
      return dia;
    };

    // El almuerzo es del DÍA, no de la fila: vive en el hueco entre dos tramos.
    // Se resuelve una vez por colaborador+día y viaja repetido en cada fila de
    // ese día, para que la tabla y el detalle no puedan contar historias
    // distintas del mismo almuerzo.
    const registrosPorDia = new Map<string, typeof registros>();
    for (const r of registros) {
      const clave = `${r.colaboradorId}|${toZonedTime(r.fecha, TZ).toDateString()}`;
      if (!registrosPorDia.has(clave)) registrosPorDia.set(clave, []);
      registrosPorDia.get(clave)!.push(r);
    }
    const almuerzoPorDia = new Map<string, ResumenAlmuerzo>();
    for (const [clave, delDia] of registrosPorDia) {
      const dia = diaEsperadoDe(delDia[0]);
      if (!dia) continue;
      almuerzoPorDia.set(clave, resumirAlmuerzoDelDia(delDia, dia));
    }

    // Las fotos (base64) no viajan en la lista: solo un indicador; se piden con /:id/fotos.
    // La llegada se evalúa contra el horario asignado (null si no aplica ese día).
    return registros.map(r => {
      const { fotoEntrada, fotoSalida, colaborador, ...resto } = r;
      let minutosTarde: number | null = null;
      const clave = `${r.colaboradorId}|${toZonedTime(r.fecha, TZ).toDateString()}`;
      const esPrimeraDelDia = primeraEntradaDia.get(clave) === r.id;
      if (r.entrada && esPrimeraDelDia && r.tipo !== 'FESTIVO') {
        const dia = diaEsperadoDe(r);
        if (dia?.programado && dia.horaEntrada) {
          const z = toZonedTime(r.entrada, TZ);
          const tarde = z.getHours() * 60 + z.getMinutes() - (minutosDe(dia.horaEntrada) + dia.toleranciaMin);
          minutosTarde = Math.max(0, tarde);
        }
      }
      return {
        ...resto,
        colaborador: { id: colaborador.id, nombre: colaborador.nombre, apellido: colaborador.apellido },
        minutosTarde,
        tieneFotoEntrada: !!fotoEntrada,
        tieneFotoSalida: !!fotoSalida,
        almuerzo: almuerzoPorDia.get(clave) ?? null,
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
    await asegurarDiaSinFallar(colaboradorId, registro.fecha, app.log);
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
    const body = request.body as any;
    if (!(await colaboradorDeEmpresa(body.colaboradorId, request.empresaId!))) {
      return reply.status(404).send({ error: 'Colaborador no encontrado' });
    }
    const registro = await prisma.registro.create({ data: camposRegistro(body, true) as any });
    // Un día con marcación es un día que va a salir en un reporte. Si llega ahí
    // sin fila, lo resuelve el horario vigente y vuelve a ser reescribible. Esto
    // pasa sobre todo al cargar días PASADOS a mano, que es como se corrige.
    await asegurarDiaSinFallar(registro.colaboradorId, registro.fecha, app.log);
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
    const body = request.body as any;
    // Si se reasigna el colaborador, debe pertenecer a la MISMA empresa (evita
    // reasignar el registro a otra empresa vía body manipulado).
    if (body.colaboradorId !== undefined && !(await colaboradorDeEmpresa(body.colaboradorId, request.empresaId!))) {
      return reply.status(404).send({ error: 'Colaborador no encontrado' });
    }
    const actualizado = await prisma.registro.update({
      where: { id },
      data: { ...camposRegistro(body, false), editadoPor: payload.email ?? payload.id, editadoEn: new Date() },
    });
    // Corregir un registro puede moverlo de día o de colaborador; el día nuevo
    // también necesita su fila. Nunca pisa la que ya exista, así que corregir
    // el pasado no cambia lo que ese día exigía.
    await asegurarDiaSinFallar(actualizado.colaboradorId, actualizado.fecha, app.log);
    return actualizado;
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
