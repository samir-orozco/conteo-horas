import { describe, it, expect } from 'vitest';
import type { Suscripcion } from '@prisma/client';
import { decidirAccesoEmpresa } from './accesoEmpresa';

// Lo que decide `requireEmpresa` (index.ts) antes de dejar pasar a un usuario de
// empresa. Va aparte porque index.ts arranca el servidor al importarse (8.5).
//
// El caso nuevo: el super admin eliminó la empresa y su administrador sigue con
// la sesión abierta. Antes recibía 403 'Empresa inactiva' y el panel se quedaba
// mostrando errores; un 401 hace que el frontend lo mande al login, que es lo
// único que tiene sentido con una empresa que no va a volver.

const DIA = 24 * 60 * 60 * 1000;
const AHORA = new Date(Date.UTC(2026, 8, 10, 17));
const empresa = (extra: Partial<{ activa: boolean; exentaPago: boolean }> = {}) => ({ activa: true, exentaPago: false, ...extra });
const suscripcion = (extra: Partial<Suscripcion> = {}) => ({
  estado: 'ACTIVA',
  finPrueba: new Date(AHORA.getTime() - 60 * DIA),
  pagadoHasta: new Date(AHORA.getTime() + 20 * DIA),
  ...extra,
}) as Suscripcion;

describe('quién entra al panel de una empresa', () => {
  it('si la empresa ya no existe es 401, para que el panel mande al login', () => {
    const r = decidirAccesoEmpresa(null, null, AHORA);
    expect(r?.status).toBe(401);
    expect(r?.cuerpo.error).toMatch(/sesión/i);
  });

  it('una empresa desactivada sigue siendo 403 Empresa inactiva', () => {
    expect(decidirAccesoEmpresa(empresa({ activa: false }), suscripcion(), AHORA))
      .toEqual({ status: 403, cuerpo: { error: 'Empresa inactiva' } });
  });

  it('con la suscripción suspendida es 402, con su código', () => {
    const vencida = suscripcion({ pagadoHasta: new Date(AHORA.getTime() - 30 * DIA) });
    const r = decidirAccesoEmpresa(empresa(), vencida, AHORA);
    expect(r?.status).toBe(402);
    expect(r?.cuerpo.codigo).toBe('SUSCRIPCION_SUSPENDIDA');
  });

  it('una empresa exenta de pago entra aunque la suscripción esté suspendida', () => {
    const vencida = suscripcion({ pagadoHasta: new Date(AHORA.getTime() - 30 * DIA) });
    expect(decidirAccesoEmpresa(empresa({ exentaPago: true }), vencida, AHORA)).toBeNull();
  });

  it('en mora todavía entra', () => {
    const enMora = suscripcion({ pagadoHasta: new Date(AHORA.getTime() - 2 * DIA) });
    expect(decidirAccesoEmpresa(empresa(), enMora, AHORA)).toBeNull();
  });

  it('al día, o sin suscripción, entra', () => {
    expect(decidirAccesoEmpresa(empresa(), suscripcion(), AHORA)).toBeNull();
    expect(decidirAccesoEmpresa(empresa(), null, AHORA)).toBeNull();
  });
});
