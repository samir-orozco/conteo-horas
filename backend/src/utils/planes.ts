// Definición de los planes de HoraPro (fuente única de verdad).
// Los límites y funciones de cada empresa salen de aquí, con posibilidad de
// override por empresa desde el super admin (limiteOverride / funcionesOverride).

export type FeatureKey =
  | 'gps' | 'telegram' | 'evidencia' | 'exportar'
  | 'multiDispositivo' | 'multiHorario' | 'siigo';

export const FEATURES: { key: FeatureKey; label: string }[] = [
  { key: 'gps', label: 'Marcación por GPS / geocerca' },
  { key: 'telegram', label: 'Alertas por Telegram' },
  { key: 'evidencia', label: 'Evidencia en novedades' },
  { key: 'exportar', label: 'Exportar reportes' },
  { key: 'multiDispositivo', label: 'Varios dispositivos de kiosco' },
  { key: 'multiHorario', label: 'Varios horarios' },
  { key: 'siigo', label: 'Integración Siigo' },
];

export type PlanId = 'ESENCIAL' | 'PROFESIONAL' | 'EMPRESARIAL';
export type Features = Record<FeatureKey, boolean>;

type PlanDef = {
  id: PlanId; nombre: string; limite: number;
  precioMensual: number; precioAnual: number; // COP
  features: Features;
};

const F = (on: FeatureKey[]): Features => {
  const base: any = {};
  for (const { key } of FEATURES) base[key] = on.includes(key);
  return base;
};

export const PLANES: Record<PlanId, PlanDef> = {
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
    features: F(['gps', 'telegram', 'evidencia', 'exportar', 'multiDispositivo', 'multiHorario', 'siigo']),
  },
};

export const esPlan = (v: any): v is PlanId => v === 'ESENCIAL' || v === 'PROFESIONAL' || v === 'EMPRESARIAL';
export const PLAN_IDS: PlanId[] = ['ESENCIAL', 'PROFESIONAL', 'EMPRESARIAL'];
export type PlanesMap = Record<PlanId, PlanDef>;

// Combina los valores por defecto del código con los overrides guardados por el
// super admin (precio, límite, funciones). Devuelve los 3 planes ya resueltos.
export function combinarPlanes(overrides: any): PlanesMap {
  const o = (overrides && typeof overrides === 'object') ? overrides : {};
  const out: any = {};
  for (const id of PLAN_IDS) {
    const base = PLANES[id];
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
export async function obtenerPlanes(prisma: any): Promise<PlanesMap> {
  const cfg = await prisma.configuracionPlataforma.findUnique({ where: { id: 1 } });
  return combinarPlanes(cfg?.planes);
}

// Datos mínimos de suscripción que necesita el cálculo de capacidades
type SuscLike = {
  plan?: string | null; cicloPago?: string | null;
  limiteOverride?: number | null; funcionesOverride?: any;
  precioModo?: string | null; precioFijo?: number | null;
} | null | undefined;

export type Capacidades = {
  plan: PlanId | 'ILIMITADO';
  nombrePlan: string;
  ciclo: 'MENSUAL' | 'ANUAL';
  limite: number; // Infinity = sin límite
  ilimitado: boolean;
  features: Features;
  precioMensual: number;
  precioAnual: number;
};

const TODAS_ON = F(FEATURES.map(f => f.key));

// Capacidades efectivas de una empresa: plan + overrides. exentaPago = ilimitado
// (empresas propias): sin límite, todas las funciones, sin costo.
export function capacidadesDe(susc: SuscLike, exentaPago = false, planes: PlanesMap = PLANES): Capacidades {
  if (exentaPago) {
    return {
      plan: 'ILIMITADO', nombrePlan: 'Ilimitado', ciclo: 'MENSUAL',
      limite: Infinity, ilimitado: true, features: { ...TODAS_ON },
      precioMensual: 0, precioAnual: 0,
    };
  }
  const p = planes[(susc?.plan as PlanId)] ?? planes.PROFESIONAL;
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
export function precioMensualDe(susc: SuscLike, exentaPago = false, planes: PlanesMap = PLANES): number {
  if (exentaPago) return 0;
  if (susc?.precioModo === 'FIJO' && susc.precioFijo != null) return susc.precioFijo;
  const p = planes[(susc?.plan as PlanId)] ?? planes.PROFESIONAL;
  return p.precioMensual;
}
