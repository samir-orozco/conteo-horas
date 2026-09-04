"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NOTIF_POR_ALERTA = void 0;
exports.default = contratoRoutes;
exports.avisarContratos = avisarContratos;
exports.avisarContratosDeTodas = avisarContratosDeTodas;
// Desde '../prisma' y no desde '../index': importar index arranca el servidor,
// y \`avisarContratos\` tiene que poder usarse desde un script sin levantar nada.
const prisma_1 = require("../prisma");
const notificaciones_1 = require("../utils/notificaciones");
const contratos_1 = require("../utils/contratos");
const fechas_1 = require("../utils/fechas");
const documentos_1 = require("../utils/documentos");
// Las fechas llegan del formulario como "YYYY-MM-DD" y se anclan a medianoche de
// BOGOTÁ, no de UTC. `new Date("2026-04-01")` son las 00:00 UTC, que en Colombia
// es el 31 de marzo a las 7 p.m.: el contrato se guardaba y se mostraba un día
// antes de lo que la persona escribió. Es la misma convención con la que el
// kiosco guarda las marcaciones.
const fechaBogota = (v) => typeof v === 'string' && v.length >= 10 ? (0, fechas_1.medianocheBogota)(v) : null;
const TIPOS = new Set(['INDEFINIDO', 'FIJO', 'OBRA_LABOR', 'APRENDIZAJE']);
// Lista blanca de lo que la empresa puede escribir. Evita que llegue basura a
// Prisma o que alguien intente escribir `convertidoAIndefinidoEn` desde el
// navegador, que solo se toca con su propia ruta.
function limpiar(data, esNuevo) {
    const out = {};
    if (esNuevo)
        out.colaboradorId = data.colaboradorId;
    if (data.tipo !== undefined && TIPOS.has(data.tipo))
        out.tipo = data.tipo;
    if (data.fechaInicio !== undefined)
        out.fechaInicio = fechaBogota(data.fechaInicio);
    if (data.fechaFin !== undefined)
        out.fechaFin = fechaBogota(data.fechaFin);
    if (data.fechaInicioPractica !== undefined) {
        out.fechaInicioPractica = fechaBogota(data.fechaInicioPractica);
    }
    if (data.estado === 'VIGENTE' || data.estado === 'TERMINADO')
        out.estado = data.estado;
    if (data.observacion !== undefined)
        out.observacion = data.observacion || null;
    const cambio = (0, documentos_1.cambioDeDocumento)(data.documento, data.documentoNombre);
    if (cambio.accion === 'rechazar')
        return { ok: false, motivo: cambio.motivo };
    if (cambio.accion === 'quitar') {
        out.documento = null;
        out.documentoTipo = null;
        out.documentoNombre = null;
    }
    else if (cambio.accion === 'guardar') {
        out.documento = cambio.documento;
        out.documentoTipo = cambio.tipo;
        out.documentoNombre = cambio.nombre;
    }
    return { ok: true, datos: out };
}
// El listado NO trae el documento (base64 pesado): solo si existe y cómo se
// llama. El archivo se pide aparte, cuando alguien lo abre.
const SIN_DOCUMENTO = {
    id: true, colaboradorId: true, tipo: true, fechaInicio: true, fechaFin: true,
    fechaInicioPractica: true, estado: true, convertidoAIndefinidoEn: true,
    observacion: true, documentoTipo: true, documentoNombre: true, creadoEn: true,
    prorrogas: {
        select: { id: true, desde: true, hasta: true, documentoTipo: true, documentoNombre: true },
        orderBy: { desde: 'asc' },
    },
};
// Adjunta a cada contrato lo que calcula el motor: cuándo vence de verdad,
// cuándo se acaba el plazo para avisar, si la próxima prórroga ya debe ser de un
// año, y cuándo se convierte en indefinido.
function conEstado(c, hoy) {
    const base = {
        tipo: c.tipo,
        fechaInicio: c.fechaInicio,
        fechaFin: c.fechaFin,
        fechaInicioPractica: c.fechaInicioPractica,
    };
    const prorrogas = c.prorrogas.map(p => ({ desde: p.desde, hasta: p.hasta }));
    return { ...c, calculo: (0, contratos_1.estadoDelContrato)(base, prorrogas, hoy) };
}
const deLaEmpresa = (empresaId) => ({ colaborador: { empresaId } });
async function contratoRoutes(app) {
    const auth = { preHandler: [app.requireEmpresa] };
    // Contratos de un colaborador, del más reciente al más viejo.
    app.get('/colaborador/:colaboradorId', auth, async (request) => {
        const { colaboradorId } = request.params;
        const lista = await prisma_1.prisma.contrato.findMany({
            where: { colaboradorId, ...deLaEmpresa(request.empresaId) },
            select: SIN_DOCUMENTO,
            orderBy: { fechaInicio: 'desc' },
        });
        const hoy = new Date();
        return lista.map(c => conEstado(c, hoy));
    });
    // Contratos de la empresa que tienen algo que avisar. Alimenta la campana y el
    // aviso por Telegram, y sirve de tablero para Recursos Humanos.
    app.get('/alertas', auth, async (request) => {
        const lista = await prisma_1.prisma.contrato.findMany({
            where: { estado: 'VIGENTE', ...deLaEmpresa(request.empresaId) },
            select: {
                ...SIN_DOCUMENTO,
                colaborador: { select: { id: true, nombre: true, apellido: true, cargo: true } },
            },
        });
        const hoy = new Date();
        return lista
            .map(c => conEstado(c, hoy))
            .filter(c => c.calculo.alertas.length > 0)
            .sort((a, b) => (a.calculo.diasParaVencer ?? 9e9) - (b.calculo.diasParaVencer ?? 9e9));
    });
    // El documento firmado, aparte del listado por su peso.
    app.get('/:id/documento', auth, async (request, reply) => {
        const { id } = request.params;
        const c = await prisma_1.prisma.contrato.findFirst({
            where: { id, ...deLaEmpresa(request.empresaId) },
            select: { documento: true, documentoTipo: true, documentoNombre: true },
        });
        if (!c)
            return reply.status(404).send({ error: 'Contrato no encontrado' });
        return c;
    });
    app.get('/prorrogas/:id/documento', auth, async (request, reply) => {
        const { id } = request.params;
        const p = await prisma_1.prisma.prorrogaContrato.findFirst({
            where: { id, contrato: { colaborador: { empresaId: request.empresaId } } },
            select: { documento: true, documentoTipo: true, documentoNombre: true },
        });
        if (!p)
            return reply.status(404).send({ error: 'Prórroga no encontrada' });
        return p;
    });
    app.post('/', auth, async (request, reply) => {
        const body = request.body;
        const col = await prisma_1.prisma.colaborador.findFirst({
            where: { id: body.colaboradorId, empresaId: request.empresaId }, select: { id: true },
        });
        if (!col)
            return reply.status(404).send({ error: 'Colaborador no encontrado' });
        const limpio = limpiar(body, true);
        if (!limpio.ok)
            return reply.status(400).send({ error: limpio.motivo });
        const datos = limpio.datos;
        if (!datos.tipo)
            return reply.status(400).send({ error: 'Falta el tipo de contrato.' });
        if (!datos.fechaInicio)
            return reply.status(400).send({ error: 'Falta la fecha de inicio.' });
        if ((datos.tipo === 'FIJO' || datos.tipo === 'APRENDIZAJE') && !datos.fechaFin) {
            return reply.status(400).send({ error: 'Un contrato a término fijo necesita fecha de terminación.' });
        }
        // Indefinido y obra o labor no terminan en una fecha: si viene una, se ignora
        // para que no aparezcan vencimientos inventados.
        if (datos.tipo === 'INDEFINIDO' || datos.tipo === 'OBRA_LABOR')
            datos.fechaFin = null;
        // Un colaborador puede tener historia, pero un solo contrato vigente. El
        // anterior se cierra solo, para que no queden dos activos contradiciéndose.
        if ((datos.estado ?? 'VIGENTE') === 'VIGENTE') {
            await prisma_1.prisma.contrato.updateMany({
                where: { colaboradorId: col.id, estado: 'VIGENTE' }, data: { estado: 'TERMINADO' },
            });
        }
        const creado = await prisma_1.prisma.contrato.create({ data: datos, select: SIN_DOCUMENTO });
        // Se avisa en el acto y no se espera al barrido diario: un contrato que se
        // registra hoy puede estar ya pasado del plazo de preaviso. No se espera el
        // resultado ni se deja que falle: un aviso no puede tumbar el alta.
        avisarContratos(request.empresaId).catch(err => app.log.error(err, 'No se pudieron generar los avisos del contrato nuevo'));
        return reply.status(201).send(conEstado(creado, new Date()));
    });
    app.put('/:id', auth, async (request, reply) => {
        const { id } = request.params;
        const existe = await prisma_1.prisma.contrato.findFirst({
            where: { id, ...deLaEmpresa(request.empresaId) }, select: { id: true, colaboradorId: true },
        });
        if (!existe)
            return reply.status(404).send({ error: 'Contrato no encontrado' });
        const limpio = limpiar(request.body, false);
        if (!limpio.ok)
            return reply.status(400).send({ error: limpio.motivo });
        const datos = limpio.datos;
        if (datos.estado === 'VIGENTE') {
            await prisma_1.prisma.contrato.updateMany({
                where: { colaboradorId: existe.colaboradorId, estado: 'VIGENTE', id: { not: id } },
                data: { estado: 'TERMINADO' },
            });
        }
        const act = await prisma_1.prisma.contrato.update({ where: { id }, data: datos, select: SIN_DOCUMENTO });
        return conEstado(act, new Date());
    });
    app.delete('/:id', auth, async (request, reply) => {
        const { id } = request.params;
        const existe = await prisma_1.prisma.contrato.findFirst({
            where: { id, ...deLaEmpresa(request.empresaId) }, select: { id: true },
        });
        if (!existe)
            return reply.status(404).send({ error: 'Contrato no encontrado' });
        // Las prórrogas se van con él (ON DELETE CASCADE): son parte del contrato,
        // no registros independientes.
        return prisma_1.prisma.contrato.delete({ where: { id } });
    });
    // Confirmar la conversión a indefinido. No la hace el sistema solo: al agotar
    // el tope de cuatro años el contrato pasa a indefinido por ley, pero que un
    // software le cambie el tipo de contrato a alguien sin que nadie lo apruebe es
    // demasiado. Aquí queda la fecha y quién la confirmó.
    app.post('/:id/convertir-indefinido', auth, async (request, reply) => {
        const { id } = request.params;
        const c = await prisma_1.prisma.contrato.findFirst({
            where: { id, ...deLaEmpresa(request.empresaId) }, select: { id: true, convertidoAIndefinidoEn: true },
        });
        if (!c)
            return reply.status(404).send({ error: 'Contrato no encontrado' });
        if (c.convertidoAIndefinidoEn)
            return reply.status(409).send({ error: 'Este contrato ya estaba marcado como indefinido.' });
        const act = await prisma_1.prisma.contrato.update({
            where: { id }, data: { convertidoAIndefinidoEn: new Date(), fechaFin: null }, select: SIN_DOCUMENTO,
        });
        return conEstado(act, new Date());
    });
    // ===== Prórrogas =====
    app.post('/:id/prorrogas', auth, async (request, reply) => {
        const { id } = request.params;
        const body = request.body;
        const c = await prisma_1.prisma.contrato.findFirst({
            where: { id, ...deLaEmpresa(request.empresaId) },
            select: { id: true, tipo: true },
        });
        if (!c)
            return reply.status(404).send({ error: 'Contrato no encontrado' });
        if (c.tipo === 'INDEFINIDO' || c.tipo === 'OBRA_LABOR') {
            return reply.status(400).send({ error: 'Este tipo de contrato no se prorroga.' });
        }
        if (!body.desde || !body.hasta)
            return reply.status(400).send({ error: 'La prórroga necesita fecha de inicio y de fin.' });
        const datos = { contratoId: id, desde: fechaBogota(body.desde), hasta: fechaBogota(body.hasta) };
        const adjunto = (0, documentos_1.cambioDeDocumento)(body.documento, body.documentoNombre);
        if (adjunto.accion === 'rechazar')
            return reply.status(400).send({ error: adjunto.motivo });
        if (adjunto.accion === 'guardar') {
            datos.documento = adjunto.documento;
            datos.documentoTipo = adjunto.tipo;
            datos.documentoNombre = adjunto.nombre;
        }
        // Se registra aunque el motor la marque como irregular: la pantalla avisa
        // fuerte, pero no bloquea. Hay excepciones y casos que el sistema no conoce,
        // y quien maneja la nómina sabe lo que firma.
        await prisma_1.prisma.prorrogaContrato.create({ data: datos });
        avisarContratos(request.empresaId).catch(err => app.log.error(err, 'No se pudieron generar los avisos tras la prórroga'));
        const act = await prisma_1.prisma.contrato.findUnique({ where: { id }, select: SIN_DOCUMENTO });
        return reply.status(201).send(conEstado(act, new Date()));
    });
    app.delete('/prorrogas/:id', auth, async (request, reply) => {
        const { id } = request.params;
        const p = await prisma_1.prisma.prorrogaContrato.findFirst({
            where: { id, contrato: { colaborador: { empresaId: request.empresaId } } }, select: { id: true },
        });
        if (!p)
            return reply.status(404).send({ error: 'Prórroga no encontrada' });
        return prisma_1.prisma.prorrogaContrato.delete({ where: { id } });
    });
}
// Convierte las alertas del motor en notificaciones para la campana. Se llama
// desde el dashboard, que es lo que se abre todos los días: este proyecto no
// tiene cron, y para un aviso con 30 días de margen alcanza de sobra.
const TITULOS = {
    PREAVISO_VENCIDO: n => `Se venció el plazo para avisar: ${n}`,
    PREAVISO_PROXIMO: n => `Contrato por vencer: ${n}`,
    SE_VUELVE_INDEFINIDO: n => `Pasa a indefinido: ${n}`,
    SUPERA_TOPE: n => `Contrato pasado del tope legal: ${n}`,
    CAMBIO_ETAPA_APRENDIZ: n => `Cambio de etapa de aprendiz: ${n}`,
};
const CUERPOS = {
    PREAVISO_VENCIDO: () => 'Nadie avisó a tiempo, así que el contrato se prorroga solo por un término igual. Revísalo con tu abogado si la intención era terminarlo.',
    PREAVISO_PROXIMO: d => `Quedan ${d} días para avisar por escrito si no se va a renovar. Pasado ese plazo se prorroga automáticamente.`,
    SE_VUELVE_INDEFINIDO: d => `En ${d} días se agota el tope de cuatro años y el contrato pasa a indefinido por ley.`,
    SUPERA_TOPE: () => 'La vigencia de este contrato supera el tope de cuatro años de la Ley 2466 de 2025.',
    CAMBIO_ETAPA_APRENDIZ: d => `En ${d} días pasa a etapa práctica y la remuneración sube del 75% al 100% del salario mínimo.`,
};
exports.NOTIF_POR_ALERTA = {
    PREAVISO_PROXIMO: 'CONTRATO_PREAVISO',
    PREAVISO_VENCIDO: 'CONTRATO_PREAVISO_VENCIDO',
    SE_VUELVE_INDEFINIDO: 'CONTRATO_A_INDEFINIDO',
    SUPERA_TOPE: 'CONTRATO_A_INDEFINIDO',
    CAMBIO_ETAPA_APRENDIZ: 'CONTRATO_ETAPA_APRENDIZ',
};
async function avisarContratos(empresaId) {
    const contratos = await prisma_1.prisma.contrato.findMany({
        where: { estado: 'VIGENTE', colaborador: { empresaId } },
        select: {
            id: true, tipo: true, fechaInicio: true, fechaFin: true, fechaInicioPractica: true,
            colaborador: { select: { id: true, nombre: true, apellido: true } },
            prorrogas: { select: { desde: true, hasta: true } },
        },
    });
    const hoy = new Date();
    for (const c of contratos) {
        const { alertas } = (0, contratos_1.estadoDelContrato)({ tipo: c.tipo, fechaInicio: c.fechaInicio, fechaFin: c.fechaFin, fechaInicioPractica: c.fechaInicioPractica }, c.prorrogas, hoy);
        const nombre = `${c.colaborador.nombre} ${c.colaborador.apellido}`;
        for (const a of alertas) {
            const tipo = exports.NOTIF_POR_ALERTA[a.tipo];
            if (!tipo || !TITULOS[a.tipo])
                continue;
            // Sin repetir: una notificación por contrato y por tipo de alerta. Si no,
            // cada vez que alguien abre el tablero le llega el mismo aviso otra vez.
            const yaExiste = await prisma_1.prisma.notificacion.findFirst({
                where: { empresaId, tipo, entidad: 'colaborador', entidadId: c.colaborador.id, titulo: TITULOS[a.tipo](nombre) },
                select: { id: true },
            });
            if (yaExiste)
                continue;
            await (0, notificaciones_1.notificar)(empresaId, {
                tipo, titulo: TITULOS[a.tipo](nombre), cuerpo: CUERPOS[a.tipo](a.dias),
                entidad: 'colaborador', entidadId: c.colaborador.id,
            });
        }
    }
}
// Recorre todas las empresas activas y genera los avisos que correspondan.
//
// Existe porque `avisarContratos` colgaba únicamente del tablero: si nadie
// entraba, nadie avisaba. Una empresa que no abriera HoraPro durante cuarenta
// días se quedaba sin el aviso de preaviso y el contrato se prorrogaba solo por
// un término igual, que es exactamente lo que este módulo existe para evitar.
// La promesa de la pantalla ("avisamos 30 días antes") no la sostenía nada.
//
// Un fallo en una empresa no puede dejar sin avisar a las demás, así que cada
// una va en su propio try. Es idempotente: `avisarContratos` no repite una
// notificación que ya exista, así que correr de más no molesta a nadie.
async function avisarContratosDeTodas(log) {
    try {
        const empresas = await prisma_1.prisma.empresa.findMany({
            where: { activa: true }, select: { id: true },
        });
        let ok = 0;
        for (const e of empresas) {
            try {
                await avisarContratos(e.id);
                ok++;
            }
            catch (err) {
                log?.error(err, `Avisos de contratos: falló la empresa ${e.id}`);
            }
        }
        log?.info(`Avisos de contratos revisados en ${ok}/${empresas.length} empresas`);
        return ok;
    }
    catch (err) {
        log?.error(err, 'No se pudieron recorrer las empresas para los avisos de contratos');
        return 0;
    }
}
