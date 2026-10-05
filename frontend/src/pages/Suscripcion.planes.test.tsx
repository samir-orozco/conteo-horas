import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PLANES_COMERCIALES } from '../lib/planesComerciales';

// «Tu plan» en Suscripción (4 de octubre de 2026). Tenía su propia lista de lo que incluye cada plan,
// más corta que la de la landing, y nunca se enteró de Turnos ni de Clima laboral: un cliente del
// Profesional que entraba a ver si le convenía subir no encontraba lo que el Empresarial le daba. Ahora
// las dos pantallas leen la misma lista, y `planesComerciales.test.ts` la compara con lo que de verdad
// prende cada plan.

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('../lib/api', () => ({ default: { get: (...a: unknown[]) => get(...a), post: vi.fn() } }));
vi.mock('../lib/recibo', () => ({ descargarReciboPDF: vi.fn() }));
vi.mock('../lib/plan', () => ({
  useMiPlan: () => ({
    plan: { plan: 'PROFESIONAL', nombrePlan: 'Profesional', ciclo: 'MENSUAL', limite: 30, ilimitado: false, features: {}, precioMensual: 169900, precioAnual: 1699000, colaboradores: 2, planes: [] },
    recargar: vi.fn(),
  }),
  invalidarMiPlan: vi.fn(),
}));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ usuario: { rol: 'ADMIN', empresaNombre: 'Demo' } }) }));

import Suscripcion from './Suscripcion';

const CUENTA = {
  estado: 'ACTIVA', diasMora: 0, finPrueba: '2026-09-01T04:59:00.000Z', pagadoHasta: '2026-11-01T05:00:00.000Z',
  colaboradoresActivos: 2, tarifaMensual: 169900,
  cobro: { tipo: 'AL_DIA', colaboradoresActivos: 2, colaboradoresFacturados: 0, tarifaMesCompleto: 169900, monto: 0, diasMes: 31, diasRestantes: 0, cubreHasta: '2026-11-01T05:00:00.000Z' },
  precios: { precioTramo1: 10000, limiteTramo1: 15, precioTramo2: 2000 },
  pagos: [], empresa: { nombre: 'Demo', nit: '900', email: 'a@b.co', telefono: null }, wompiConfigurado: true, checkout: null,
};

beforeEach(() => {
  get.mockReset();
  get.mockResolvedValue({ data: CUENTA });
});

// La tarjeta de un plan: lo que rodea a su título y trae la lista.
const tarjetaDe = async (nombre: string) => {
  let el: HTMLElement | null = await screen.findByRole('heading', { name: nombre });
  while (el && !el.querySelector('ul')) el = el.parentElement;
  return el!;
};

describe('«Tu plan» en Suscripción', () => {
  it('cada plan muestra todo lo que incluye, igual que en la landing', async () => {
    render(<MemoryRouter><Suscripcion /></MemoryRouter>);
    for (const p of PLANES_COMERCIALES) {
      const tarjeta = await tarjetaDe(p.nombre);
      for (const f of p.incluye) expect(within(tarjeta).getByText(f)).toBeInTheDocument();
    }
  });

  it('el Empresarial dice que trae Turnos y Clima laboral', async () => {
    render(<MemoryRouter><Suscripcion /></MemoryRouter>);
    const empresarial = await tarjetaDe('Empresarial');
    expect(within(empresarial).getByText(/Turnos/)).toBeInTheDocument();
    expect(within(empresarial).getByText(/Clima laboral/)).toBeInTheDocument();
  });
});
