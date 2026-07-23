"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificar = notificar;
const index_1 = require("../index");
// Crea una notificación para el admin. Es "fire-and-forget": nunca debe romper
// el flujo que la dispara (marcar, reportar novedad, auto-cierre), así que
// cualquier error se traga en silencio.
async function notificar(empresaId, n) {
    try {
        await index_1.prisma.notificacion.create({
            data: {
                empresaId,
                tipo: n.tipo,
                titulo: n.titulo,
                cuerpo: n.cuerpo ?? null,
                entidad: n.entidad ?? null,
                entidadId: n.entidadId ?? null,
            },
        });
    }
    catch {
        /* una notificación fallida no debe afectar la operación principal */
    }
}
