"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = sedeRoutes;
const prisma_1 = require("../prisma");
const capacidades_1 = require("../utils/capacidades");
const ubicacionDeSede_1 = require("../utils/ubicacionDeSede");
const sedePrincipal_1 = require("../utils/sedePrincipal");
// Coordenada válida o null. Una sede sin coordenadas no exige ubicación, que es
// una configuración legítima (oficina sin GPS, o sede recién creada).
function coordenada(v, min, max) {
    const n = Number(v);
    if (v === null || v === '' || v === undefined || !Number.isFinite(n))
        return null;
    return n >= min && n <= max ? n : null;
}
function camposSede(body) {
    const lat = coordenada(body.lat, -90, 90);
    const lng = coordenada(body.lng, -180, 180);
    const radio = Math.min(5000, Math.max(20, Number(body.radio) || 150));
    return {
        direccion: body.direccion?.trim() || null,
        // Las dos coordenadas van juntas o no va ninguna: media coordenada no ubica
        // nada y dejaría una geocerca imposible de cumplir.
        lat: lat !== null && lng !== null ? lat : null,
        lng: lat !== null && lng !== null ? lng : null,
        radio,
    };
}
async function sedeRoutes(app) {
    const auth = { preHandler: [app.requireEmpresa] };
    // `principal` le dice a la pantalla cuál es la Sede principal: la que se le
    // muestra y se le cuenta, por defecto y sin asignársela, a un presencial al que
    // nadie le eligió sede (utils/sedePrincipal.ts, 12 de septiembre de 2026).
    app.get('/', auth, async (request) => {
        const sedes = await prisma_1.prisma.sede.findMany({
            where: { empresaId: request.empresaId, activa: true },
            include: { _count: { select: { colaboradores: true } } },
            orderBy: { nombre: 'asc' },
        });
        const principal = (0, sedePrincipal_1.sedePrincipal)(sedes);
        return sedes.map(s => ({ ...s, principal: s.id === principal }));
    });
    // Ponerle ubicación a una sede, moverla o cambiarle el radio exige el permiso de GPS del plan
    // (15 de septiembre de 2026): una sede con ubicación activa la geocerca en el kiosco. Qué cuenta como
    // cambio lo decide cambiaLaGeocerca, con sus pruebas.
    const SIN_GPS = {
        error: 'Tu plan no incluye la marcación por GPS. Puedes quitarle la ubicación a la sede, pero no ponérsela ni moverla.',
        codigo: 'FUNCION_PLAN', funcion: 'gps',
    };
    app.post('/', auth, async (request, reply) => {
        const body = (request.body ?? {});
        const nombre = body.nombre?.trim();
        if (!nombre)
            return reply.status(400).send({ error: 'El nombre de la sede es obligatorio' });
        const campos = camposSede(body);
        const existentes = await prisma_1.prisma.sede.count({ where: { empresaId: request.empresaId, activa: true } });
        const conGeocerca = (0, ubicacionDeSede_1.cambiaLaGeocerca)(null, campos);
        if (existentes >= 1 || conGeocerca) {
            const cap = await (0, capacidades_1.capacidadesEmpresa)(request.empresaId);
            if (existentes >= 1 && !cap.features.multiSede) {
                return reply.status(403).send({
                    error: 'Tu plan permite una sola sede. Sube a Empresarial para manejar varias.',
                    codigo: 'FUNCION_PLAN', funcion: 'multiSede',
                });
            }
            if (conGeocerca && !cap.features.gps)
                return reply.status(403).send(SIN_GPS);
        }
        const sede = await prisma_1.prisma.sede.create({
            data: { empresaId: request.empresaId, nombre, ...campos },
        });
        return reply.status(201).send(sede);
    });
    app.put('/:id', auth, async (request, reply) => {
        const { id } = request.params;
        const existente = await prisma_1.prisma.sede.findFirst({ where: { id, empresaId: request.empresaId } });
        if (!existente)
            return reply.status(404).send({ error: 'Sede no encontrada' });
        const body = (request.body ?? {});
        const nombre = body.nombre?.trim();
        if (!nombre)
            return reply.status(400).send({ error: 'El nombre de la sede es obligatorio' });
        const campos = camposSede(body);
        if ((0, ubicacionDeSede_1.cambiaLaGeocerca)(existente, campos) && !(await (0, capacidades_1.capacidadesEmpresa)(request.empresaId)).features.gps) {
            return reply.status(403).send(SIN_GPS);
        }
        return prisma_1.prisma.sede.update({ where: { id }, data: { nombre, ...campos } });
    });
    // Se desactiva en vez de borrarse: los registros ya marcados apuntan a ella y
    // el reporte histórico tiene que poder seguir diciendo dónde ocurrió cada
    // marcación. Sí se sueltan los colaboradores, o quedarían asignados a una sede
    // donde ya no pueden marcar.
    //
    // Y la última sede activa no se desactiva (11 de septiembre de 2026): un
    // presencial no debe verse «Sin sede» mientras la empresa tenga alguna, y sin
    // ninguna no quedaría sede por defecto que mostrarle. A quien pierde su sede no
    // se le asigna otra (decisión del dueño del 12 de septiembre de 2026): al leer se
    // le muestra y se le cuenta la suya por defecto (utils/sedePrincipal.ts).
    app.delete('/:id', auth, async (request, reply) => {
        const { id } = request.params;
        const empresaId = request.empresaId;
        const resultado = await prisma_1.prisma.$transaction(async (tx) => {
            // Candado sobre la empresa: dos pestañas desactivando a la vez las dos
            // últimas sedes verían cada una que queda la otra, y la empresa terminaría
            // sin ninguna.
            await tx.$queryRaw `SELECT id FROM empresas WHERE id = ${empresaId} FOR UPDATE`;
            const existente = await tx.sede.findFirst({ where: { id, empresaId }, select: { activa: true } });
            if (!existente)
                return 'NO_EXISTE';
            const otras = await tx.sede.count({ where: { empresaId, activa: true, id: { not: id } } });
            if (existente.activa && otras === 0)
                return 'ES_LA_ULTIMA';
            await tx.colaboradorSede.deleteMany({ where: { sedeId: id } });
            await tx.sede.update({ where: { id }, data: { activa: false } });
            return 'DESACTIVADA';
        }, { timeout: 30000 });
        if (resultado === 'NO_EXISTE')
            return reply.status(404).send({ error: 'Sede no encontrada' });
        if (resultado === 'ES_LA_ULTIMA') {
            return reply.status(400).send({
                error: 'Es la única sede de la empresa, y quien trabaja presencial siempre necesita una. Cámbiale el nombre o la ubicación en vez de eliminarla.',
                codigo: 'ULTIMA_SEDE',
            });
        }
        return { ok: true };
    });
}
