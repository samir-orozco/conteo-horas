"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = reporteRoutes;
const date_fns_tz_1 = require("date-fns-tz");
const date_fns_1 = require("date-fns");
const index_1 = require("../index");
const horasColombiana_1 = require("../utils/horasColombiana");
const vigencias_1 = require("../utils/vigencias");
const tardanzas_1 = require("../utils/tardanzas");
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
    return { liquidacion, totalRecargos, totalExtra, totalAdicional, registrosCont: registros.length, detalleRegistros };
}
async function reporteRoutes(app) {
    const auth = { preHandler: [app.requireEmpresa] };
    app.get('/liquidacion', auth, async (request, reply) => {
        const { colaboradorId, desde, hasta } = request.query;
        const [colaborador, registros, festivos, tiposHoraTodos, jornadas, cfgModo] = await Promise.all([
            index_1.prisma.colaborador.findFirst({
                where: { id: colaboradorId, empresaId: request.empresaId },
                include: { horario: { include: { franjas: true } } },
            }),
            index_1.prisma.registro.findMany({
                where: { colaboradorId, fecha: { gte: new Date(desde), lte: new Date(hasta) }, salida: { not: null } },
                orderBy: { fecha: 'asc' },
            }),
            index_1.prisma.diaFestivo.findMany({
                where: { OR: [{ empresaId: null }, { empresaId: request.empresaId }] },
            }),
            index_1.prisma.tipoHora.findMany(),
            index_1.prisma.jornadaVigencia.findMany(),
            index_1.prisma.configuracion.findUnique({ where: { empresaId_clave: { empresaId: request.empresaId, clave: 'HORAS_EXTRA_MODO' } } }),
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
        return {
            colaborador, desde, hasta, liquidacion: r.liquidacion,
            salarioBase: colaborador.salarioMensual,
            totalRecargos: r.totalRecargos, totalExtra: r.totalExtra, totalAdicional: r.totalAdicional,
            totalPagar: r.totalAdicional, // compat: ahora es lo adicional al salario
            registrosCont: r.registrosCont,
            detalleRegistros: r.detalleRegistros,
            jornadaSemanal: jornadaCierre, horasMes,
        };
    });
    // Resumen de extras y recargos de TODOS los colaboradores activos en un período
    // (para la vista "Todos" del reporte de Extras; el drill-down de cada uno usa /liquidacion).
    app.get('/extras-resumen', auth, async (request) => {
        const { desde, hasta } = request.query;
        const empresaId = request.empresaId;
        const desdeF = new Date(desde), hastaF = new Date(hasta);
        const [colaboradores, registrosTodos, festivos, tiposHoraTodos, jornadas, cfgModo] = await Promise.all([
            index_1.prisma.colaborador.findMany({
                where: { empresaId, activo: true },
                include: { horario: { include: { franjas: true } } },
                orderBy: { nombre: 'asc' },
            }),
            index_1.prisma.registro.findMany({
                where: { colaborador: { empresaId }, fecha: { gte: desdeF, lte: hastaF }, salida: { not: null } },
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
        const [registros, festivos, permisos] = await Promise.all([
            index_1.prisma.registro.findMany({
                where: { colaboradorId, fecha: { gte: new Date(desde), lte: new Date(hasta) } },
            }),
            index_1.prisma.diaFestivo.findMany({ where: { OR: [{ empresaId: null }, { empresaId: request.empresaId }] } }),
            index_1.prisma.permiso.findMany({ where: { colaboradorId, aprobado: true }, select: { fechaInicio: true, fechaFin: true, tipo: true, aprobado: true, colaboradorId: true } }),
        ]);
        const resultado = (0, tardanzas_1.calcularTardanzas)(registros, colaborador.horario, festivos, permisos);
        return { sinHorario: false, horario: colaborador.horario, ...resultado };
    });
    // Resumen de llegadas tarde de TODOS los colaboradores activos en un período
    // (para la vista "Todos"; el drill-down de cada uno usa /tardanzas).
    app.get('/tardanzas-resumen', auth, async (request) => {
        const { desde, hasta } = request.query;
        const empresaId = request.empresaId;
        const desdeF = new Date(desde), hastaF = new Date(hasta);
        const [colaboradores, registrosTodos, festivos, permisosTodos] = await Promise.all([
            index_1.prisma.colaborador.findMany({
                where: { empresaId, activo: true },
                include: { horario: { include: { franjas: true } } },
                orderBy: { nombre: 'asc' },
            }),
            index_1.prisma.registro.findMany({ where: { colaborador: { empresaId }, fecha: { gte: desdeF, lte: hastaF } } }),
            index_1.prisma.diaFestivo.findMany({ where: { OR: [{ empresaId: null }, { empresaId }] } }),
            index_1.prisma.permiso.findMany({
                where: { colaborador: { empresaId }, aprobado: true },
                select: { fechaInicio: true, fechaFin: true, tipo: true, aprobado: true, colaboradorId: true },
            }),
        ]);
        const porColRegistros = agrupar(registrosTodos);
        const porColPermisos = agrupar(permisosTodos);
        const resultado = colaboradores.map(col => {
            if (!col.horario || !col.horario.activo) {
                return { colaboradorId: col.id, nombre: col.nombre, apellido: col.apellido, sinHorario: true, diasTarde: 0, totalMinutos: 0 };
            }
            const r = (0, tardanzas_1.calcularTardanzas)((porColRegistros.get(col.id) ?? []), col.horario, festivos, (porColPermisos.get(col.id) ?? []));
            return { colaboradorId: col.id, nombre: col.nombre, apellido: col.apellido, sinHorario: false, diasTarde: r.diasTarde, totalMinutos: r.totalMinutos };
        });
        return { desde, hasta, colaboradores: resultado };
    });
    app.get('/asistencia', auth, async (request) => {
        const { desde, hasta } = request.query;
        return index_1.prisma.registro.findMany({
            where: {
                colaborador: { empresaId: request.empresaId },
                fecha: { gte: new Date(desde), lte: new Date(hasta) },
            },
            include: { colaborador: true },
            orderBy: { fecha: 'desc' },
        });
    });
}
