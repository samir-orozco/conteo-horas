"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.comoLista = void 0;
exports.atencionDeLaEmpresa = atencionDeLaEmpresa;
exports.esClimaSinPlan = esClimaSinPlan;
const prisma_1 = require("../prisma");
const clima_1 = require("./clima");
const capacidades_1 = require("./capacidades");
// QUIÉN NECESITA ATENCIÓN HOY EN UNA EMPRESA (4 de octubre de 2026; sacado de routes/clima.ts el 14 de octubre,
// PENDIENTES nº 39, fase 4, porque ahora lo usan tres: el panel, el aviso a las empresas sin el plan y el resumen
// semanal). La regla está en utils/clima.ts, con sus pruebas; esto lee la base.
//
// Entre las personas activas: lo malo que vino después del último buen día de cada una, por viejo que sea. Una
// ventana fija de fechas dejaba fuera a quien responde poco (revisión adversarial del 4 de octubre de 2026).
// Las dos consultas van por `empresaId`, que abre el índice (empresaId, fecha) de calificaciones_clima (§8.4).
const comoLista = (v) => (Array.isArray(v) ? v.filter((m) => typeof m === 'string') : []);
exports.comoLista = comoLista;
async function atencionDeLaEmpresa(empresaId, activos, db = prisma_1.prisma) {
    const [buenos, malas, gente] = await Promise.all([
        db.calificacionClima.groupBy({ by: ['colaboradorId'], where: { empresaId, carita: { gt: clima_1.CARITA_MAX_DE_ATENCION } }, _max: { fecha: true } }),
        db.calificacionClima.findMany({
            where: { empresaId, carita: { lte: clima_1.CARITA_MAX_DE_ATENCION } },
            select: { colaboradorId: true, fecha: true, carita: true, motivos: true },
        }),
        // Quien llama ya tiene a los activos (el panel): no se vuelven a leer.
        activos ? null : db.colaborador.findMany({ where: { empresaId, activo: true }, select: { id: true } }),
    ]);
    const vivos = activos ?? new Set((gente ?? []).map(c => c.id));
    const ultimoBueno = new Map(buenos.filter(b => b._max.fecha).map(b => [b.colaboradorId, b._max.fecha]));
    return (0, clima_1.necesitanAtencion)((0, clima_1.filasParaLaRacha)(malas.map(m => ({ ...m, motivos: (0, exports.comoLista)(m.motivos) })), ultimoBueno).filter(c => vivos.has(c.colaboradorId)));
}
/**
 * Si a esta empresa le tocan los avisos del clima SIN el plan (PENDIENTES nº 39, fase 4): no tiene el clima (ni por
 * plan, ni por prueba, ni por concesión) y la calificación del día está encendida. Con ella apagada no junta
 * respuestas nuevas, y avisar por lo que quedó de antes confunde.
 */
async function esClimaSinPlan(empresaId, db = prisma_1.prisma) {
    const [cap, conf] = await Promise.all([
        (0, capacidades_1.capacidadesEmpresa)(empresaId),
        db.configuracion.findUnique({ where: { empresaId_clave: { empresaId, clave: clima_1.CLAVE_CALIFICACION_DIA } }, select: { valor: true } }),
    ]);
    return !cap.features.clima && (0, clima_1.calificacionDelDiaEncendida)(conf?.valor);
}
