"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TIPO_AVISO_SIN_PLAN = void 0;
exports.avisarClimaSinPlan = avisarClimaSinPlan;
const prisma_1 = require("../prisma");
const atencionClima_1 = require("./atencionClima");
const climaSinPlan_1 = require("./climaSinPlan");
const pruebaClima_1 = require("./pruebaClima");
exports.TIPO_AVISO_SIN_PLAN = 'CLIMA_ATENCION_SIN_PLAN';
async function avisarClimaSinPlan(log, ahora = new Date(), db = prisma_1.prisma) {
    const empresas = await db.empresa.findMany({ where: { activa: true }, select: { id: true } });
    let enviados = 0, sinPlan = 0, fallidas = 0;
    for (const e of empresas) {
        try {
            if (!await (0, atencionClima_1.esClimaSinPlan)(e.id, db))
                continue;
            sinPlan++;
            const enAtencion = await (0, atencionClima_1.atencionDeLaEmpresa)(e.id, undefined, db);
            if (enAtencion.length === 0)
                continue;
            // Por (empresaId, creadoEn), el índice de la campana (§8.4: ver el EXPLAIN en el commit).
            const ultimo = await db.notificacion.findFirst({
                where: { empresaId: e.id, tipo: exports.TIPO_AVISO_SIN_PLAN }, orderBy: { creadoEn: 'desc' }, select: { creadoEn: true, entidadId: true },
            });
            const aviso = (0, climaSinPlan_1.avisoDeAtencionSinPlan)({ enAtencion, ultimo: ultimo && { creadoEn: ultimo.creadoEn, hastaDia: ultimo.entidadId }, ahora });
            if (!aviso)
                continue;
            const pruebas = await db.concesionFuncion.findMany({
                where: { empresaId: e.id, funcion: pruebaClima_1.FUNCION_DE_PRUEBA, origen: 'PRUEBA' }, select: { desde: true, hasta: true, revocadaEn: true },
            });
            const texto = (0, climaSinPlan_1.textoDelAvisoSinPlan)(aviso.personas, (0, pruebaClima_1.estadoDePrueba)(pruebas, ahora).disponible);
            await db.notificacion.create({
                data: { empresaId: e.id, tipo: texto.tipo, titulo: texto.titulo, cuerpo: texto.cuerpo, entidad: 'clima', entidadId: aviso.hastaDia },
            });
            enviados++;
        }
        catch (err) {
            fallidas++;
            log?.error(err, `Clima sin el plan: falló la empresa ${e.id}`);
        }
    }
    log?.info(`Clima sin el plan: ${enviados} avisos · ${sinPlan} empresas sin el plan revisadas · ${fallidas} fallidas · de ${empresas.length} empresas`);
    return enviados;
}
