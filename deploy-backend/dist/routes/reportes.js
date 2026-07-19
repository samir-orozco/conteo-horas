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
async function reporteRoutes(app) {
    const auth = { preHandler: [app.requireEmpresa] };
    app.get('/liquidacion', auth, async (request, reply) => {
        const { colaboradorId, desde, hasta } = request.query;
        const [colaborador, registros, festivos, tiposHoraTodos, jornadas] = await Promise.all([
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
        ]);
        if (!colaborador)
            return reply.status(404).send({ error: 'Colaborador no encontrado' });
        const festivosDates = festivos.map(f => new Date(f.fecha));
        // Agrupar registros por semana ISO para resetear el contador de ordinarias cada semana
        const porSemana = new Map();
        for (const reg of registros) {
            const key = semanaKey(reg.fecha);
            if (!porSemana.has(key))
                porSemana.set(key, []);
            porSemana.get(key).push(reg);
        }
        const acumulado = {};
        const horario = colaborador.horario;
        const diasConAlmuerzo = new Set(); // almuerzo se descuenta 1 vez por día
        for (const [, regsDeUnaSemana] of porSemana) {
            // Jornada y recargos vigentes se evalúan con la fecha de cada semana/registro,
            // así el cambio a 42h (15 jul 2026) y el dominical 90%→100% aplican solos.
            const jornadaSemanal = (0, vigencias_1.jornadaVigente)(regsDeUnaSemana[0].fecha, jornadas);
            let minutosOrdSemana = 0; // se resetea cada semana
            for (const registro of regsDeUnaSemana) {
                if (!registro.entrada || !registro.salida)
                    continue;
                const tiposDelDia = (0, vigencias_1.tiposVigentes)(registro.fecha, tiposHoraTodos);
                const { resultado, minutosOrdinariosTrabajados } = (0, horasColombiana_1.calcularHorasTrabajadas)(registro.entrada, registro.salida, festivosDates, tiposDelDia, jornadaSemanal, minutosOrdSemana);
                let ordDelRegistro = minutosOrdinariosTrabajados;
                // Descontar almuerzo una sola vez por día (si la franja de ese día lo aplica)
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
                for (const p of resultado) {
                    if (!acumulado[p.codigo])
                        acumulado[p.codigo] = { ...p };
                    else
                        acumulado[p.codigo].minutos += p.minutos;
                }
            }
        }
        // Valor hora con el divisor de la jornada vigente al final del período
        const jornadaCierre = (0, vigencias_1.jornadaVigente)(new Date(hasta), jornadas);
        const horasMes = (0, vigencias_1.horasMesDeJornada)(jornadaCierre);
        const horasPorTipo = Object.values(acumulado);
        const liquidacion = (0, horasColombiana_1.calcularLiquidacion)(colaborador.salarioMensual, horasMes, horasPorTipo);
        // totalAdicional = recargos + horas extra que se suman al salario base
        const totalAdicional = liquidacion.reduce((s, l) => s + l.subtotal, 0);
        const totalRecargos = liquidacion.filter(l => !l.esExtra).reduce((s, l) => s + l.subtotal, 0);
        const totalExtra = liquidacion.filter(l => l.esExtra).reduce((s, l) => s + l.subtotal, 0);
        return {
            colaborador, desde, hasta, liquidacion,
            salarioBase: colaborador.salarioMensual,
            totalRecargos, totalExtra, totalAdicional,
            totalPagar: totalAdicional, // compat: ahora es lo adicional al salario
            registrosCont: registros.length,
            jornadaSemanal: jornadaCierre, horasMes,
        };
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
