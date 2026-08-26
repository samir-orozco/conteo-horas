"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = colaboradorRoutes;
const client_1 = require("@prisma/client");
const prisma_1 = require("../prisma");
const horasColombiana_1 = require("../utils/horasColombiana");
const vigencias_1 = require("../utils/vigencias");
const capacidades_1 = require("../utils/capacidades");
const rostro_1 = require("../utils/rostro");
const fechas_1 = require("../utils/fechas");
const materializarDias_1 = require("../utils/materializarDias");
async function colaboradorRoutes(app) {
    const auth = { preHandler: [app.requireEmpresa] };
    // Cierra el contrato vigente de quien se retira. Sin esto el módulo de
    // contratos seguiría avisando del vencimiento de alguien que ya no está.
    async function cerrarContratoVigente(colaboradorId) {
        await prisma_1.prisma.contrato.updateMany({
            where: { colaboradorId, estado: 'VIGENTE' },
            data: { estado: 'TERMINADO' },
        });
    }
    // Barrido de los retiros que quedaron PROGRAMADOS antes de este cambio.
    //
    // Aplazar el retiro a fin de mes venía de cuando el precio dependía del número
    // de colaboradores: se cobraba el mes y se dejaba el cupo ocupado. Hoy el
    // precio es plano por plan y no mira cuántos hay, así que aplazar no protegía
    // ingreso: solo impedía contratar al reemplazo el mismo día. Ya no se
    // programan retiros nuevos, pero pueden quedar filas viejas en producción y
    // hay que aplicarlas, ahora sí dejando la fecha registrada.
    async function aplicarRetiros(empresaId) {
        const pendientes = await prisma_1.prisma.colaborador.findMany({
            where: { empresaId, activo: true, retiroProgramado: { lte: new Date() } },
            select: { id: true, retiroProgramado: true },
        });
        for (const c of pendientes) {
            await prisma_1.prisma.colaborador.update({
                where: { id: c.id },
                data: { activo: false, fechaRetiro: c.retiroProgramado, retiroProgramado: null },
            });
            await cerrarContratoVigente(c.id);
        }
    }
    app.get('/', auth, async (request) => {
        await aplicarRetiros(request.empresaId);
        // Se incluyen las sedes para que el modal de edición de la LISTA pueda
        // mostrarlas sin pedir cada colaborador por separado.
        const filas = await prisma_1.prisma.colaborador.findMany({
            where: { empresaId: request.empresaId, activo: true },
            include: { sedes: { select: { sedeId: true } } },
            orderBy: { nombre: 'asc' },
        });
        return filas.map(({ sedes, ...c }) => ({ ...c, sedeIds: sedes.map(s => s.sedeId) }));
    });
    app.get('/:id', auth, async (request, reply) => {
        const { id } = request.params;
        const col = await prisma_1.prisma.colaborador.findFirst({
            where: { id, empresaId: request.empresaId },
            include: {
                horario: { include: { franjas: true } },
                sedes: { select: { sedeId: true } },
            },
        });
        if (!col)
            return reply.status(404).send({ error: 'No encontrado' });
        // Se aplana a una lista de ids: es lo que el selector múltiple necesita, y
        // evita que el frontend tenga que conocer la tabla de unión.
        const { sedes, ...resto } = col;
        return { ...resto, sedeIds: (sedes ?? []).map((s) => s.sedeId) };
    });
    // Valida que el horario asignado sea de la misma empresa
    async function horarioValido(horarioId, empresaId) {
        if (!horarioId)
            return true;
        const h = await prisma_1.prisma.horario.findFirst({ where: { id: horarioId, empresaId, activo: true } });
        return Boolean(h);
    }
    // Reemplaza las sedes donde este colaborador puede marcar. Se validan contra
    // la empresa del token: sin eso, un id de otra empresa colaría a alguien en
    // una sede ajena. `undefined` significa "no se tocó" y se distingue de `[]`,
    // que sí quiere decir "quítale todas".
    async function sincronizarSedes(colaboradorId, sedeIds, empresaId) {
        if (!Array.isArray(sedeIds))
            return;
        const validas = await prisma_1.prisma.sede.findMany({
            where: { id: { in: sedeIds.filter((x) => typeof x === 'string') }, empresaId, activa: true },
            select: { id: true },
        });
        await prisma_1.prisma.$transaction([
            prisma_1.prisma.colaboradorSede.deleteMany({ where: { colaboradorId } }),
            ...(validas.length
                ? [prisma_1.prisma.colaboradorSede.createMany({ data: validas.map(s => ({ colaboradorId, sedeId: s.id })), skipDuplicates: true })]
                : []),
        ]);
    }
    // La fecha de nacimiento llega como "YYYY-MM-DD"; la normalizamos a Date (o null)
    function normalizar(data) {
        if ('fechaNacimiento' in data) {
            data.fechaNacimiento = data.fechaNacimiento ? new Date(`${data.fechaNacimiento}T12:00:00Z`) : null;
        }
        return data;
    }
    app.post('/', auth, async (request, reply) => {
        const { sedeIds, ...cuerpo } = request.body;
        const data = normalizar(cuerpo);
        if (!(await horarioValido(data.horarioId, request.empresaId))) {
            return reply.status(400).send({ error: 'Horario inválido' });
        }
        // La cédula es única por empresa. Si ya existe desactivado (lo "borraron"),
        // se reactiva con los datos nuevos y conserva todo su historial de horas.
        const existente = await prisma_1.prisma.colaborador.findUnique({
            where: { empresaId_cedula: { empresaId: request.empresaId, cedula: data.cedula } },
        });
        if (existente?.activo) {
            return reply.status(409).send({ error: `La cédula ${data.cedula} ya está registrada para ${existente.nombre} ${existente.apellido}` });
        }
        // Límite de colaboradores según el plan (crear o reactivar suma un activo)
        const cap = await (0, capacidades_1.capacidadesEmpresa)(request.empresaId);
        if (cap.limite !== Infinity) {
            const activos = await prisma_1.prisma.colaborador.count({ where: { empresaId: request.empresaId, activo: true } });
            if (activos >= cap.limite) {
                return reply.status(403).send({
                    error: `Tu plan ${cap.nombrePlan} permite hasta ${cap.limite} colaboradores.`,
                    codigo: 'LIMITE_PLAN', limite: cap.limite, plan: cap.plan,
                });
            }
        }
        // Se materializa la ventana de una vez, no en la pasada diaria: si alguien
        // se crea y marca el mismo día, ese día tiene que tener su fila.
        const materializar = async (colaboradorId) => {
            try {
                await (0, materializarDias_1.mantenerVentanaDeColaborador)(colaboradorId);
            }
            catch (err) {
                request.log.error(err, 'No se pudo materializar la ventana del colaborador');
            }
        };
        if (existente) {
            const reactivado = await prisma_1.prisma.colaborador.update({
                where: { id: existente.id },
                data: { ...data, activo: true, retiroProgramado: null },
            });
            // Aquí SÍ hay que pisar: quien vuelve trae filas viejas de cuando estuvo
            // activo, y `mantenerVentanaDeColaborador` solo rellena huecos. Sin esto
            // reingresaba con el horario que tenía el día que se fue.
            try {
                await (0, materializarDias_1.regenerarDiasDeColaborador)(reactivado.id);
            }
            catch (err) {
                request.log.error(err, 'No se pudieron regenerar los días del colaborador reactivado');
            }
            await sincronizarSedes(reactivado.id, sedeIds, request.empresaId);
            return reply.status(200).send({ ...reactivado, reactivado: true });
        }
        const colaborador = await prisma_1.prisma.colaborador.create({
            data: { ...data, empresaId: request.empresaId },
        });
        await materializar(colaborador.id);
        await sincronizarSedes(colaborador.id, sedeIds, request.empresaId);
        return reply.status(201).send(colaborador);
    });
    app.put('/:id', auth, async (request, reply) => {
        const { id } = request.params;
        const existente = await prisma_1.prisma.colaborador.findFirst({ where: { id, empresaId: request.empresaId } });
        if (!existente)
            return reply.status(404).send({ error: 'No encontrado' });
        const { empresaId: _ignorar, horario: _rel, sedeIds, ...rest } = request.body;
        const data = normalizar(rest);
        if (!(await horarioValido(data.horarioId, request.empresaId))) {
            return reply.status(400).send({ error: 'Horario inválido' });
        }
        const actualizado = await prisma_1.prisma.colaborador.update({ where: { id }, data });
        await sincronizarSedes(id, sedeIds, request.empresaId);
        // Cambiar a alguien de horario es la otra forma de reescribir el pasado:
        // `Colaborador.horarioId` tampoco tiene historial. Aplica desde HOY si su día
        // sigue intacto, y desde mañana si ya marcó. Lo anterior no se toca.
        let aplicadoHoy = null;
        if (data.horarioId !== undefined && data.horarioId !== existente.horarioId) {
            try {
                aplicadoHoy = (await (0, materializarDias_1.regenerarDiasDeColaborador)(id)).aplicadoHoy;
            }
            catch (err) {
                request.log.error(err, 'No se pudieron regenerar los días del colaborador');
            }
        }
        return { ...actualizado, aplicadoHoy };
    });
    // Estilo Notion: si el mes ya está pagado, el colaborador queda cubierto y
    // sigue activo hasta fin de mes; el retiro se aplica al iniciar el siguiente.
    // Si no hay mes pagado, se desactiva de inmediato.
    const MOTIVOS = ['RENUNCIA', 'FIN_CONTRATO', 'SIN_JUSTA_CAUSA', 'JUSTA_CAUSA', 'FIN_OBRA', 'OTRO'];
    // Registrar el retiro de un colaborador.
    //
    // No borra nada: marcaciones, novedades, contratos y reportes quedan igual, y
    // tienen que quedar, porque la ley obliga a conservar esa información y porque
    // borrarla reescribiría meses ya liquidados. Lo que hace es sacarlo de la
    // operación, dejar constancia de cuándo y por qué, y liberar el cupo del plan
    // el mismo día para que el reemplazo pueda entrar.
    app.post('/:id/retirar', auth, async (request, reply) => {
        const { id } = request.params;
        const { fecha, motivo } = (request.body ?? {});
        const existente = await prisma_1.prisma.colaborador.findFirst({
            where: { id, empresaId: request.empresaId }, select: { id: true, activo: true },
        });
        if (!existente)
            return reply.status(404).send({ error: 'No encontrado' });
        if (!existente.activo)
            return reply.status(409).send({ error: 'Ese colaborador ya está retirado.' });
        const fechaRetiro = typeof fecha === 'string' && fecha.length >= 10
            ? (0, fechas_1.medianocheBogota)(fecha) : (0, fechas_1.medianocheBogota)((0, fechas_1.hoyEnBogota)());
        if (!fechaRetiro)
            return reply.status(400).send({ error: 'La fecha de retiro no es válida.' });
        if (motivo && !MOTIVOS.includes(motivo)) {
            return reply.status(400).send({ error: 'Motivo de retiro no válido.' });
        }
        const colaborador = await prisma_1.prisma.colaborador.update({
            where: { id },
            data: {
                activo: false,
                fechaRetiro,
                motivoRetiro: (motivo ?? 'OTRO'),
                retiroProgramado: null,
            },
        });
        await cerrarContratoVigente(id);
        return colaborador;
    });
    // Se conserva el DELETE porque es lo que llama la interfaz vieja y lo que
    // puede haber en una pestaña abierta. Hace lo mismo que retirar, sin motivo.
    app.delete('/:id', auth, async (request, reply) => {
        const { id } = request.params;
        const existente = await prisma_1.prisma.colaborador.findFirst({ where: { id, empresaId: request.empresaId } });
        if (!existente)
            return reply.status(404).send({ error: 'No encontrado' });
        const colaborador = await prisma_1.prisma.colaborador.update({
            where: { id },
            data: { activo: false, fechaRetiro: (0, fechas_1.medianocheBogota)((0, fechas_1.hoyEnBogota)()), retiroProgramado: null },
        });
        await cerrarContratoVigente(id);
        // `retiroInmediato` se mantiene por compatibilidad con el frontend actual.
        return { ...colaborador, retiroInmediato: true };
    });
    // Los que ya no están. Van en su propia ruta y no en el listado principal
    // para que ninguna pantalla los cuente por accidente en un total de la
    // operación de hoy.
    app.get('/inactivos', auth, async (request) => {
        await aplicarRetiros(request.empresaId);
        return prisma_1.prisma.colaborador.findMany({
            where: { empresaId: request.empresaId, activo: false },
            select: {
                id: true, nombre: true, apellido: true, cedula: true, cargo: true,
                salarioMensual: true, fechaRetiro: true, motivoRetiro: true, creadoEn: true,
            },
            orderBy: [{ fechaRetiro: 'desc' }, { nombre: 'asc' }],
        });
    });
    // Reingreso: recupera la ficha completa, con su historial y su rostro.
    //
    // Existe porque sin esto la única salida era volver a crear a la persona, y
    // eso parte su historia en dos fichas: el kardex viejo queda huérfano, el
    // rostro hay que enrolarlo otra vez y la antigüedad para la liquidación se
    // pierde.
    app.post('/:id/reingresar', auth, async (request, reply) => {
        const { id } = request.params;
        const existente = await prisma_1.prisma.colaborador.findFirst({
            where: { id, empresaId: request.empresaId }, select: { id: true, activo: true },
        });
        if (!existente)
            return reply.status(404).send({ error: 'No encontrado' });
        if (existente.activo)
            return reply.status(409).send({ error: 'Ese colaborador ya está activo.' });
        // Reingresar suma un activo, así que pasa por el mismo tope del plan.
        const cap = await (0, capacidades_1.capacidadesEmpresa)(request.empresaId);
        if (cap.limite !== Infinity) {
            const activos = await prisma_1.prisma.colaborador.count({ where: { empresaId: request.empresaId, activo: true } });
            if (activos >= cap.limite) {
                return reply.status(403).send({
                    error: `Tu plan ${cap.nombrePlan} permite hasta ${cap.limite} colaboradores.`,
                    codigo: 'LIMITE_PLAN', limite: cap.limite, plan: cap.plan,
                });
            }
        }
        const colaborador = await prisma_1.prisma.colaborador.update({
            where: { id },
            data: { activo: true, fechaRetiro: null, motivoRetiro: null, retiroProgramado: null },
        });
        // Sus días esperados quedaron congelados con el horario del día que se fue.
        try {
            await (0, materializarDias_1.regenerarDiasDeColaborador)(id);
        }
        catch (err) {
            request.log.error(err, 'No se pudieron regenerar los días del colaborador que reingresa');
        }
        return colaborador;
    });
    // Enrolamiento facial guiado: guarda VARIAS muestras (frente, perfiles,
    // con/sin gafas — 128 floats cada una) capturadas en el navegador. La imagen
    // nunca llega al servidor. rostroEnroladoEn queda como evidencia de que hubo
    // consentimiento explícito (dato biométrico, Ley 1581).
    app.post('/:id/rostro', auth, async (request, reply) => {
        const { id } = request.params;
        const { descriptores } = request.body;
        const existente = await prisma_1.prisma.colaborador.findFirst({ where: { id, empresaId: request.empresaId } });
        if (!existente)
            return reply.status(404).send({ error: 'No encontrado' });
        if (!(0, rostro_1.esListaDescriptoresValida)(descriptores)) {
            return reply.status(400).send({ error: 'Muestras faciales inválidas' });
        }
        const colaborador = await prisma_1.prisma.colaborador.update({
            where: { id },
            data: { rostroDescriptor: descriptores, rostroEnroladoEn: new Date() },
        });
        return { ok: true, rostroEnroladoEn: colaborador.rostroEnroladoEn };
    });
    app.delete('/:id/rostro', auth, async (request, reply) => {
        const { id } = request.params;
        const existente = await prisma_1.prisma.colaborador.findFirst({ where: { id, empresaId: request.empresaId } });
        if (!existente)
            return reply.status(404).send({ error: 'No encontrado' });
        await prisma_1.prisma.colaborador.update({
            where: { id },
            data: { rostroDescriptor: client_1.Prisma.DbNull, rostroEnroladoEn: null },
        });
        return { ok: true };
    });
    app.get('/:id/valor-hora', auth, async (request, reply) => {
        const { id } = request.params;
        const colaborador = await prisma_1.prisma.colaborador.findFirst({ where: { id, empresaId: request.empresaId } });
        if (!colaborador)
            return reply.status(404).send({ error: 'No encontrado' });
        const jornadas = await prisma_1.prisma.jornadaVigencia.findMany();
        const jornada = (0, vigencias_1.jornadaVigente)(new Date(), jornadas);
        const horasMes = (0, vigencias_1.horasMesDeJornada)(jornada);
        return {
            salarioMensual: colaborador.salarioMensual,
            jornadaSemanal: jornada,
            horasMes,
            valorHora: (0, horasColombiana_1.calcularValorHora)(colaborador.salarioMensual, horasMes),
        };
    });
}
