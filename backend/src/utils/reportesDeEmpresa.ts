import { prisma } from '../prisma';
import { jornadaVigente, horasMesDeJornada } from './vigencias';
import { calcularTardanzas, HorarioConFranjas, construirExtraConfig } from './tardanzas';
import { rangoReporte } from './fechas';
import { calcularValorHora } from './horasColombiana';
import { combinarDiasEsperados, diasParaMedir } from './diasEsperados';
import { lugaresConAtribucion } from './sedesDeReporte';
import { sedesPorDefecto } from './sedesDeEmpresa';
import { liquidarRegistros, desdeDeLaCuentaSemanal } from './liquidarRegistros';
// La guarda legal: convierte las tres columnas crudas en el estado que el motor entiende, y por el
// camino descarta cualquier día declarado SIN acuerdo escrito. Se resuelve aquí, una vez por
// persona, y nunca dentro del motor: así no hay ninguna rama que pueda saltársela.
import { fuenteDelDescansoDe } from './descansoDelHorario';

// LOS DOS RESÚMENES DE LA EMPRESA ENTERA, FUERA DE LAS RUTAS (11 de octubre de 2026).
//
// Vivían dentro de /extras-resumen y /tardanzas-resumen. Salieron cuando el correo semanal
// necesitó las mismas cifras: la otra opción era una segunda copia de las consultas, y dos copias
// de lo que calcula dinero terminan dando dos números distintos para la misma persona (§9.3).
//
// Es plomería: consultas y armado. El cálculo vive en liquidarRegistros y calcularTardanzas, que
// están probados. La extracción se verificó con la respuesta ENTERA de las dos rutas, antes y
// después, sobre la base local (§5.3).

export function agrupar<T extends { colaboradorId: string }>(filas: T[]): Map<string, T[]> {
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
export function filasParaLugares(empresaId: string, desdeF: Date, finExclusivo: Date) {
  return prisma.registro.findMany({
    where: { colaborador: { empresaId }, fecha: { gte: desdeF, lt: finExclusivo } },
    select: { colaboradorId: true, fecha: true, entrada: true, sedeId: true, sedeSalidaId: true },
  });
}

// Extras y recargos de TODOS los colaboradores activos en un período.
//
// Este resumen es SOLO lo que se paga además del salario. El saldo de tiempo
// no remunerado no se calcula aquí a propósito: es un descuento sobre el
// salario y vive en /liquidacion, donde el salario está a la vista. Dejarlo
// fuera evita además traer los permisos de toda la empresa en cada consulta.
//
// Cada fila trae además los minutos ordinarios y extra, y los de cada día, que la ruta no
// devuelve y el correo semanal sí usa (las horas de la semana y sus barras).
export async function liquidarEmpresa(empresaId: string, desde: string, hasta: string) {
  const { desdeF, finExclusivo } = rangoReporte(desde, hasta);
  const hastaF = new Date(hasta); // solo para resolver la jornada vigente al cierre
  // Las marcaciones y los días se traen desde el lunes de la primera semana: cuentan para el tope
  // semanal, pero el motor solo paga desde `desdeF` (15 de octubre de 2026).
  const desdeCuenta = desdeDeLaCuentaSemanal(desdeF);

  const [colaboradores, registrosTodos, festivos, tiposHoraTodos, jornadas, cfgModo, diasTodosEsp, sedes, defectoDe, filasDeLugar] = await Promise.all([
    // Solo lo que usa este resumen. Sin `select` venían todas las columnas de cada persona
    // activa, también `foto`, `fotoMini` y `rostroDescriptor` (13 de septiembre de 2026).
    prisma.colaborador.findMany({
      where: { empresaId, activo: true },
      select: {
        id: true, nombre: true, apellido: true, salarioMensual: true, modalidad: true,
        // El horario con sus franjas: de ahí sale qué día descansa esta persona, y sin eso este
        // resumen daría cifras distintas de /liquidacion para la misma gente.
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
      where: { colaborador: { empresaId }, fecha: { gte: desdeCuenta, lt: finExclusivo } },
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
      where: { colaborador: { empresaId }, fecha: { gte: desdeCuenta, lt: finExclusivo } },
      select: {
        colaboradorId: true, fecha: true, programado: true, horaEntrada: true,
        horaSalida: true, toleranciaMin: true, almuerzoMin: true, minutosEsperados: true,
        toleranciaSalidaMin: true, ajustaEntrada: true, almuerzoInicio: true, almuerzoFin: true,
        descansos: true,
        // Si ESE día era su descanso obligatorio. Sin esta columna el día llega al motor sin la
        // respuesta congelada y el recargo dominical se recalcula con la declaración de HOY, que
        // es justo lo que esta tabla existe para impedir (20 de septiembre de 2026).
        esDescanso: true,
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

  const filas = colaboradores.map(col => {
    const horario = (col as any).horario as HorarioConFranjas | null;
    const registros = porColaborador.get(col.id) ?? [];
    const dias = combinarDiasEsperados(desdeCuenta, finExclusivo, porColDiasEsp.get(col.id) ?? [], horario);
    const extraConfig = construirExtraConfig(modoExtra, horario, dias);
    const r = liquidarRegistros(registros as any, horario, extraConfig, festivosDates, tiposHoraTodos, jornadas, col.salarioMensual, horasMes, false, dias, fuenteDelDescansoDe(col.horario), desdeF);
    return {
      colaboradorId: col.id, nombre: col.nombre, apellido: col.apellido,
      totalRecargos: r.totalRecargos, totalExtra: r.totalExtra, totalAdicional: r.totalAdicional,
      ...lugaresConAtribucion(porColLugares.get(col.id) ?? [], { modalidad: col.modalidad, sedePorDefecto: defectoDe(col.id) }),
      minutosOrdinarios: r.minutosOrdinarios, minutosExtra: r.minutosExtra, minutosPorDia: r.minutosPorDia,
    };
  });

  return { filas, sedes };
}

// Llegadas tarde de TODOS los colaboradores activos en un período.
export async function tardanzasDeEmpresa(empresaId: string, desde: string, hasta: string) {
  const { desdeF, finExclusivo } = rangoReporte(desde, hasta);

  const [colaboradores, registrosTodos, festivos, permisosTodos, jornadas, diasTodos, sedes, defectoDe] = await Promise.all([
    // Solo lo que usa este resumen, igual que el de extras: sin `select` venían todas las
    // columnas de cada persona activa, también sus fotos y su descriptor facial.
    prisma.colaborador.findMany({
      where: { empresaId, activo: true },
      select: {
        id: true, nombre: true, apellido: true, salarioMensual: true, modalidad: true,
        horario: { include: { franjas: true } },
      },
      orderBy: { nombre: 'asc' },
    }),
    // Sin filtro de sede, por lo mismo que en extras: la primera entrada
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
    //
    // SIN `esDescanso`, por lo mismo que en /tardanzas: este resumen cuenta llegadas tarde, no
    // recargos, y seleccionar la columna aquí sugeriría que la respeta.
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
    // Todas las sedes, también las desactivadas (ver el resumen de extras).
    prisma.sede.findMany({ where: { empresaId }, select: { id: true, nombre: true, activa: true } }),
    // La sede por defecto de cada persona, en lote (ver el resumen de extras).
    sedesPorDefecto(prisma, empresaId),
  ]);

  const porColRegistros = agrupar(registrosTodos);
  const porColPermisos = agrupar(permisosTodos as any);
  const porColDias = agrupar(diasTodos);
  // Mismo divisor para todos: la jornada vigente al cierre del período.
  const horasMes = horasMesDeJornada(jornadaVigente(new Date(hasta), jornadas));

  const filas = colaboradores.map(col => {
    const donde = lugaresConAtribucion(porColRegistros.get(col.id) ?? [], { modalidad: col.modalidad, sedePorDefecto: defectoDe(col.id) });
    // Con horario activo o con turnos pintados en el planificador: la misma regla de /tardanzas y
    // del Inicio (15 de octubre de 2026).
    const dias = diasParaMedir(desdeF, finExclusivo, porColDias.get(col.id) ?? [], col.horario);
    if (!dias) {
      return { colaboradorId: col.id, nombre: col.nombre, apellido: col.apellido, sinHorario: true, diasTarde: 0, totalMinutos: 0, montoTardanzas: 0, detalle: [], ...donde };
    }
    const r = calcularTardanzas(
      porColRegistros.get(col.id) ?? [],
      dias,
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
      // El detalle por día, para el Inicio (las llegadas tarde de los últimos 7 días). La ruta del
      // resumen lo quita antes de responder.
      detalle: r.detalle,
      ...donde,
    };
  });

  return { filas, sedes };
}
