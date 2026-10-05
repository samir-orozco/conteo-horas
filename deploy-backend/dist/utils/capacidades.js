"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.capacidadesEmpresa = capacidadesEmpresa;
exports.tieneFuncion = tieneFuncion;
exports.exigeFuncion = exigeFuncion;
const prisma_1 = require("../prisma");
const planes_1 = require("./planes");
// Capacidades efectivas de una empresa (plan + overrides + acceso ilimitado).
async function capacidadesEmpresa(empresaId) {
    const [empresa, planes] = await Promise.all([
        prisma_1.prisma.empresa.findUnique({ where: { id: empresaId }, include: { suscripcion: true } }),
        (0, planes_1.obtenerPlanes)(prisma_1.prisma),
    ]);
    return (0, planes_1.capacidadesDe)(empresa?.suscripcion, empresa?.exentaPago ?? false, planes);
}
// ¿La empresa tiene activa cierta función según su plan?
async function tieneFuncion(empresaId, feature) {
    const cap = await capacidadesEmpresa(empresaId);
    return !!cap.features[feature];
}
// ────────── LA GUARDA DE UNA FUNCIÓN QUE ES UN MÓDULO ENTERO (30 de septiembre de 2026) ──────────
//
// Las funciones anteriores se bloquean DENTRO del manejador, porque la guarda depende de algo más
// que el plan: `multiHorario` deja crear el primero y rechaza el segundo, `multiSede` igual. Esas no
// se pueden sacar aquí.
//
// Turnos no: ahí no hay cupo que contar. O la empresa tiene el módulo o no lo tiene, y son NUEVE
// rutas repartidas en dos archivos. Escrita nueve veces, la guarda se olvida en la décima —que es
// exactamente lo que el §9.3 dice que pasa con una regla copiada—, y esa décima sería una puerta
// abierta a un módulo que se vende aparte.
//
// POR ESO VA EN EL `preHandler`, pegada a `requireEmpresa` en la misma constante `auth` que ya usan
// todas. Con eso la ruta que se escriba mañana queda cubierta sin que nadie se acuerde.
//
// EL ORDEN IMPORTA Y NO ES CASUAL: `requireEmpresa` corre antes y es quien pone `request.empresaId`.
// Si llega vacío, esta guarda se aparta en silencio en vez de responder, porque la petición ya fue
// rechazada por la de antes y escribir dos respuestas a la misma petición es un error de Fastify.
// Tipada y sin `any`: el tope del linter está congelado en 173 y dos `any` nuevos lo revientan, que
// es exactamente para lo que está (§10). `empresaId` lo declara `types/fastify.d.ts`.
function exigeFuncion(feature) {
    return async function (request, reply) {
        if (!request.empresaId)
            return;
        if (await tieneFuncion(request.empresaId, feature))
            return;
        // El mismo `codigo` y el mismo `funcion` que usan las guardas de dentro de los manejadores: la
        // pantalla los lee para saber que es cosa del plan y no un error, y ofrecer subir de plan.
        return reply.status(403).send({
            error: (0, planes_1.mensajeDeFuncionBloqueada)(feature),
            codigo: 'FUNCION_PLAN',
            funcion: feature,
        });
    };
}
