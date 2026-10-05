"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DIAS_AVISO_ANTES_DE_LA_PAUSA = void 0;
exports.avisoDeSuscripcion = avisoDeSuscripcion;
exports.avisarSuscripcionesDeTodas = avisarSuscripcionesDeTodas;
const prisma_1 = require("../prisma");
const correo_1 = require("./correo");
const suscripcion_1 = require("./suscripcion");
// Los correos al administrador cuando la suscripción vence (4 de octubre de 2026). El único
// aviso era el del panel, que no ve justo quien nunca entra: el que deja marcando el kiosco
// sin pagar. Decisión del dueño: un correo cuando vence y otro tres días antes de que el
// kiosco se pause. Cada aviso queda también en la campana, y es esa fila la que impide
// mandarlo dos veces: la pasada corre al arrancar y a diario, y tiene que ser idempotente.
const DIA_MS = 24 * 60 * 60 * 1000;
exports.DIAS_AVISO_ANTES_DE_LA_PAUSA = 3;
// Qué aviso le toca hoy a una suscripción, o ninguno. Decide solo con fechas; lo que ya se
// mandó lo filtra quien llama, con la clave.
function avisoDeSuscripcion(s, ahora = new Date()) {
    if (s.estado === 'CANCELADA')
        return null;
    const vence = s.pagadoHasta ?? s.finPrueba;
    if (ahora <= vence)
        return null;
    const pausa = (0, suscripcion_1.pausaDelKiosco)(s);
    if (ahora >= pausa)
        return null;
    const datos = { vence, pausa, eraPrueba: !s.pagadoHasta };
    if (ahora.getTime() >= pausa.getTime() - exports.DIAS_AVISO_ANTES_DE_LA_PAUSA * DIA_MS) {
        return { tipo: 'KIOSCO_POR_PAUSARSE', clave: `${s.id}:pausa:${pausa.getTime()}`, ...datos };
    }
    if (ahora.getTime() <= vence.getTime() + suscripcion_1.DIAS_GRACIA_MORA * DIA_MS) {
        return { tipo: 'SUSCRIPCION_VENCIDA', clave: `${s.id}:vence:${vence.getTime()}`, ...datos };
    }
    return null;
}
const fecha = (d) => d.toLocaleDateString('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'long', year: 'numeric' });
// El último día que cubre algo que vence a medianoche: el día anterior.
const ultimoDia = (d) => fecha(new Date(d.getTime() - 1));
const escapar = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const parrafo = (html) => `<p style="font-size:14px;color:#303030;line-height:1.5;margin:0 0 12px">${html}</p>`;
function correoDelAviso(a, empresa, enlace) {
    const nombre = `<b>${escapar(empresa)}</b>`;
    const boton = `<p style="margin:24px 0 0"><a href="${enlace}" style="display:inline-block;background:#FFD85E;color:#303030;font-weight:700;text-decoration:none;padding:12px 20px;border-radius:12px">Pagar la suscripción</a></p>`;
    if (a.tipo === 'SUSCRIPCION_VENCIDA') {
        const titulo = a.eraPrueba ? 'Terminó tu prueba gratis' : 'Tu suscripción venció';
        const que = a.eraPrueba
            ? `La prueba gratis de ${nombre} en HoraPro terminó el ${fecha(a.vence)}.`
            : `El último pago de ${nombre} cubrió hasta el ${ultimoDia(a.vence)}.`;
        return {
            asunto: `${titulo} · ${empresa}`,
            titulo,
            cuerpo: `El kiosco sigue marcando hasta el ${ultimoDia(a.pausa)}.`,
            html: (0, correo_1.plantillaCorreo)(titulo, parrafo(`${que} Para seguir usando el panel, registra el pago del mes.`)
                + parrafo(`Tus colaboradores pueden seguir marcando en el kiosco hasta el <b>${ultimoDia(a.pausa)}</b>. Desde el ${fecha(a.pausa)}, el kiosco se pausa hasta que se registre el pago.`)
                + boton),
        };
    }
    const titulo = `El kiosco se pausa el ${fecha(a.pausa)}`;
    return {
        asunto: `${titulo} · ${empresa}`,
        titulo,
        cuerpo: 'Registra el pago para que tus colaboradores sigan marcando.',
        // La fecha y no «en 3 días»: al desplegar, o si una pasada se pierde, sale más tarde.
        html: (0, correo_1.plantillaCorreo)(titulo, parrafo(`Desde el <b>${fecha(a.pausa)}</b>, tus colaboradores no podrán marcar en el kiosco de ${nombre} hasta que se registre el pago de la suscripción. Lo que ya marcaron se conserva.`)
            + boton),
    };
}
// A quién se le escribe: a los administradores activos, que son los que pueden pagar desde
// el panel. Si no queda ninguno, al correo con el que se registró la empresa.
function destinatarios(e) {
    const admins = [...new Set(e.usuarios.map(u => u.email.trim().toLowerCase()).filter(Boolean))];
    return admins.length ? admins : [e.email];
}
// La pasada diaria. Una empresa que falla no deja sin aviso a las demás, y la pasada deja
// huella en el log siempre, también cuando no hubo nada que avisar (sección 8.3). Si falla la
// consulta inicial, el error sube a correrRonda, que lo registra como ronda perdida.
async function avisarSuscripcionesDeTodas(log, ahora = new Date(), db = prisma_1.prisma) {
    const filas = await db.suscripcion.findMany({
        where: { empresa: { activa: true, exentaPago: false } },
        include: {
            empresa: {
                select: { id: true, nombre: true, email: true, usuarios: { where: { rol: 'ADMIN', activo: true }, select: { email: true } } },
            },
        },
    });
    const enlace = `${process.env.FRONTEND_ORIGIN?.split(',')[0] ?? 'http://localhost:5173'}/app/suscripcion`;
    let enviados = 0;
    for (const s of filas) {
        const aviso = avisoDeSuscripcion(s, ahora);
        if (!aviso)
            continue;
        try {
            const yaMandado = await db.notificacion.findFirst({
                where: { empresaId: s.empresa.id, tipo: aviso.tipo, entidad: 'suscripcion', entidadId: aviso.clave },
                select: { id: true },
            });
            if (yaMandado)
                continue;
            const correo = correoDelAviso(aviso, s.empresa.nombre, enlace);
            for (const para of destinatarios(s.empresa)) {
                await (0, correo_1.enviarCorreo)({ para, asunto: correo.asunto, html: correo.html });
            }
            // Se anota después de mandarlo: si el correo falla, la próxima pasada lo reintenta.
            await db.notificacion.create({
                data: { empresaId: s.empresa.id, tipo: aviso.tipo, titulo: correo.titulo, cuerpo: correo.cuerpo, entidad: 'suscripcion', entidadId: aviso.clave },
            });
            enviados++;
        }
        catch (err) {
            log?.error(err, `Avisos de suscripción: falló la empresa ${s.empresa.id}`);
        }
    }
    log?.info(`Avisos de suscripción: ${enviados} enviados de ${filas.length} revisadas`);
    return enviados;
}
