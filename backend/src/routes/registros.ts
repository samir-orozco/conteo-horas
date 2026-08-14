import { FastifyInstance } from 'fastify';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { prisma } from '../index';
import { minutosDe } from '../utils/tardanzas';
import { combinarDiasEsperados } from '../utils/diasEsperados';
import { asegurarDiaSinFallar, regenerarDiasDeColaborador } from '../utils/materializarDias';
import { rangoDiaBogota } from '../utils/fechas';
import {
  esPermisoRemunerado, parsearPoliticaPermisos, CLAVE_PERMISOS_REMUNERADOS,
} from '../utils/saldoTiempo';
import {
  resumirAlmuerzoDelDia, minutosContadosDelDia, partirDiaEnJornadas, tramoQueChoca,
  marcacionQueCierra, agruparEnJornadas, instantesDeJornada,
} from '../utils/jornada';

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
  // Qué fue esa salida. Se deja corregir porque al absorber una marcación —dejar
  // que una sola cubra todo el día— la superviviente conservaba la marca de
  // salida al descanso, y la tabla decía "Sin regreso" sobre un día completo.
  if (typeof body.salidaAlmuerzo === 'boolean') out.salidaAlmuerzo = body.salidaAlmuerzo;
  return out;
}

export default async function registroRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.requireEmpresa] };

  // Por qué se valida ANTES de guardar y no se arregla al mostrar: un tramo
  // imposible no tiene forma correcta de pintarse. Quien corregía la salida de
  // la mañana para ponerle la hora real de la tarde se tragaba el tramo del
  // regreso del descanso; el día quedaba con dos marcaciones que se pisan, y la
  // tabla no tenía más remedio que mostrarlo como dos filas.
  async function motivoParaRechazar(
    colaboradorId: string,
    fecha: Date,
    entrada: Date | null,
    salida: Date | null,
    excluirId?: string,
  ): Promise<{ error: string; codigo?: string; conflicto?: { id: string; entrada: Date | null; salida: Date | null } } | null> {
    if (!entrada || !salida) return null;
    if (salida.getTime() <= entrada.getTime()) {
      return { error: 'La salida tiene que ser posterior a la entrada. Si el turno cruza la medianoche, la salida es del día siguiente.' };
    }
    const { inicioDia, finDia } = rangoDiaBogota(fecha);
    const otros = await prisma.registro.findMany({
      where: {
        colaboradorId,
        fecha: { gte: inicioDia, lt: finDia },
        ...(excluirId ? { id: { not: excluirId } } : {}),
      },
      select: { id: true, entrada: true, salida: true },
    });
    const choque = tramoQueChoca({ entrada, salida }, otros);
    if (!choque) return null;
    const hhmm = (d: Date | null) => (d ? format(toZonedTime(d, TZ), 'HH:mm') : '—');
    // Viaja el conflicto entero, no solo el texto: querer que UNA marcación
    // cubra todo el día es lo normal al corregir un día que el kiosco dejó
    // partido, y sin el id la única salida era cancelar, buscar la otra —que ya
    // no tiene fila propia— y borrarla a mano.
    return {
      error: `Ese horario se cruza con otra marcación del mismo día, la de ${hhmm(choque.entrada)} a ${hhmm(choque.salida)}. Nadie puede estar en dos turnos a la vez.`,
      codigo: 'CRUCE_DE_MARCACIONES',
      conflicto: { id: choque.id, entrada: choque.entrada, salida: choque.salida },
    };
  }

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

    // Las novedades que tocan el rango, en UNA consulta. Sin esto la tabla no
    // puede avisar de que ese día hay algo que aprobar, y una novedad pendiente
    // que nadie mira es tiempo que no se está pagando —o que se está pagando de
    // más— sin que nadie lo haya decidido.
    const novedadesPorDia = new Map<string, { id: string; tipo: string; aprobado: boolean; remunerada: boolean }>();
    if (registros.length > 0) {
      const fechas = registros.map(r => r.fecha.getTime());
      const desdeDia = rangoDiaBogota(new Date(Math.min(...fechas))).inicioDia;
      const hastaDia = rangoDiaBogota(new Date(Math.max(...fechas))).finDia;
      const [permisos, politicaCruda] = await Promise.all([
        prisma.permiso.findMany({
          where: {
            colaboradorId: { in: [...new Set(registros.map(r => r.colaboradorId))] },
            fechaInicio: { lt: hastaDia },
            fechaFin: { gte: desdeDia },
          },
          select: { id: true, colaboradorId: true, tipo: true, aprobado: true, fechaInicio: true, fechaFin: true },
          orderBy: { creadoEn: 'asc' },
        }),
        prisma.configuracion.findUnique({
          where: { empresaId_clave: { empresaId: request.empresaId!, clave: CLAVE_PERMISOS_REMUNERADOS } },
          select: { valor: true },
        }),
      ]);
      const politica = parsearPoliticaPermisos(politicaCruda?.valor);
      // Un permiso puede cubrir varios días —unas vacaciones—, así que se
      // reparte por cada día que toca. Se queda el primero de cada día: la
      // tabla solo avisa de que hay algo; el detalle lo cuenta entero.
      for (const p of permisos) {
        for (let t = rangoDiaBogota(p.fechaInicio).inicioDia.getTime();
             t <= rangoDiaBogota(p.fechaFin).inicioDia.getTime();
             t += 24 * 60 * 60 * 1000) {
          const clave = `${p.colaboradorId}|${toZonedTime(new Date(t), TZ).toDateString()}`;
          if (!novedadesPorDia.has(clave)) {
            novedadesPorDia.set(clave, {
              id: p.id, tipo: p.tipo, aprobado: p.aprobado,
              remunerada: esPermisoRemunerado(p.tipo, politica),
            });
          }
        }
      }
    }

    // La tabla lista JORNADAS, no marcaciones. Marcar el almuerzo parte el día
    // en dos tramos, y devolverlos sueltos hacía aparecer el mismo día dos veces
    // —con la segunda fila medio vacía— como si la persona hubiera marcado dos
    // veces. Volver del almuerzo es la misma jornada; volver por la tarde a
    // hacer horas extra sí es otra, y esa sí baja como fila aparte.
    const registrosPorDia = new Map<string, typeof registros>();
    for (const r of registros) {
      const clave = `${r.colaboradorId}|${toZonedTime(r.fecha, TZ).toDateString()}`;
      if (!registrosPorDia.has(clave)) registrosPorDia.set(clave, []);
      registrosPorDia.get(clave)!.push(r);
    }

    // Las fotos (base64) no viajan en la lista: solo un indicador; se piden con /:id/fotos.
    // La llegada se evalúa contra el horario asignado (null si no aplica ese día).
    const filas = [];
    for (const [clave, delDia] of registrosPorDia) {
      const dia = diaEsperadoDe(delDia[0]);
      if (!dia) continue;

      for (const jornada of partirDiaEnJornadas(delDia, dia)) {
        const marcaciones = jornada.marcaciones;
        const primera = marcaciones[0];
        // Quién cierra la jornada. Una salida al DESCANSO no la cierra: la
        // persona no se fue, sigue en su turno. Ponerla en la columna de Salida
        // decía que se había ido a casa a la hora de su descanso.
        const cierra = marcacionQueCierra(marcaciones);

        // La tardanza se mide solo en la primera entrada del día: volver del
        // almuerzo, o regresar de noche a hacer extras, no es llegar tarde.
        let minutosTarde: number | null = null;
        if (primera.entrada && primeraEntradaDia.get(clave) === primera.id
          && primera.tipo !== 'FESTIVO' && dia.programado && dia.horaEntrada) {
          const z = toZonedTime(primera.entrada, TZ);
          minutosTarde = Math.max(0, z.getHours() * 60 + z.getMinutes() - (minutosDe(dia.horaEntrada) + dia.toleranciaMin));
        }

        filas.push({
          // El id es el de la PRIMERA marcación: es la que abre la jornada y con
          // la que se entra al detalle. Las demás viajan en `marcaciones`, que es
          // lo que permite editar o borrar una sola sin adivinar cuál.
          id: primera.id,
          colaboradorId: primera.colaboradorId,
          colaborador: {
            id: delDia[0].colaborador.id,
            nombre: delDia[0].colaborador.nombre,
            apellido: delDia[0].colaborador.apellido,
          },
          fecha: primera.fecha,
          entrada: primera.entrada,
          salida: cierra?.salida ?? null,
          tipo: primera.tipo,
          observacion: primera.observacion,
          sedeId: primera.sedeId,
          minutosTarde,
          // Lo que ese bloque de trabajo contó, con el almuerzo ya descontado.
          // Antes la columna restaba salida menos entrada de un tramo suelto, así
          // que un día con almuerzo mostraba dos duraciones parciales.
          minutosContados: jornada.minutosContados,
          // Lo que ESTA jornada pagó de almuerzo. El resumen `almuerzo` es del
          // día entero: en un día con dos jornadas no son el mismo número.
          minutosAlmuerzoAqui: jornada.minutosAlmuerzoAqui,
          entradaEstimada: primera.entradaEstimada,
          salidaEstimada: cierra?.salidaEstimada ?? false,
          salidaAlmuerzo: cierra?.salidaAlmuerzo ?? false,
          tieneFotoEntrada: !!primera.fotoEntrada,
          tieneFotoSalida: !!cierra?.fotoSalida,
          almuerzo: jornada.almuerzo,
          novedad: novedadesPorDia.get(clave) ?? null,
          marcaciones: marcaciones.map(m => ({
            id: m.id,
            entrada: m.entrada,
            salida: m.salida,
            salidaAlmuerzo: m.salidaAlmuerzo,
            entradaEstimada: m.entradaEstimada,
            salidaEstimada: m.salidaEstimada,
            tieneFotoEntrada: !!m.fotoEntrada,
            tieneFotoSalida: !!m.fotoSalida,
          })),
        });
      }
    }

    // Se reordena al final: agrupar por día deshace el orden que traía la
    // consulta, y la tabla espera lo más reciente arriba.
    return filas.sort((a, b) => {
      const dif = b.fecha.getTime() - a.fecha.getTime();
      if (dif !== 0) return dif;
      return (b.entrada?.getTime() ?? 0) - (a.entrada?.getTime() ?? 0);
    });
  });

  // Detalle de UNA marcación, con el día alrededor.
  //
  // Existe porque la fila de la tabla no se explica sola: el almuerzo vive en el
  // hueco entre dos filas, la tardanza solo se mide en la primera entrada del
  // día, y una hora puede haberla puesto el sistema y no una persona. Todo eso
  // se calcula aquí y no en el navegador.
  //
  // Lo que NO devuelve, a propósito: el desglose en horas ordinarias y extra con
  // su plata. Esa clasificación depende de lo que la persona llevara acumulado
  // en la semana, así que cambiaría según el rango que el administrador tenga
  // filtrado en pantalla — la misma marcación diría dos cifras distintas. Eso
  // vive en el reporte, que sí liquida un período completo.
  app.get('/:id/jornada', auth, async (request, reply) => {
    const { id } = request.params as { id: string };

    // `select` explícito: las fotos son LongText de hasta 300 KB cada una y este
    // endpoint se repide al cambiar de tramo y después de cada guardado.
    const registro = await prisma.registro.findFirst({
      where: { id, colaborador: { empresaId: request.empresaId } },
      select: {
        id: true, colaboradorId: true, fecha: true, entrada: true, salida: true,
        tipo: true, observacion: true, salidaEstimada: true, salidaAlmuerzo: true,
        entradaEstimada: true, creadoEn: true, editadoPor: true, editadoEn: true,
        fotoEntrada: false, fotoSalida: false,
        sede: { select: { nombre: true, activa: true } },
        colaborador: {
          select: {
            nombre: true, apellido: true, cargo: true, empresaId: true,
            horario: { include: { franjas: true } },
          },
        },
      },
    });
    if (!registro) return reply.status(404).send({ error: 'Registro no encontrado' });

    const { inicioDia, finDia } = rangoDiaBogota(registro.fecha);

    const [delDia, congelado, festivo, novedad, fotos] = await Promise.all([
      prisma.registro.findMany({
        where: { colaboradorId: registro.colaboradorId, fecha: { gte: inicioDia, lt: finDia } },
        orderBy: { entrada: 'asc' },
        select: {
          id: true, entrada: true, salida: true, salidaAlmuerzo: true,
          entradaEstimada: true, salidaEstimada: true,
        },
      }),
      prisma.diaEsperado.findFirst({
        where: { colaboradorId: registro.colaboradorId, fecha: { gte: inicioDia, lt: finDia } },
      }),
      prisma.diaFestivo.findFirst({
        where: {
          fecha: { gte: inicioDia, lt: finDia },
          OR: [{ empresaId: null }, { empresaId: registro.colaborador.empresaId }],
        },
        select: { nombre: true },
      }),
      prisma.permiso.findFirst({
        where: {
          colaboradorId: registro.colaboradorId,
          fechaInicio: { lt: finDia },
          fechaFin: { gte: inicioDia },
        },
        // `id` para poder aprobarla o cambiarle el tipo desde el propio detalle,
        // que es donde el administrador la está mirando.
        select: { id: true, tipo: true, descripcion: true, aprobado: true, fechaInicio: true, fechaFin: true, horaInicio: true, horaFin: true },
      }),
      prisma.registro.findUnique({
        where: { id },
        select: { fotoEntrada: true, fotoSalida: true },
      }),
    ]);

    const [dia] = combinarDiasEsperados(
      inicioDia, finDia,
      congelado ? [congelado as any] : [],
      registro.colaborador.horario as any,
    );

    // ¿La fila se escribió ESE día o se reconstruyó después? El backfill llenó
    // todo el pasado con el horario que estaba vigente al correrlo, así que
    // "existe fila" no significa "quedó congelado entonces". La fecha de
    // creación es lo único que distingue una cosa de la otra.
    const fueCongelado = !!congelado && congelado.creadoEn.getTime() <= finDia.getTime();

    const almuerzo = resumirAlmuerzoDelDia(delDia, dia);

    // La tardanza se mide solo en la primera entrada del día: volver del
    // almuerzo no es llegar tarde. Cuando no aplica se dice POR QUÉ, que un
    // guion mudo en una columna de asistencia solo genera dudas.
    const primera = delDia.find(r => r.entrada);
    let minutosTarde: number | null = null;
    let motivoSinTardanza: string | null = null;
    if (!registro.entrada) motivoSinTardanza = 'SIN_ENTRADA';
    else if (primera && primera.id !== registro.id) motivoSinTardanza = 'NO_ES_PRIMERA';
    else if (registro.tipo === 'FESTIVO' || festivo) motivoSinTardanza = 'FESTIVO';
    else if (!dia?.programado || !dia.horaEntrada) motivoSinTardanza = 'NO_PROGRAMADO';
    else if (!registro.colaborador.horario?.activo && !congelado) motivoSinTardanza = 'SIN_HORARIO';
    else {
      const z = toZonedTime(registro.entrada, TZ);
      minutosTarde = Math.max(0, z.getHours() * 60 + z.getMinutes() - (minutosDe(dia.horaEntrada) + dia.toleranciaMin));
    }

    // ¿Esa novedad se paga? No es un campo: sale del tipo más la política de la
    // empresa. Las de ley siempre, NO_REMUNERADO nunca, y cuatro tipos dependen
    // de lo que cada empresa haya configurado. Se resuelve aquí para que el
    // administrador lo vea al elegir el tipo, en vez de tener que ir a mirarlo.
    let novedadRemunerada: boolean | null = null;
    if (novedad) {
      const politica = await prisma.configuracion.findUnique({
        where: { empresaId_clave: { empresaId: registro.colaborador.empresaId, clave: CLAVE_PERMISOS_REMUNERADOS } },
        select: { valor: true },
      });
      novedadRemunerada = esPermisoRemunerado(novedad.tipo, parsearPoliticaPermisos(politica?.valor));
    }

    const { colaborador, ...datosRegistro } = registro;
    return {
      registro: {
        ...datosRegistro,
        tieneFotoEntrada: !!fotos?.fotoEntrada,
        tieneFotoSalida: !!fotos?.fotoSalida,
      },
      colaborador: { nombre: colaborador.nombre, apellido: colaborador.apellido, cargo: colaborador.cargo },
      fecha: inicioDia,
      dia: dia ? { ...dia, congelado: fueCongelado } : null,
      tramos: delDia,
      almuerzo,
      minutosDelDia: minutosContadosDelDia(delDia, dia),
      minutosTarde,
      motivoSinTardanza,
      festivo,
      novedad: novedad ? { ...novedad, remunerada: novedadRemunerada } : null,
    };
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
    const datos = camposRegistro(body, true);
    const motivo = await motivoParaRechazar(datos.colaboradorId, datos.fecha, datos.entrada ?? null, datos.salida ?? null);
    if (motivo) return reply.status(400).send(motivo);

    const registro = await prisma.registro.create({ data: datos as any });
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
    // Lo que va a quedar guardado: el body puede traer solo una parte.
    const cambios = camposRegistro(body, false);
    const motivo = await motivoParaRechazar(
      cambios.colaboradorId ?? existente.colaboradorId,
      cambios.fecha ?? existente.fecha,
      cambios.entrada !== undefined ? cambios.entrada : existente.entrada,
      cambios.salida !== undefined ? cambios.salida : existente.salida,
      id,
    );
    if (motivo) return reply.status(400).send(motivo);

    const actualizado = await prisma.registro.update({
      where: { id },
      data: { ...cambios, editadoPor: payload.email ?? payload.id, editadoEn: new Date() },
    });
    // Corregir un registro puede moverlo de día o de colaborador; el día nuevo
    // también necesita su fila. Nunca pisa la que ya exista, así que corregir
    // el pasado no cambia lo que ese día exigía.
    await asegurarDiaSinFallar(actualizado.colaboradorId, actualizado.fecha, app.log);
    return actualizado;
  });

  // Guardar una JORNADA entera: entrada, descanso y salida de una sola vez.
  //
  // Existe porque el formulario por marcación mentía. La fila de la tabla es una
  // jornada, pero al editarla se abría la PRIMERA marcación, cuya salida es la
  // del descanso: quien había marcado su entrada y su descanso veía "Salida
  // 11:38" y con razón esperaba verla vacía, porque no se había ido a trabajar.
  //
  // Va en una transacción y con una sola validación sobre el estado FINAL. Hacer
  // dos PUT seguidos no sirve: mover el descanso de 11:38 a 12:30 hace que el
  // primer PUT pise al segundo tramo y lo rechace, aunque el resultado final
  // fuera perfectamente válido.
  app.put('/jornada/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const payload = request.user as any;
    const b = request.body as any;

    const primera = await prisma.registro.findFirst({
      where: { id, colaborador: { empresaId: request.empresaId } },
    });
    if (!primera) return reply.status(404).send({ error: 'Registro no encontrado' });

    const colaboradorId = b.colaboradorId ?? primera.colaboradorId;
    if (b.colaboradorId !== undefined && !(await colaboradorDeEmpresa(colaboradorId, request.empresaId!))) {
      return reply.status(404).send({ error: 'Colaborador no encontrado' });
    }
    if (!b.entrada) return reply.status(400).send({ error: 'La jornada necesita una hora de entrada.' });
    if (b.descansoRegreso && !b.descansoSalida) {
      return reply.status(400).send({ error: 'Para registrar el regreso del descanso hace falta la hora en que salió.' });
    }
    if (b.descansoSalida && !b.descansoRegreso && b.salida) {
      return reply.status(400).send({
        error: 'Salió al descanso y todavía no ha vuelto, así que la jornada no puede tener hora de salida. Pon primero la hora del regreso.',
      });
    }

    // Las marcaciones que HOY componen esta jornada, para saber a cuáles escribir.
    // Van por el día de ORIGEN, que es donde la marcación vive ahora mismo.
    const { inicioDia, finDia } = rangoDiaBogota(primera.fecha);
    const delDiaOrigen = await prisma.registro.findMany({
      where: { colaboradorId: primera.colaboradorId, fecha: { gte: inicioDia, lt: finDia } },
      orderBy: { entrada: 'asc' },
    });
    const jornadas = agruparEnJornadas(delDiaOrigen.filter(r => r.entrada));
    const esta = jornadas.find(j => j.some(m => m.id === id)) ?? [primera];
    if (esta.length > 2) {
      return reply.status(400).send({
        error: 'Esta jornada tiene más de dos marcaciones. Edítalas una por una desde el detalle.',
        codigo: 'DEMASIADAS_MARCACIONES',
      });
    }

    // "2026-08-14" se ancla a medianoche de BOGOTÁ, no de UTC. `new Date` sobre
    // esa cadena da medianoche UTC, que en Bogotá es el día ANTERIOR a las siete
    // de la tarde: guardar así movía la jornada entera un día atrás.
    const fechaBase = typeof b.fecha === 'string' && /^\d{4}-\d{2}-\d{2}/.test(b.fecha)
      ? new Date(`${b.fecha.slice(0, 10)}T05:00:00.000Z`)
      : inicioDia;
    const t = instantesDeJornada(fechaBase, {
      entrada: b.entrada,
      descansoSalida: b.descansoSalida || undefined,
      descansoRegreso: b.descansoRegreso || undefined,
      salida: b.salida || undefined,
    });

    // Los tramos que van a quedar, y con qué chocarían.
    //
    // Se comparan contra el día de DESTINO y contra el colaborador de DESTINO,
    // que pueden no ser los de origen. Mirar el día de origen —como se hacía—
    // dejaba pasar la mudanza: corregirle la fecha a una jornada del 13 al 14 se
    // validaba contra las marcaciones del 13, así que si el 14 ya tenía jornada
    // quedaban dos solapadas y esas horas se contaban DOS VECES.
    //
    // Las marcaciones de esta jornada se excluyen: se están reescribiendo enteras.
    const idsPropios = [...new Set(esta.map(m => m.id))];
    const destino = rangoDiaBogota(fechaBase);
    const ajenos = await prisma.registro.findMany({
      where: {
        colaboradorId,
        fecha: { gte: destino.inicioDia, lt: destino.finDia },
        id: { notIn: idsPropios },
      },
      select: { id: true, entrada: true, salida: true },
    });
    const nuevos = [
      { entrada: t.entrada, salida: t.descansoSalida ?? t.salida },
      ...(t.descansoRegreso ? [{ entrada: t.descansoRegreso, salida: t.salida }] : []),
    ];
    const hhmm = (d: Date | null) => (d ? format(toZonedTime(d, TZ), 'HH:mm') : '—');
    for (const n of nuevos) {
      const choque = tramoQueChoca(n, ajenos);
      if (choque) {
        return reply.status(400).send({
          error: `Ese horario se cruza con otra marcación del mismo día, la de ${hhmm(choque.entrada)} a ${hhmm(choque.salida)}. Nadie puede estar en dos turnos a la vez.`,
          codigo: 'CRUCE_DE_MARCACIONES',
          conflicto: { id: choque.id, entrada: choque.entrada, salida: choque.salida },
        });
      }
    }

    const comunes = {
      colaboradorId,
      fecha: fechaBase,
      ...(TIPOS_REGISTRO.has(b.tipo) ? { tipo: b.tipo } : {}),
      observacion: b.observacion || null,
      editadoPor: payload.email ?? payload.id,
      editadoEn: new Date(),
    };

    await prisma.$transaction(async (tx) => {
      await tx.registro.update({
        where: { id: esta[0].id },
        data: { ...comunes, entrada: t.entrada, salida: nuevos[0].salida, salidaAlmuerzo: !!t.descansoSalida },
      });
      const segunda = esta[1];
      if (nuevos[1]) {
        const datos = { ...comunes, entrada: nuevos[1].entrada, salida: nuevos[1].salida, salidaAlmuerzo: false };
        if (segunda) await tx.registro.update({ where: { id: segunda.id }, data: datos });
        else await tx.registro.create({ data: { ...datos, tipo: (b.tipo ?? esta[0].tipo) as any } });
      } else if (segunda) {
        // Se quitó el descanso: la marcación del regreso ya no representa nada.
        await tx.registro.delete({ where: { id: segunda.id } });
      }
    });

    await asegurarDiaSinFallar(colaboradorId, fechaBase, app.log);
    return { ok: true };
  });

  app.delete('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const existente = await prisma.registro.findFirst({
      where: { id, colaborador: { empresaId: request.empresaId } },
    });
    if (!existente) return reply.status(404).send({ error: 'Registro no encontrado' });
    const borrado = await prisma.registro.delete({ where: { id } });

    // Un cambio de horario se aplica desde HOY solo a quien todavía no ha
    // marcado; a quien ya empezó su día se le deja para mañana. Esa decisión se
    // tomaba al guardar el horario y no se volvía a mirar: si después se borran
    // las marcaciones, el día vuelve a estar sin estrenar pero seguía congelado
    // con el horario viejo, y no había forma de desatascarlo hasta el día
    // siguiente. Al borrar se vuelve a evaluar.
    //
    // Solo mira de hoy en adelante —`regenerarDiasDeColaborador` nunca toca el
    // pasado—, así que borrar una marcación de julio no reescribe aquel día.
    const { inicioDia, finDia } = rangoDiaBogota();
    const esDeHoy = borrado.fecha >= inicioDia && borrado.fecha < finDia;
    if (esDeHoy) {
      try {
        await regenerarDiasDeColaborador(borrado.colaboradorId);
      } catch (err) {
        app.log.error(err, 'No se pudieron regenerar los días tras borrar la marcación');
      }
    }
    return borrado;
  });
}
