import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

// El historial de pagos del admin de la empresa, con su recibo en PDF (3 de octubre de 2026).

const { get, descargar } = vi.hoisted(() => ({ get: vi.fn(), descargar: vi.fn() }));
vi.mock('../lib/api', () => ({ default: { get: (...a: unknown[]) => get(...a), post: vi.fn() } }));
vi.mock('../lib/recibo', () => ({ descargarReciboPDF: (...a: unknown[]) => descargar(...a) }));
vi.mock('../lib/plan', () => ({ useMiPlan: () => ({ plan: null, recargar: vi.fn() }), invalidarMiPlan: vi.fn() }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ usuario: { rol: 'ADMIN' } }) }));

import Suscripcion from './Suscripcion';

const EMPRESA = { nombre: 'Tuercas & Pernos', nit: '900111222-1', email: 'gerencia@tuercas.co', telefono: null };
const PAGO = {
  id: 'p1', monto: 99900, colaboradoresFacturados: 3, metodo: 'LINK_WOMPI', wompiTransaccionId: 'tx-1',
  periodoInicio: '2026-10-22T14:00:00.000Z', periodoFin: '2026-11-01T05:00:00.000Z', creadoEn: '2026-10-22T14:00:00.000Z',
};
const CUENTA = {
  estado: 'ACTIVA', diasMora: 0, finPrueba: '2026-10-22T05:00:00.000Z', pagadoHasta: '2026-11-01T05:00:00.000Z',
  colaboradoresActivos: 3, tarifaMensual: 99900,
  cobro: { tipo: 'AL_DIA', colaboradoresActivos: 3, colaboradoresFacturados: 3, tarifaMesCompleto: 99900, monto: 0, diasMes: 31, diasRestantes: 10, cubreHasta: '2026-11-01T05:00:00.000Z' },
  precios: { precioTramo1: 10000, limiteTramo1: 15, precioTramo2: 2000 },
  pagos: [PAGO], empresa: EMPRESA, wompiConfigurado: true, checkout: null,
};

beforeEach(() => {
  get.mockReset(); descargar.mockReset();
  get.mockResolvedValue({ data: CUENTA });
});
const abrir = () => render(<MemoryRouter><Suscripcion /></MemoryRouter>);

describe('el historial de pagos de la empresa', () => {
  it('cada pago tiene su botón para descargar el recibo, con los datos de la empresa', async () => {
    abrir();
    await userEvent.click(await screen.findByRole('button', { name: /descargar recibo/i }));
    expect(descargar).toHaveBeenCalledWith({ ...PAGO, suscripcion: { empresa: EMPRESA } });
  });

  it('«cubre hasta» es el último día pagado, no el día del vencimiento', async () => {
    abrir();
    const tabla = await screen.findByRole('table');
    expect(within(tabla).getByText('31 de oct de 2026')).toBeInTheDocument();
    expect(within(tabla).queryByText(/1 de nov/)).toBeNull();
  });
});
