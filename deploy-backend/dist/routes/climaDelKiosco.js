"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = climaDelKioscoRoutes;
const prisma_1 = require("../prisma");
const clima_1 = require("../utils/clima");
const climaDelKiosco_1 = require("../utils/climaDelKiosco");
const cifradoConfidencial_1 = require("../utils/cifradoConfidencial");
// LA VENTANA DE LAS CARITAS DEL KIOSCO (4 de octubre de 2026). docs/CLIMA_LABORAL.md §3.
//
// Vive bajo /api/worker/ A PROPÓSITO: la auditoría del sistema excluye ese prefijo
// (utils/auditoriaDePeticion.ts), y si no lo excluyera guardaría el cuerpo de cada petición en el
// registro, con el texto de la observación confidencial al lado del token de quien la escribió.
// Una observación confidencial por salida. Se lleva en memoria y no en la base: guardar en la base que
// tal persona ya mandó una sería justo el dato que la confidencialidad esconde. Los tokens duran 15
// minutos, y un reinicio del servidor a lo sumo deja mandar una segunda dentro de ese rato.
const confidencialesEnviadas = new Map();
const QUINCE_MIN_MS = 15 * 60 * 1000;
function tokenDeLaSalida(request) {
    const t = request.user;
    if (t?.rol !== climaDelKiosco_1.ROL_CLIMA || !t.id || !t.empresaId || !t.fecha || !t.jti)
        return null;
    return t;
}
async function climaDelKioscoRoutes(app) {
    // La carita y los motivos. Se manda cada vez que la persona toca algo: la carita se guarda en el
    // momento en que se toca, y si se va sin terminar, lo que alcanzó a escoger ya quedó.
    app.put('/', { preHandler: [app.authenticate] }, async (request, reply) => {
        const t = tokenDeLaSalida(request);
        if (!t)
            return reply.code(403).send({ error: 'No autorizado' });
        const c = (0, clima_1.leerCalificacion)(request.body, await (0, climaDelKiosco_1.motivosDeEmpresa)(t.empresaId));
        if (!c.ok)
            return reply.code(400).send({ error: c.error });
        const fecha = new Date(t.fecha);
        await prisma_1.prisma.calificacionClima.upsert({
            where: { colaboradorId_fecha: { colaboradorId: t.id, fecha } },
            create: { empresaId: t.empresaId, colaboradorId: t.id, fecha, carita: c.carita, motivos: c.motivos },
            update: { carita: c.carita, motivos: c.motivos },
        });
        return { ok: true };
    });
    app.post('/observacion', { preHandler: [app.authenticate] }, async (request, reply) => {
        const t = tokenDeLaSalida(request);
        if (!t)
            return reply.code(403).send({ error: 'No autorizado' });
        const o = (0, clima_1.leerObservacion)(request.body);
        if (!o.ok)
            return reply.code(400).send({ error: o.error });
        if (!o.confidencial) {
            const r = await prisma_1.prisma.calificacionClima.updateMany({
                where: { colaboradorId: t.id, fecha: new Date(t.fecha) },
                data: { observacion: o.texto },
            });
            if (r.count === 0)
                return reply.code(409).send({ error: 'Primero escoge cómo te fue hoy.' });
            return { ok: true };
        }
        const ahora = Date.now();
        for (const [jti, vence] of confidencialesEnviadas)
            if (vence < ahora)
                confidencialesEnviadas.delete(jti);
        if (confidencialesEnviadas.has(t.jti))
            return reply.code(409).send({ error: 'Ya enviaste tu observación.', codigo: 'YA_ENVIADA' });
        // SE RESERVA ANTES DE GUARDAR, no después: mientras la base responde, el servidor atiende otras
        // peticiones, y dos envíos simultáneos con la misma salida pasaban los dos. Si algo falla, la
        // reserva se suelta para que la persona pueda reintentar.
        confidencialesEnviadas.set(t.jti, ahora + QUINCE_MIN_MS);
        // Sin clave no hay cómo guardar el autor, y guardar la nota sin él rompería lo que se le prometió a
        // la empresa (poder entregarlo por orden de autoridad). Se para con un código propio, para que la
        // falta de configuración no se confunda con una caída (CLAUDE.md §8.3).
        const clave = (0, cifradoConfidencial_1.leerClave)(process.env.CLAVE_CONFIDENCIAL);
        if (!clave) {
            confidencialesEnviadas.delete(t.jti);
            app.log.error('Clima laboral: falta CLAVE_CONFIDENCIAL en el .env; no se guardó una observación confidencial');
            return reply.code(503).send({ codigo: 'SIN_CLAVE', error: 'No pudimos enviar tu observación. Inténtalo más tarde.' });
        }
        try {
            const momento = new Date(ahora);
            await prisma_1.prisma.observacionConfidencial.create({
                data: {
                    empresaId: t.empresaId,
                    semana: (0, clima_1.semanaDe)(momento),
                    visibleDesde: (0, clima_1.visibleDesde)(momento),
                    texto: o.texto,
                    autorCifrado: (0, cifradoConfidencial_1.cifrar)(t.id, clave),
                },
            });
        }
        catch (err) {
            confidencialesEnviadas.delete(t.jti);
            // EL ERROR NO SIGUE AL MANEJADOR GLOBAL NI SE ESCRIBE ENTERO. Prisma mete los datos de la consulta
            // en el mensaje del error, y el manejador global guarda el error en el registro del sistema: el
            // texto confidencial quedaría allí, al lado de quién lo mandó. Solo se anota el código.
            const codigo = err?.code;
            app.log.error({ codigo: typeof codigo === 'string' ? codigo : 'desconocido' }, 'Clima laboral: no se pudo guardar una observación confidencial');
            return reply.code(500).send({ error: 'No pudimos enviar tu observación. Inténtalo otra vez.' });
        }
        return { ok: true };
    });
}
