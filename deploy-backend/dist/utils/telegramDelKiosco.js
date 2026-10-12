"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLAVE_NOVEDADES = void 0;
exports.mensajesDelKiosco = mensajesDelKiosco;
const correo_1 = require("./correo");
const noHaLlegado_1 = require("./noHaLlegado");
// QUÉ LE MANDA EL KIOSCO AL GRUPO DE TELEGRAM AL MARCAR (12 de octubre de 2026).
//
// Dos avisos, cada uno con su interruptor: la llegada tarde (TELEGRAM_ALERTAS_TARDE, el de siempre)
// y la novedad por aprobar (TELEGRAM_NOVEDADES). Decisiones del dueño:
// - La novedad NO dice el tipo ni el motivo: varios son datos de salud (incapacidad, cita médica,
//   licencia) y el chat suele ser un grupo donde no todos son administradores. Se ven en la app.
// - Quien llega tarde y deja el motivo genera UN solo mensaje con las dos cosas.
//
// El mensaje de llegada tarde vivía armado dentro de routes/worker.ts; salió aquí para poder probar
// el caso combinado, y de paso escapa el nombre, que antes iba crudo en un mensaje HTML.
exports.CLAVE_NOVEDADES = 'TELEGRAM_NOVEDADES';
const cuantoTarde = (m) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}min` : `${m} min`);
function mensajesDelKiosco(a) {
    const nombre = `<b>${(0, correo_1.escapar)(a.nombre)}</b>`;
    const revisar = `<a href="${(0, correo_1.escapar)(a.enlace)}">Revisar en HoraPro</a>`;
    const avisaNovedad = a.dejoNovedad && a.novedades;
    if (a.minutosTarde !== null && a.alertasTarde) {
        const tarde = `⚠️ ${nombre} llegó tarde\n🕐 ${(0, noHaLlegado_1.horaLegible)(a.hora)} · ${cuantoTarde(a.minutosTarde)} tarde`;
        return [avisaNovedad ? `${tarde}\n📝 Dejó una novedad por aprobar · ${revisar}` : tarde];
    }
    if (avisaNovedad)
        return [`📝 ${nombre} reportó una novedad y espera tu aprobación\n${revisar}`];
    return [];
}
