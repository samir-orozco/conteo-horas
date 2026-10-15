"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.agrupar = agrupar;
exports.filasParaLugares = filasParaLugares;
exports.idsDeLaEmpresa = idsDeLaEmpresa;
exports.liquidarEmpresa = liquidarEmpresa;
exports.tardanzasDeEmpresa = tardanzasDeEmpresa;
const prisma_1 = require("../prisma");
const vigencias_1 = require("./vigencias");
const tardanzas_1 = require("./tardanzas");
const fechas_1 = require("./fechas");
const horasColombiana_1 = require("./horasColombiana");
const diasEsperados_1 = require("./diasEsperados");
const sedesDeReporte_1 = require("./sedesDeReporte");
const sedesDeEmpresa_1 = require("./sedesDeEmpresa");
const liquidarRegistros_1 = require("./liquidarRegistros");
// La guarda legal: convierte las tres columnas crudas en el estado que el motor entiende, y por el
// camino descarta cualquier día declarado SIN acuerdo escrito. Se resuelve aquí, una vez por
// persona, y nunca dentro del motor: así no hay ninguna rama que pueda saltársela.
const descansoDelHorario_1 = require("./descansoDelHorario");
// LOS DOS RESÚMENES DE LA EMPRESA ENTERA, FUERA DE LAS RUTAS (11 de octubre de 2026).
//
// Vivían dentro de /extras-resumen y /tardanzas-resumen. Salieron cuando el correo semanal
// necesitó las mismas cifras: la otra opción era una segunda copia de las consultas, y dos copias
// de lo que calcula dinero terminan dando dos números distintos para la misma persona (§9.3).
//
// Es plomería: consultas y armado. El cálculo vive en liquidarRegistros y calcularTardanzas, que
// están probados. La extracción se verificó con la respuesta ENTERA de las dos rutas, antes y
// después, sobre la base local (§5.3).
function agrupar(filas) {
    const mapa = new Map();
    for (const f of filas) {
        if (!mapa.has(f.colaboradorId))
            mapa.set(f.colaboradorId, []);
        mapa.get(f.colaboradorId).push(f);
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
async function filasParaLugares(empresaId, desdeF, finExclusivo) {
    return prisma_1.prisma.registro.findMany({
        where: { colaboradorId: { in: await idsDeLaEmpresa(empresaId) }, fecha: { gte: desdeF, lt: finExclusivo } },
        select: { colaboradorId: true, fecha: true, entrada: true, sedeId: true, sedeSalidaId: true },
    });
}
// TODAS las personas de la empresa, también las retiradas: lo mismo que el filtro `colaborador: { empresaId }`.
// Con ese filtro MySQL recorría `registros` y `dias_esperados` ENTERAS, de todas las empresas, y descartaba después
// lo que no era de esta (un Table scan, CLAUDE.md §8.4); con la lista entra por el índice (colaboradorId, fecha).
// Medido el 15 de octubre de 2026 al llevar las extras de la quincena al Inicio, que se carga a cada rato.
// prisma/diferencial-consultas-por-empresa.ts comprobó que los reportes responden byte a byte lo mismo.
function idsDeLaEmpresa(empresaId) {
    return prisma_1.prisma.colaborador.findMany({ where: { empresaId }, select: { id: true } }).then(cs => cs.map(c => c.id));
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
async function liquidarEmpresa(empresaId, desde, hasta) {
    const { desdeF, finExclusivo } = (0, fechas_1.rangoReporte)(desde, hasta);
    const hastaF = new Date(hasta); // solo para resolver la jornada vigente al cierre
    // Las marcaciones y los días se traen desde el lunes de la primera semana: cuentan para el tope
    // semanal, pero el motor solo paga desde `desdeF` (15 de octubre de 2026).
    const desdeCuenta = (0, liquidarRegistros_1.desdeDeLaCuentaSemanal)(desdeF);
    const ids = idsDeLaEmpresa(empresaId);
    const [colaboradores, registrosTodos, festivos, tiposHoraTodos, jornadas, cfgModo, diasTodosEsp, sedes, defectoDe, filasDeLugar] = await Promise.all([
        // Solo lo que usa este resumen. Sin `select` venían todas las columnas de cada persona
        // activa, también `foto`, `fotoMini` y `rostroDescriptor` (13 de septiembre de 2026).
        prisma_1.prisma.colaborador.findMany({
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
        ids.then(ids => prisma_1.prisma.registro.findMany({
            // Sin filtro de sede, A PROPÓSITO: cada persona se liquida con todos sus
            // turnos y la sede solo decide quién aparece (ver `responderPorSede`).
            // Filtrando aquí, el tope semanal se medía sobre la parte de la semana
            // que quedaba: quien repartió la semana entre dos sedes tenía $0 de
            // extras en cada una. También las abiertas, por lo mismo que en /liquidacion.
            where: { colaboradorId: { in: ids }, fecha: { gte: desdeCuenta, lt: finExclusivo } },
            select: {
                id: true, colaboradorId: true, fecha: true, entrada: true, salida: true, sedeId: true, sedeSalidaId: true,
                salidaAlmuerzo: true, salidaDescanso: true, descansoVentana: true,
            },
            orderBy: { fecha: 'asc' },
        })),
        prisma_1.prisma.diaFestivo.findMany({ where: { OR: [{ empresaId: null }, { empresaId }] } }),
        prisma_1.prisma.tipoHora.findMany(),
        prisma_1.prisma.jornadaVigencia.findMany(),
        prisma_1.prisma.configuracion.findUnique({ where: { empresaId_clave: { empresaId, clave: 'HORAS_EXTRA_MODO' } } }),
        // Los días de toda la empresa en una consulta. Hacen falta para aplicar la
        // tolerancia de jornada igual que en /liquidacion: si esta vista no la
        // aplicara, el resumen y el desglose del mismo colaborador darían cifras
        // distintas, que es la peor forma de perder la confianza en un reporte.
        ids.then(ids => prisma_1.prisma.diaEsperado.findMany({
            where: { colaboradorId: { in: ids }, fecha: { gte: desdeCuenta, lt: finExclusivo } },
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
        })),
        // Todas las sedes, también las desactivadas: desactivar una sede no borra lo
        // que se trabajó ahí, y el resumen tiene que poder nombrarla.
        prisma_1.prisma.sede.findMany({ where: { empresaId }, select: { id: true, nombre: true, activa: true } }),
        // La sede por defecto de cada persona, para atribuírsela al leer a un
        // presencial cuyas marcas no la probaron (utils/sedePrincipal.ts). En lote:
        // dos consultas para toda la empresa, no una por persona.
        (0, sedesDeEmpresa_1.sedesPorDefecto)(prisma_1.prisma, empresaId),
        // Dónde trabajó cada uno se decide con TODAS las filas del período, las mismas
        // que lee llegadas tarde, y no con las cerradas que se liquidan arriba (ver
        // `filasParaLugares`, 12 de septiembre de 2026).
        filasParaLugares(empresaId, desdeF, finExclusivo),
    ]);
    const modoExtra = cfgModo?.valor === 'HORARIO' ? 'HORARIO' : 'SEMANAL';
    const festivosDates = festivos.map(f => new Date(f.fecha));
    const jornadaCierre = (0, vigencias_1.jornadaVigente)(hastaF, jornadas);
    const horasMes = (0, vigencias_1.horasMesDeJornada)(jornadaCierre);
    const porColaborador = agrupar(registrosTodos);
    const porColDiasEsp = agrupar(diasTodosEsp);
    const porColLugares = agrupar(filasDeLugar);
    const filas = colaboradores.map(col => {
        const horario = col.horario;
        const registros = porColaborador.get(col.id) ?? [];
        const dias = (0, diasEsperados_1.combinarDiasEsperados)(desdeCuenta, finExclusivo, porColDiasEsp.get(col.id) ?? [], horario);
        const extraConfig = (0, tardanzas_1.construirExtraConfig)(modoExtra, horario, dias);
        const r = (0, liquidarRegistros_1.liquidarRegistros)(registros, horario, extraConfig, festivosDates, tiposHoraTodos, jornadas, col.salarioMensual, horasMes, false, dias, (0, descansoDelHorario_1.fuenteDelDescansoDe)(col.horario), desdeF);
        return {
            colaboradorId: col.id, nombre: col.nombre, apellido: col.apellido,
            totalRecargos: r.totalRecargos, totalExtra: r.totalExtra, totalAdicional: r.totalAdicional,
            ...(0, sedesDeReporte_1.lugaresConAtribucion)(porColLugares.get(col.id) ?? [], { modalidad: col.modalidad, sedePorDefecto: defectoDe(col.id) }),
            minutosOrdinarios: r.minutosOrdinarios, minutosExtra: r.minutosExtra, minutosConRecargo: r.minutosConRecargo, minutosPorDia: r.minutosPorDia,
        };
    });
    return { filas, sedes };
}
// Llegadas tarde de TODOS los colaboradores activos en un período.
async function tardanzasDeEmpresa(empresaId, desde, hasta) {
    const { desdeF, finExclusivo } = (0, fechas_1.rangoReporte)(desde, hasta);
    const ids = idsDeLaEmpresa(empresaId);
    const [colaboradores, registrosTodos, festivos, permisosTodos, jornadas, diasTodos, sedes, defectoDe] = await Promise.all([
        // Solo lo que usa este resumen, igual que el de extras: sin `select` venían todas las
        // columnas de cada persona activa, también sus fotos y su descriptor facial.
        prisma_1.prisma.colaborador.findMany({
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
        prisma_1.prisma.diaFestivo.findMany({ where: { OR: [{ empresaId: null }, { empresaId }] } }),
        // Con las horas, igual que en /tardanzas: una salida temprana no excusa la llegada.
        ids.then(ids => prisma_1.prisma.permiso.findMany({
            where: { colaboradorId: { in: ids }, aprobado: true },
            select: { fechaInicio: true, fechaFin: true, horaInicio: true, horaFin: true, tipo: true, aprobado: true, colaboradorId: true },
        })),
        prisma_1.prisma.jornadaVigencia.findMany(),
        // Los días de TODA la empresa en una sola consulta; se agrupan abajo. Uno
        // por colaborador serían N consultas para pintar una tabla.
        //
        // SIN `esDescanso`, por lo mismo que en /tardanzas: este resumen cuenta llegadas tarde, no
        // recargos, y seleccionar la columna aquí sugeriría que la respeta.
        ids.then(ids => prisma_1.prisma.diaEsperado.findMany({
            where: { colaboradorId: { in: ids }, fecha: { gte: desdeF, lt: finExclusivo } },
            select: {
                colaboradorId: true, fecha: true, programado: true, horaEntrada: true,
                horaSalida: true, toleranciaMin: true, almuerzoMin: true, minutosEsperados: true,
                toleranciaSalidaMin: true, ajustaEntrada: true, almuerzoInicio: true, almuerzoFin: true,
                descansos: true,
            },
            orderBy: { fecha: 'asc' },
        })),
        // Todas las sedes, también las desactivadas (ver el resumen de extras).
        prisma_1.prisma.sede.findMany({ where: { empresaId }, select: { id: true, nombre: true, activa: true } }),
        // La sede por defecto de cada persona, en lote (ver el resumen de extras).
        (0, sedesDeEmpresa_1.sedesPorDefecto)(prisma_1.prisma, empresaId),
    ]);
    const porColRegistros = agrupar(registrosTodos);
    const porColPermisos = agrupar(permisosTodos);
    const porColDias = agrupar(diasTodos);
    // Mismo divisor para todos: la jornada vigente al cierre del período.
    const horasMes = (0, vigencias_1.horasMesDeJornada)((0, vigencias_1.jornadaVigente)(new Date(hasta), jornadas));
    const filas = colaboradores.map(col => {
        const donde = (0, sedesDeReporte_1.lugaresConAtribucion)(porColRegistros.get(col.id) ?? [], { modalidad: col.modalidad, sedePorDefecto: defectoDe(col.id) });
        // Con horario activo o con turnos pintados en el planificador: la misma regla de /tardanzas y
        // del Inicio (15 de octubre de 2026).
        const dias = (0, diasEsperados_1.diasParaMedir)(desdeF, finExclusivo, porColDias.get(col.id) ?? [], col.horario);
        if (!dias) {
            return { colaboradorId: col.id, nombre: col.nombre, apellido: col.apellido, sinHorario: true, diasTarde: 0, totalMinutos: 0, montoTardanzas: 0, detalle: [], ...donde };
        }
        const r = (0, tardanzas_1.calcularTardanzas)(porColRegistros.get(col.id) ?? [], dias, festivos, (porColPermisos.get(col.id) ?? []));
        // Valor informativo (ver la nota en /tardanzas): el descuento efectivo
        // viaja en el saldo del período, no aquí.
        const monto = (r.totalMinutos / 60) * (0, horasColombiana_1.calcularValorHora)(col.salarioMensual, horasMes);
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
