// Lo que la ficha de una empresa en el super admin compara para saber qué es «a la medida» (15 de
// septiembre de 2026). Todo sale del catálogo que manda el servidor (GET /admin/planes), el mismo de
// «Precios». Antes la pantalla tenía su propia copia de los planes: le faltaba «Varias sedes» y no se
// enteraba de lo que se cambiara en «Precios», así que al guardar inventaba extras.
export type FuncionDelPlan = { key: string; label: string; proximamente?: boolean };
export type PlanDelCatalogo = {
  id: string; nombre: string; limite: number; precioMensual: number; precioAnual: number;
  features: Record<string, boolean>;
};
export type CatalogoDePlanes = { planes: Record<string, PlanDelCatalogo>; funciones: FuncionDelPlan[]; orden: string[] };

// Cada función de la lista con lo que trae el plan. La que el plan no menciona va en falso.
export function funcionesDelPlan(catalogo: CatalogoDePlanes, planId: string): Record<string, boolean> {
  const delPlan = catalogo.planes[planId]?.features ?? {};
  return Object.fromEntries(catalogo.funciones.map(f => [f.key, !!delPlan[f.key]]));
}

// Solo lo que difiere del plan, prendido o apagado, para guardarlo como override. null si no difiere nada.
export function funcionesExtra(
  catalogo: CatalogoDePlanes, planId: string, marcadas: Record<string, boolean>,
): Record<string, boolean> | null {
  const delPlan = funcionesDelPlan(catalogo, planId);
  const extra = Object.fromEntries(catalogo.funciones
    .filter(f => !!marcadas[f.key] !== delPlan[f.key])
    .map(f => [f.key, !!marcadas[f.key]]));
  return Object.keys(extra).length ? extra : null;
}

// El cupo como override: null si es el del plan.
export function cupoExtra(catalogo: CatalogoDePlanes, planId: string, cupo: number): number | null {
  return cupo === catalogo.planes[planId]?.limite ? null : cupo;
}
