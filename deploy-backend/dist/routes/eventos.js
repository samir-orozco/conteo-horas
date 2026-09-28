"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = eventoRoutes;
exports.eventosAdminRoutes = eventosAdminRoutes;
const prisma_1 = require("../prisma");
const registrarEvento_1 = require("../utils/registrarEvento");
const consultaDeEventos_1 = require("../utils/consultaDeEventos");
// El registro del sistema: lo que se rompe, quién intenta entrar sin permiso y quién hizo qué.
//
// Este archivo tiene DOS plugins con permisos opuestos, y conviene no confundirlos:
//
// - `eventoRoutes` es PÚBLICO y solo escribe. Lo usa el navegador de cualquiera para reportar que
//   se le rompió la pantalla, igual que el kiosco es público. No lee nada.
// - `eventosAdminRoutes` es del super administrador y es el que lee y borra.
async function eventoRoutes(app) {
    // Lo que se rompió en la pantalla de alguien. Hasta hoy eso solo se veía en su celular y había
    // que pedirle una foto (ver `CapturadorErrores.tsx`).
    //
    // Con límite propio: es una ruta abierta que escribe en la base, así que sin él sería una forma
    // cómoda de llenar la tabla desde fuera. 20 por minuto es holgado para una pantalla que se
    // rompe de verdad y estrecho para quien quiera abusar. La agrupación por huella hace el resto:
    // mil reportes del mismo fallo son una fila.
    app.post('/navegador', { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } }, async (request, reply) => {
        const cuerpo = (request.body ?? {});
        (0, registrarEvento_1.registrarReporteDelNavegador)(cuerpo, request);
        // 204 siempre, incluso si el reporte venía vacío: el navegador no tiene nada que hacer con un
        // error de esta ruta, y devolvérselo solo le daría algo más que reportar.
        return reply.status(204).send();
    });
}
const ORDEN = { ultimaVez: 'desc' };
// Lo que se ve en la tabla. El detalle (el rastro completo, el cuerpo de la petición) NO viaja en
// el listado: son hasta veinte mil caracteres por fila y la pantalla solo los pide al abrir una.
const COLUMNAS_DE_LISTA = {
    id: true, tipo: true, origen: true, veces: true, primeraVez: true, ultimaVez: true,
    metodo: true, ruta: true, estado: true, mensaje: true, ip: true,
    usuarioEmail: true, usuarioNombre: true, empresaId: true, empresaNombre: true, navegador: true,
};
async function eventosAdminRoutes(app) {
    const auth = { preHandler: [app.requireSuperAdmin] };
    app.get('/', auth, async (request) => {
        const { where, take, skip } = (0, consultaDeEventos_1.filtrosDeEventos)(request.query);
        const [eventos, total] = await Promise.all([
            prisma_1.prisma.eventoSistema.findMany({ where, orderBy: ORDEN, take, skip, select: COLUMNAS_DE_LISTA }),
            prisma_1.prisma.eventoSistema.count({ where }),
        ]);
        return { eventos, total, pagina: skip / take + 1, porPagina: take };
    });
    // Cuántos hay en cada pestaña, para los contadores de arriba. Respeta los filtros de fecha y de
    // búsqueda pero NO el de tipo, que es justamente lo que las pestañas eligen.
    app.get('/resumen', auth, async (request) => {
        const { where } = (0, consultaDeEventos_1.filtrosDeEventos)({ ...request.query, tipo: undefined });
        const porTipo = await prisma_1.prisma.eventoSistema.groupBy({ by: ['tipo'], where, _count: true, _sum: { veces: true } });
        return {
            total: porTipo.reduce((suma, t) => suma + t._count, 0),
            porTipo: porTipo.map(t => ({ tipo: t.tipo, filas: t._count, ocurrencias: t._sum.veces ?? 0 })),
        };
    });
    app.get('/:id', auth, async (request, reply) => {
        const { id } = request.params;
        const evento = await prisma_1.prisma.eventoSistema.findUnique({ where: { id } });
        if (!evento)
            return reply.status(404).send({ error: 'Ese evento ya no existe' });
        return evento;
    });
    app.get('/exportar', auth, async (request, reply) => {
        const { where } = (0, consultaDeEventos_1.filtrosDeEventos)(request.query);
        // Tope propio y alto: un export es una acción deliberada, no una pantalla que se refresca. El
        // límite existe para que no se intente traer un millón de filas a la memoria del proceso.
        const eventos = await prisma_1.prisma.eventoSistema.findMany({ where, orderBy: ORDEN, take: 5000, select: COLUMNAS_DE_LISTA });
        const hoy = new Date().toISOString().slice(0, 10);
        return reply
            .header('Content-Type', 'text/csv; charset=utf-8')
            .header('Content-Disposition', `attachment; filename="registro-sistema-${hoy}.csv"`)
            // La marca de orden de bytes es lo que hace que Excel abra el archivo en UTF-8 y no pinte
            // "FerreterÃ­a" donde dice "Ferretería".
            .send('﻿' + (0, consultaDeEventos_1.csvDeEventos)(eventos));
    });
    // Borrar. No hay borrado automático —lo decidió el dueño— así que este es el único camino por el
    // que sale algo de aquí, y por eso el alcance se exige explícito: sin él no se borra nada, en vez
    // de que "sin filtros" signifique "todo" (CLAUDE.md §12.3).
    app.delete('/', auth, async (request, reply) => {
        const alcance = (0, consultaDeEventos_1.rangoDeBorrado)((request.body ?? {}));
        if (!alcance) {
            return reply.status(400).send({
                error: 'Di qué hay que borrar: un período con sus dos fechas, unas filas concretas, o todo el registro.',
            });
        }
        const { count } = await prisma_1.prisma.eventoSistema.deleteMany(alcance);
        return { borrados: count };
    });
}
