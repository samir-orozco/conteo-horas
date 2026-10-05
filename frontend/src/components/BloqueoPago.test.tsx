import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// El aviso que bloquea el panel cuando la suscripción está vencida.
//
// 4 de octubre de 2026, dos cambios. El primer pago cuenta desde el fin de la prueba y no
// desde hoy, así que un aviso que solo dice «hasta el 31» no explica por qué se cobran 24
// días cuando quedan 17. Y el kiosco ya no sigue marcando sin límite: se pausa 10 días
// después de la suspensión, así que el aviso no puede seguir prometiendo «siguen marcando
// normalmente».

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('../lib/api', () => ({ default: { get: (...a: unknown[]) => get(...a), post: vi.fn() } }));
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ usuario: { rol: 'ADMIN', estadoSuscripcion: 'SUSPENDIDA' }, logout: vi.fn() }),
}));

import BloqueoPago from './BloqueoPago';

const CUENTA = {
  estado: 'SUSPENDIDA', diasMora: 7, tarifaMensual: 299900, colaboradoresActivos: 2, checkout: null,
  cobro: {
    monto: 232181, mesCompleto: false, diasRestantes: 24, diasMes: 31, tarifaMesCompleto: 299900,
    desde: '2026-10-09T04:59:00.000Z', cubreHasta: '2026-11-01T05:00:00.000Z',
  },
  kiosco: { pausaDesde: '2026-10-24T05:00:00.000Z', pausado: false },
};
const abrir = (cuenta: object) => {
  get.mockResolvedValue({ data: cuenta });
  render(<MemoryRouter><BloqueoPago /></MemoryRouter>);
};
// Un párrafo entero, aunque traiga la fecha en negrita.
const parrafo = (texto: string) => screen.findByText((_, el) => el?.tagName === 'P' && el.textContent === texto);

describe('el aviso de suscripción vencida', () => {
  it('dice desde cuándo y hasta cuándo cubre el pago', async () => {
    abrir(CUENTA);
    expect(await screen.findByText('Cubre desde el 8 de octubre de 2026 hasta el 31 de octubre de 2026 — todos los pagos renuevan el día 1.')).toBeInTheDocument();
  });

  it('antes de la pausa, dice hasta cuándo se marca en el kiosco y desde cuándo se pausa', async () => {
    abrir(CUENTA);
    expect(await parrafo('Tus colaboradores pueden seguir marcando en el kiosco hasta el 23 de octubre de 2026. Desde el 24 de octubre de 2026, el kiosco se pausa hasta que registres el pago.')).toBeInTheDocument();
    expect(screen.queryByText(/siguen marcando normalmente/)).toBeNull();
  });

  it('con el kiosco ya pausado, lo dice', async () => {
    abrir({ ...CUENTA, kiosco: { pausaDesde: '2026-10-24T05:00:00.000Z', pausado: true } });
    expect(await parrafo('El kiosco está pausado desde el 24 de octubre de 2026: tus colaboradores no pueden marcar hasta que registres el pago. Lo que ya marcaron se conserva.')).toBeInTheDocument();
  });
});
