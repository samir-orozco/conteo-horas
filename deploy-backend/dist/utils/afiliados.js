"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TIPOS_CUENTA = exports.METODOS_PAGO = void 0;
exports.limpiarPago = limpiarPago;
exports.calcularBilletera = calcularBilletera;
exports.METODOS_PAGO = ['NEQUI', 'BANCOLOMBIA', 'DAVIPLATA', 'OTRO'];
exports.TIPOS_CUENTA = ['AHORROS', 'CORRIENTE'];
// Normaliza los datos de pago del afiliado según el método (Nequi/Daviplata no
// llevan tipo de cuenta; solo BANCOLOMBIA/OTRO). Compartido por el CRUD del admin,
// el auto-registro y el perfil del afiliado.
function limpiarPago(b) {
    const metodo = exports.METODOS_PAGO.includes(b.pagoMetodo) ? b.pagoMetodo : null;
    const esBanco = metodo === 'BANCOLOMBIA' || metodo === 'OTRO';
    return {
        pagoMetodo: metodo,
        pagoBanco: metodo === 'OTRO' ? (b.pagoBanco?.trim() || null) : null,
        pagoTipoCuenta: esBanco && exports.TIPOS_CUENTA.includes(b.pagoTipoCuenta) ? b.pagoTipoCuenta : null,
        pagoNumero: b.pagoNumero?.trim() || null,
        pagoTitular: b.pagoTitular?.trim() || null,
        pagoDocumento: b.pagoDocumento?.trim() || null,
    };
}
function calcularBilletera(comisiones, retiros) {
    const totalComision = comisiones.filter(c => c.estado === 'CAUSADA').reduce((s, c) => s + c.monto, 0);
    const totalRetirado = retiros.filter(r => r.estado === 'PAGADO').reduce((s, r) => s + r.monto, 0);
    // Los retiros solicitados/aprobados (aún no pagados) reservan saldo.
    const enProceso = retiros.filter(r => r.estado === 'SOLICITADO' || r.estado === 'APROBADO').reduce((s, r) => s + r.monto, 0);
    return { totalComision, totalRetirado, enProceso, disponible: totalComision - totalRetirado - enProceso };
}
