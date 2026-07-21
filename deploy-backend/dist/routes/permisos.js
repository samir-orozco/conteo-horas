"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = permisoRoutes;
const index_1 = require("../index");
const capacidades_1 = require("../utils/capacidades");
// Evidencia: imagen o PDF en base64 data URI, con tope de tamaño (~4 MB de texto).
const MAX_EVIDENCIA = 4200000;
function evidenciaValida(v) {
    return typeof v === 'string' && /^data:(image\/(jpeg|png|webp)|application\/pdf);base64,/.test(v) && v.length < MAX_EVIDENCIA;
}
// Campos que la empresa puede enviar (evita pasar basura a Prisma)
function limpiarPermiso(data, esNuevo) {
    const out = {};
    if (esNuevo)
        out.colaboradorId = data.colaboradorId;
    if (data.tipo !== undefined)
        out.tipo = data.tipo;
    if (data.descripcion !== undefined)
        out.descripcion = data.descripcion || null;
    if (data.fechaInicio !== undefined)
        out.fechaInicio = data.fechaInicio;
    if (data.fechaFin !== undefined)
        out.fechaFin = data.fechaFin;
    if (data.aprobado !== undefined)
        out.aprobado = data.aprobado;
    // Evidencia: null = quitar; string válido = guardar; undefined = no tocar
    if (data.evidencia === null) {
        out.evidencia = null;
        out.evidenciaTipo = null;
        out.evidenciaNombre = null;
    }
    else if (evidenciaValida(data.evidencia)) {
        out.evidencia = data.evidencia;
        out.evidenciaTipo = data.evidencia.slice(5, data.evidencia.indexOf(';'));
        out.evidenciaNombre = typeof data.evidenciaNombre === 'string' ? data.evidenciaNombre.slice(0, 120) : null;
    }
    return out;
}
// El listado NO trae la evidencia (base64 pesado); solo el tipo/nombre para saber que existe.
const SELECT_LISTA = {
    id: true, colaboradorId: true, fechaInicio: true, fechaFin: true, tipo: true,
    descripcion: true, aprobado: true, creadoEn: true, evidenciaTipo: true, evidenciaNombre: true,
    colaborador: true,
};
async function permisoRoutes(app) {
    const auth = { preHandler: [app.requireEmpresa] };
    app.get('/', auth, async (request) => {
        const { colaboradorId } = request.query;
        const where = { colaborador: { empresaId: request.empresaId } };
        if (colaboradorId)
            where.colaboradorId = colaboradorId;
        return index_1.prisma.permiso.findMany({
            where,
            select: SELECT_LISTA,
            orderBy: { fechaInicio: 'desc' },
        });
    });
    // Evidencia de una novedad (se pide aparte para no cargarla en cada listado)
    app.get('/:id/evidencia', auth, async (request, reply) => {
        const { id } = request.params;
        const permiso = await index_1.prisma.permiso.findFirst({
            where: { id, colaborador: { empresaId: request.empresaId } },
            select: { evidencia: true, evidenciaTipo: true, evidenciaNombre: true },
        });
        if (!permiso || !permiso.evidencia)
            return reply.status(404).send({ error: 'Sin evidencia' });
        return permiso;
    });
    app.post('/', auth, async (request, reply) => {
        const data = request.body;
        const col = await index_1.prisma.colaborador.findFirst({
            where: { id: data.colaboradorId, empresaId: request.empresaId },
        });
        if (!col)
            return reply.status(404).send({ error: 'Colaborador no encontrado' });
        if (evidenciaValida(data.evidencia)) {
            const cap = await (0, capacidades_1.capacidadesEmpresa)(request.empresaId);
            if (!cap.features.evidencia)
                return reply.status(403).send({ error: 'Adjuntar evidencia está disponible en el plan Profesional.', codigo: 'FUNCION_PLAN', funcion: 'evidencia' });
        }
        const permiso = await index_1.prisma.permiso.create({ data: limpiarPermiso(data, true) });
        return reply.status(201).send(permiso);
    });
    app.put('/:id', auth, async (request, reply) => {
        const { id } = request.params;
        const existente = await index_1.prisma.permiso.findFirst({
            where: { id, colaborador: { empresaId: request.empresaId } },
        });
        if (!existente)
            return reply.status(404).send({ error: 'Permiso no encontrado' });
        const data = request.body;
        return index_1.prisma.permiso.update({ where: { id }, data: limpiarPermiso(data, false) });
    });
    app.delete('/:id', auth, async (request, reply) => {
        const { id } = request.params;
        const existente = await index_1.prisma.permiso.findFirst({
            where: { id, colaborador: { empresaId: request.empresaId } },
        });
        if (!existente)
            return reply.status(404).send({ error: 'Permiso no encontrado' });
        return index_1.prisma.permiso.delete({ where: { id } });
    });
}
