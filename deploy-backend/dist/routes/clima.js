"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = climaRoutes;
const prisma_1 = require("../prisma");
const capacidades_1 = require("../utils/capacidades");
const fechas_1 = require("../utils/fechas");
const sedesDeEmpresa_1 = require("../utils/sedesDeEmpresa");
const clima_1 = require("../utils/clima");
const climaDelKiosco_1 = require("../utils/climaDelKiosco");
// EL PANEL DEL CLIMA LABORAL (4 de octubre de 2026). docs/CLIMA_LABORAL.md §3.6.
// Las cuentas están en utils/clima.ts, con sus pruebas; esto lee la base y las conecta.
const DIA_MS = 24 * 60 * 60 * 1000;
const SEMANAS_DEL_BUZON = 12;
// Las últimas respuestas de una persona en su historial: unos tres meses de jornadas.
const HISTORIAL = 60;
const RECIENTES = 30;
// SOLO EL ADMINISTRADOR (decisión del dueño del 3 de octubre de 2026). Las calificaciones van con
// nombre, así que un supervisor no las ve hasta que se trabaje el tema de usuarios y permisos.
async function soloAdministrador(request, reply) {
    const rol = request.user?.rol;
    if (rol !== 'ADMIN') {
        return reply.status(403).send({ error: 'Solo el administrador ve el clima laboral.', codigo: 'SOLO_ADMIN' });
    }
}
const comoLista = (v) => (Array.isArray(v) ? v.filter((m) => typeof m === 'string') : []);
const fechaValida = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
async function climaRoutes(app) {
    const auth = { preHandler: [app.requireEmpresa, (0, capacidades_1.exigeFuncion)('clima'), soloAdministrador] };
    // La sede de cada persona, atribuida al LEER con la regla de los reportes: sus sedes asignadas, o la
    // principal si es presencial y no tiene ninguna. Null («Sin sede») solo para híbridos y remotos.
    async function sedesDeLaGente(empresaId) {
        const [colaboradores, asignadas, sedes, defecto] = await Promise.all([
            prisma_1.prisma.colaborador.findMany({ where: { empresaId }, select: { id: true, nombre: true, apellido: true, cargo: true, modalidad: true, activo: true } }),
            prisma_1.prisma.colaboradorSede.findMany({ where: { sede: { empresaId, activa: true } }, select: { colaboradorId: true, sedeId: true } }),
            prisma_1.prisma.sede.findMany({ where: { empresaId, activa: true }, select: { id: true, nombre: true }, orderBy: { creadoEn: 'asc' } }),
            (0, sedesDeEmpresa_1.sedesPorDefecto)(prisma_1.prisma, empresaId),
        ]);
        const sedesDe = new Map();
        for (const a of asignadas)
            sedesDe.set(a.colaboradorId, [...(sedesDe.get(a.colaboradorId) ?? []), a.sedeId]);
        for (const c of colaboradores) {
            if (sedesDe.has(c.id))
                continue;
            sedesDe.set(c.id, [c.modalidad === 'PRESENCIAL' ? defecto(c.id) : null]);
        }
        return { colaboradores, sedes, sedesDe };
    }
    // Quién necesita atención HOY en toda la empresa, entre las personas activas: lo malo que vino después
    // del último buen día de cada una, por viejo que sea. Una ventana fija de fechas dejaba fuera a quien
    // responde poco (revisión adversarial del 4 de octubre de 2026).
    async function atencionDeLaEmpresa(empresaId, activos) {
        const [buenos, malas] = await Promise.all([
            prisma_1.prisma.calificacionClima.groupBy({ by: ['colaboradorId'], where: { empresaId, carita: { gt: clima_1.CARITA_MAX_DE_ATENCION } }, _max: { fecha: true } }),
            prisma_1.prisma.calificacionClima.findMany({
                where: { empresaId, carita: { lte: clima_1.CARITA_MAX_DE_ATENCION } },
                select: { colaboradorId: true, fecha: true, carita: true, motivos: true },
            }),
        ]);
        const ultimoBueno = new Map(buenos.filter(b => b._max.fecha).map(b => [b.colaboradorId, b._max.fecha]));
        return (0, clima_1.necesitanAtencion)((0, clima_1.filasParaLaRacha)(malas.map(m => ({ ...m, motivos: comoLista(m.motivos) })), ultimoBueno).filter(c => activos.has(c.colaboradorId)));
    }
    // EL SEGUIMIENTO (4 de octubre de 2026): cada persona que entra a «Necesitan atención» recibe su caso,
    // con las reglas de `casosPorAbrir`. Se abren al leer la lista, y la llave única (persona, comienzo de
    // la racha) impide que dos lecturas simultáneas abran el mismo caso dos veces.
    async function sincronizarSeguimientos(empresaId, atencion) {
        if (atencion.length === 0)
            return;
        const casos = await prisma_1.prisma.seguimientoClima.findMany({
            where: { empresaId, colaboradorId: { in: atencion.map(a => a.colaboradorId) } },
            select: { colaboradorId: true, desde: true, estado: true },
        });
        const nuevos = (0, clima_1.casosPorAbrir)(atencion, casos);
        if (nuevos.length > 0) {
            await prisma_1.prisma.seguimientoClima.createMany({
                data: nuevos.map(n => ({ empresaId, colaboradorId: n.colaboradorId, desde: n.desde })),
                skipDuplicates: true,
            });
        }
    }
    // Quién puede ser responsable de un caso: los usuarios activos de la empresa.
    const responsablesDe = (empresaId) => prisma_1.prisma.usuario.findMany({ where: { empresaId, activo: true }, select: { id: true, nombre: true }, orderBy: { nombre: 'asc' } });
    app.get('/resumen', auth, async (request, reply) => {
        const empresaId = request.empresaId;
        const { desde, hasta, sedeId } = request.query;
        if (!fechaValida(desde) || !fechaValida(hasta) || desde > hasta) {
            return reply.status(400).send({ error: 'El rango de fechas no es válido.' });
        }
        const sede = typeof sedeId === 'string' && sedeId !== '' ? sedeId : null;
        const { desdeF, finExclusivo } = (0, fechas_1.rangoReporte)(desde, hasta);
        // El período anterior, del mismo largo, para la variación del promedio.
        const desdeAnterior = new Date(desdeF.getTime() - (finExclusivo.getTime() - desdeF.getTime()));
        const { colaboradores, sedes, sedesDe } = await sedesDeLaGente(empresaId);
        const enLaSede = (colaboradorId) => sede === null || (sedesDe.get(colaboradorId) ?? []).includes(sede);
        const persona = new Map(colaboradores.map(c => [c.id, c]));
        const nombreDe = (id) => { const c = persona.get(id); return c ? `${c.nombre} ${c.apellido}` : 'Persona eliminada'; };
        const nombreDeSede = new Map([...sedes.map(s => [s.id, s.nombre]), [null, 'Sin sede']]);
        const filas = await prisma_1.prisma.calificacionClima.findMany({
            where: { empresaId, fecha: { gte: desdeAnterior, lt: finExclusivo } },
            select: { colaboradorId: true, fecha: true, carita: true, motivos: true, observacion: true, actualizadoEn: true },
        });
        const todas = filas.map(f => ({ ...f, motivos: comoLista(f.motivos) }));
        const delPeriodo = (d, h) => (c) => c.fecha >= d && c.fecha < h;
        const actualTodas = todas.filter(delPeriodo(desdeF, finExclusivo));
        const actual = actualTodas.filter(c => enLaSede(c.colaboradorId));
        const anterior = todas.filter(delPeriodo(desdeAnterior, desdeF)).filter(c => enLaSede(c.colaboradorId));
        const resumen = (0, clima_1.resumenDelClima)(actual);
        const resumenAnterior = (0, clima_1.resumenDelClima)(anterior);
        // Cuántas JORNADAS (persona y día) se cerraron en el kiosco en el período: es contra qué se compara
        // «respondieron». Por jornadas y no por personas: por personas, en un rango largo casi todos responden
        // alguna vez y el porcentaje se quedaba en 100. Solo las salidas que abren la ventana: ni pausas, ni
        // el cierre automático, ni las cargadas a mano (revisión adversarial del 4 de octubre de 2026). Un
        // turno partido son dos salidas pero una sola jornada, por eso se agrupa por persona y día.
        //
        // Se leen las de TODA la empresa: con ellas sale también la participación de cada sede.
        const ids = colaboradores.map(c => c.id);
        const jornadasTodas = ids.length === 0 ? [] : await prisma_1.prisma.registro.groupBy({
            by: ['colaboradorId', 'fecha'],
            where: {
                colaboradorId: { in: ids }, fecha: { gte: desdeF, lt: finExclusivo },
                ...climaDelKiosco_1.SALIDAS_QUE_ABREN_LA_VENTANA,
            },
        });
        const jornadas = jornadasTodas.filter(j => enLaSede(j.colaboradorId));
        // «Necesitan atención» es cómo está cada uno HOY, no en el período. Los casos de seguimiento se abren
        // con TODA la empresa, no solo con la sede del filtro: filtrar la vista no puede dejar a nadie sin caso.
        const activos = new Set(colaboradores.filter(c => c.activo).map(c => c.id));
        const atencionTodas = await atencionDeLaEmpresa(empresaId, activos);
        await sincronizarSeguimientos(empresaId, atencionTodas);
        const casos = atencionTodas.length === 0 ? [] : await prisma_1.prisma.seguimientoClima.findMany({
            where: { empresaId, colaboradorId: { in: atencionTodas.map(a => a.colaboradorId) } },
            select: { id: true, colaboradorId: true, desde: true, estado: true },
        });
        const atencion = atencionTodas.filter(a => enLaSede(a.colaboradorId)).map(a => {
            // El caso de esta racha; si no hay, el que siga abierto.
            const suyos = casos.filter(c => c.colaboradorId === a.colaboradorId);
            const caso = suyos.find(c => c.desde.getTime() === a.desde.getTime()) ?? suyos.find(c => c.estado !== 'CERRADO') ?? null;
            return {
                ...a,
                nombre: nombreDe(a.colaboradorId),
                cargo: persona.get(a.colaboradorId)?.cargo ?? null,
                sedes: (sedesDe.get(a.colaboradorId) ?? []).map(s => nombreDeSede.get(s) ?? 'Sin sede'),
                seguimiento: caso ? { id: caso.id, estado: caso.estado } : null,
            };
        });
        const recientes = [...actual]
            .sort((a, b) => b.fecha.getTime() - a.fecha.getTime() || b.actualizadoEn.getTime() - a.actualizadoEn.getTime())
            .slice(0, RECIENTES)
            .map(c => ({ colaboradorId: c.colaboradorId, nombre: nombreDe(c.colaboradorId), fecha: c.fecha, carita: c.carita, motivos: c.motivos, observacion: c.observacion }));
        return {
            ...resumen,
            variacion: (0, clima_1.variacionDelPromedio)(resumen.promedio, resumenAnterior.promedio),
            jornadas: jornadas.length,
            porSede: (0, clima_1.promedioPorSede)(actualTodas, jornadasTodas, sedesDe, sedes),
            atencion,
            recientes,
        };
    });
    // EL HISTORIAL DE UNA PERSONA, para «Revisar» en «Necesitan atención» (4 de octubre de 2026). Va con
    // nombre, como todo lo del panel salvo el buzón: sus caritas, sus motivos y sus observaciones DIRECTAS.
    // Las confidenciales no se tocan aquí: ni siquiera se consultan. La persona se busca dentro de la
    // empresa de quien pregunta; la de otra empresa, para este panel, no existe.
    app.get('/persona/:id', auth, async (request, reply) => {
        const empresaId = request.empresaId;
        const { id } = request.params;
        const persona = await prisma_1.prisma.colaborador.findFirst({
            where: { id, empresaId },
            select: { id: true, nombre: true, apellido: true, cargo: true, modalidad: true },
        });
        if (!persona)
            return reply.status(404).send({ error: 'No encontramos a esa persona.' });
        const [asignadas, defecto, filas] = await Promise.all([
            prisma_1.prisma.colaboradorSede.findMany({ where: { colaboradorId: id, sede: { empresaId, activa: true } }, select: { sede: { select: { nombre: true } } } }),
            (0, sedesDeEmpresa_1.sedesPorDefecto)(prisma_1.prisma, empresaId, id),
            prisma_1.prisma.calificacionClima.findMany({
                where: { colaboradorId: id, empresaId },
                orderBy: { fecha: 'desc' },
                take: HISTORIAL,
                select: { fecha: true, carita: true, motivos: true, observacion: true },
            }),
        ]);
        let sedes = asignadas.map(a => a.sede.nombre);
        if (sedes.length === 0 && persona.modalidad === 'PRESENCIAL' && defecto(id)) {
            const principal = await prisma_1.prisma.sede.findFirst({ where: { id: defecto(id), empresaId }, select: { nombre: true } });
            if (principal)
                sedes = [principal.nombre];
        }
        // Su caso de seguimiento: el que siga abierto, o el último que tuvo.
        const [casos, responsables] = await Promise.all([
            prisma_1.prisma.seguimientoClima.findMany({
                where: { colaboradorId: id, empresaId },
                orderBy: { abiertoEn: 'desc' },
                include: { comentarios: { orderBy: { creadoEn: 'asc' } } },
            }),
            responsablesDe(empresaId),
        ]);
        const caso = casos.find(c => c.estado !== 'CERRADO') ?? casos[0] ?? null;
        return {
            nombre: `${persona.nombre} ${persona.apellido}`,
            cargo: persona.cargo,
            sedes: sedes.length > 0 ? sedes : ['Sin sede'],
            respuestas: filas.map(f => ({ fecha: f.fecha, carita: f.carita, motivos: comoLista(f.motivos), observacion: f.observacion })),
            seguimiento: caso && {
                id: caso.id, estado: caso.estado, responsableId: caso.responsableId, desde: caso.desde, abiertoEn: caso.abiertoEn, cerradoEn: caso.cerradoEn,
                comentarios: caso.comentarios.map(k => ({ id: k.id, autorNombre: k.autorNombre, texto: k.texto, creadoEn: k.creadoEn, editadoEn: k.editadoEn })),
            },
            responsables,
        };
    });
    // LA PESTAÑA «SEGUIMIENTO»: todos los casos de la empresa. Primero se abren los que falten.
    const ORDEN_DE_ESTADO = { SIN_REVISAR: 0, EN_SEGUIMIENTO: 1, CERRADO: 2 };
    app.get('/seguimientos', auth, async (request) => {
        const empresaId = request.empresaId;
        const { colaboradores, sedes, sedesDe } = await sedesDeLaGente(empresaId);
        const activos = new Set(colaboradores.filter(c => c.activo).map(c => c.id));
        const atencion = await atencionDeLaEmpresa(empresaId, activos);
        await sincronizarSeguimientos(empresaId, atencion);
        const [casos, responsables] = await Promise.all([
            prisma_1.prisma.seguimientoClima.findMany({
                where: { empresaId },
                include: { comentarios: { orderBy: { creadoEn: 'desc' }, take: 1 }, _count: { select: { comentarios: true } } },
            }),
            responsablesDe(empresaId),
        ]);
        const persona = new Map(colaboradores.map(c => [c.id, c]));
        const nombreDeSede = new Map([...sedes.map(s => [s.id, s.nombre]), [null, 'Sin sede']]);
        const nombreDeUsuario = new Map(responsables.map(r => [r.id, r.nombre]));
        return {
            responsables,
            casos: casos
                .sort((a, b) => ORDEN_DE_ESTADO[a.estado] - ORDEN_DE_ESTADO[b.estado] || b.abiertoEn.getTime() - a.abiertoEn.getTime())
                .map(c => {
                const p = persona.get(c.colaboradorId);
                const enLista = atencion.find(a => a.colaboradorId === c.colaboradorId && a.desde.getTime() === c.desde.getTime());
                return {
                    id: c.id, colaboradorId: c.colaboradorId,
                    nombre: p ? `${p.nombre} ${p.apellido}` : 'Persona eliminada',
                    cargo: p?.cargo ?? null,
                    sedes: (sedesDe.get(c.colaboradorId) ?? []).map(s => nombreDeSede.get(s) ?? 'Sin sede'),
                    estado: c.estado,
                    responsableId: c.responsableId,
                    responsable: c.responsableId ? nombreDeUsuario.get(c.responsableId) ?? 'Usuario que ya no está' : null,
                    desde: c.desde, abiertoEn: c.abiertoEn, cerradoEn: c.cerradoEn,
                    // Si la racha que lo abrió sigue: cuántas respuestas negativas lleva.
                    racha: enLista ? enLista.dias : null,
                    comentarios: c._count.comentarios,
                    ultimoComentario: c.comentarios[0] ? { texto: c.comentarios[0].texto, autorNombre: c.comentarios[0].autorNombre, creadoEn: c.comentarios[0].creadoEn } : null,
                };
            }),
        };
    });
    app.patch('/seguimientos/:id', auth, async (request, reply) => {
        const empresaId = request.empresaId;
        const { id } = request.params;
        const caso = await prisma_1.prisma.seguimientoClima.findFirst({ where: { id, empresaId }, select: { id: true } });
        if (!caso)
            return reply.status(404).send({ error: 'Ese caso no existe.' });
        const usuarios = await prisma_1.prisma.usuario.findMany({ where: { empresaId, activo: true }, select: { id: true } });
        const v = (0, clima_1.leerCambioDeSeguimiento)(request.body, usuarios.map(u => u.id));
        if (!v.ok)
            return reply.status(400).send({ error: v.error });
        // Cerrar anota cuándo; reabrir lo borra.
        const cierre = v.cambio.estado === undefined ? {} : { cerradoEn: v.cambio.estado === 'CERRADO' ? new Date() : null };
        return prisma_1.prisma.seguimientoClima.update({ where: { id }, data: { ...v.cambio, ...cierre } });
    });
    // LOS COMENTARIOS DEL CASO. El autor sale de la sesión, nunca del cuerpo. Se pueden editar y borrar
    // (decisión del dueño); al editar queda la marca de cuándo.
    app.post('/seguimientos/:id/comentarios', auth, async (request, reply) => {
        const empresaId = request.empresaId;
        const { id } = request.params;
        const caso = await prisma_1.prisma.seguimientoClima.findFirst({ where: { id, empresaId }, select: { id: true } });
        if (!caso)
            return reply.status(404).send({ error: 'Ese caso no existe.' });
        const c = (0, clima_1.leerComentario)(request.body);
        if (!c.ok)
            return reply.status(400).send({ error: c.error });
        const comentario = await prisma_1.prisma.comentarioSeguimientoClima.create({
            data: { seguimientoId: id, autorId: request.usuarioId ?? null, autorNombre: request.usuarioNombre ?? 'Administrador', texto: c.texto },
        });
        return reply.status(201).send(comentario);
    });
    const comentarioDe = (empresaId, seguimientoId, id) => prisma_1.prisma.comentarioSeguimientoClima.findFirst({ where: { id, seguimientoId, seguimiento: { empresaId } }, select: { id: true } });
    app.put('/seguimientos/:id/comentarios/:cid', auth, async (request, reply) => {
        const { id, cid } = request.params;
        if (!await comentarioDe(request.empresaId, id, cid))
            return reply.status(404).send({ error: 'Ese comentario no existe.' });
        const c = (0, clima_1.leerComentario)(request.body);
        if (!c.ok)
            return reply.status(400).send({ error: c.error });
        return prisma_1.prisma.comentarioSeguimientoClima.update({ where: { id: cid }, data: { texto: c.texto, editadoEn: new Date() } });
    });
    app.delete('/seguimientos/:id/comentarios/:cid', auth, async (request, reply) => {
        const { id, cid } = request.params;
        if (!await comentarioDe(request.empresaId, id, cid))
            return reply.status(404).send({ error: 'Ese comentario no existe.' });
        await prisma_1.prisma.comentarioSeguimientoClima.delete({ where: { id: cid } });
        return { ok: true };
    });
    // EL BUZÓN CONFIDENCIAL: solo el texto, sin nada que diga quién ni cuándo. Ni el id sale de aquí.
    app.get('/buzon', auth, async (request) => {
        const empresaId = request.empresaId;
        const ahora = new Date();
        const desde = new Date((0, clima_1.semanaDe)(ahora).getTime() - (SEMANAS_DEL_BUZON - 1) * 7 * DIA_MS);
        const notas = await prisma_1.prisma.observacionConfidencial.findMany({
            where: { empresaId, visibleDesde: { lte: ahora }, semana: { gte: desde } },
            select: { id: true, semana: true, texto: true },
        });
        const porSemana = new Map();
        for (const n of notas)
            porSemana.set(n.semana.getTime(), [...(porSemana.get(n.semana.getTime()) ?? []), n]);
        return {
            semanas: [...porSemana]
                .sort(([a], [b]) => b - a)
                .map(([semana, lista]) => ({ semana: new Date(semana), notas: (0, clima_1.ordenRevuelto)(lista).map(n => n.texto) })),
        };
    });
    app.get('/motivos', auth, async (request) => {
        const motivos = await (0, climaDelKiosco_1.motivosDeEmpresa)(request.empresaId);
        return { motivos, otro: clima_1.MOTIVO_OTRO, predeterminados: clima_1.MOTIVOS_PREDETERMINADOS, catalogo: clima_1.CATALOGO_DE_MOTIVOS, maximo: clima_1.MAX_MOTIVOS };
    });
    app.put('/motivos', auth, async (request, reply) => {
        const v = (0, clima_1.validarMotivosDeEmpresa)(request.body?.motivos);
        if (!v.ok)
            return reply.status(400).send({ error: v.error });
        const empresaId = request.empresaId;
        await prisma_1.prisma.configuracion.upsert({
            where: { empresaId_clave: { empresaId, clave: climaDelKiosco_1.CLAVE_MOTIVOS } },
            create: { empresaId, clave: climaDelKiosco_1.CLAVE_MOTIVOS, valor: JSON.stringify(v.motivos) },
            update: { valor: JSON.stringify(v.motivos) },
        });
        return { motivos: v.motivos };
    });
}
