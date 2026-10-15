"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = climaRoutes;
const prisma_1 = require("../prisma");
const capacidades_1 = require("../utils/capacidades");
const notificaciones_1 = require("../utils/notificaciones");
const fechas_1 = require("../utils/fechas");
const clima_1 = require("../utils/clima");
const pruebaClima_1 = require("../utils/pruebaClima");
const climaSinPlan_1 = require("../utils/climaSinPlan");
const atencionClima_1 = require("../utils/atencionClima");
const sedesDeEmpresa_1 = require("../utils/sedesDeEmpresa");
const clima_2 = require("../utils/clima");
const climaDelKiosco_1 = require("../utils/climaDelKiosco");
const lecturasDelClima_1 = require("../utils/lecturasDelClima");
// EL PANEL DEL CLIMA LABORAL (4 de octubre de 2026). docs/CLIMA_LABORAL.md §3.6.
// Las cuentas están en utils/clima.ts, con sus pruebas; esto lee la base y las conecta.
const DIA_MS = 24 * 60 * 60 * 1000;
const SEMANAS_DEL_BUZON = 12;
// Las últimas respuestas de una persona en su historial: unos tres meses de jornadas.
const HISTORIAL = 60;
// SOLO EL ADMINISTRADOR (decisión del dueño del 3 de octubre de 2026). Las calificaciones van con
// nombre, así que un supervisor no las ve hasta que se trabaje el tema de usuarios y permisos.
async function soloAdministrador(request, reply) {
    const rol = request.user?.rol;
    if (rol !== 'ADMIN') {
        return reply.status(403).send({ error: 'Solo el administrador ve el clima laboral.', codigo: 'SOLO_ADMIN' });
    }
}
const fechaValida = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
async function climaRoutes(app) {
    const auth = { preHandler: [app.requireEmpresa, (0, capacidades_1.exigeFuncion)('clima'), soloAdministrador] };
    // Las rutas que NO exigen el plan de clima, porque son para quien no lo tiene: la prueba gratis (fase 3) y la vista
    // sin el plan (fase 4), PENDIENTES nº 39. Sí exigen al administrador, que es quien ve el clima.
    const authSinPlan = { preHandler: [app.requireEmpresa, soloAdministrador] };
    // ===== LA PRUEBA GRATIS (14 de octubre de 2026, PENDIENTES nº 39, fase 3) =====
    // Qué se decide está en utils/pruebaClima.ts; las pruebas se leen con `pruebasDe` (utils/lecturasDelClima.ts).
    app.get('/prueba', authSinPlan, async (request) => {
        return { ...(0, pruebaClima_1.estadoDePrueba)(await (0, lecturasDelClima_1.pruebasDe)(request.empresaId), new Date()), dias: pruebaClima_1.DIAS_DE_PRUEBA };
    });
    app.post('/prueba', authSinPlan, async (request, reply) => {
        const empresaId = request.empresaId;
        const [cap, previas] = await Promise.all([(0, capacidades_1.capacidadesEmpresa)(empresaId), (0, lecturasDelClima_1.pruebasDe)(empresaId)]);
        const d = (0, pruebaClima_1.decidirPrueba)({ tieneClima: !!cap.features.clima, pruebasPrevias: previas.length });
        if (!d.ok)
            return reply.status(409).send({ error: d.error, codigo: d.codigo });
        const prueba = await prisma_1.prisma.concesionFuncion.create({
            data: {
                empresaId, funcion: pruebaClima_1.FUNCION_DE_PRUEBA, hasta: (0, pruebaClima_1.finDePrueba)((0, fechas_1.hoyEnBogota)()), origen: 'PRUEBA',
                otorgadaPorId: request.usuarioId ?? null, otorgadaPorNombre: request.usuarioNombre ?? null,
            },
        });
        // Para probar el clima hace falta que el kiosco pregunte: si la empresa había apagado la calificación del
        // día, la prueba la vuelve a encender (fase 1).
        await prisma_1.prisma.configuracion.upsert({
            where: { empresaId_clave: { empresaId, clave: clima_1.CLAVE_CALIFICACION_DIA } },
            create: { empresaId, clave: clima_1.CLAVE_CALIFICACION_DIA, valor: '1' },
            update: { valor: '1' },
        });
        const aviso = (0, pruebaClima_1.textoDeAviso)('INICIO', { hasta: prueba.hasta });
        (0, notificaciones_1.notificar)(empresaId, { tipo: aviso.tipo, titulo: aviso.titulo, cuerpo: aviso.cuerpo, entidad: 'clima', entidadId: prueba.id });
        return reply.status(201).send({ hasta: prueba.hasta });
    });
    // Quién puede ser responsable de un caso: los usuarios activos de la empresa.
    const responsablesDe = (empresaId) => prisma_1.prisma.usuario.findMany({ where: { empresaId, activo: true }, select: { id: true, nombre: true }, orderBy: { nombre: 'asc' } });
    // El rango y la sede de la consulta, o null si el rango no vale.
    const leerRango = (query) => {
        const { desde, hasta, sedeId } = query;
        if (!fechaValida(desde) || !fechaValida(hasta) || desde > hasta)
            return null;
        return { desde, hasta, sede: typeof sedeId === 'string' && sedeId !== '' ? sedeId : null };
    };
    app.get('/resumen', auth, async (request, reply) => {
        const r = leerRango(request.query);
        if (!r)
            return reply.status(400).send({ error: 'El rango de fechas no es válido.' });
        return (0, lecturasDelClima_1.resumenDelPanel)(request.empresaId, r.desde, r.hasta, r.sede, true);
    });
    // LA VISTA SIN EL PLAN (14 de octubre de 2026, PENDIENTES nº 39, fase 4): cifras sin nombres de toda la empresa.
    app.get('/vistazo', authSinPlan, async (request, reply) => {
        const r = leerRango(request.query);
        if (!r)
            return reply.status(400).send({ error: 'El rango de fechas no es válido.' });
        return (0, climaSinPlan_1.vistazoDelClima)(await (0, lecturasDelClima_1.resumenDelPanel)(request.empresaId, r.desde, r.hasta, null, false));
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
            respuestas: filas.map(f => ({ fecha: f.fecha, carita: f.carita, motivos: (0, atencionClima_1.comoLista)(f.motivos), observacion: f.observacion })),
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
        const { colaboradores, sedes, sedesDe } = await (0, lecturasDelClima_1.sedesDeLaGente)(empresaId);
        const activos = new Set(colaboradores.filter(c => c.activo).map(c => c.id));
        const atencion = await (0, atencionClima_1.atencionDeLaEmpresa)(empresaId, activos);
        await (0, lecturasDelClima_1.sincronizarSeguimientos)(empresaId, atencion);
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
                // Quien hoy necesita atención y a quien este caso representa: el de su racha o, si no hay, el que siga
                // abierto (`casoDeLaAtencion`, la misma regla del resumen del panel).
                const suya = atencion.find(a => a.colaboradorId === c.colaboradorId);
                const enLista = suya && (0, clima_2.casoDeLaAtencion)(suya, casos.filter(x => x.colaboradorId === c.colaboradorId))?.id === c.id ? suya : undefined;
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
        const v = (0, clima_2.leerCambioDeSeguimiento)(request.body, usuarios.map(u => u.id));
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
        const c = (0, clima_2.leerComentario)(request.body);
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
        const c = (0, clima_2.leerComentario)(request.body);
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
    // Las notas que se ven hoy: las ya visibles de las últimas SEMANAS_DEL_BUZON semanas.
    const ventanaDelBuzon = (empresaId, ahora) => ({
        empresaId, visibleDesde: { lte: ahora },
        semana: { gte: new Date((0, clima_2.semanaDe)(ahora).getTime() - (SEMANAS_DEL_BUZON - 1) * 7 * DIA_MS) },
    });
    // EL BUZÓN CONFIDENCIAL: solo el texto, sin nada que diga quién ni cuándo. Ni el id sale de aquí.
    app.get('/buzon', auth, async (request) => {
        const notas = await prisma_1.prisma.observacionConfidencial.findMany({
            where: ventanaDelBuzon(request.empresaId, new Date()),
            select: { id: true, semana: true, texto: true },
        });
        const porSemana = new Map();
        for (const n of notas)
            porSemana.set(n.semana.getTime(), [...(porSemana.get(n.semana.getTime()) ?? []), n]);
        return {
            semanas: [...porSemana]
                .sort(([a], [b]) => b - a)
                .map(([semana, lista]) => ({ semana: new Date(semana), notas: (0, clima_2.ordenRevuelto)(lista).map(n => n.texto) })),
        };
    });
    // EL BUZÓN SIN EL PLAN (PENDIENTES nº 39, fase 4): CUÁNTAS notas por semana, nunca el texto. Ni siquiera se lee:
    // la consulta solo trae la semana. Un desenfoque por CSS se quita desde el inspector; un texto que no viajó, no.
    app.get('/buzon/conteo', authSinPlan, async (request) => {
        const grupos = await prisma_1.prisma.observacionConfidencial.groupBy({
            by: ['semana'], where: ventanaDelBuzon(request.empresaId, new Date()), _count: { _all: true },
        });
        return {
            semanas: grupos
                .sort((a, b) => b.semana.getTime() - a.semana.getTime())
                .map(g => ({ semana: g.semana, notas: g._count._all })),
        };
    });
    app.get('/motivos', auth, async (request) => {
        const motivos = await (0, climaDelKiosco_1.motivosDeEmpresa)(request.empresaId);
        return { motivos, otro: clima_2.MOTIVO_OTRO, predeterminados: clima_2.MOTIVOS_PREDETERMINADOS, catalogo: clima_2.CATALOGO_DE_MOTIVOS, maximo: clima_2.MAX_MOTIVOS };
    });
    app.put('/motivos', auth, async (request, reply) => {
        const v = (0, clima_2.validarMotivosDeEmpresa)(request.body?.motivos);
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
