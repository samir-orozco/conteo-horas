import { FastifyInstance } from 'fastify';
import { prisma } from '../prisma';
import { jornadaVigente, horasMesDeJornada } from '../utils/vigencias';
import { calcularTardanzas, HorarioConFranjas, construirExtraConfig } from '../utils/tardanzas';
import { rangoReporte } from '../utils/fechas';
import { calcularValorHora } from '../utils/horasColombiana';
import {
  CLAVE_PERMISOS_REMUNERADOS, parsearPoliticaPermisos, calcularHorasEsperadas, armarSaldo,
} from '../utils/saldoTiempo';
import { combinarDiasEsperados } from '../utils/diasEsperados';
import {
  lugaresConAtribucion, apareceConFiltro, resumirPorSede, nombrarLugares, type Lugar, type SedeDelResumen,
} from '../utils/sedesDeReporte';
import { sedesPorDefecto } from '../utils/sedesDeEmpresa';
import { liquidarRegistros } from '../utils/liquidarRegistros';
import { novedadesDelPeriodo } from '../utils/novedadesDelPeriodo';
import { COLABORADOR_SIN_FOTOS } from '../utils/columnasDeColaborador';


// Lo que devuelven los dos resúmenes que se filtran por sede. El filtro decide
// QUIÉN aparece; el resumen se arma siempre con todas las filas, así que no cambia
// según la sede que se mire. Las reglas viven en utils/sedesDeReporte.ts: esto
// solo las junta, y cambia en cada fila los ids de sus lugares por sus nombres.
//
// Los lugares ya traen la sede que se le atribuye al leer a un presencial (12 de
// septiembre de 2026): cuenta en la línea de su sede, entra en el filtro de su
// sede, y en la fila va con `porDefecto` para que la pantalla lo diga.
function responderPorSede<K extends string, F extends { lugares: Lugar[]; porDefecto: string[] } & Record<K, number>>(
  filas: F[],
  claves: readonly K[],
  sedes: SedeDelResumen[],
  sedeId: string | undefined,
) {
  return {
    colaboradores: filas
      .filter(f => apareceConFiltro(f.lugares, sedeId))
      .map(({ lugares, porDefecto, ...fila }) => ({ ...fila, sedes: nombrarLugares(lugares, sedes, porDefecto) })),
    resumen: resumirPorSede(filas, claves, sedes),
  };
}

function agrupar<T extends { colaboradorId: string }>(filas: T[]): Map<string, T[]> {
  const mapa = new Map<string, T[]>();
  for (const f of filas) {
    if (!mapa.has(f.colaboradorId)) mapa.set(f.colaboradorId, []);
    mapa.get(f.colaboradorId)!.push(f);
  }
  return mapa;
}

// Las filas con las que los dos resúmenes deciden DÓNDE trabajó cada persona: todas
// las del período, de la empresa entera, en una sola consulta.
//
// Todas quiere decir también las abiertas y las que el auto-cierre dejó sin hora de
// salida. La regla b) de la atribución (utils/sedePrincipal.ts) busca la fila de ese
// mismo día con sede probada, y puede ser justo la que sigue abierta: /extras-resumen
// le pasaba solo las filas que liquida, que son las cerradas, y ponía en su sede por
// defecto a quien llegadas tarde ponía en la sede donde marcó (revisión del 12 de
// septiembre de 2026). Ahora los dos leen estas mismas filas. Qué se liquida no
// cambia: extras sigue calculando el dinero con su propia consulta.
//
// Liviana a propósito: sin fotos ni horas de salida. Va por el índice
// (colaboradorId, fecha) de `registros` (CLAUDE.md 8.4).
function filasParaLugares(empresaId: string, desdeF: Date, finExclusivo: Date) {
  return prisma.registro.findMany({
    where: { colaborador: { empresaId }, fecha: { gte: desdeF, lt: finExclusivo } },
    select: { colaboradorId: true, fecha: true, entrada: true, sedeId: true, sedeSalidaId: true },
  });
}

export default async function reporteRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.requireEmpresa] };

  app.get('/liquidacion', auth, async (request, reply) => {
    const { colaboradorId, desde, hasta } = request.query as any;
    const { desdeF, finExclusivo } = rangoReporte(desde, hasta);

    const [colaborador, registros, festivos, tiposHoraTodos, jornadas, cfgModo, cfgPermisos, permisosRango, diasMaterializados] = await Promise.all([
      // El colaborador viaja entero en la respuesta, pero sin sus fotos ni su descriptor facial,
      // que es un dato biométrico: se mandaban al navegador y ninguna pantalla los lee de aquí,
      // solo el nombre y el apellido (13 de septiembre de 2026).
      prisma.colaborador.findFirst({
        where: { id: colaboradorId, empresaId: request.empresaId },
        select: { ...COLABORADOR_SIN_FOTOS, horario: { include: { franjas: true } } },
      }),
      // `select` explícito: sin él vienen también `fotoEntrada` y `fotoSalida`,
      // que son base64 de cientos de KB cada una. Un mes de marcaciones se
      // convertía en decenas de MB cargados en memoria para no usarlos. Las
      // fotos se piden aparte, una a una, con `GET /registros/:id/fotos`.
      //
      // También las abiertas: no se liquidan, pero la entrada de una puede ser el regreso
      // de una pausa, y sin ella la pausa se cobraba entera (utils/liquidarRegistros.ts).
      prisma.registro.findMany({
        where: { colaboradorId, fecha: { gte: desdeF, lt: finExclusivo } },
        select: { id: true, fecha: true, entrada: true, salida: true, salidaAlmuerzo: true, salidaDescanso: true, descansoVentana: true },
        orderBy: { fecha: 'asc' },
      }),
      prisma.diaFestivo.findMany({
        where: { OR: [{ empresaId: null }, { empresaId: request.empresaId }] },
      }),
      prisma.tipoHora.findMany(),
      prisma.jornadaVigencia.findMany(),
      prisma.configuracion.findUnique({ where: { empresaId_clave: { empresaId: request.empresaId!, clave: 'HORAS_EXTRA_MODO' } } }),
      prisma.configuracion.findUnique({ where: { empresaId_clave: { empresaId: request.empresaId!, clave: CLAVE_PERMISOS_REMUNERADOS } } }),
      // Solo los permisos que tocan el rango: un permiso que terminó antes de
      // `desde` o empieza después del corte no afecta este período.
      // Con las horas: la novedad de una salida temprana solo excusa su tramo, y
      // sin ellas el saldo la leería de día completo.
      prisma.permiso.findMany({
        where: { colaboradorId, aprobado: true, fechaInicio: { lt: finExclusivo }, fechaFin: { gte: desdeF } },
        select: { fechaInicio: true, fechaFin: true, horaInicio: true, horaFin: true, tipo: true },
      }),
      // Lo que el horario exigía ESE día, congelado cuando se materializó. Es lo
      // que impide que editar un horario hoy mueva la liquidación de julio.
      prisma.diaEsperado.findMany({
        where: { colaboradorId, fecha: { gte: desdeF, lt: finExclusivo } },
        select: {
          fecha: true, programado: true, horaEntrada: true, horaSalida: true,
          toleranciaMin: true, almuerzoMin: true, minutosEsperados: true,
          toleranciaSalidaMin: true, ajustaEntrada: true, almuerzoInicio: true, almuerzoFin: true,
          descansos: true,
        },
        orderBy: { fecha: 'asc' },
      }),
    ]);

    if (!colaborador) return reply.status(404).send({ error: 'Colaborador no encontrado' });

    // Modo de horas extra (SEMANAL por defecto). En HORARIO, extra = fuera de la
    // franja asignada; sin horario activo el helper cae a SEMANAL solo.
    const modoExtra = cfgModo?.valor === 'HORARIO' ? 'HORARIO' : 'SEMANAL';
    const festivosDates = festivos.map(f => new Date(f.fecha));
    const horario = (colaborador as any).horario as HorarioConFranjas | null;

    // Valor hora con el divisor de la jornada vigente al final del período
    const jornadaCierre = jornadaVigente(new Date(hasta), jornadas);
    const horasMes = horasMesDeJornada(jornadaCierre);

    // Los días materializados mandan; los que todavía no lo están (backfill a
    // medias, colaborador anterior a la función) caen al horario vigente, que es
    // lo que el sistema hacía siempre. Así nadie ve números nuevos por sorpresa.
    // Se resuelven ANTES de liquidar porque de ahí sale también la hora de
    // salida programada que usa la tolerancia de jornada.
    const diasEsperados = combinarDiasEsperados(desdeF, finExclusivo, diasMaterializados, horario);
    // El ExtraConfig sale de los días YA COMBINADOS, no del horario vigente: es
    // lo que impide que cambiar un horario reescriba la clasificación de extras
    // de un período ya liquidado.
    const extraConfig = construirExtraConfig(modoExtra, horario, diasEsperados);

    const r = liquidarRegistros(registros, horario, extraConfig, festivosDates, tiposHoraTodos, jornadas, colaborador.salarioMensual, horasMes, true, diasEsperados);

    // Saldo de tiempo no remunerado: lo que el horario exigía contra lo que
    // realmente trabajó. Va en su propio campo y NUNCA dentro de `liquidacion`,
    // porque ese array alimenta totalRecargos/totalAdicional y una fila
    // sintética ahí contaminaría los totales de todos los reportes.
    const politica = parsearPoliticaPermisos(cfgPermisos?.valor);
    const sinHorario = !horario || !horario.activo;
    const esperadas = calcularHorasEsperadas(
      desdeF, finExclusivo, diasEsperados, festivosDates, permisosRango, politica,
      (fecha) => jornadaVigente(fecha, jornadas),
    );
    const saldo = armarSaldo(esperadas, r.minutosOrdinarios, calcularValorHora(colaborador.salarioMensual, horasMes), sinHorario);

    return {
      colaborador, desde, hasta, liquidacion: r.liquidacion,
      salarioBase: colaborador.salarioMensual,
      totalRecargos: r.totalRecargos, totalExtra: r.totalExtra, totalAdicional: r.totalAdicional,
      totalPagar: r.totalAdicional, // compat: ahora es lo adicional al salario
      // Los dos: `registrosCont` son marcaciones CERRADAS y `diasCont` son días con marcación. La
      // cabecera de la pantalla mostraba el primero llamándolo días (15 de septiembre de 2026).
      registrosCont: r.registrosCont,
      diasCont: r.diasCont,
      detalleRegistros: r.detalleRegistros,
      jornadaSemanal: jornadaCierre, horasMes,
      saldo,
    };
  });

  // Resumen de extras y recargos de TODOS los colaboradores activos en un período
  // (para la vista "Todos" del reporte de Extras; el drill-down de cada uno usa /liquidacion).
  app.get('/extras-resumen', auth, async (request) => {
    const { desde, hasta, sedeId } = request.query as any;
    const empresaId = request.empresaId!;
    const { desdeF, finExclusivo } = rangoReporte(desde, hasta);
    const hastaF = new Date(hasta); // solo para resolver la jornada vigente al cierre

    // Este reporte es SOLO lo que se paga además del salario. El saldo de tiempo
    // no remunerado no se calcula aquí a propósito: es un descuento sobre el
    // salario y vive en /liquidacion, donde el salario está a la vista. Dejarlo
    // fuera evita además traer los permisos de toda la empresa en cada consulta.
    const [colaboradores, registrosTodos, festivos, tiposHoraTodos, jornadas, cfgModo, diasTodosEsp, sedes, defectoDe, filasDeLugar] = await Promise.all([
      // Solo lo que usa este resumen. Sin `select` venían todas las columnas de cada persona
      // activa, también `foto`, `fotoMini` y `rostroDescriptor` (13 de septiembre de 2026).
      prisma.colaborador.findMany({
        where: { empresaId, activo: true },
        select: {
          id: true, nombre: true, apellido: true, salarioMensual: true, modalidad: true,
          horario: { include: { franjas: true } },
        },
        orderBy: { nombre: 'asc' },
      }),
      // Igual que en /liquidacion, pero aquí pesa más: son los registros de
      // TODA la empresa. Sin el select, las fotos de un mes entero viajaban a
      // memoria en cada carga del reporte.
      prisma.registro.findMany({
        // Sin filtro de sede, A PROPÓSITO: cada persona se liquida con todos sus
        // turnos y la sede solo decide quién aparece (ver `responderPorSede`).
        // Filtrando aquí, el tope semanal se medía sobre la parte de la semana
        // que quedaba: quien repartió la semana entre dos sedes tenía $0 de
        // extras en cada una. También las abiertas, por lo mismo que en /liquidacion.
        where: { colaborador: { empresaId }, fecha: { gte: desdeF, lt: finExclusivo } },
        select: {
          id: true, colaboradorId: true, fecha: true, entrada: true, salida: true, sedeId: true, sedeSalidaId: true,
          salidaAlmuerzo: true, salidaDescanso: true, descansoVentana: true,
        },
        orderBy: { fecha: 'asc' },
      }),
      prisma.diaFestivo.findMany({ where: { OR: [{ empresaId: null }, { empresaId }] } }),
      prisma.tipoHora.findMany(),
      prisma.jornadaVigencia.findMany(),
      prisma.configuracion.findUnique({ where: { empresaId_clave: { empresaId, clave: 'HORAS_EXTRA_MODO' } } }),
      // Los días de toda la empresa en una consulta. Hacen falta para aplicar la
      // tolerancia de jornada igual que en /liquidacion: si esta vista no la
      // aplicara, el resumen y el desglose del mismo colaborador darían cifras
      // distintas, que es la peor forma de perder la confianza en un reporte.
      prisma.diaEsperado.findMany({
        where: { colaborador: { empresaId }, fecha: { gte: desdeF, lt: finExclusivo } },
        select: {
          colaboradorId: true, fecha: true, programado: true, horaEntrada: true,
          horaSalida: true, toleranciaMin: true, almuerzoMin: true, minutosEsperados: true,
          toleranciaSalidaMin: true, ajustaEntrada: true, almuerzoInicio: true, almuerzoFin: true,
          descansos: true,
        },
        orderBy: { fecha: 'asc' },
      }),
      // Todas las sedes, también las desactivadas: desactivar una sede no borra lo
      // que se trabajó ahí, y el resumen tiene que poder nombrarla.
      prisma.sede.findMany({ where: { empresaId }, select: { id: true, nombre: true, activa: true } }),
      // La sede por defecto de cada persona, para atribuírsela al leer a un
      // presencial cuyas marcas no la probaron (utils/sedePrincipal.ts). En lote:
      // dos consultas para toda la empresa, no una por persona.
      sedesPorDefecto(prisma, empresaId),
      // Dónde trabajó cada uno se decide con TODAS las filas del período, las mismas
      // que lee llegadas tarde, y no con las cerradas que se liquidan arriba (ver
      // `filasParaLugares`, 12 de septiembre de 2026).
      filasParaLugares(empresaId, desdeF, finExclusivo),
    ]);

    const modoExtra = cfgModo?.valor === 'HORARIO' ? 'HORARIO' : 'SEMANAL';
    const festivosDates = festivos.map(f => new Date(f.fecha));
    const jornadaCierre = jornadaVigente(hastaF, jornadas);
    const horasMes = horasMesDeJornada(jornadaCierre);
    const porColaborador = agrupar(registrosTodos);
    const porColDiasEsp = agrupar(diasTodosEsp);
    const porColLugares = agrupar(filasDeLugar);

    const resultado = colaboradores.map(col => {
      const horario = (col as any).horario as HorarioConFranjas | null;
      const registros = porColaborador.get(col.id) ?? [];
      const dias = combinarDiasEsperados(desdeF, finExclusivo, porColDiasEsp.get(col.id) ?? [], horario);
      const extraConfig = construirExtraConfig(modoExtra, horario, dias);
      const r = liquidarRegistros(registros as any, horario, extraConfig, festivosDates, tiposHoraTodos, jornadas, col.salarioMensual, horasMes, false, dias);
      return {
        colaboradorId: col.id, nombre: col.nombre, apellido: col.apellido,
        totalRecargos: r.totalRecargos, totalExtra: r.totalExtra, totalAdicional: r.totalAdicional,
        ...lugaresConAtribucion(porColLugares.get(col.id) ?? [], { modalidad: col.modalidad, sedePorDefecto: defectoDe(col.id) }),
      };
    });

    return { desde, hasta, ...responderPorSede(resultado, ['totalRecargos', 'totalExtra', 'totalAdicional'] as const, sedes, sedeId) };
  });

  // Llegadas tarde de un colaborador según su horario asignado
  app.get('/tardanzas', auth, async (request, reply) => {
    const { colaboradorId, desde, hasta } = request.query as any;
    // Solo lo que usa este reporte: si existe, su horario y su salario. Sin `select` venían todas
    // las columnas, también `foto`, `fotoMini` y `rostroDescriptor` (13 de septiembre de 2026).
    const colaborador = await prisma.colaborador.findFirst({
      where: { id: colaboradorId, empresaId: request.empresaId },
      select: { salarioMensual: true, horario: { include: { franjas: true } } },
    });
    if (!colaborador) return reply.status(404).send({ error: 'Colaborador no encontrado' });
    if (!colaborador.horario || !colaborador.horario.activo) {
      return { sinHorario: true, detalle: [], totalMinutos: 0, diasTarde: 0 };
    }

    const { desdeF, finExclusivo } = rangoReporte(desde, hasta);
    const [registros, festivos, permisos, jornadas, diasMaterializados] = await Promise.all([
      // Solo la entrada: es lo único que lee `calcularTardanzas`. Sin `select`
      // venían también las fotos de cada marcación del período (ver /liquidacion).
      prisma.registro.findMany({
        where: { colaboradorId, fecha: { gte: desdeF, lt: finExclusivo } },
        select: { entrada: true },
      }),
      prisma.diaFestivo.findMany({ where: { OR: [{ empresaId: null }, { empresaId: request.empresaId }] } }),
      // Con las horas: la novedad de una salida temprana no excusa la llegada de esa mañana.
      prisma.permiso.findMany({ where: { colaboradorId, aprobado: true }, select: { fechaInicio: true, fechaFin: true, horaInicio: true, horaFin: true, tipo: true, aprobado: true, colaboradorId: true } }),
      prisma.jornadaVigencia.findMany(),
      // La hora exigida y la tolerancia de cada día, congeladas. Sin esto,
      // adelantar la entrada del horario llenaba de tardanzas los meses cerrados.
      prisma.diaEsperado.findMany({
        where: { colaboradorId, fecha: { gte: desdeF, lt: finExclusivo } },
        select: {
          fecha: true, programado: true, horaEntrada: true, horaSalida: true,
          toleranciaMin: true, almuerzoMin: true, minutosEsperados: true,
          toleranciaSalidaMin: true, ajustaEntrada: true, almuerzoInicio: true, almuerzoFin: true,
          descansos: true,
        },
        orderBy: { fecha: 'asc' },
      }),
    ]);

    const diasEsperados = combinarDiasEsperados(desdeF, finExclusivo, diasMaterializados, colaborador.horario);
    const resultado = calcularTardanzas(registros, diasEsperados, festivos, permisos);
    // Valor del tiempo llegado tarde, a la tarifa base. Es INFORMATIVO: el
    // descuento real sale del saldo del período (ver /liquidacion), que ya
    // incluye estos minutos. Sumar ambos cobraría la tardanza dos veces.
    const valorHora = calcularValorHora(colaborador.salarioMensual, horasMesDeJornada(jornadaVigente(new Date(hasta), jornadas)));
    return {
      sinHorario: false, horario: colaborador.horario, ...resultado,
      valorHora: parseFloat(valorHora.toFixed(2)),
      montoTardanzas: parseFloat(((resultado.totalMinutos / 60) * valorHora).toFixed(2)),
    };
  });

  // Resumen de llegadas tarde de TODOS los colaboradores activos en un período
  // (para la vista "Todos"; el drill-down de cada uno usa /tardanzas).
  app.get('/tardanzas-resumen', auth, async (request) => {
    const { desde, hasta, sedeId } = request.query as any;
    const empresaId = request.empresaId!;
    const { desdeF, finExclusivo } = rangoReporte(desde, hasta);

    const [colaboradores, registrosTodos, festivos, permisosTodos, jornadas, diasTodos, sedes, defectoDe] = await Promise.all([
      // Solo lo que usa este resumen, igual que /extras-resumen: sin `select` venían todas las
      // columnas de cada persona activa, también sus fotos y su descriptor facial.
      prisma.colaborador.findMany({
        where: { empresaId, activo: true },
        select: {
          id: true, nombre: true, apellido: true, salarioMensual: true, modalidad: true,
          horario: { include: { franjas: true } },
        },
        orderBy: { nombre: 'asc' },
      }),
      // Sin filtro de sede, por lo mismo que en /extras-resumen: la primera entrada
      // del día sale de TODOS los turnos. Filtrando aquí, quien entraba a tiempo en
      // una sede y regresaba del almuerzo en otra aparecía tarde en la segunda.
      //
      // Son las filas de `filasParaLugares`, sin fotos: aquí se usan la entrada (la
      // tardanza), el colaborador (para agrupar), y la fecha y las sedes (dónde
      // trabajó, con la sede que se le atribuye a un presencial, y quién aparece con
      // el filtro). Las mismas con las que extras decide dónde trabajó cada uno.
      filasParaLugares(empresaId, desdeF, finExclusivo),
      prisma.diaFestivo.findMany({ where: { OR: [{ empresaId: null }, { empresaId }] } }),
      // Con las horas, igual que en /tardanzas: una salida temprana no excusa la llegada.
      prisma.permiso.findMany({
        where: { colaborador: { empresaId }, aprobado: true },
        select: { fechaInicio: true, fechaFin: true, horaInicio: true, horaFin: true, tipo: true, aprobado: true, colaboradorId: true },
      }),
      prisma.jornadaVigencia.findMany(),
      // Los días de TODA la empresa en una sola consulta; se agrupan abajo. Uno
      // por colaborador serían N consultas para pintar una tabla.
      prisma.diaEsperado.findMany({
        where: { colaborador: { empresaId }, fecha: { gte: desdeF, lt: finExclusivo } },
        select: {
          colaboradorId: true, fecha: true, programado: true, horaEntrada: true,
          horaSalida: true, toleranciaMin: true, almuerzoMin: true, minutosEsperados: true,
          toleranciaSalidaMin: true, ajustaEntrada: true, almuerzoInicio: true, almuerzoFin: true,
          descansos: true,
        },
        orderBy: { fecha: 'asc' },
      }),
      // Todas las sedes, también las desactivadas (ver /extras-resumen).
      prisma.sede.findMany({ where: { empresaId }, select: { id: true, nombre: true, activa: true } }),
      // La sede por defecto de cada persona, en lote (ver /extras-resumen).
      sedesPorDefecto(prisma, empresaId),
    ]);

    const porColRegistros = agrupar(registrosTodos);
    const porColPermisos = agrupar(permisosTodos as any);
    const porColDias = agrupar(diasTodos);
    // Mismo divisor para todos: la jornada vigente al cierre del período.
    const horasMes = horasMesDeJornada(jornadaVigente(new Date(hasta), jornadas));

    const resultado = colaboradores.map(col => {
      const donde = lugaresConAtribucion(porColRegistros.get(col.id) ?? [], { modalidad: col.modalidad, sedePorDefecto: defectoDe(col.id) });
      if (!col.horario || !col.horario.activo) {
        return { colaboradorId: col.id, nombre: col.nombre, apellido: col.apellido, sinHorario: true, diasTarde: 0, totalMinutos: 0, montoTardanzas: 0, ...donde };
      }
      const r = calcularTardanzas(
        porColRegistros.get(col.id) ?? [],
        combinarDiasEsperados(desdeF, finExclusivo, porColDias.get(col.id) ?? [], col.horario),
        festivos,
        (porColPermisos.get(col.id) ?? []) as any
      );
      // Valor informativo (ver la nota en /tardanzas): el descuento efectivo
      // viaja en el saldo del período, no aquí.
      const monto = (r.totalMinutos / 60) * calcularValorHora(col.salarioMensual, horasMes);
      return {
        colaboradorId: col.id, nombre: col.nombre, apellido: col.apellido, sinHorario: false,
        diasTarde: r.diasTarde, totalMinutos: r.totalMinutos,
        montoTardanzas: parseFloat(monto.toFixed(2)),
        ...donde,
      };
    });

    return { desde, hasta, ...responderPorSede(resultado, ['diasTarde', 'totalMinutos', 'montoTardanzas'] as const, sedes, sedeId) };
  });

  // Nómina del período de TODOS los colaboradores activos (15 de septiembre de 2026): el desglose por
  // concepto de cada uno, su salario como base y sus novedades. Es el reporte que se descarga en el
  // formato de HoraPro y, encima, en el de cada ERP.
  //
  // Persona por persona usa EL MISMO cálculo de /liquidacion: liquidarRegistros con los días
  // congelados del período. No hay una segunda cuenta del dinero, así que el detalle de una persona
  // tiene que dar exactamente lo mismo que este resumen.
  //
  // El salario viaja como base, no como total a pagar: en una quincena, el salario del mes completo
  // no es lo que se paga, y ese módulo todavía no existe.
  app.get('/nomina', auth, async (request) => {
    const { desde, hasta, sedeId } = request.query as { desde: string; hasta: string; sedeId?: string };
    const empresaId = request.empresaId!;
    const { desdeF, finExclusivo } = rangoReporte(desde, hasta);

    const [colaboradores, registrosTodos, festivos, tiposHoraTodos, jornadas, cfgModo, cfgPermisos, permisosTodos, diasTodosEsp, sedes, defectoDe, filasDeLugar] = await Promise.all([
      // Solo lo que usa este reporte. La cédula y el cargo van para el archivo del ERP, que
      // identifica a cada persona por su documento.
      prisma.colaborador.findMany({
        where: { empresaId, activo: true },
        select: {
          id: true, nombre: true, apellido: true, cedula: true, cargo: true,
          salarioMensual: true, modalidad: true, horario: { include: { franjas: true } },
        },
        orderBy: { nombre: 'asc' },
      }),
      // Sin filtro de sede y también las abiertas, por lo mismo que en /extras-resumen: cada persona
      // se liquida con todos sus turnos y la sede solo decide quién aparece.
      prisma.registro.findMany({
        where: { colaborador: { empresaId }, fecha: { gte: desdeF, lt: finExclusivo } },
        select: {
          id: true, colaboradorId: true, fecha: true, entrada: true, salida: true, sedeId: true, sedeSalidaId: true,
          salidaAlmuerzo: true, salidaDescanso: true, descansoVentana: true,
        },
        orderBy: { fecha: 'asc' },
      }),
      prisma.diaFestivo.findMany({ where: { OR: [{ empresaId: null }, { empresaId }] } }),
      prisma.tipoHora.findMany(),
      prisma.jornadaVigencia.findMany(),
      prisma.configuracion.findUnique({ where: { empresaId_clave: { empresaId, clave: 'HORAS_EXTRA_MODO' } } }),
      prisma.configuracion.findUnique({ where: { empresaId_clave: { empresaId, clave: CLAVE_PERMISOS_REMUNERADOS } } }),
      // Solo las novedades que tocan el rango, con sus horas: una de parte del día no es un día.
      prisma.permiso.findMany({
        where: { colaborador: { empresaId }, aprobado: true, fechaInicio: { lt: finExclusivo }, fechaFin: { gte: desdeF } },
        select: { colaboradorId: true, fechaInicio: true, fechaFin: true, horaInicio: true, horaFin: true, tipo: true },
      }),
      prisma.diaEsperado.findMany({
        where: { colaborador: { empresaId }, fecha: { gte: desdeF, lt: finExclusivo } },
        select: {
          colaboradorId: true, fecha: true, programado: true, horaEntrada: true,
          horaSalida: true, toleranciaMin: true, almuerzoMin: true, minutosEsperados: true,
          toleranciaSalidaMin: true, ajustaEntrada: true, almuerzoInicio: true, almuerzoFin: true,
          descansos: true,
        },
        orderBy: { fecha: 'asc' },
      }),
      prisma.sede.findMany({ where: { empresaId }, select: { id: true, nombre: true, activa: true } }),
      sedesPorDefecto(prisma, empresaId),
      filasParaLugares(empresaId, desdeF, finExclusivo),
    ]);

    const modoExtra = cfgModo?.valor === 'HORARIO' ? 'HORARIO' : 'SEMANAL';
    const festivosDates = festivos.map(f => new Date(f.fecha));
    const jornadaCierre = jornadaVigente(new Date(hasta), jornadas);
    const horasMes = horasMesDeJornada(jornadaCierre);
    const politica = parsearPoliticaPermisos(cfgPermisos?.valor);
    const porColaborador = agrupar(registrosTodos);
    const porColDiasEsp = agrupar(diasTodosEsp);
    const porColPermisos = agrupar(permisosTodos);
    const porColLugares = agrupar(filasDeLugar);

    const resultado = colaboradores.map(col => {
      const horario = col.horario as HorarioConFranjas | null;
      const dias = combinarDiasEsperados(desdeF, finExclusivo, porColDiasEsp.get(col.id) ?? [], horario);
      const extraConfig = construirExtraConfig(modoExtra, horario, dias);
      // Solo las columnas que lee el motor de horas: las demás de la fila (colaborador, sedes) son
      // para saber dónde trabajó, y pasarlas enteras obligaba a un `as any`.
      const suyos = (porColaborador.get(col.id) ?? []).map(reg => ({
        id: reg.id, fecha: reg.fecha, entrada: reg.entrada, salida: reg.salida,
        salidaAlmuerzo: reg.salidaAlmuerzo, salidaDescanso: reg.salidaDescanso, descansoVentana: reg.descansoVentana,
      }));
      const r = liquidarRegistros(
        suyos, horario, extraConfig, festivosDates,
        tiposHoraTodos, jornadas, col.salarioMensual, horasMes, false, dias,
      );
      return {
        colaboradorId: col.id, cedula: col.cedula, nombre: col.nombre, apellido: col.apellido, cargo: col.cargo,
        salarioMensual: col.salarioMensual,
        valorHora: parseFloat(calcularValorHora(col.salarioMensual, horasMes).toFixed(2)),
        registrosCont: r.registrosCont,
        diasCont: r.diasCont,
        minutosOrdinarios: r.minutosOrdinarios,
        liquidacion: r.liquidacion,
        totalRecargos: r.totalRecargos, totalExtra: r.totalExtra, totalAdicional: r.totalAdicional,
        novedades: novedadesDelPeriodo(porColPermisos.get(col.id) ?? [], desdeF, finExclusivo, politica),
        ...lugaresConAtribucion(porColLugares.get(col.id) ?? [], { modalidad: col.modalidad, sedePorDefecto: defectoDe(col.id) }),
      };
    });

    return {
      desde, hasta, horasMes, jornadaSemanal: jornadaCierre,
      ...responderPorSede(resultado, ['totalRecargos', 'totalExtra', 'totalAdicional'] as const, sedes, sedeId),
    };
  });
}
