import { useEffect, useState } from 'react';
import api from './api';

export type PlanApi = { id: string; nombre: string; precioMensual: number; precioAnual: number; limite: number; features: Record<string, boolean> };
export type MiPlan = {
  plan: string; nombrePlan: string; ciclo: string;
  limite: number | null; // null = ilimitado
  ilimitado: boolean;
  features: Record<string, boolean>;
  precioMensual: number; precioAnual: number;
  colaboradores: number;
  planes?: PlanApi[]; // los 3 planes con precios reales (para cambiar de plan)
};

let cache: Promise<MiPlan> | null = null;

export function cargarMiPlan(force = false): Promise<MiPlan> {
  if (!cache || force) cache = api.get('/suscripcion/mi-plan').then(r => r.data);
  return cache;
}
export function invalidarMiPlan() { cache = null; }

// Hook: capacidades del plan de la empresa (cacheado por sesión).
export function useMiPlan(): { plan: MiPlan | null; recargar: () => void } {
  const [plan, setPlan] = useState<MiPlan | null>(null);
  const recargar = () => cargarMiPlan(true).then(setPlan).catch(() => {});
  useEffect(() => { cargarMiPlan().then(setPlan).catch(() => {}); }, []);
  return { plan, recargar };
}
