import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../lib/api', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
import api from '../../lib/api';
import PruebaGratis from './PruebaGratis';

// LA PRUEBA GRATIS DEL CLIMA EN SU PANTALLA (14 de octubre de 2026, PENDIENTES nº 39, fase 3). Sin el plan: el botón
// para empezarla, o lo que pasó si ya se usó. Con la prueba corriendo: hasta cuándo. Qué vale lo decide el servidor
// (utils/pruebaClima.ts); aquí se prueba lo que ve el administrador.

const get = api.get as unknown as ReturnType<typeof vi.fn>;
const post = api.post as unknown as ReturnType<typeof vi.fn>;
// Fin exclusivo: la medianoche de Bogotá del 13 de noviembre, o sea que el último día es el 12.
const HASTA = '2026-11-13T05:00:00.000Z';
const estado = (o: Record<string, unknown>) => get.mockResolvedValue({ data: { disponible: false, vigente: null, terminada: null, dias: 30, ...o } });
const montar = (sinPlan: boolean, onEmpezada = vi.fn()) => {
  render(<MemoryRouter><PruebaGratis sinPlan={sinPlan} onEmpezada={onEmpezada} /></MemoryRouter>);
  return onEmpezada;
};

beforeEach(() => { get.mockReset(); post.mockReset(); });

describe('PruebaGratis, sin el plan', () => {
  it('si está disponible, ofrece probarlo gratis 30 días y al pulsarlo la empieza', async () => {
    estado({ disponible: true });
    post.mockResolvedValue({ data: { hasta: HASTA } });
    const onEmpezada = montar(true);
    await userEvent.click(await screen.findByRole('button', { name: 'Pruébalo gratis 30 días' }));
    expect(post).toHaveBeenCalledWith('/clima/prueba');
    await waitFor(() => expect(onEmpezada).toHaveBeenCalled());
  });

  it('si el servidor no la deja empezar, dice por qué', async () => {
    estado({ disponible: true });
    post.mockRejectedValue({ response: { data: { error: 'Esta empresa ya usó su prueba gratis del clima laboral.' } } });
    const onEmpezada = montar(true);
    await userEvent.click(await screen.findByRole('button', { name: 'Pruébalo gratis 30 días' }));
    expect(await screen.findByText('Esta empresa ya usó su prueba gratis del clima laboral.')).toBeInTheDocument();
    expect(onEmpezada).not.toHaveBeenCalled();
  });

  it('si ya la usó, dice cuándo terminó y ofrece subir de plan, sin el botón de la prueba', async () => {
    estado({ terminada: { hasta: HASTA } });
    montar(true);
    expect(await screen.findByText(/Tu prueba gratis terminó el 12 de noviembre de 2026/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Subir de plan/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Pruébalo gratis 30 días' })).toBeNull();
  });

  it('si no se pudo saber el estado, queda la tarjeta de subir de plan', async () => {
    get.mockRejectedValue(new Error('caído'));
    montar(true);
    expect(await screen.findByRole('button', { name: /Subir de plan/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Pruébalo gratis 30 días' })).toBeNull();
  });
});

describe('PruebaGratis, con el clima', () => {
  it('durante la prueba, dice hasta qué día, con el último incluido', async () => {
    estado({ vigente: { hasta: HASTA } });
    montar(false);
    expect(await screen.findByText(/Estás probando el clima laboral gratis hasta el 12 de noviembre de 2026/)).toBeInTheDocument();
  });

  it('con el plan y sin prueba, no muestra nada', async () => {
    estado({ disponible: true });
    const { container } = render(<MemoryRouter><PruebaGratis sinPlan={false} onEmpezada={vi.fn()} /></MemoryRouter>);
    // Que el estado YA llegó, no solo que se pidió: vacío antes de cargar no dice nada de la regla.
    await act(() => new Promise(r => setTimeout(r, 0)));
    expect(container).toBeEmptyDOMElement();
  });
});
