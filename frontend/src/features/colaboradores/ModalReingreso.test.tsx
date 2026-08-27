import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ModalReingreso from './ModalReingreso';
import type { MiPlan } from '../../lib/plan';

// El componente pide al servidor al confirmar. Aquí se prueba lo que decide y
// lo que muestra, no la red.
const post = vi.fn();
vi.mock('../../lib/api', () => ({ default: { post: (...a: unknown[]) => post(...a) } }));

const persona = { id: 'c1', nombre: 'Carlos', apellido: 'Ramírez' };

const plan = (over: Partial<MiPlan> = {}): MiPlan => ({
  plan: 'EMPRESARIAL', nombrePlan: 'Empresarial', ciclo: 'MENSUAL',
  limite: 5, ilimitado: false, features: {},
  precioMensual: 0, precioAnual: 0, colaboradores: 3,
  ...over,
});

const montar = (p: MiPlan | null) =>
  render(<ModalReingreso persona={persona} plan={p} onCerrar={() => {}} onListo={() => {}} />);

describe('el cupo que se le muestra a quien va a reingresar', () => {
  it('dice cuántos usa y en cuántos quedaría', () => {
    montar(plan({ colaboradores: 3, limite: 5 }));
    const caja = screen.getByText(/permite/i).closest('div')!;
    expect(caja.textContent).toMatch(/permite\s*5\s*colaboradores/i);
    expect(caja.textContent).toMatch(/usas\s*3/i);
    expect(caja.textContent).toMatch(/quedarías en\s*4/i);
  });

  it('con plan ilimitado no habla de topes', () => {
    montar(plan({ ilimitado: true, limite: null }));
    expect(screen.getByText(/no tiene límite de colaboradores/i)).toBeInTheDocument();
    expect(screen.queryByText(/No hay cupo disponible/i)).not.toBeInTheDocument();
  });

  it('con el cupo lleno avisa y NO deja confirmar', () => {
    // Reingresar suma un activo: con 5 de 5, el que entra sería el sexto.
    montar(plan({ colaboradores: 5, limite: 5 }));
    expect(screen.getByText(/No hay cupo disponible/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sí, reingresar/i })).toBeDisabled();
  });

  it('justo con un cupo libre sí deja confirmar', () => {
    montar(plan({ colaboradores: 4, limite: 5 }));
    expect(screen.queryByText(/No hay cupo disponible/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sí, reingresar/i })).toBeEnabled();
  });
});

describe('lo que le advierte a quien confirma', () => {
  it('dice que es reversible, porque si no nadie se atreve', () => {
    montar(plan());
    expect(screen.getByText(/Es reversible/i)).toBeInTheDocument();
  });

  it('avisa que el soporte del retiro se borra', () => {
    montar(plan());
    expect(screen.getByText(/soporte adjunto se borran/i)).toBeInTheDocument();
  });

  it('al confirmar llama al servidor con esa persona', async () => {
    post.mockResolvedValueOnce({ data: {} });
    montar(plan({ colaboradores: 1, limite: 5 }));
    await userEvent.click(screen.getByRole('button', { name: /sí, reingresar/i }));
    expect(post).toHaveBeenCalledWith('/colaboradores/c1/reingresar');
  });

  it('si el servidor lo rechaza, muestra el motivo y no se cierra en falso', async () => {
    post.mockRejectedValueOnce({ response: { data: { error: 'Ese colaborador ya está activo.' } } });
    montar(plan({ colaboradores: 1, limite: 5 }));
    await userEvent.click(screen.getByRole('button', { name: /sí, reingresar/i }));
    expect(await screen.findByText(/ya está activo/i)).toBeInTheDocument();
  });
});
