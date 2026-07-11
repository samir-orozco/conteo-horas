"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = configuracionRoutes;
const index_1 = require("../index");
const vigencias_1 = require("../utils/vigencias");
async function configuracionRoutes(app) {
    const auth = { preHandler: [app.requireEmpresa] };
    app.get('/', auth, async (request) => {
        const items = await index_1.prisma.configuracion.findMany({ where: { empresaId: request.empresaId } });
        return items.reduce((acc, item) => { acc[item.clave] = item.valor; return acc; }, {});
    });
    app.put('/', auth, async (request) => {
        const data = request.body;
        const empresaId = request.empresaId;
        await Promise.all(Object.entries(data).map(([clave, valor]) => index_1.prisma.configuracion.upsert({
            where: { empresaId_clave: { empresaId, clave } },
            update: { valor },
            create: { empresaId, clave, valor },
        })));
        return { ok: true };
    });
    // Datos de la empresa (los ve cualquiera de la empresa, solo ADMIN los edita)
    app.get('/empresa', auth, async (request) => {
        return index_1.prisma.empresa.findUnique({
            where: { id: request.empresaId },
            select: { nombre: true, nit: true, email: true, telefono: true },
        });
    });
    app.put('/empresa', auth, async (request, reply) => {
        const payload = request.user;
        if (payload.rol !== 'ADMIN')
            return reply.status(403).send({ error: 'Solo el administrador edita los datos de la empresa' });
        const { nombre, nit, telefono } = request.body;
        if (!nombre || !nit)
            return reply.status(400).send({ error: 'Nombre y NIT son obligatorios' });
        const conflicto = await index_1.prisma.empresa.findFirst({ where: { nit, NOT: { id: request.empresaId } } });
        if (conflicto)
            return reply.status(409).send({ error: 'Ya hay otra empresa registrada con ese NIT' });
        return index_1.prisma.empresa.update({
            where: { id: request.empresaId },
            data: { nombre, nit, telefono },
            select: { nombre: true, nit: true, email: true, telefono: true },
        });
    });
    // Reglas legales vigentes (solo lectura para la empresa; las administra la plataforma)
    app.get('/legales', auth, async (request) => {
        const { fecha } = request.query;
        const ref = fecha ? new Date(fecha) : new Date();
        const [jornadas, tipos] = await Promise.all([
            index_1.prisma.jornadaVigencia.findMany({ orderBy: { vigenteDesde: 'asc' } }),
            index_1.prisma.tipoHora.findMany({ orderBy: [{ codigo: 'asc' }, { vigenteDesde: 'asc' }] }),
        ]);
        const jornada = (0, vigencias_1.jornadaVigente)(ref, jornadas);
        return {
            fechaReferencia: ref,
            jornadaSemanal: jornada,
            horasMes: (0, vigencias_1.horasMesDeJornada)(jornada),
            tiposHoraVigentes: (0, vigencias_1.tiposVigentes)(ref, tipos),
            calendarioJornadas: jornadas,
        };
    });
    // Compat: lista de tipos de hora vigentes hoy
    app.get('/tipos-hora', auth, async () => {
        const tipos = await index_1.prisma.tipoHora.findMany({ orderBy: { codigo: 'asc' } });
        return (0, vigencias_1.tiposVigentes)(new Date(), tipos);
    });
    // Token del link único del kiosco de marcación de la empresa
    app.get('/marcador-link', auth, async (request) => {
        const empresa = await index_1.prisma.empresa.findUnique({
            where: { id: request.empresaId },
            select: { marcadorToken: true, nombre: true },
        });
        const soloDispositivos = await index_1.prisma.configuracion.findUnique({
            where: { empresaId_clave: { empresaId: request.empresaId, clave: 'KIOSCO_SOLO_DISPOSITIVOS' } },
        });
        return { ...empresa, soloDispositivos: soloDispositivos?.valor === '1' };
    });
    // ===== Dispositivos autorizados del kiosco =====
    app.get('/dispositivos', auth, async (request) => {
        return index_1.prisma.dispositivoKiosco.findMany({
            where: { empresaId: request.empresaId },
            orderBy: { creadoEn: 'asc' },
        });
    });
    // Genera un código de vinculación de 6 dígitos (un solo uso, 10 minutos)
    app.post('/dispositivos/codigo', auth, async (request) => {
        const codigo = String(Math.floor(100000 + Math.random() * 900000));
        const valor = JSON.stringify({ codigo, expira: Date.now() + 10 * 60 * 1000 });
        await index_1.prisma.configuracion.upsert({
            where: { empresaId_clave: { empresaId: request.empresaId, clave: 'CODIGO_KIOSCO' } },
            update: { valor },
            create: { empresaId: request.empresaId, clave: 'CODIGO_KIOSCO', valor },
        });
        return { codigo, expiraEnMinutos: 10 };
    });
    app.delete('/dispositivos/:id', auth, async (request, reply) => {
        const { id } = request.params;
        const disp = await index_1.prisma.dispositivoKiosco.findFirst({ where: { id, empresaId: request.empresaId } });
        if (!disp)
            return reply.status(404).send({ error: 'Dispositivo no encontrado' });
        await index_1.prisma.dispositivoKiosco.delete({ where: { id } });
        return { ok: true };
    });
}
