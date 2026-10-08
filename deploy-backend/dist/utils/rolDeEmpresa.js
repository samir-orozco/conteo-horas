"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rolPermitidoParaEmpresa = rolPermitidoParaEmpresa;
function rolPermitidoParaEmpresa(rol) {
    return rol === 'ADMIN' || rol === 'SUPERVISOR';
}
