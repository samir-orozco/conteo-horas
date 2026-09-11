import type { Suscripcion } from '@prisma/client';
import { estadoEfectivo, accesoPermitido } from './suscripcion';

// Lo que decide `requireEmpresa` (index.ts) antes de dejar pasar a un usuario de
// empresa. Va aparte porque index.ts arranca el servidor al importarse
// (CLAUDE.md 8.5), y así la decisión se puede probar.
export type AccesoNegado = { status: 401 | 402 | 403; cuerpo: { error: string; codigo?: string } };

export function decidirAccesoEmpresa(
  empresa: { activa: boolean; exentaPago: boolean } | null,
  suscripcion: Suscripcion | null,
  ahora = new Date(),
): AccesoNegado | null {
  // La empresa ya no existe: el super admin la eliminó con la sesión abierta.
  // 401 y no 403, porque ante un 401 el frontend manda al login, y no hay otra
  // cosa útil que hacer con una empresa que no va a volver.
  if (!empresa) return { status: 401, cuerpo: { error: 'Tu sesión ya no es válida. Vuelve a iniciar sesión.' } };
  if (!empresa.activa) return { status: 403, cuerpo: { error: 'Empresa inactiva' } };
  if (!empresa.exentaPago && suscripcion && !accesoPermitido(estadoEfectivo(suscripcion, ahora))) {
    return {
      status: 402,
      cuerpo: { error: 'Suscripción suspendida por falta de pago. Contacta a HoraPro.', codigo: 'SUSCRIPCION_SUSPENDIDA' },
    };
  }
  return null;
}
