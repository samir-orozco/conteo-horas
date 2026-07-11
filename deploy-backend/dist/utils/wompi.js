"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WOMPI_EVENTS_SECRET = exports.WOMPI_INTEGRITY_SECRET = exports.WOMPI_PRIVATE_KEY = exports.WOMPI_PUBLIC_KEY = exports.WOMPI_CHECKOUT_URL = exports.WOMPI_API_URL = void 0;
exports.wompiConfigurado = wompiConfigurado;
exports.referenciaPago = referenciaPago;
exports.empresaIdDeReferencia = empresaIdDeReferencia;
exports.firmaIntegridad = firmaIntegridad;
exports.consultarTransaccion = consultarTransaccion;
exports.consultarPorReferencia = consultarPorReferencia;
const crypto_1 = __importDefault(require("crypto"));
// Configuración Wompi — ambiente de pruebas por defecto.
// Llaves de prueba (pub_test_*, test_integrity_*, test_events_*) se obtienen
// en comercios.wompi.co con el comercio en modo sandbox.
exports.WOMPI_API_URL = process.env.WOMPI_API_URL || 'https://sandbox.wompi.co/v1';
exports.WOMPI_CHECKOUT_URL = 'https://checkout.wompi.co/p/';
exports.WOMPI_PUBLIC_KEY = process.env.WOMPI_PUBLIC_KEY || '';
exports.WOMPI_PRIVATE_KEY = process.env.WOMPI_PRIVATE_KEY || '';
exports.WOMPI_INTEGRITY_SECRET = process.env.WOMPI_INTEGRITY_SECRET || '';
exports.WOMPI_EVENTS_SECRET = process.env.WOMPI_EVENTS_SECRET || '';
function wompiConfigurado() {
    return Boolean(exports.WOMPI_PUBLIC_KEY && exports.WOMPI_INTEGRITY_SECRET);
}
// Referencia determinística por período: HP-<empresaId>-P<vencimiento>.
// Estable hasta que entra un pago (cambia el vencimiento), lo que permite
// verificar el pago por referencia sin depender del redirect de Wompi.
function referenciaPago(empresaId, vencimiento) {
    return `HP-${empresaId}-P${vencimiento.getTime()}`;
}
function empresaIdDeReferencia(reference) {
    const partes = reference.split('-');
    if (partes[0] !== 'HP' || partes.length < 3)
        return null;
    return partes[1];
}
// Firma de integridad del Web Checkout: SHA256(<ref><monto><moneda><secreto>)
function firmaIntegridad(reference, amountInCents, currency = 'COP') {
    return crypto_1.default
        .createHash('sha256')
        .update(`${reference}${amountInCents}${currency}${exports.WOMPI_INTEGRITY_SECRET}`)
        .digest('hex');
}
// Consulta una transacción en el API de Wompi (sandbox o producción según env)
async function consultarTransaccion(id) {
    const res = await fetch(`${exports.WOMPI_API_URL}/transactions/${id}`, {
        headers: exports.WOMPI_PUBLIC_KEY ? { Authorization: `Bearer ${exports.WOMPI_PUBLIC_KEY}` } : undefined,
    });
    if (!res.ok)
        return null;
    const body = await res.json();
    return body?.data ?? null;
}
// Busca transacciones por referencia — requiere la llave privada
async function consultarPorReferencia(reference) {
    if (!exports.WOMPI_PRIVATE_KEY)
        return [];
    const res = await fetch(`${exports.WOMPI_API_URL}/transactions?reference=${encodeURIComponent(reference)}`, {
        headers: { Authorization: `Bearer ${exports.WOMPI_PRIVATE_KEY}` },
    });
    if (!res.ok)
        return [];
    const body = await res.json();
    return body?.data ?? [];
}
