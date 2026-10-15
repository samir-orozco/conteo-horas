"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.climaParaElInicio = climaParaElInicio;
const climaSinPlan_1 = require("./climaSinPlan");
function climaParaElInicio(e) {
    if (!e.esAdministrador)
        return null;
    const vistazo = (0, climaSinPlan_1.vistazoDelClima)(e.resumen);
    if (!e.tieneClima)
        return { estado: 'SIN_PLAN', desde: e.desde, hasta: e.hasta, vistazo, prueba: e.prueba };
    // El Inicio no abre casos (un GET que se carga a cada rato no escribe): cuenta como abiertos también los de
    // quienes entraron a «necesita atención» y todavía no tienen caso. Sin caso es exactamente lo que
    // `casosPorAbrir` abriría: ni uno de esta racha, ni otro abierto (el resumen trae uno u otro en `seguimiento`).
    const porAbrir = e.resumen.atencion.filter(a => a.seguimiento === null).length;
    return {
        estado: 'ACTIVO', desde: e.desde, hasta: e.hasta, vistazo,
        distribucion: { ...e.resumen.distribucion }, prueba: e.prueba, casosAbiertos: e.casosAbiertosEnLaBase + porAbrir,
    };
}
