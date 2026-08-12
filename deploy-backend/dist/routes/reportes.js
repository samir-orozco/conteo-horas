"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = reporteRoutes;
const date_fns_tz_1 = require("date-fns-tz");
const date_fns_1 = require("date-fns");
const index_1 = require("../index");
const horasColombiana_1 = require("../utils/horasColombiana");
const vigencias_1 = require("../utils/vigencias");
const tardanzas_1 = require("../utils/tardanzas");
const fechas_1 = require("../utils/fechas");
const horasColombiana_2 = require("../utils/horasColombiana");
const saldoTiempo_1 = require("../utils/saldoTiempo");
const diasEsperados_1 = require("../utils/diasEsperados");
const TZ = 'America/Bogota';
function semanaKey(fecha) {
    const z = (0, date_fns_tz_1.toZonedTime)(fecha, TZ);
    return `${(0, date_fns_1.getISOWeekYear)(z)}-W${String((0, date_fns_1.getISOWeek)(z)).padStart(2, '0')}`;
}
function claveDiaBogota(d) {
    const z = (0, date_fns_tz_1.toZonedTime)(d, TZ);
    return `${z.getFullYear()}-${z.getMonth()}-${z.getDate()}`;
}
// Minutos de almuerzo a descontar de un registro: solo si el horario tiene
// almuerzo y la franja de ESE día lo aplica (ej. el sábado corto no).
function almuerzoDelRegistro(horario, fecha) {
    if (!horario || !horario.almuerzoMin)
        return 0;
    const z = (0, date_fns_tz_1.toZonedTime)(fecha, TZ);
    const franja = (0, tardanzas_1.franjaDelDia)(horario, tardanzas_1.DIAS_SEMANA[z.getDay()]);
    return franja && franja.tieneAlmuerzo ? horario.almuerzoMin : 0;
}
function agrupar(filas) {
    const mapa = new Map();
    for (const f of filas) {
        if (!mapa.has(f.colaboradorId))
            mapa.set(f.colaboradorId, []);
        mapa.get(f.colaboradorId).push(f);
    }
    return mapa;
}
// Núcleo del cálculo de liquidación de UN colaborador en un período: recorre sus
// registros agrupados por semana ISO (el tope de 42h/sem se resetea cada semana),
// aplica el motor de horas colombianas registro por registro, y opcionalmente
// arma el desglose día a día (para el drill-down de "Extras y recargos").
function liquidarRegistros(registros, horario, extraConfig, festivosDates, tiposHoraTodos, jornadas, salarioMensual, horasMes, incluirDetalle) {
    const porSemana = new Map();
    for (const reg of registros) {
        const key = semanaKey(reg.fecha);
        if (!porSemana.has(key))
            porSemana.set(key, []);
        porSemana.get(key).push(reg);
    }
    const acumulado = {};
    const diasConAlmuerzo = new Set();
    const detalleRegistros = [];
    for (const [, regsDeUnaSemana] of porSemana) {
        const jornadaSemanal = (0, vigencias_1.jornadaVigente)(regsDeUnaSemana[0].fecha, jornadas);
        let minutosOrdSemana = 0;
        for (const registro of regsDeUnaSemana) {
            if (!registro.entrada || !registro.salida)
                continue;
            const tiposDelDia = (0, vigencias_1.tiposVigentes)(registro.fecha, tiposHoraTodos);
            const { resultado, minutosOrdinariosTrabajados } = (0, horasColombiana_1.calcularHorasTrabajadas)(registro.entrada, registro.salida, festivosDates, tiposDelDia, jornadaSemanal, minutosOrdSemana, extraConfig);
            let ordDelRegistro = minutosOrdinariosTrabajados;
            const claveDia = claveDiaBogota(registro.entrada);
            const almuerzo = almuerzoDelRegistro(horario, registro.entrada);
            if (almuerzo > 0 && !diasConAlmuerzo.has(claveDia)) {
                const { descontado } = (0, horasColombiana_1.descontarAlmuerzo)(resultado, almuerzo);
                if (descontado > 0) {
                    diasConAlmuerzo.add(claveDia);
                    ordDelRegistro = Math.max(0, ordDelRegistro - descontado);
                }
            }
            minutosOrdSemana += ordDelRegistro;
            if (incluirDetalle) {
                // Solo lo que genera pago adicional (excluye HOD, que ya está en el salario)
                const filas = (0, horasColombiana_1.calcularLiquidacion)(salarioMensual, horasMes, resultado)
                    .filter(l => l.codigo !== 'HOD' && l.horas > 0)
                    .map(l => ({ codigo: l.codigo, nombre: l.nombre, horas: l.horas, subtotal: l.subtotal }));
                if (filas.length > 0) {
                    detalleRegistros.push({ fecha: registro.fecha, entrada: registro.entrada, salida: registro.salida, filas });
                }
            }
            for (const p of resultado) {
                if (!acumulado[p.codigo])
                    acumulado[p.codigo] = { ...p };
                else
                    acumulado[p.codigo].minutos += p.minutos;
            }
        }
    }
    const horasPorTipo = Object.values(acumulado);
    const liquidacion = (0, horasColombiana_1.calcularLiquidacion)(salarioMensual, horasMes, horasPorTipo);
    const totalAdicional = liquidacion.reduce((s, l) => s + l.subtotal, 0);
    const totalRecargos = liquidacion.filter(l => !l.esExtra).reduce((s, l) => s + l.subtotal, 0);
    const totalExtra = liquidacion.filter(l => l.esExtra).reduce((s, l) => s + l.subtotal, 0);
    // Minutos ORDINARIOS del período (ya netos de almuerzo), para comparar contra
    // las horas que el horario exigía. Se suman los códigos no extra del acumulado
    // —no el contador semanal interno— porque ese excluye domingos y festivos, y
    // aquí sí queremos contarlos: si alguien trabajó un domingo, ese tiempo lo
    // trabajó. Las extra quedan fuera a propósito: se pagan aparte con su recargo.
    //
    // Se toman los MINUTOS crudos, no las horas de `liquidacion`: esas vienen
    // redondeadas a 2 decimales y al multiplicarlas por 60 reaparecen colas de
    // coma flotante (167.33h → 10039.8 min en vez de 10040).
    const minutosOrdinarios = horasPorTipo
        .filter(t => !horasColombiana_2.CODIGOS_EXTRA.has(t.codigo))
        .reduce((s, t) => s + t.minutos, 0);
    return { liquidacion, totalRecargos, totalExtra, totalAdicional, registrosCont: registros.length, detalleRegistros, minutosOrdinarios };
}
async function reporteRoutes(app) {
    const auth = { preHandler: [app.requireEmpresa] };
    app.get('/liquidacion', auth, async (request, reply) => {
        const { colaboradorId, desde, hasta } = request.query;
        const { desdeF, finExclusivo } = (0, fechas_1.rangoReporte)(desde, hasta);
        const [colaborador, registros, festivos, tiposHoraTodos, jornadas, cfgModo, cfgPermisos, permisosRango, diasMaterializados] = await Promise.all([
            index_1.prisma.colaborador.findFirst({
                where: { id: colaboradorId, empresaId: request.empresaId },
                include: { horario: { include: { franjas: true } } },
            }),
            index_1.prisma.registro.findMany({
                where: { colaboradorId, fecha: { gte: desdeF, lt: finExclusivo }, salida: { not: null } },
                orderBy: { fecha: 'asc' },
            }),
            index_1.prisma.diaFestivo.findMany({
                where: { OR: [{ empresaId: null }, { empresaId: request.empresaId }] },
            }),
            index_1.prisma.tipoHora.findMany(),
            index_1.prisma.jornadaVigencia.findMany(),
            index_1.prisma.configuracion.findUnique({ where: { empresaId_clave: { empresaId: request.empresaId, clave: 'HORAS_EXTRA_MODO' } } }),
            index_1.prisma.configuracion.findUnique({ where: { empresaId_clave: { empresaId: request.empresaId, clave: saldoTiempo_1.CLAVE_PERMISOS_REMUNERADOS } } }),
            // Solo los permisos que tocan el rango: un permiso que terminó antes de
            // `desde` o empieza después del corte no afecta este período.
            index_1.prisma.permiso.findMany({
                where: { colaboradorId, aprobado: true, fechaInicio: { lt: finExclusivo }, fechaFin: { gte: desdeF } },
                select: { fechaInicio: true, fechaFin: true, tipo: true },
            }),
            // Lo que el horario exigía ESE día, congelado cuando se materializó. Es lo
            // que impide que editar un horario hoy mueva la liquidación de julio.
            index_1.prisma.diaEsperado.findMany({
                where: { colaboradorId, fecha: { gte: desdeF, lt: finExclusivo } },
                select: {
                    fecha: true, programado: true, horaEntrada: true, horaSalida: true,
                    toleranciaMin: true, almuerzoMin: true, minutosEsperados: true,
                },
                orderBy: { fecha: 'asc' },
            }),
        ]);
        if (!colaborador)
            return reply.status(404).send({ error: 'Colaborador no encontrado' });
        // Modo de horas extra (SEMANAL por defecto). En HORARIO, extra = fuera de la
        // franja asignada; sin horario activo el helper cae a SEMANAL solo.
        const modoExtra = cfgModo?.valor === 'HORARIO' ? 'HORARIO' : 'SEMANAL';
        const festivosDates = festivos.map(f => new Date(f.fecha));
        const horario = colaborador.horario;
        const extraConfig = (0, tardanzas_1.construirExtraConfig)(modoExtra, horario);
        // Valor hora con el divisor de la jornada vigente al final del período
        const jornadaCierre = (0, vigencias_1.jornadaVigente)(new Date(hasta), jornadas);
        const horasMes = (0, vigencias_1.horasMesDeJornada)(jornadaCierre);
        const r = liquidarRegistros(registros, horario, extraConfig, festivosDates, tiposHoraTodos, jornadas, colaborador.salarioMensual, horasMes, true);
        // Saldo de tiempo no remunerado: lo que el horario exigía contra lo que
        // realmente trabajó. Va en su propio campo y NUNCA dentro de `liquidacion`,
        // porque ese array alimenta totalRecargos/totalAdicional y una fila
        // sintética ahí contaminaría los totales de todos los reportes.
        const politica = (0, saldoTiempo_1.parsearPoliticaPermisos)(cfgPermisos?.valor);
        const sinHorario = !horario || !horario.activo;
        // Los días materializados mandan; los que todavía no lo están (backfill a
        // medias, colaborador anterior a la función) caen al horario vigente, que es
        // lo que el sistema hacía siempre. Así nadie ve números nuevos por sorpresa.
        const diasEsperados = (0, diasEsperados_1.combinarDiasEsperados)(desdeF, finExclusivo, diasMaterializados, horario);
        const esperadas = (0, saldoTiempo_1.calcularHorasEsperadas)(desdeF, finExclusivo, diasEsperados, festivosDates, permisosRango, politica, (fecha) => (0, vigencias_1.jornadaVigente)(fecha, jornadas));
        const saldo = (0, saldoTiempo_1.armarSaldo)(esperadas, r.minutosOrdinarios, (0, horasColombiana_2.calcularValorHora)(colaborador.salarioMensual, horasMes), sinHorario);
        return {
            colaborador, desde, hasta, liquidacion: r.liquidacion,
            salarioBase: colaborador.salarioMensual,
            totalRecargos: r.totalRecargos, totalExtra: r.totalExtra, totalAdicional: r.totalAdicional,
            totalPagar: r.totalAdicional, // compat: ahora es lo adicional al salario
            registrosCont: r.registrosCont,
            detalleRegistros: r.detalleRegistros,
            jornadaSemanal: jornadaCierre, horasMes,
            saldo,
        };
    });
    // Resumen de extras y recargos de TODOS los colaboradores activos en un período
    // (para la vista "Todos" del reporte de Extras; el drill-down de cada uno usa /liquidacion).
    app.get('/extras-resumen', auth, async (request) => {
        const { desde, hasta } = request.query;
        const empresaId = request.empresaId;
        const { desdeF, finExclusivo } = (0, fechas_1.rangoReporte)(desde, hasta);
        const hastaF = new Date(hasta); // solo para resolver la jornada vigente al cierre
        // Este reporte es SOLO lo que se paga además del salario. El saldo de tiempo
        // no remunerado no se calcula aquí a propósito: es un descuento sobre el
        // salario y vive en /liquidacion, donde el salario está a la vista. Dejarlo
        // fuera evita además traer los permisos de toda la empresa en cada consulta.
        const [colaboradores, registrosTodos, festivos, tiposHoraTodos, jornadas, cfgModo] = await Promise.all([
            index_1.prisma.colaborador.findMany({
                where: { empresaId, activo: true },
                include: { horario: { include: { franjas: true } } },
                orderBy: { nombre: 'asc' },
            }),
            index_1.prisma.registro.findMany({
                where: { colaborador: { empresaId }, fecha: { gte: desdeF, lt: finExclusivo }, salida: { not: null } },
                orderBy: { fecha: 'asc' },
            }),
            index_1.prisma.diaFestivo.findMany({ where: { OR: [{ empresaId: null }, { empresaId }] } }),
            index_1.prisma.tipoHora.findMany(),
            index_1.prisma.jornadaVigencia.findMany(),
            index_1.prisma.configuracion.findUnique({ where: { empresaId_clave: { empresaId, clave: 'HORAS_EXTRA_MODO' } } }),
        ]);
        const modoExtra = cfgModo?.valor === 'HORARIO' ? 'HORARIO' : 'SEMANAL';
        const festivosDates = festivos.map(f => new Date(f.fecha));
        const jornadaCierre = (0, vigencias_1.jornadaVigente)(hastaF, jornadas);
        const horasMes = (0, vigencias_1.horasMesDeJornada)(jornadaCierre);
        const porColaborador = agrupar(registrosTodos);
        const resultado = colaboradores.map(col => {
            const horario = col.horario;
            const extraConfig = (0, tardanzas_1.construirExtraConfig)(modoExtra, horario);
            const registros = porColaborador.get(col.id) ?? [];
            const r = liquidarRegistros(registros, horario, extraConfig, festivosDates, tiposHoraTodos, jornadas, col.salarioMensual, horasMes, false);
            return {
                colaboradorId: col.id, nombre: col.nombre, apellido: col.apellido,
                totalRecargos: r.totalRecargos, totalExtra: r.totalExtra, totalAdicional: r.totalAdicional,
            };
        });
        return { desde, hasta, colaboradores: resultado };
    });
    // Llegadas tarde de un colaborador según su horario asignado
    app.get('/tardanzas', auth, async (request, reply) => {
        const { colaboradorId, desde, hasta } = request.query;
        const colaborador = await index_1.prisma.colaborador.findFirst({
            where: { id: colaboradorId, empresaId: request.empresaId },
            include: { horario: { include: { franjas: true } } },
        });
        if (!colaborador)
            return reply.status(404).send({ error: 'Colaborador no encontrado' });
        if (!colaborador.horario || !colaborador.horario.activo) {
            return { sinHorario: true, detalle: [], totalMinutos: 0, diasTarde: 0 };
        }
        const { desdeF, finExclusivo } = (0, fechas_1.rangoReporte)(desde, hasta);
        const [registros, festivos, permisos, jornadas, diasMaterializados] = await Promise.all([
            index_1.prisma.registro.findMany({
                where: { colaboradorId, fecha: { gte: desdeF, lt: finExclusivo } },
            }),
            index_1.prisma.diaFestivo.findMany({ where: { OR: [{ empresaId: null }, { empresaId: request.empresaId }] } }),
            index_1.prisma.permiso.findMany({ where: { colaboradorId, aprobado: true }, select: { fechaInicio: true, fechaFin: true, tipo: true, aprobado: true, colaboradorId: true } }),
            index_1.prisma.jornadaVigencia.findMany(),
            // La hora exigida y la tolerancia de cada día, congeladas. Sin esto,
            // adelantar la entrada del horario llenaba de tardanzas los meses cerrados.
            index_1.prisma.diaEsperado.findMany({
                where: { colaboradorId, fecha: { gte: desdeF, lt: finExclusivo } },
                select: {
                    fecha: true, programado: true, horaEntrada: true, horaSalida: true,
                    toleranciaMin: true, almuerzoMin: true, minutosEsperados: true,
                },
                orderBy: { fecha: 'asc' },
            }),
        ]);
        const diasEsperados = (0, diasEsperados_1.combinarDiasEsperados)(desdeF, finExclusivo, diasMaterializados, colaborador.horario);
        const resultado = (0, tardanzas_1.calcularTardanzas)(registros, diasEsperados, festivos, permisos);
        // Valor del tiempo llegado tarde, a la tarifa base. Es INFORMATIVO: el
        // descuento real sale del saldo del período (ver /liquidacion), que ya
        // incluye estos minutos. Sumar ambos cobraría la tardanza dos veces.
        const valorHora = (0, horasColombiana_2.calcularValorHora)(colaborador.salarioMensual, (0, vigencias_1.horasMesDeJornada)((0, vigencias_1.jornadaVigente)(new Date(hasta), jornadas)));
        return {
            sinHorario: false, horario: colaborador.horario, ...resultado,
            valorHora: parseFloat(valorHora.toFixed(2)),
            montoTardanzas: parseFloat(((resultado.totalMinutos / 60) * valorHora).toFixed(2)),
        };
    });
    // Resumen de llegadas tarde de TODOS los colaboradores activos en un período
    // (para la vista "Todos"; el drill-down de cada uno usa /tardanzas).
    app.get('/tardanzas-resumen', auth, async (request) => {
        const { desde, hasta } = request.query;
        const empresaId = request.empresaId;
        const { desdeF, finExclusivo } = (0, fechas_1.rangoReporte)(desde, hasta);
        const [colaboradores, registrosTodos, festivos, permisosTodos, jornadas, diasTodos] = await Promise.all([
            index_1.prisma.colaborador.findMany({
                where: { empresaId, activo: true },
                include: { horario: { include: { franjas: true } } },
                orderBy: { nombre: 'asc' },
            }),
            index_1.prisma.registro.findMany({ where: { colaborador: { empresaId }, fecha: { gte: desdeF, lt: finExclusivo } } }),
            index_1.prisma.diaFestivo.findMany({ where: { OR: [{ empresaId: null }, { empresaId }] } }),
            index_1.prisma.permiso.findMany({
                where: { colaborador: { empresaId }, aprobado: true },
                select: { fechaInicio: true, fechaFin: true, tipo: true, aprobado: true, colaboradorId: true },
            }),
            index_1.prisma.jornadaVigencia.findMany(),
            // Los días de TODA la empresa en una sola consulta; se agrupan abajo. Uno
            // por colaborador serían N consultas para pintar una tabla.
            index_1.prisma.diaEsperado.findMany({
                where: { colaborador: { empresaId }, fecha: { gte: desdeF, lt: finExclusivo } },
                select: {
                    colaboradorId: true, fecha: true, programado: true, horaEntrada: true,
                    horaSalida: true, toleranciaMin: true, almuerzoMin: true, minutosEsperados: true,
                },
                orderBy: { fecha: 'asc' },
            }),
        ]);
        const porColRegistros = agrupar(registrosTodos);
        const porColPermisos = agrupar(permisosTodos);
        const porColDias = agrupar(diasTodos);
        // Mismo divisor para todos: la jornada vigente al cierre del período.
        const horasMes = (0, vigencias_1.horasMesDeJornada)((0, vigencias_1.jornadaVigente)(new Date(hasta), jornadas));
        const resultado = colaboradores.map(col => {
            if (!col.horario || !col.horario.activo) {
                return { colaboradorId: col.id, nombre: col.nombre, apellido: col.apellido, sinHorario: true, diasTarde: 0, totalMinutos: 0, montoTardanzas: 0 };
            }
            const r = (0, tardanzas_1.calcularTardanzas)((porColRegistros.get(col.id) ?? []), (0, diasEsperados_1.combinarDiasEsperados)(desdeF, finExclusivo, porColDias.get(col.id) ?? [], col.horario), festivos, (porColPermisos.get(col.id) ?? []));
            // Valor informativo (ver la nota en /tardanzas): el descuento efectivo
            // viaja en el saldo del período, no aquí.
            const monto = (r.totalMinutos / 60) * (0, horasColombiana_2.calcularValorHora)(col.salarioMensual, horasMes);
            return {
                colaboradorId: col.id, nombre: col.nombre, apellido: col.apellido, sinHorario: false,
                diasTarde: r.diasTarde, totalMinutos: r.totalMinutos,
                montoTardanzas: parseFloat(monto.toFixed(2)),
            };
        });
        return { desde, hasta, colaboradores: resultado };
    });
    app.get('/asistencia', auth, async (request) => {
        const { desde, hasta } = request.query;
        const { desdeF, finExclusivo } = (0, fechas_1.rangoReporte)(desde, hasta);
        return index_1.prisma.registro.findMany({
            where: {
                colaborador: { empresaId: request.empresaId },
                fecha: { gte: desdeF, lt: finExclusivo },
            },
            include: { colaborador: true },
            orderBy: { fecha: 'desc' },
        });
    });
}
