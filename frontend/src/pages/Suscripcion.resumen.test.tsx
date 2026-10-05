import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

// El «Resumen de tu pago» que se ve antes de ir a Wompi (4 de octubre de 2026). Decía
// «2 colaboradores × $10.000 = $20.000», del precio viejo por colaborador, encima de un
// total de $270.877 que salía del precio del plan. Y no decía desde cuándo cubría, que
// es lo que explica los días que se cobran desde que el primer pago cuenta desde el fin
// de la prueba.

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('../lib/api', () => ({ default: { get: (...a: unknown[]) => get(...a), post: vi.fn() } }));
vi.mock('../lib/recibo', () => ({ descargarReciboPDF: vi.fn() }));
vi.mock('../lib/plan', () => ({
  useMiPlan: () => ({
    plan: { plan: 'EMPRESARIAL', nombrePlan: 'Empresarial', ciclo: 'MENSUAL', limite: 150, ilimitado: false, features: {}, precioMensual: 299900, precioAnual: 2999000, colaboradores: 2, planes: [] },
    recargar: vi.fn(),
  }),
  invalidarMiPlan: vi.fn(),
}));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ usuario: { rol: 'ADMIN', empresaNombre: 'Demo' } }) }));

import Suscripcion from './Suscripcion';

// En prueba hasta el 8 de octubre a las 11:59 p. m. de Bogotá; paga el 4.
const FIN_PRUEBA = '2026-10-09T04:59:00.000Z';
const CUENTA = {
  estado: 'PRUEBA', diasMora: 0, finPrueba: FIN_PRUEBA, pagadoHasta: null,
  colaboradoresActivos: 2, tarifaMensual: 299900,
  cobro: {
    tipo: 'MES', colaboradoresActivos: 2, colaboradoresFacturados: 0, tarifaMesCompleto: 299900, monto: 232181,
    diasMes: 31, diasRestantes: 24, mesCompleto: false, desde: FIN_PRUEBA, cubreHasta: '2026-11-01T05:00:00.000Z',
  },
  precios: { precioTramo1: 10000, limiteTramo1: 15, precioTramo2: 2000 },
  pagos: [], empresa: { nombre: 'Demo', nit: '900', email: 'a@b.co', telefono: null }, wompiConfigurado: true,
  checkout: { url: 'https://checkout.wompi.co/p/', publicKey: 'pub_test_x', currency: 'COP', amountInCents: 23218100, reference: 'HP-e1-P1', signature: 'firma', verificacionDisponible: false },
};

beforeEach(() => {
  get.mockReset();
  get.mockResolvedValue({ data: CUENTA });
});
const abrirResumen = async () => {
  render(<MemoryRouter><Suscripcion /></MemoryRouter>);
  await userEvent.click(await screen.findByRole('button', { name: /pagar .* con wompi/i }));
  return screen.getByRole('dialog', { name: 'Resumen de tu pago' });
};

describe('el resumen antes de pagar', () => {
  it('dice el plan y su precio de mes completo, no un precio por colaborador', async () => {
    const resumen = await abrirResumen();
    expect(within(resumen).getByText('Plan Empresarial · mes completo')).toBeInTheDocument();
    expect(within(resumen).getByText('$ 299.900')).toBeInTheDocument();
    expect(within(resumen).queryByText(/colaborador/)).toBeNull();
  });

  it('dice desde cuándo cubre: el día en que termina la prueba', async () => {
    const resumen = await abrirResumen();
    expect(within(resumen).getByText('Desde')).toBeInTheDocument();
    expect(within(resumen).getByText('8 de octubre de 2026')).toBeInTheDocument();
    expect(within(resumen).getByText('24 de 31')).toBeInTheDocument();
  });

  it('el mes del título es el del período, en hora de Bogotá', async () => {
    const resumen = await abrirResumen();
    expect(within(resumen).getByText('Suscripción HoraPro · octubre de 2026')).toBeInTheDocument();
  });
});
