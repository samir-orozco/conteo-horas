import { FastifyInstance } from 'fastify';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { getISOWeek, getISOWeekYear, startOfISOWeek } from 'date-fns';
import { prisma } from '../prisma';
import { calcularHorasTrabajadas, descontarAlmuerzo, claveDeDescanso, type DescansoConfig } from '../utils/horasColombiana';
// La guarda legal, igual que en reportes.ts: un día declarado SIN acuerdo escrito no vale.
import { fuenteDelDescansoDe } from '../utils/descansoDelHorario';
import { jornadaVigente, tiposVigentes } from '../utils/vigencias';
import { HorarioConFranjas, construirExtraConfig } from '../utils/tardanzas';
import { almuerzoDelRegistro, cobroDePausas } from '../utils/liquidarRegistros';
import { minutosAlmuerzoADescontar } from '../utils/almuerzo';
// Con el nombre de siempre: la copia local salió a `utils/fechas.ts` y ninguna línea de uso cambia.
import { claveDiaBogota as claveDia } from '../utils/fechas';
import { CONTRATO_QUE_LA_REPRESENTA } from '../utils/estadoContratoResumen';
import { contratosPorRevisar } from '../utils/contratosPorRevisar';
import { enArranque, primerosPasos } from '../utils/primerosPasos';
import { armarSemanaDelInicio, ventanaDelInicio } from '../utils/semanaDelInicio';
import { capacidadesEmpresa } from '../utils/capacidades';
import { pruebasDe, resumenDelPanel } from '../utils/lecturasDelClima';
import { DIAS_DE_PRUEBA, estadoDePrueba } from '../utils/pruebaClima';
import { climaParaElInicio } from '../utils/climaDelInicio';
import { armarAgenda } from '../utils/agendaDelInicio';

const TZ = 'America/Bogota';
const CODIGOS_EXTRA = new Set(['HED', 'HEN', 'HEDD', 'HEND']);

function semanaKey(fecha: Date): string {
  const z = toZonedTime(fecha, TZ);
  return `${getISOWeekYear(z)}-W${String(getISOWeek(z)).padStart(2, '0')}`;
}

// Panel de inicio de la empresa: foto del día + del mes.
export default async function dashboardRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.requireEmpresa] };

  app.get('/empresa', auth, async (request) => {
    const empresaId = request.empresaId!;
    const ahora = new Date();
    const ahoraBog = toZonedTime(ahora, TZ);
    const inicioDia = new Date(Date.UTC(ahoraBog.getFullYear(), ahoraBog.getMonth(), ahoraBog.getDate(), 5, 0, 0));
    const finDia = new Date(inicioDia.getTime() + 24 * 60 * 60 * 1000);
    const inicioMes = new Date(Date.UTC(ahoraBog.getFullYear(), ahoraBog.getMonth(), 1, 5, 0, 0));
    const en45 = new Date(inicioDia.getTime() + 45 * 24 * 60 * 60 * 1000);
    // Lunes 00:00 Bogotá de la semana ISO que contiene el día 1: así las semanas
    // que cruzan el límite de mes quedan completas para los KPIs semanales/extra.
    const inicioSemanaMes = fromZonedTime(startOfISOWeek(toZonedTime(inicioMes, TZ)), TZ);
    const claveHoy = claveDia(ahora);
    // Los días que piden la asistencia de la semana y las llegadas tarde de los últimos 7 días.
    const ventana = ventanaDelInicio(ahora);

    const [colaboradores, festivos, jornadas, tiposHoraTodos, empresa] = await Promise.all([
      prisma.colaborador.findMany({
        where: { empresaId, activo: true },
        select: {
          id: true, nombre: true, apellido: true, cargo: true, fechaNacimiento: true,
          // Desde cuándo existe: quien no estaba cuando tenía que entrar no faltó (utils/asistencia.ts).
          creadoEn: true,
          // El horario entero con sus franjas: con él se completan los días que no estén materializados
          // (`diasParaMedir`), igual que en los reportes.
          horario: { include: { franjas: true } },
          // Para «Primeros pasos»: si ya hay alguien con su rostro registrado.
          rostroEnroladoEn: true,
          // Para «Pendientes por resolver»: el mismo contrato que pinta la lista de Colaboradores.
          contratos: CONTRATO_QUE_LA_REPRESENTA,
        },
        orderBy: { nombre: 'asc' },
      }),
      // Solo festivos relevantes: del mes en curso (para el cálculo) y de la ventana de la semana, hasta
      // +45 días (próximos). Sin el comienzo de la ventana, los primeros días del mes las llegadas tarde
      // del mes anterior se contaban también en sus festivos.
      prisma.diaFestivo.findMany({ where: { OR: [{ empresaId: null }, { empresaId }], fecha: { gte: ventana.inicio < inicioSemanaMes ? ventana.inicio : inicioSemanaMes, lte: en45 } } }),
      prisma.jornadaVigencia.findMany(),
      prisma.tipoHora.findMany(),
      // Por su llave primaria: la fecha de creación, para saber si sigue arrancando, y la suscripción, para
      // anunciar su vencimiento en «Próximos días».
      prisma.empresa.findUnique({
        where: { id: empresaId },
        select: { creadoEn: true, exentaPago: true, suscripcion: { select: { estado: true, finPrueba: true, pagadoHasta: true } } },
      }),
    ]);

    const colIds = colaboradores.map(c => c.id);
    // «Primeros pasos» solo existe durante el primer mes: fuera de él no se pregunta nada más a la base.
    const arrancando = !!empresa && enArranque(empresa.creadoEn, ahora);
    const festSet = new Set(festivos.map(f => claveDia(f.fecha)));
    const hoyEsFestivo = festSet.has(claveHoy);

    // Registros de hoy + turnos abiertos de días anteriores.
    // Nota: NO se traen fotoEntrada/fotoSalida (LongText base64) — solo se necesita
    // saber si existen, que se resuelve con una consulta liviana de IDs.
    const SEL_REG = {
      id: true, colaboradorId: true, fecha: true, entrada: true, salida: true, tipo: true,
      // Sin esto el dashboard no puede distinguir a quien se fue a su casa de
      // quien salió a una pausa, y los pintaba a los dos como "salida de hoy".
      salidaAlmuerzo: true, salidaDescanso: true,
      colaborador: { select: { id: true, nombre: true, apellido: true, cargo: true } },
    };
    const [registrosHoy, turnosAbiertos, registrosMes, salidasConFoto, diasCongelados, porAprobar, horariosActivos, marcacionDelKiosco, permisos, diasDeLaVentana, marcasDeLaVentana] = await Promise.all([
      prisma.registro.findMany({
        where: { colaboradorId: { in: colIds }, fecha: { gte: inicioDia, lt: finDia } },
        select: SEL_REG,
        orderBy: { entrada: 'asc' },
      }),
      prisma.registro.findMany({
        where: { colaboradorId: { in: colIds }, fecha: { lt: inicioDia }, entrada: { not: null }, salida: null },
        select: { id: true, fecha: true, entrada: true, colaborador: { select: { id: true, nombre: true, apellido: true, cargo: true } } },
        orderBy: { fecha: 'desc' },
      }),
      prisma.registro.findMany({
        where: { colaboradorId: { in: colIds }, fecha: { gte: inicioSemanaMes, lte: finDia }, salida: { not: null } },
        select: { id: true, colaboradorId: true, fecha: true, entrada: true, salida: true, salidaAlmuerzo: true },
        orderBy: { fecha: 'asc' },
      }),
      // IDs de las salidas de hoy que tienen foto de verificación (para el ícono de cámara)
      prisma.registro.findMany({
        where: { colaboradorId: { in: colIds }, fecha: { gte: inicioDia, lt: finDia }, fotoSalida: { not: null } },
        select: { id: true },
      }),
      // Si cada día del rango era el descanso obligatorio de esa persona, congelado. MISMO rango que
      // `registrosMes` de arriba, para que no haya un día con marcación y sin su respuesta. Van solo
      // tres columnas: el panel no necesita el resto del día, solo saber si llevaba recargo.
      prisma.diaEsperado.findMany({
        where: { colaboradorId: { in: colIds }, fecha: { gte: inicioSemanaMes, lte: finDia } },
        select: { colaboradorId: true, fecha: true, esDescanso: true },
      }),
      // Las novedades por aprobar: sin aprobar y de alguien activo, sean de la fecha que sean. Es la misma
      // regla con la que el resumen semanal las cuenta (`envioResumenSemanal.ts`). Va por los ids de los
      // activos y no por la relación con la empresa, para que entre por el índice de `colaboradorId`.
      prisma.permiso.findMany({
        where: { aprobado: false, colaboradorId: { in: colIds } },
        select: { id: true, colaboradorId: true, tipo: true, fechaInicio: true, fechaFin: true },
        orderBy: { fechaInicio: 'asc' },
      }),
      arrancando ? prisma.horario.count({ where: { empresaId, activo: true } }) : Promise.resolve(0),
      // Del kiosco: con rostro o con cédula. Una carga a mano (MANUAL) no prueba que el kiosco funcione, y
      // `not: 'MANUAL'` dejaría fuera las filas en null, así que van los dos métodos con nombre. Se busca
      // entre TODA la gente de la empresa, también la retirada: la primera marcación es un hecho que ya
      // pasó, y retirar a quien probó el kiosco no puede volver a pedir el paso (revisión del 14/10/2026).
      arrancando
        ? prisma.colaborador.findMany({ where: { empresaId }, select: { id: true } }).then(todos =>
          prisma.registro.findFirst({ where: { colaboradorId: { in: todos.map(c => c.id) }, metodoEntrada: { in: ['ROSTRO', 'CEDULA'] } }, select: { id: true } }))
        : Promise.resolve(null),
      // Las novedades APROBADAS que tocan la ventana: las de hoy van a su tarjeta, y todas excusan en la
      // asistencia y en las llegadas tarde, como en el reporte. Por los ids de los activos, para entrar
      // por el índice de `colaboradorId`.
      prisma.permiso.findMany({
        where: { aprobado: true, colaboradorId: { in: colIds }, fechaInicio: { lt: ventana.fin }, fechaFin: { gte: ventana.inicio } },
        select: { id: true, colaboradorId: true, fechaInicio: true, fechaFin: true, horaInicio: true, horaFin: true, tipo: true, descripcion: true, aprobado: true, evidenciaTipo: true, evidenciaNombre: true,
          colaborador: { select: { nombre: true, apellido: true } } },
      }),
      // Lo que el horario o el planificador exigían cada día de la ventana, congelado.
      prisma.diaEsperado.findMany({
        where: { colaboradorId: { in: colIds }, fecha: { gte: ventana.inicio, lt: ventana.fin } },
        select: {
          colaboradorId: true, fecha: true, programado: true, horaEntrada: true, horaSalida: true,
          toleranciaMin: true, almuerzoMin: true, minutosEsperados: true, toleranciaSalidaMin: true, ajustaEntrada: true,
          almuerzoInicio: true, almuerzoFin: true, descansos: true,
        },
      }),
      // Las entradas de la ventana, con la fecha de su jornada (no la del reloj: un nocturno).
      prisma.registro.findMany({
        where: { colaboradorId: { in: colIds }, fecha: { gte: ventana.inicio, lt: finDia }, entrada: { not: null } },
        select: { colaboradorId: true, fecha: true, entrada: true },
      }),
    ]);
    const conFotoSalida = new Set(salidasConFoto.map(r => r.id));

    // Un turno abierto de un día anterior aún puede estar EN CURSO (turno nocturno
    // que cruzó medianoche) si la entrada fue hace poco; si no, es un olvido de salida.
    const LIMITE_TURNO_MS = 16 * 60 * 60 * 1000;
    const turnoEnCurso = (r: { entrada: Date | null }) => !!r.entrada && (ahora.getTime() - r.entrada.getTime()) <= LIMITE_TURNO_MS;
    const turnosEnCurso = turnosAbiertos.filter(turnoEnCurso);
    const turnosViejos = turnosAbiertos.filter(r => !turnoEnCurso(r));

    // ===== En planta ahora (entrada abierta hoy + turno nocturno aún en curso) =====
    const enPlanta = [
      ...registrosHoy.filter(r => r.entrada && !r.salida),
      ...turnosEnCurso,
    ].map(r => ({
      id: r.colaborador.id,
      nombre: `${r.colaborador.nombre} ${r.colaborador.apellido}`,
      cargo: r.colaborador.cargo,
      desde: r.entrada,
    }));

    // ===== En una pausa ahora (salió a almorzar o a su descanso y no vuelve) =====
    //
    // Antes esta gente caía en "Salidas de hoy", en rojo, como quien se fue a su
    // casa —y desaparecía del tablero mientras almorzaba—. Una salida a una pausa
    // no cierra la jornada: es la misma regla que `marcacionQueCierra` aplica en
    // la columna de Salida, y el dashboard no puede contradecirla.
    const porColaborador = new Map<string, typeof registrosHoy>();
    for (const r of registrosHoy) {
      const lista = porColaborador.get(r.colaboradorId);
      if (lista) lista.push(r);
      else porColaborador.set(r.colaboradorId, [r]);
    }
    const enDescanso = [];
    for (const marcas of porColaborador.values()) {
      const enOrden = [...marcas].sort((a, b) => (a.entrada?.getTime() ?? 0) - (b.entrada?.getTime() ?? 0));
      // Si tiene un tramo abierto ya volvió: está en `enPlanta`, no aquí.
      if (enOrden.some(m => m.entrada && !m.salida)) continue;
      const ultima = [...enOrden].reverse().find(m => m.salida);
      if (!ultima || (!ultima.salidaAlmuerzo && !ultima.salidaDescanso)) continue;
      enDescanso.push({
        id: ultima.colaborador.id,
        nombre: `${ultima.colaborador.nombre} ${ultima.colaborador.apellido}`,
        cargo: ultima.colaborador.cargo,
        // A cuál de las dos pausas salió: el tablero dice "almorzando" o "en su
        // descanso", no una etiqueta que sirva para las dos.
        pausa: ultima.salidaDescanso ? 'DESCANSO' : 'ALMUERZO',
        desde: ultima.salida,
      });
    }

    // ===== Salidas de hoy (colaboradores que marcaron salida) =====
    // Sin el filtro de las pausas, quien salió a almorzar o a su descanso
    // aparecía aquí como que había terminado su jornada.
    const salidasRecientes = registrosHoy
      .filter(r => r.salida && !r.salidaAlmuerzo && !r.salidaDescanso)
      .sort((a, b) => b.salida!.getTime() - a.salida!.getTime())
      .map(r => ({
        registroId: r.id,
        id: r.colaborador.id,
        nombre: `${r.colaborador.nombre} ${r.colaborador.apellido}`,
        cargo: r.colaborador.cargo,
        entrada: r.entrada,
        salida: r.salida,
        tieneFotoSalida: conFotoSalida.has(r.id),
      }));

    // Novedades que cubren HOY, para su tarjeta. Las de toda la ventana las usa la semana, más abajo.
    const permisosHoy = permisos.filter(p => claveDia(p.fechaInicio) <= claveHoy && claveHoy <= claveDia(p.fechaFin));

    // ===== La semana: asistencia, llegadas tarde de 7 días y «Aún no han marcado» =====
    // Una sola regla, la de los días esperados (decisión del dueño, 15 de octubre de 2026): la del
    // reporte de llegadas tarde y la del aviso de Telegram. Antes este tablero miraba el horario de hoy
    // y no veía los turnos pintados en el planificador ni los días libres de la programación.
    const semana = armarSemanaDelInicio({
      ahora,
      colaboradores,
      materializados: diasDeLaVentana,
      marcas: marcasDeLaVentana,
      novedades: permisos,
      festivos,
    });
    const { sinMarcarHoy, llegadasTardeHoy } = semana;
    // Las fotos chicas de quienes llegaron tarde en los 7 días, una vez cada una y por su llave primaria.
    // La miniatura no va en la consulta de todos los activos: la traería de toda la empresa.
    const tardeEnLaSemana = [...new Set(semana.llegadasTarde7d.dias.flatMap(d => d.personas.map(p => p.id)))];
    const fotos = tardeEnLaSemana.length
      ? await prisma.colaborador.findMany({ where: { id: { in: tardeEnLaSemana } }, select: { id: true, fotoMini: true } })
      : [];
    const fotoDe = new Map(fotos.map(f => [f.id, f.fotoMini]));
    const nombreCompleto = new Map(colaboradores.map(c => [c.id, `${c.nombre} ${c.apellido}`]));
    const personasDeLaSemana = Object.fromEntries(tardeEnLaSemana.map(id => [id, { nombre: nombreCompleto.get(id) ?? '', fotoMini: fotoDe.get(id) ?? null }]));

    // ===== Horas extra y horas de la semana (toda la empresa) =====
    const festivosDates = festivos.map(f => new Date(f.fecha));
    const porColSemana = new Map<string, typeof registrosMes>();
    for (const r of registrosMes) {
      const k = `${r.colaboradorId}|${semanaKey(r.fecha)}`;
      if (!porColSemana.has(k)) porColSemana.set(k, []);
      porColSemana.get(k)!.push(r);
    }

    let minutosExtraMes = 0;
    let minutosTrabajadosSemana = 0;
    const claveSemanaActual = semanaKey(ahora);
    // Horario de cada colaborador, para descontar el almuerzo. Lo que ya se cobró de cada
    // día lo lleva `cobroDePausas`, la misma cuenta de la liquidación: la copia de aquí
    // daba el día por cobrado con la primera fila que pagara algo (12 de septiembre de 2026).
    const horarioPorCol = new Map<string, HorarioConFranjas | null>(
      colaboradores.map(c => [c.id, (c as any).horario as HorarioConFranjas | null])
    );
    const cobrarAlmuerzo = cobroDePausas();
    // Cuánto almuerzo debe cada día de cada persona, con la regla de utils/almuerzo.ts: lo
    // fijado menos lo que se tomó marcado. El panel no lee días congelados, así que lo fijado
    // es el almuerzo del horario vigente, como siempre. El día es el de la fecha de la jornada.
    const filasPorColDia = new Map<string, typeof registrosMes>();
    for (const r of registrosMes) {
      const k = `${r.colaboradorId}|${claveDia(r.fecha)}`;
      filasPorColDia.set(k, [...(filasPorColDia.get(k) ?? []), r]);
    }
    const almuerzoPorColDia = new Map([...filasPorColDia].map(([k, filas]) => [k,
      minutosAlmuerzoADescontar(filas, { almuerzoMin: almuerzoDelRegistro(horarioPorCol.get(filas[0].colaboradorId), filas[0].fecha) })]));

    // Modo de horas extra (mismo criterio que el reporte de liquidación)
    const cfgModo = await prisma.configuracion.findUnique({ where: { empresaId_clave: { empresaId, clave: 'HORAS_EXTRA_MODO' } } });
    const modoExtra = cfgModo?.valor === 'HORARIO' ? 'HORARIO' : 'SEMANAL';
    // El `ExtraConfig` sigue sin días congelados: el panel mira la semana en curso y se queda con el
    // respaldo por día de semana, que es como se ha comportado siempre.
    const extraConfigPorCol = new Map(colaboradores.map(c => [c.id, construirExtraConfig(modoExtra, (c as any).horario, [])]));

    // El DESCANSO sí se conecta (20 de septiembre de 2026), y es un cambio de criterio respecto de
    // lo que decía aquí antes. La razón: el panel y el reporte cuentan las horas de la MISMA semana
    // para la MISMA gente, así que si uno respeta el día de descanso pactado y el otro no, muestran
    // dos cifras distintas de lo mismo. Eso es peor que no mostrarlo.
    //
    // Donde hay fila congelada manda la fila; donde no la hay, el horario de esa persona (o la
    // programación, si no tiene horario). Un `null` NO entra al mapa: es la ausencia del dato, no un
    // `false`. Las franjas ya venían en la consulta para calcular las horas de la semana, así que
    // esto no agrega ni una columna: el 30 de septiembre de 2026 QUITÓ las tres del descanso.
    const descansoPorCol = new Map<string, DescansoConfig>(
      colaboradores.map(c => [c.id, { porFecha: {} as Record<string, boolean>, fuente: fuenteDelDescansoDe(c.horario) }]),
    );
    for (const d of diasCongelados) {
      if (typeof d.esDescanso !== 'boolean') continue;
      const cfg = descansoPorCol.get(d.colaboradorId);
      if (cfg?.porFecha) cfg.porFecha[claveDeDescanso(d.fecha)] = d.esDescanso;
    }

    for (const [clave, regs] of porColSemana) {
      const jornadaSemanal = jornadaVigente(regs[0].fecha, jornadas);
      let minutosOrdSemana = 0;
      const esSemanaActual = clave.endsWith(claveSemanaActual);
      for (const r of regs) {
        if (!r.entrada || !r.salida) continue;
        const tiposDelDia = tiposVigentes(r.fecha, tiposHoraTodos);
        const { resultado, minutosOrdinariosTrabajados } = calcularHorasTrabajadas(
          r.entrada, r.salida, festivosDates, tiposDelDia as any, jornadaSemanal, minutosOrdSemana, extraConfigPorCol.get(r.colaboradorId),
          descansoPorCol.get(r.colaboradorId)
        );
        const claveColDia = `${r.colaboradorId}|${claveDia(r.fecha)}`;
        const almuerzoCobrado = cobrarAlmuerzo(claveColDia, almuerzoPorColDia.get(claveColDia) ?? 0, m => descontarAlmuerzo(resultado, m));
        minutosOrdSemana += Math.max(0, minutosOrdinariosTrabajados - almuerzoCobrado);
        for (const p of resultado) {
          if (CODIGOS_EXTRA.has(p.codigo)) minutosExtraMes += p.minutos;
          if (esSemanaActual) minutosTrabajadosSemana += p.minutos;
        }
      }
    }

    // ===== Turnos realmente olvidados (abiertos de días anteriores, ya no en curso) =====
    const turnosOlvidados = turnosViejos.map(r => ({
      id: r.id,
      colaborador: `${r.colaborador.nombre} ${r.colaborador.apellido}`,
      entrada: r.entrada,
    }));

    // ===== Novedades activas hoy =====
    const novedadesHoy = permisosHoy.map(p => ({
      id: p.id,
      colaboradorId: p.colaboradorId,
      colaborador: `${p.colaborador.nombre} ${p.colaborador.apellido}`,
      tipo: p.tipo,
      descripcion: p.descripcion,
      aprobado: p.aprobado,
      fechaInicio: p.fechaInicio,
      fechaFin: p.fechaFin,
      evidenciaTipo: p.evidenciaTipo,
      evidenciaNombre: p.evidenciaNombre,
    }));

    // ===== Próximos festivos (siguientes 45 días) =====
    const proximosFestivos = festivos
      .filter(f => new Date(f.fecha) >= inicioDia && new Date(f.fecha) <= en45)
      .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
      .map(f => ({ nombre: f.nombre, fecha: f.fecha, propio: f.empresaId !== null }));

    // ===== Cumpleaños del mes =====
    const mesHoy = ahoraBog.getMonth();
    const diaHoyNum = ahoraBog.getDate();
    const cumpleanos = colaboradores
      .filter(c => c.fechaNacimiento)
      .map(c => {
        const n = new Date(c.fechaNacimiento!);
        return {
          id: c.id,
          nombre: `${c.nombre} ${c.apellido}`,
          cargo: c.cargo,
          dia: n.getUTCDate(),
          mes: n.getUTCMonth(),
          esHoy: n.getUTCMonth() === mesHoy && n.getUTCDate() === diaHoyNum,
        };
      })
      .filter(c => c.mes === mesHoy)
      .sort((a, b) => a.dia - b.dia);

    // ===== Pendientes por resolver =====
    // Lo que espera a que alguien haga algo. Los turnos sin cerrar ya viajan en `turnosOlvidados`.
    const nombreDe = new Map(colaboradores.map(c => [c.id, `${c.nombre} ${c.apellido}`]));
    const pendientes = {
      novedades: porAprobar.map(p => ({
        id: p.id, colaboradorId: p.colaboradorId, colaborador: nombreDe.get(p.colaboradorId) ?? '',
        tipo: p.tipo, fechaInicio: p.fechaInicio, fechaFin: p.fechaFin,
      })),
      contratos: contratosPorRevisar(
        colaboradores.map(c => ({ id: c.id, nombre: `${c.nombre} ${c.apellido}`, contrato: c.contratos[0] ?? null })),
        ahora,
      ),
    };

    // ===== El clima de los últimos 7 días =====
    // Solo el ADMINISTRADOR, como el panel (`soloAdministrador` en routes/clima.ts): al supervisor no se le lee nada.
    // Con o sin la función: sin ella salen las cifras sin nombres de la vista sin el plan. El resumen se lee SIN
    // abrir casos: un GET que se carga a cada rato no escribe.
    const esAdministrador = (request.user as { rol?: string } | undefined)?.rol === 'ADMIN';
    let clima: ReturnType<typeof climaParaElInicio> = null;
    let pruebaDelClima: { hasta: Date } | null = null;
    if (esAdministrador) {
      const desdeClima = ventana.claves7[0];
      const hastaClima = ventana.claves7[6];
      const [cap, pruebas, resumenClima, casosEnLaBase] = await Promise.all([
        capacidadesEmpresa(empresaId),
        pruebasDe(empresaId),
        resumenDelPanel(empresaId, desdeClima, hastaClima, null, false),
        prisma.seguimientoClima.count({ where: { empresaId, estado: { in: ['SIN_REVISAR', 'EN_SEGUIMIENTO'] } } }),
      ]);
      const prueba = estadoDePrueba(pruebas, ahora);
      pruebaDelClima = prueba.vigente;
      clima = climaParaElInicio({
        esAdministrador, tieneClima: !!cap.features.clima, desde: desdeClima, hasta: hastaClima,
        resumen: resumenClima, prueba: { ...prueba, dias: DIAS_DE_PRUEBA },
        casosAbiertosEnLaBase: casosEnLaBase,
      });
    }

    // ===== Próximos días =====
    // Festivos, cumpleaños, contratos y, solo al administrador, el vencimiento de la suscripción y el fin de la
    // prueba del clima en su última semana (utils/agendaDelInicio.ts). `proximosFestivos` y `cumpleanos` siguen
    // viajando para el Inicio anterior, mientras dure la ventana del despliegue.
    const agenda = armarAgenda({
      ahora, festivos,
      personas: colaboradores.map(c => ({ id: c.id, nombre: `${c.nombre} ${c.apellido}`, fechaNacimiento: c.fechaNacimiento })),
      contratos: pendientes.contratos,
      esAdministrador, suscripcion: empresa?.suscripcion ?? null, exentaPago: empresa?.exentaPago ?? false, pruebaDelClima,
    });

    // ===== Primeros pasos =====
    // null es «no aplica» (la empresa ya pasó su primer mes o completó los pasos). Un backend anterior no
    // manda el campo, y la pantalla tampoco pinta nada.
    const pasos = arrancando
      ? primerosPasos({
        horariosActivos,
        colaboradoresActivos: colaboradores.length,
        conRostro: colaboradores.filter(c => c.rostroEnroladoEn).length,
        marcoEnElKiosco: !!marcacionDelKiosco,
      })
      : null;

    return {
      fecha: ahora,
      hoyEsFestivo,
      totales: {
        colaboradoresActivos: colaboradores.length,
        enPlanta: enPlanta.length,
        horasSemana: Math.round((minutosTrabajadosSemana / 60) * 10) / 10,
        horasExtraMes: Math.round((minutosExtraMes / 60) * 10) / 10,
      },
      enPlanta,
      enDescanso,
      salidasRecientes,
      llegadasTardeHoy,
      sinMarcarHoy,
      turnosOlvidados,
      novedadesHoy,
      proximosFestivos,
      cumpleanos,
      // Los casos de clima abiertos van con los demás pendientes, solo si el administrador tiene la función.
      pendientes: clima?.estado === 'ACTIVO' ? { ...pendientes, casosClima: clima.casosAbiertos } : pendientes,
      primerosPasos: pasos,
      clima,
      agenda,
      asistenciaSemana: semana.asistenciaSemana,
      llegadasTarde7d: { dias: semana.llegadasTarde7d.dias, personas: personasDeLaSemana },
    };
  });
}
