"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decidirAccesoEmpresa = decidirAccesoEmpresa;
const suscripcion_1 = require("./suscripcion");
function decidirAccesoEmpresa(empresa, suscripcion, ahora = new Date()) {
    // La empresa ya no existe: el super admin la eliminó con la sesión abierta.
    // 401 y no 403, porque ante un 401 el frontend manda al login, y no hay otra
    // cosa útil que hacer con una empresa que no va a volver.
    if (!empresa)
        return { status: 401, cuerpo: { error: 'Tu sesión ya no es válida. Vuelve a iniciar sesión.' } };
    if (!empresa.activa)
        return { status: 403, cuerpo: { error: 'Empresa inactiva' } };
    if (!empresa.exentaPago && suscripcion && !(0, suscripcion_1.accesoPermitido)((0, suscripcion_1.estadoEfectivo)(suscripcion, ahora))) {
        return {
            status: 402,
            cuerpo: { error: 'Suscripción suspendida por falta de pago. Contacta a HoraPro.', codigo: 'SUSCRIPCION_SUSPENDIDA' },
        };
    }
    return null;
}
