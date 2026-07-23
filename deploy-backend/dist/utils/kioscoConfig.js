"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exigeDispositivo = exigeDispositivo;
exports.permiteCedula = permiteCedula;
exports.geocercoConfig = geocercoConfig;
exports.dispositivoValido = dispositivoValido;
const index_1 = require("../index");
// Lectura de los flags del kiosco (Configuración → Marcación) y validación de
// dispositivos autorizados. Antes vivían dentro de routes/worker.ts.
// ¿La empresa exige dispositivos autorizados para el kiosco?
async function exigeDispositivo(empresaId) {
    const cfg = await index_1.prisma.configuracion.findUnique({
        where: { empresaId_clave: { empresaId, clave: 'KIOSCO_SOLO_DISPOSITIVOS' } },
    });
    return cfg?.valor === '1';
}
// ¿La empresa permite marcar con cédula? (por defecto sí; se desactiva en Configuración → Marcación)
async function permiteCedula(empresaId) {
    const cfg = await index_1.prisma.configuracion.findUnique({
        where: { empresaId_clave: { empresaId, clave: 'KIOSCO_PERMITE_CEDULA' } },
    });
    return cfg?.valor !== '0';
}
async function geocercoConfig(empresaId) {
    const cfgs = await index_1.prisma.configuracion.findMany({
        where: { empresaId, clave: { in: ['GEO_EXIGIR', 'GEO_LAT', 'GEO_LNG', 'GEO_RADIO'] } },
    });
    const map = Object.fromEntries(cfgs.map(c => [c.clave, c.valor]));
    if (map.GEO_EXIGIR !== '1')
        return null;
    const lat = Number(map.GEO_LAT), lng = Number(map.GEO_LNG);
    const radio = Number(map.GEO_RADIO) || 150;
    if (!Number.isFinite(lat) || !Number.isFinite(lng))
        return null; // activado pero sin ubicación fijada
    return { lat, lng, radio };
}
// ¿El deviceToken corresponde a un dispositivo vinculado de esa empresa?
async function dispositivoValido(empresaId, deviceToken) {
    if (!deviceToken)
        return false;
    const disp = await index_1.prisma.dispositivoKiosco.findUnique({ where: { token: deviceToken } });
    if (!disp || disp.empresaId !== empresaId)
        return false;
    await index_1.prisma.dispositivoKiosco.update({ where: { id: disp.id }, data: { ultimoUso: new Date() } });
    return true;
}
