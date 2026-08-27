import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import HistorialVinculacion from './HistorialVinculacion';

const get = vi.fn();
vi.mock('../../lib/api', () => ({ default: { get: (...a: unknown[]) => get(...a) } }));

const evento = (over: Record<string, unknown> = {}) => ({
  id: 'e' + Math.random(), tipo: 'INGRESO', fecha: '2026-07-06T05:00:00.000Z',
  motivo: null, nota: null, documentoTipo: null, documentoNombre: null, ...over,
});

const montar = () => render(<HistorialVinculacion colaboradorId="c1" onVerDocumento={() => {}} />);

describe('la historia de vinculación', () => {
  it('con un solo ingreso dice que no ha pasado nada más, en vez de quedar en blanco', async () => {
    // Vive en su propio tab: devolver nada dejaría la pantalla vacía sin
    // explicar por qué.
    get.mockResolvedValueOnce({ data: [evento()] });
    montar();
    expect(await screen.findByText(/Historia con la empresa/i)).toBeInTheDocument();
    expect(screen.getByText(/Ingresó/i)).toBeInTheDocument();
  });

  it('sin ningún evento lo dice con palabras', async () => {
    get.mockResolvedValueOnce({ data: [] });
    montar();
    expect(await screen.findByText(/Sin movimientos registrados/i)).toBeInTheDocument();
  });

  it('pinta cada entrada y cada salida con su fecha', async () => {
    get.mockResolvedValueOnce({ data: [
      evento({ tipo: 'RETIRO', fecha: '2026-08-24T05:00:00.000Z', motivo: 'SIN_JUSTA_CAUSA' }),
      evento({ tipo: 'REINGRESO', fecha: '2026-08-20T05:00:00.000Z' }),
      evento({ tipo: 'INGRESO', fecha: '2026-07-06T05:00:00.000Z' }),
    ] });
    montar();
    expect(await screen.findByText(/Se retiró/i)).toBeInTheDocument();
    expect(screen.getByText(/Reingresó/i)).toBeInTheDocument();
    expect(screen.getByText(/Despido sin justa causa/i)).toBeInTheDocument();
  });

  it('el soporte de un retiro se puede abrir', async () => {
    get.mockResolvedValueOnce({ data: [
      evento({ tipo: 'RETIRO', motivo: 'RENUNCIA', documentoTipo: 'application/pdf', documentoNombre: 'carta.pdf' }),
    ] });
    montar();
    expect(await screen.findByRole('button', { name: /carta\.pdf/i })).toBeInTheDocument();
  });

  it('si el servidor falla no rompe la ficha', async () => {
    get.mockRejectedValueOnce(new Error('sin red'));
    montar();
    expect(await screen.findByText(/Sin movimientos registrados/i)).toBeInTheDocument();
  });
});
