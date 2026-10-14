import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../lib/api', () => ({ default: { get: vi.fn(), put: vi.fn() } }));
import api from '../../lib/api';
import CalificacionDelDia from './CalificacionDelDia';

// EL INTERRUPTOR «CALIFICACIÓN DEL DÍA» (14 de octubre de 2026, PENDIENTES nº 39). Encendido de fábrica en
// todos los planes: una empresa que nunca lo tocó no tiene la clave guardada, y eso se lee como encendido,
// que es lo que hace el kiosco (utils/clima.ts, calificacionDelDiaEncendida).

const get = api.get as unknown as ReturnType<typeof vi.fn>;
const put = api.put as unknown as ReturnType<typeof vi.fn>;
const conConfig = (cfg: Record<string, string>) => get.mockResolvedValue({ data: cfg });
const interruptor = () => screen.findByRole('switch', { name: /calificación del día/i });

beforeEach(() => { get.mockReset(); put.mockReset(); put.mockResolvedValue({ data: { ok: true } }); });

describe('CalificacionDelDia', () => {
  it('una empresa que nunca lo tocó lo ve encendido', async () => {
    conConfig({ KIOSCO_PERMITE_CEDULA: '1' });
    render(<CalificacionDelDia />);
    await waitFor(async () => expect(await interruptor()).toHaveAttribute('aria-checked', 'true'));
  });

  it('una empresa que lo apagó lo ve apagado', async () => {
    conConfig({ CLIMA_CALIFICACION_DIA: '0' });
    render(<CalificacionDelDia />);
    await waitFor(async () => expect(await interruptor()).toHaveAttribute('aria-checked', 'false'));
  });

  it('apagarlo guarda «0» y prenderlo guarda «1»', async () => {
    conConfig({});
    render(<CalificacionDelDia />);
    const sw = await interruptor();
    await waitFor(() => expect(sw).toBeEnabled());
    await userEvent.click(sw);
    expect(put).toHaveBeenLastCalledWith('/configuracion', { CLIMA_CALIFICACION_DIA: '0' });
    expect(sw).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(sw);
    expect(put).toHaveBeenLastCalledWith('/configuracion', { CLIMA_CALIFICACION_DIA: '1' });
    expect(sw).toHaveAttribute('aria-checked', 'true');
  });

  it('si no se pudo guardar, vuelve a como estaba y lo dice', async () => {
    conConfig({});
    put.mockRejectedValueOnce(new Error('caído'));
    render(<CalificacionDelDia />);
    const sw = await interruptor();
    await waitFor(() => expect(sw).toBeEnabled());
    await userEvent.click(sw);
    await waitFor(() => expect(sw).toHaveAttribute('aria-checked', 'true'));
    expect(screen.getByText('No pudimos guardar el cambio. Intenta de nuevo.')).toBeInTheDocument();
  });
});
