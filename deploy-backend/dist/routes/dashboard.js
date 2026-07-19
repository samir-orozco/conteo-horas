"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = dashboardRoutes;
const date_fns_tz_1 = require("date-fns-tz");
const date_fns_1 = require("date-fns");
const index_1 = require("../index");
const horasColombiana_1 = require("../utils/horasColombiana");
const vigencias_1 = require("../utils/vigencias");
const tardanzas_1 = require("../utils/tardanzas");
const TZ = 'America/Bogota';
const DIAS = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
const CODIGOS_EXTRA = new Set(['HED', 'HEN', 'HEDD', 'HEND']);
// Minutos de almuerzo del registro: solo si la franja de ese día lo aplica.
function almuerzoDelRegistro(horario, fecha) {
    if (!horario || !horario.almuerzoMin)
        return 0;
    const z = (0, date_fns_tz_1.toZonedTime)(fecha, TZ);
    const franja = (0, tardanzas_1.franjaDelDia)(horario, DIAS[z.getDay()]);
    return franja && franja.tieneAlmuerzo ? horario.almuerzoMin : 0;
}
function claveDia(d) {
    const z = (0, date_fns_tz_1.toZonedTime)(d, TZ);
    return `${z.getFullYear()}-${String(z.getMonth() + 1).padStart(2, '0')}-${String(z.getDate()).padStart(2, '0')}`;
}
function semanaKey(fecha) {
    const z = (0, date_fns_tz_1.toZonedTime)(fecha, TZ);
    return `${(0, date_fns_1.getISOWeekYear)(z)}-W${String((0, date_fns_1.getISOWeek)(z)).padStart(2, '0')}`;
}
function minutosDe(hhmm) {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
}
// Panel de inicio de la empresa: foto del día + del mes.
async function dashboardRoutes(app) {
    const auth = { preHandler: [app.requireEmpresa] };
    app.get('/empresa', auth, async (request) => {
        const empresaId = request.empresaId;
        const ahora = new Date();
        const ahoraBog = (0, date_fns_tz_1.toZonedTime)(ahora, TZ);
        const inicioDia = new Date(Date.UTC(ahoraBog.getFullYear(), ahoraBog.getMonth(), ahoraBog.getDate(), 5, 0, 0));
        const finDia = new Date(inicioDia.getTime() + 24 * 60 * 60 * 1000);
        const inicioMes = new Date(Date.UTC(ahoraBog.getFullYear(), ahoraBog.getMonth(), 1, 5, 0, 0));
        const claveHoy = claveDia(ahora);
        const diaHoy = DIAS[ahoraBog.getDay()];
        const [colaboradores, festivos, jornadas, tiposHoraTodos, permisos] = await Promise.all([
            index_1.prisma.colaborador.findMany({
                where: { empresaId, activo: true },
                include: { horario: { include: { franjas: true } } },
                orderBy: { nombre: 'asc' },
            }),
            index_1.prisma.diaFestivo.findMany({ where: { OR: [{ empresaId: null }, { empresaId }] } }),
            index_1.prisma.jornadaVigencia.findMany(),
            index_1.prisma.tipoHora.findMany(),
            index_1.prisma.permiso.findMany({
                where: { aprobado: true, colaborador: { empresaId }, fechaInicio: { lte: finDia }, fechaFin: { gte: inicioDia } },
                select: { id: true, colaboradorId: true, fechaInicio: true, fechaFin: true, tipo: true, descripcion: true, aprobado: true, evidenciaTipo: true, evidenciaNombre: true, colaborador: true },
            }),
        ]);
        const colIds = colaboradores.map(c => c.id);
        const festSet = new Set(festivos.map(f => claveDia(f.fecha)));
        const hoyEsFestivo = festSet.has(claveHoy);
        // Registros de hoy + turnos abiertos de días anteriores
        const [registrosHoy, turnosAbiertos, registrosMes] = await Promise.all([
            index_1.prisma.registro.findMany({
                where: { colaboradorId: { in: colIds }, fecha: { gte: inicioDia, lt: finDia } },
                include: { colaborador: true },
                orderBy: { entrada: 'asc' },
            }),
            index_1.prisma.registro.findMany({
                where: { colaboradorId: { in: colIds }, fecha: { lt: inicioDia }, entrada: { not: null }, salida: null },
                include: { colaborador: true },
                orderBy: { fecha: 'desc' },
            }),
            index_1.prisma.registro.findMany({
                where: { colaboradorId: { in: colIds }, fecha: { gte: inicioMes, lte: finDia }, salida: { not: null } },
                orderBy: { fecha: 'asc' },
            }),
        ]);
        // ===== En planta ahora (entrada abierta hoy) =====
        const enPlanta = registrosHoy
            .filter(r => r.entrada && !r.salida)
            .map(r => ({
            id: r.colaborador.id,
            nombre: `${r.colaborador.nombre} ${r.colaborador.apellido}`,
            cargo: r.colaborador.cargo,
            desde: r.entrada,
        }));
        const enPlantaIds = new Set(enPlanta.map(e => e.id));
        // ===== Salidas de hoy (colaboradores que marcaron salida) =====
        const salidasRecientes = registrosHoy
            .filter(r => r.salida)
            .sort((a, b) => b.salida.getTime() - a.salida.getTime())
            .map(r => ({
            registroId: r.id,
            id: r.colaborador.id,
            nombre: `${r.colaborador.nombre} ${r.colaborador.apellido}`,
            cargo: r.colaborador.cargo,
            entrada: r.entrada,
            salida: r.salida,
            tieneFotoEntrada: !!r.fotoEntrada,
            tieneFotoSalida: !!r.fotoSalida,
        }));
        // Colaboradores con al menos una entrada hoy
        const marcaronHoy = new Set(registrosHoy.filter(r => r.entrada).map(r => r.colaboradorId));
        const novedadHoyIds = new Set(permisos.filter(p => claveDia(p.fechaInicio) <= claveHoy && claveHoy <= claveDia(p.fechaFin)).map(p => p.colaboradorId));
        // Tipo de novedad activa hoy por colaborador (para explicar por qué no marcó)
        const novedadHoyTipo = new Map();
        for (const p of permisos) {
            if (claveDia(p.fechaInicio) <= claveHoy && claveHoy <= claveDia(p.fechaFin) && !novedadHoyTipo.has(p.colaboradorId)) {
                novedadHoyTipo.set(p.colaboradorId, p.tipo);
            }
        }
        // ===== Llegadas tarde hoy (según horario) =====
        const llegadasTardeHoy = [];
        // Primera entrada de hoy por colaborador
        const primeraEntradaHoy = new Map();
        for (const r of registrosHoy) {
            if (!r.entrada)
                continue;
            const prev = primeraEntradaHoy.get(r.colaboradorId);
            if (!prev || r.entrada < prev)
                primeraEntradaHoy.set(r.colaboradorId, r.entrada);
        }
        // ===== Sin marcar hoy (deberían haber entrado y no lo han hecho) =====
        const sinMarcarHoy = [];
        for (const c of colaboradores) {
            if (!c.horario || !c.horario.activo)
                continue;
            // La franja que aplica hoy (un horario puede variar por día, ej. sábados más corto)
            const franjaHoy = (0, tardanzas_1.franjaDelDia)(c.horario, diaHoy);
            if (!franjaHoy || hoyEsFestivo)
                continue;
            const entrada = primeraEntradaHoy.get(c.id);
            if (entrada) {
                // Llegó tarde: la tardanza solo aplica si no tiene novedad que justifique el día
                if (novedadHoyIds.has(c.id))
                    continue;
                const z = (0, date_fns_tz_1.toZonedTime)(entrada, TZ);
                const llegadaMin = z.getHours() * 60 + z.getMinutes();
                const tarde = llegadaMin - (minutosDe(franjaHoy.horaEntrada) + c.horario.toleranciaMin);
                if (tarde > 0) {
                    llegadasTardeHoy.push({
                        id: c.id,
                        nombre: `${c.nombre} ${c.apellido}`,
                        horaLlegada: `${String(z.getHours()).padStart(2, '0')}:${String(z.getMinutes()).padStart(2, '0')}`,
                        minutosTarde: tarde,
                    });
                }
            }
            else {
                // No ha marcado. Si tiene novedad hoy (ej. médico), lo mostramos con el
                // distintivo de su novedad para saber por qué no marcó. Si no, solo lo
                // marcamos "sin marcar" cuando ya pasó su hora de entrada + tolerancia.
                const novedad = novedadHoyTipo.get(c.id) ?? null;
                const ahoraMin = ahoraBog.getHours() * 60 + ahoraBog.getMinutes();
                const yaPasoEntrada = ahoraMin > minutosDe(franjaHoy.horaEntrada) + c.horario.toleranciaMin;
                if (novedad || yaPasoEntrada) {
                    sinMarcarHoy.push({
                        id: c.id,
                        nombre: `${c.nombre} ${c.apellido}`,
                        cargo: c.cargo,
                        horario: c.horario.nombre,
                        horaEntrada: franjaHoy.horaEntrada,
                        novedad,
                    });
                }
            }
        }
        // ===== Horas extra y horas de la semana (toda la empresa) =====
        const festivosDates = festivos.map(f => new Date(f.fecha));
        const porColSemana = new Map();
        for (const r of registrosMes) {
            const k = `${r.colaboradorId}|${semanaKey(r.fecha)}`;
            if (!porColSemana.has(k))
                porColSemana.set(k, []);
            porColSemana.get(k).push(r);
        }
        let minutosExtraMes = 0;
        let minutosTrabajadosSemana = 0;
        const claveSemanaActual = semanaKey(ahora);
        // Horario de cada colaborador (para descontar almuerzo) + control 1 vez/día
        const horarioPorCol = new Map(colaboradores.map(c => [c.id, c.horario]));
        const diasConAlmuerzo = new Set();
        for (const [clave, regs] of porColSemana) {
            const jornadaSemanal = (0, vigencias_1.jornadaVigente)(regs[0].fecha, jornadas);
            let minutosOrdSemana = 0;
            const esSemanaActual = clave.endsWith(claveSemanaActual);
            for (const r of regs) {
                if (!r.entrada || !r.salida)
                    continue;
                const tiposDelDia = (0, vigencias_1.tiposVigentes)(r.fecha, tiposHoraTodos);
                const { resultado, minutosOrdinariosTrabajados } = (0, horasColombiana_1.calcularHorasTrabajadas)(r.entrada, r.salida, festivosDates, tiposDelDia, jornadaSemanal, minutosOrdSemana);
                let ordDelRegistro = minutosOrdinariosTrabajados;
                const claveColDia = `${r.colaboradorId}|${claveDia(r.entrada)}`;
                const almuerzo = almuerzoDelRegistro(horarioPorCol.get(r.colaboradorId), r.entrada);
                if (almuerzo > 0 && !diasConAlmuerzo.has(claveColDia)) {
                    const { descontado } = (0, horasColombiana_1.descontarAlmuerzo)(resultado, almuerzo);
                    if (descontado > 0) {
                        diasConAlmuerzo.add(claveColDia);
                        ordDelRegistro = Math.max(0, ordDelRegistro - descontado);
                    }
                }
                minutosOrdSemana += ordDelRegistro;
                for (const p of resultado) {
                    if (CODIGOS_EXTRA.has(p.codigo))
                        minutosExtraMes += p.minutos;
                    if (esSemanaActual)
                        minutosTrabajadosSemana += p.minutos;
                }
            }
        }
        // ===== Turnos abiertos de días anteriores (olvidaron marcar salida) =====
        const turnosOlvidados = turnosAbiertos.map(r => ({
            id: r.id,
            colaborador: `${r.colaborador.nombre} ${r.colaborador.apellido}`,
            fecha: r.fecha,
            entrada: r.entrada,
        }));
        // ===== Novedades activas hoy =====
        const novedadesHoy = permisos
            .filter(p => claveDia(p.fechaInicio) <= claveHoy && claveHoy <= claveDia(p.fechaFin))
            .map(p => ({
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
        const en45 = new Date(inicioDia.getTime() + 45 * 24 * 60 * 60 * 1000);
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
            const n = new Date(c.fechaNacimiento);
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
            salidasRecientes,
            llegadasTardeHoy: llegadasTardeHoy.sort((a, b) => b.minutosTarde - a.minutosTarde),
            sinMarcarHoy,
            turnosOlvidados,
            novedadesHoy,
            proximosFestivos,
            cumpleanos,
        };
    });
}
