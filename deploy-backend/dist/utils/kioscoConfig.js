"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exigeDispositivo = exigeDispositivo;
exports.permiteCedula = permiteCedula;
exports.exigeRetoDePose = exigeRetoDePose;
exports.geocercoConfig = geocercoConfig;
exports.sedesConGeocercaDe = sedesConGeocercaDe;
exports.empresaUsaSedes = empresaUsaSedes;
exports.dispositivoValido = dispositivoValido;
const prisma_1 = require("../prisma");
// Lectura de los flags del kiosco (Configuración → Marcación) y validación de
// dispositivos autorizados. Antes vivían dentro de routes/worker.ts.
// ¿La empresa exige dispositivos autorizados para el kiosco?
async function exigeDispositivo(empresaId) {
    const cfg = await prisma_1.prisma.configuracion.findUnique({
        where: { empresaId_clave: { empresaId, clave: 'KIOSCO_SOLO_DISPOSITIVOS' } },
    });
    return cfg?.valor === '1';
}
// ¿La empresa permite marcar con cédula? (por defecto sí; se desactiva en Configuración → Marcación)
async function permiteCedula(empresaId) {
    const cfg = await prisma_1.prisma.configuracion.findUnique({
        where: { empresaId_clave: { empresaId, clave: 'KIOSCO_PERMITE_CEDULA' } },
    });
    return cfg?.valor !== '0';
}
// ¿El ingreso facial pide girar la cabeza antes de capturar?
//
// APAGADO POR DEFECTO, y eso es deliberado. Esta es la parte del producto que ya
// rompió el ingreso del kiosco varias veces, y un reto que falle deja a la gente
// sin poder marcar. Se enciende por empresa, se prueba con una, y solo después se
// piensa en cambiar el defecto.
//
// Que sea configuración de servidor y no una constante del bundle es lo que
// permite apagarlo desde el panel si empieza a fallar, sin esperar un despliegue.
async function exigeRetoDePose(empresaId) {
    const cfg = await prisma_1.prisma.configuracion.findUnique({
        where: { empresaId_clave: { empresaId, clave: 'KIOSCO_RETO_POSE' } },
    });
    return cfg?.valor === '1';
}
async function geocercoConfig(empresaId) {
    const cfgs = await prisma_1.prisma.configuracion.findMany({
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
async function sedesConGeocercaDe(colaboradorId) {
    const filas = await prisma_1.prisma.colaboradorSede.findMany({
        where: { colaboradorId, sede: { activa: true } },
        select: { sede: { select: { id: true, nombre: true, lat: true, lng: true, radio: true } } },
    });
    return filas
        .map(f => f.sede)
        .filter((s) => s.lat !== null && s.lng !== null)
        .map(s => ({ id: s.id, nombre: s.nombre, lat: s.lat, lng: s.lng, radio: s.radio }));
}
// ¿La empresa tiene alguna sede con ubicación fijada? El kiosco lo consulta
// ANTES de saber quién va a marcar, para decidir si pide el GPS de entrada.
async function empresaUsaSedes(empresaId) {
    const n = await prisma_1.prisma.sede.count({
        where: { empresaId, activa: true, lat: { not: null }, lng: { not: null } },
    });
    return n > 0;
}
// ¿El deviceToken corresponde a un dispositivo vinculado de esa empresa?
async function dispositivoValido(empresaId, deviceToken) {
    if (!deviceToken)
        return false;
    const disp = await prisma_1.prisma.dispositivoKiosco.findUnique({ where: { token: deviceToken } });
    if (!disp || disp.empresaId !== empresaId)
        return false;
    await prisma_1.prisma.dispositivoKiosco.update({ where: { id: disp.id }, data: { ultimoUso: new Date() } });
    return true;
}
