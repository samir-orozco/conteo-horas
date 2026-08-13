"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = registroRoutes;
const date_fns_tz_1 = require("date-fns-tz");
const index_1 = require("../index");
const tardanzas_1 = require("../utils/tardanzas");
const diasEsperados_1 = require("../utils/diasEsperados");
const materializarDias_1 = require("../utils/materializarDias");
const fechas_1 = require("../utils/fechas");
const jornada_1 = require("../utils/jornada");
const TZ = 'America/Bogota';
const TIPOS_REGISTRO = new Set(['NORMAL', 'PERMISO', 'FESTIVO']);
// Lista blanca de campos que la empresa puede escribir en un registro. Evita
// mass-assignment (inyectar fotos base64, editadoPor, creadoEn, etc. desde el body).
function camposRegistro(body, esNuevo) {
    const out = {};
    if (esNuevo || body.colaboradorId !== undefined)
        out.colaboradorId = body.colaboradorId;
    if (body.fecha !== undefined)
        out.fecha = body.fecha ? new Date(body.fecha) : undefined;
    if (body.entrada !== undefined)
        out.entrada = body.entrada ? new Date(body.entrada) : null;
    if (body.salida !== undefined)
        out.salida = body.salida ? new Date(body.salida) : null;
    if (body.tipo !== undefined && TIPOS_REGISTRO.has(body.tipo))
        out.tipo = body.tipo;
    if (body.observacion !== undefined)
        out.observacion = body.observacion || null;
    return out;
}
async function registroRoutes(app) {
    const auth = { preHandler: [app.requireEmpresa] };
    // Verifica que el colaborador pertenezca a la empresa del token
    async function colaboradorDeEmpresa(colaboradorId, empresaId) {
        return index_1.prisma.colaborador.findFirst({ where: { id: colaboradorId, empresaId } });
    }
    app.get('/', auth, async (request) => {
        const { colaboradorId, desde, hasta } = request.query;
        const where = { colaborador: { empresaId: request.empresaId } };
        if (colaboradorId)
            where.colaboradorId = colaboradorId;
        if (desde || hasta) {
            where.fecha = {};
            if (desde)
                where.fecha.gte = new Date(desde);
            // "hasta" es inclusivo: los registros se guardan a las 05:00 UTC (medianoche
            // de Bogotá), así que cubrimos todo el día tomando hasta el inicio del día siguiente.
            if (hasta)
                where.fecha.lt = new Date(new Date(hasta).getTime() + 24 * 60 * 60 * 1000);
        }
        const registros = await index_1.prisma.registro.findMany({
            where,
            include: { colaborador: { include: { horario: { include: { franjas: true } } } } },
            orderBy: { fecha: 'desc' },
        });
        // La tardanza solo se evalúa en la PRIMERA entrada del día de cada colaborador
        // (un reingreso después del almuerzo no es una llegada tarde).
        const primeraEntradaDia = new Map(); // colaboradorId|día -> registro.id
        for (const r of registros) {
            if (!r.entrada)
                continue;
            const clave = `${r.colaboradorId}|${(0, date_fns_tz_1.toZonedTime)(r.fecha, TZ).toDateString()}`;
            const actual = registros.find(x => x.id === primeraEntradaDia.get(clave));
            if (!actual || r.entrada < actual.entrada)
                primeraEntradaDia.set(clave, r.id);
        }
        // Lo que el horario exigía CADA día, congelado. Esta columna se calculaba
        // contra el horario vigente, así que adelantar la entrada llenaba de
        // tardanzas los días viejos aunque el reporte ya no lo hiciera.
        const diasPorColaborador = new Map();
        if (registros.length > 0) {
            // El rango se abre a los límites del DÍA de Bogotá: el kiosco guarda
            // `Registro.fecha` con la hora real, y las filas están ancladas a
            // medianoche, así que filtrar por el instante crudo las dejaría fuera.
            const fechas = registros.map(r => r.fecha.getTime());
            const desdeDia = (0, fechas_1.rangoDiaBogota)(new Date(Math.min(...fechas))).inicioDia;
            const hastaDia = (0, fechas_1.rangoDiaBogota)(new Date(Math.max(...fechas))).finDia;
            const materializados = await index_1.prisma.diaEsperado.findMany({
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
                if (!diasPorColaborador.has(d.colaboradorId))
                    diasPorColaborador.set(d.colaboradorId, new Map());
                diasPorColaborador.get(d.colaboradorId).set((0, date_fns_tz_1.toZonedTime)(d.fecha, TZ).toDateString(), d);
            }
        }
        // Un día sin fila cae al horario vigente, igual que en los reportes: es lo
        // que el sistema hacía siempre, así que nadie ve un número distinto.
        const diaEsperadoDe = (registro) => {
            const clave = (0, date_fns_tz_1.toZonedTime)(registro.fecha, TZ).toDateString();
            const congelado = diasPorColaborador.get(registro.colaboradorId)?.get(clave);
            const { inicioDia, finDia } = (0, fechas_1.rangoDiaBogota)(registro.fecha);
            const [dia] = (0, diasEsperados_1.combinarDiasEsperados)(inicioDia, finDia, congelado ? [congelado] : [], registro.colaborador.horario);
            return dia;
        };
        // El almuerzo es del DÍA, no de la fila: vive en el hueco entre dos tramos.
        // Se resuelve una vez por colaborador+día y viaja repetido en cada fila de
        // ese día, para que la tabla y el detalle no puedan contar historias
        // distintas del mismo almuerzo.
        const registrosPorDia = new Map();
        for (const r of registros) {
            const clave = `${r.colaboradorId}|${(0, date_fns_tz_1.toZonedTime)(r.fecha, TZ).toDateString()}`;
            if (!registrosPorDia.has(clave))
                registrosPorDia.set(clave, []);
            registrosPorDia.get(clave).push(r);
        }
        const almuerzoPorDia = new Map();
        // En qué fila del día se pinta el almuerzo. `minutos` y `minutosDescontados`
        // son plata: repetidos en las dos filas de un día partido, alguien los suma.
        const filaDelAlmuerzo = new Map(); // clave del día -> registro.id
        for (const [clave, delDia] of registrosPorDia) {
            const dia = diaEsperadoDe(delDia[0]);
            if (!dia)
                continue;
            const resumen = (0, jornada_1.resumirAlmuerzoDelDia)(delDia, dia);
            almuerzoPorDia.set(clave, resumen);
            // Si hubo salida a almorzar, va en esa fila: es la marcación que la
            // produjo. Si no, en la primera entrada del día, que es donde el
            // administrador va a mirar primero.
            const ancla = resumen.salida
                ? delDia.find(r => r.salidaAlmuerzo)?.id
                : primeraEntradaDia.get(clave);
            if (ancla)
                filaDelAlmuerzo.set(clave, ancla);
        }
        // Las fotos (base64) no viajan en la lista: solo un indicador; se piden con /:id/fotos.
        // La llegada se evalúa contra el horario asignado (null si no aplica ese día).
        return registros.map(r => {
            const { fotoEntrada, fotoSalida, colaborador, ...resto } = r;
            let minutosTarde = null;
            const clave = `${r.colaboradorId}|${(0, date_fns_tz_1.toZonedTime)(r.fecha, TZ).toDateString()}`;
            const esPrimeraDelDia = primeraEntradaDia.get(clave) === r.id;
            if (r.entrada && esPrimeraDelDia && r.tipo !== 'FESTIVO') {
                const dia = diaEsperadoDe(r);
                if (dia?.programado && dia.horaEntrada) {
                    const z = (0, date_fns_tz_1.toZonedTime)(r.entrada, TZ);
                    const tarde = z.getHours() * 60 + z.getMinutes() - ((0, tardanzas_1.minutosDe)(dia.horaEntrada) + dia.toleranciaMin);
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
                almuerzoEnEstaFila: filaDelAlmuerzo.get(clave) === r.id,
            };
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
        const { id } = request.params;
        // `select` explícito: las fotos son LongText de hasta 300 KB cada una y este
        // endpoint se repide al cambiar de tramo y después de cada guardado.
        const registro = await index_1.prisma.registro.findFirst({
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
        if (!registro)
            return reply.status(404).send({ error: 'Registro no encontrado' });
        const { inicioDia, finDia } = (0, fechas_1.rangoDiaBogota)(registro.fecha);
        const [delDia, congelado, festivo, novedad, fotos] = await Promise.all([
            index_1.prisma.registro.findMany({
                where: { colaboradorId: registro.colaboradorId, fecha: { gte: inicioDia, lt: finDia } },
                orderBy: { entrada: 'asc' },
                select: {
                    id: true, entrada: true, salida: true, salidaAlmuerzo: true,
                    entradaEstimada: true, salidaEstimada: true,
                },
            }),
            index_1.prisma.diaEsperado.findFirst({
                where: { colaboradorId: registro.colaboradorId, fecha: { gte: inicioDia, lt: finDia } },
            }),
            index_1.prisma.diaFestivo.findFirst({
                where: {
                    fecha: { gte: inicioDia, lt: finDia },
                    OR: [{ empresaId: null }, { empresaId: registro.colaborador.empresaId }],
                },
                select: { nombre: true },
            }),
            index_1.prisma.permiso.findFirst({
                where: {
                    colaboradorId: registro.colaboradorId,
                    fechaInicio: { lt: finDia },
                    fechaFin: { gte: inicioDia },
                },
                select: { tipo: true, descripcion: true, aprobado: true, fechaInicio: true, fechaFin: true, horaInicio: true, horaFin: true },
            }),
            index_1.prisma.registro.findUnique({
                where: { id },
                select: { fotoEntrada: true, fotoSalida: true },
            }),
        ]);
        const [dia] = (0, diasEsperados_1.combinarDiasEsperados)(inicioDia, finDia, congelado ? [congelado] : [], registro.colaborador.horario);
        // ¿La fila se escribió ESE día o se reconstruyó después? El backfill llenó
        // todo el pasado con el horario que estaba vigente al correrlo, así que
        // "existe fila" no significa "quedó congelado entonces". La fecha de
        // creación es lo único que distingue una cosa de la otra.
        const fueCongelado = !!congelado && congelado.creadoEn.getTime() <= finDia.getTime();
        const almuerzo = (0, jornada_1.resumirAlmuerzoDelDia)(delDia, dia);
        // La tardanza se mide solo en la primera entrada del día: volver del
        // almuerzo no es llegar tarde. Cuando no aplica se dice POR QUÉ, que un
        // guion mudo en una columna de asistencia solo genera dudas.
        const primera = delDia.find(r => r.entrada);
        let minutosTarde = null;
        let motivoSinTardanza = null;
        if (!registro.entrada)
            motivoSinTardanza = 'SIN_ENTRADA';
        else if (primera && primera.id !== registro.id)
            motivoSinTardanza = 'NO_ES_PRIMERA';
        else if (registro.tipo === 'FESTIVO' || festivo)
            motivoSinTardanza = 'FESTIVO';
        else if (!dia?.programado || !dia.horaEntrada)
            motivoSinTardanza = 'NO_PROGRAMADO';
        else if (!registro.colaborador.horario?.activo && !congelado)
            motivoSinTardanza = 'SIN_HORARIO';
        else {
            const z = (0, date_fns_tz_1.toZonedTime)(registro.entrada, TZ);
            minutosTarde = Math.max(0, z.getHours() * 60 + z.getMinutes() - ((0, tardanzas_1.minutosDe)(dia.horaEntrada) + dia.toleranciaMin));
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
            minutosDelDia: (0, jornada_1.minutosContadosDelDia)(delDia, dia),
            minutosTarde,
            motivoSinTardanza,
            festivo,
            novedad,
        };
    });
    // Fotos de verificación facial de un registro (se conservan 2 meses)
    app.get('/:id/fotos', auth, async (request, reply) => {
        const { id } = request.params;
        const registro = await index_1.prisma.registro.findFirst({
            where: { id, colaborador: { empresaId: request.empresaId } },
            select: { fotoEntrada: true, fotoSalida: true },
        });
        if (!registro)
            return reply.status(404).send({ error: 'Registro no encontrado' });
        return registro;
    });
    // Registrar entrada (reloj - usa hora actual de Bogotá)
    app.post('/entrada', auth, async (request, reply) => {
        const { colaboradorId } = request.body;
        if (!(await colaboradorDeEmpresa(colaboradorId, request.empresaId))) {
            return reply.status(404).send({ error: 'Colaborador no encontrado' });
        }
        const ahora = new Date();
        const fechaBogota = (0, date_fns_tz_1.toZonedTime)(ahora, TZ);
        fechaBogota.setHours(0, 0, 0, 0);
        const existente = await index_1.prisma.registro.findFirst({
            where: { colaboradorId, fecha: { gte: fechaBogota, lt: new Date(fechaBogota.getTime() + 86400000) }, salida: null },
        });
        if (existente)
            return reply.status(400).send({ error: 'Ya tiene una entrada activa hoy' });
        const registro = await index_1.prisma.registro.create({
            data: { colaboradorId, fecha: ahora, entrada: ahora, tipo: 'NORMAL' },
        });
        await (0, materializarDias_1.asegurarDiaSinFallar)(colaboradorId, registro.fecha, app.log);
        return reply.status(201).send(registro);
    });
    // Registrar salida
    app.post('/salida', auth, async (request, reply) => {
        const { colaboradorId } = request.body;
        if (!(await colaboradorDeEmpresa(colaboradorId, request.empresaId))) {
            return reply.status(404).send({ error: 'Colaborador no encontrado' });
        }
        const ahora = new Date();
        const fechaBogota = (0, date_fns_tz_1.toZonedTime)(ahora, TZ);
        fechaBogota.setHours(0, 0, 0, 0);
        const registro = await index_1.prisma.registro.findFirst({
            where: { colaboradorId, fecha: { gte: fechaBogota, lt: new Date(fechaBogota.getTime() + 86400000) }, salida: null },
            orderBy: { entrada: 'desc' },
        });
        if (!registro)
            return reply.status(400).send({ error: 'No hay entrada activa hoy' });
        return index_1.prisma.registro.update({ where: { id: registro.id }, data: { salida: ahora } });
    });
    // Registro manual (admin)
    app.post('/', auth, async (request, reply) => {
        const body = request.body;
        if (!(await colaboradorDeEmpresa(body.colaboradorId, request.empresaId))) {
            return reply.status(404).send({ error: 'Colaborador no encontrado' });
        }
        const registro = await index_1.prisma.registro.create({ data: camposRegistro(body, true) });
        // Un día con marcación es un día que va a salir en un reporte. Si llega ahí
        // sin fila, lo resuelve el horario vigente y vuelve a ser reescribible. Esto
        // pasa sobre todo al cargar días PASADOS a mano, que es como se corrige.
        await (0, materializarDias_1.asegurarDiaSinFallar)(registro.colaboradorId, registro.fecha, app.log);
        return reply.status(201).send(registro);
    });
    // Corrección manual — deja rastro de auditoría
    app.put('/:id', auth, async (request, reply) => {
        const { id } = request.params;
        const payload = request.user;
        const existente = await index_1.prisma.registro.findFirst({
            where: { id, colaborador: { empresaId: request.empresaId } },
        });
        if (!existente)
            return reply.status(404).send({ error: 'Registro no encontrado' });
        const body = request.body;
        // Si se reasigna el colaborador, debe pertenecer a la MISMA empresa (evita
        // reasignar el registro a otra empresa vía body manipulado).
        if (body.colaboradorId !== undefined && !(await colaboradorDeEmpresa(body.colaboradorId, request.empresaId))) {
            return reply.status(404).send({ error: 'Colaborador no encontrado' });
        }
        const actualizado = await index_1.prisma.registro.update({
            where: { id },
            data: { ...camposRegistro(body, false), editadoPor: payload.email ?? payload.id, editadoEn: new Date() },
        });
        // Corregir un registro puede moverlo de día o de colaborador; el día nuevo
        // también necesita su fila. Nunca pisa la que ya exista, así que corregir
        // el pasado no cambia lo que ese día exigía.
        await (0, materializarDias_1.asegurarDiaSinFallar)(actualizado.colaboradorId, actualizado.fecha, app.log);
        return actualizado;
    });
    app.delete('/:id', auth, async (request, reply) => {
        const { id } = request.params;
        const existente = await index_1.prisma.registro.findFirst({
            where: { id, colaborador: { empresaId: request.empresaId } },
        });
        if (!existente)
            return reply.status(404).send({ error: 'Registro no encontrado' });
        return index_1.prisma.registro.delete({ where: { id } });
    });
}
