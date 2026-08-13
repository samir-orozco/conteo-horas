import { prisma } from '../index';
import { capacidadesDe, obtenerPlanes, type Capacidades, type FeatureKey } from './planes';

// Capacidades efectivas de una empresa (plan + overrides + acceso ilimitado).
export async function capacidadesEmpresa(empresaId: string): Promise<Capacidades> {
  const [empresa, planes] = await Promise.all([
    prisma.empresa.findUnique({ where: { id: empresaId }, include: { suscripcion: true } }),
    obtenerPlanes(prisma),
  ]);
  return capacidadesDe(empresa?.suscripcion, empresa?.exentaPago ?? false, planes);
}

// ¿La empresa tiene activa cierta función según su plan?
export async function tieneFuncion(empresaId: string, feature: FeatureKey): Promise<boolean> {
  const cap = await capacidadesEmpresa(empresaId);
  return !!cap.features[feature];
}
