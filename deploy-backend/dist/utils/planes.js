"use strict";
// Definición de los planes de HoraPro (fuente única de verdad).
// Los límites y funciones de cada empresa salen de aquí, con posibilidad de
// override por empresa desde el super admin (limiteOverride / funcionesOverride).
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLAN_IDS = exports.esPlan = exports.PLANES = exports.FEATURES = void 0;
exports.combinarPlanes = combinarPlanes;
exports.obtenerPlanes = obtenerPlanes;
exports.capacidadesDe = capacidadesDe;
exports.precioMensualDe = precioMensualDe;
exports.FEATURES = [
    { key: 'gps', label: 'Marcación por GPS / geocerca' },
    { key: 'telegram', label: 'Alertas por Telegram' },
    { key: 'evidencia', label: 'Evidencia en novedades' },
    { key: 'exportar', label: 'Exportar reportes' },
    { key: 'multiDispositivo', label: 'Varios dispositivos de kiosco' },
    { key: 'multiHorario', label: 'Varios horarios' },
    { key: 'multiSede', label: 'Varias sedes' },
    { key: 'siigo', label: 'Integración Siigo' },
];
const F = (on) => {
    const base = {};
    for (const { key } of exports.FEATURES)
        base[key] = on.includes(key);
    return base;
};
exports.PLANES = {
    ESENCIAL: {
        id: 'ESENCIAL', nombre: 'Esencial', limite: 10,
        precioMensual: 99900, precioAnual: 999000,
        features: F([]),
    },
    PROFESIONAL: {
        id: 'PROFESIONAL', nombre: 'Profesional', limite: 30,
        precioMensual: 169900, precioAnual: 1699000,
        features: F(['gps', 'telegram', 'evidencia', 'exportar', 'multiDispositivo', 'multiHorario']),
    },
    EMPRESARIAL: {
        id: 'EMPRESARIAL', nombre: 'Empresarial', limite: 150,
        precioMensual: 299900, precioAnual: 2999000,
        features: F(['gps', 'telegram', 'evidencia', 'exportar', 'multiDispositivo', 'multiHorario', 'siigo', 'multiSede']),
    },
};
const esPlan = (v) => v === 'ESENCIAL' || v === 'PROFESIONAL' || v === 'EMPRESARIAL';
exports.esPlan = esPlan;
exports.PLAN_IDS = ['ESENCIAL', 'PROFESIONAL', 'EMPRESARIAL'];
// Combina los valores por defecto del código con los overrides guardados por el
// super admin (precio, límite, funciones). Devuelve los 3 planes ya resueltos.
function combinarPlanes(overrides) {
    const o = (overrides && typeof overrides === 'object') ? overrides : {};
    const out = {};
    for (const id of exports.PLAN_IDS) {
        const base = exports.PLANES[id];
        const ov = (o[id] && typeof o[id] === 'object') ? o[id] : {};
        out[id] = {
            ...base,
            precioMensual: Number.isFinite(ov.precioMensual) ? ov.precioMensual : base.precioMensual,
            precioAnual: Number.isFinite(ov.precioAnual) ? ov.precioAnual : base.precioAnual,
            limite: Number.isFinite(ov.limite) ? ov.limite : base.limite,
            features: { ...base.features, ...(ov.features && typeof ov.features === 'object' ? ov.features : {}) },
        };
    }
    return out;
}
// Carga los planes efectivos desde la configuración de la plataforma.
async function obtenerPlanes(prisma) {
    const cfg = await prisma.configuracionPlataforma.findUnique({ where: { id: 1 } });
    return combinarPlanes(cfg?.planes);
}
const TODAS_ON = F(exports.FEATURES.map(f => f.key));
// Capacidades efectivas de una empresa: plan + overrides. exentaPago = ilimitado
// (empresas propias): sin límite, todas las funciones, sin costo.
function capacidadesDe(susc, exentaPago = false, planes = exports.PLANES) {
    if (exentaPago) {
        return {
            plan: 'ILIMITADO', nombrePlan: 'Ilimitado', ciclo: 'MENSUAL',
            limite: Infinity, ilimitado: true, features: { ...TODAS_ON },
            precioMensual: 0, precioAnual: 0,
        };
    }
    const p = planes[susc?.plan] ?? planes.PROFESIONAL;
    const overrides = (susc?.funcionesOverride && typeof susc.funcionesOverride === 'object') ? susc.funcionesOverride : {};
    return {
        plan: p.id, nombrePlan: p.nombre,
        ciclo: susc?.cicloPago === 'ANUAL' ? 'ANUAL' : 'MENSUAL',
        limite: susc?.limiteOverride ?? p.limite,
        ilimitado: false,
        features: { ...p.features, ...overrides },
        precioMensual: p.precioMensual,
        precioAnual: p.precioAnual,
    };
}
// Precio mensual efectivo (para el cobro por mes calendario que ya existe).
// Precio fijo a la medida > precio del plan.
function precioMensualDe(susc, exentaPago = false, planes = exports.PLANES) {
    if (exentaPago)
        return 0;
    if (susc?.precioModo === 'FIJO' && susc.precioFijo != null)
        return susc.precioFijo;
    const p = planes[susc?.plan] ?? planes.PROFESIONAL;
    return p.precioMensual;
}
