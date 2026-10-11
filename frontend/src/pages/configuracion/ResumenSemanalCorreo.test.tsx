import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../lib/api', () => ({ default: { get: vi.fn(), put: vi.fn() } }));
import api from '../../lib/api';
import ResumenSemanalCorreo from './ResumenSemanalCorreo';

// EL INTERRUPTOR DEL RESUMEN SEMANAL (11 de octubre de 2026). Viene encendido de fábrica: una empresa
// que nunca lo tocó no tiene la clave guardada, y eso tiene que leerse como encendido. Si se leyera
// como apagado, la pantalla diría «no te llega» a quien sí le está llegando.

const get = api.get as unknown as ReturnType<typeof vi.fn>;
const put = api.put as unknown as ReturnType<typeof vi.fn>;
const conConfig = (cfg: Record<string, string>) => get.mockResolvedValue({ data: cfg });
const interruptor = () => screen.findByRole('switch', { name: /resumen semanal por correo/i });

beforeEach(() => { get.mockReset(); put.mockReset(); put.mockResolvedValue({ data: { ok: true } }); });

describe('ResumenSemanalCorreo', () => {
  it('una empresa que nunca lo tocó lo ve encendido', async () => {
    conConfig({ TELEGRAM_CHAT_ID: '123' });
    render(<ResumenSemanalCorreo />);
    await waitFor(async () => expect(await interruptor()).toHaveAttribute('aria-checked', 'true'));
  });

  it('apagarlo guarda «0» y prenderlo guarda «1»', async () => {
    conConfig({});
    render(<ResumenSemanalCorreo />);
    const sw = await interruptor();
    await waitFor(() => expect(sw).toBeEnabled());
    await userEvent.click(sw);
    expect(put).toHaveBeenLastCalledWith('/configuracion', { RESUMEN_SEMANAL_CORREO: '0' });
    expect(sw).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(sw);
    expect(put).toHaveBeenLastCalledWith('/configuracion', { RESUMEN_SEMANAL_CORREO: '1' });
    expect(sw).toHaveAttribute('aria-checked', 'true');
  });

  it('una empresa que lo apagó lo ve apagado', async () => {
    conConfig({ RESUMEN_SEMANAL_CORREO: '0' });
    render(<ResumenSemanalCorreo />);
    await waitFor(async () => expect(await interruptor()).toHaveAttribute('aria-checked', 'false'));
  });

  it('si no se pudo guardar, vuelve a como estaba y lo dice', async () => {
    conConfig({});
    put.mockRejectedValue(new Error('red'));
    render(<ResumenSemanalCorreo />);
    const sw = await interruptor();
    await waitFor(() => expect(sw).toBeEnabled());
    await userEvent.click(sw);
    expect(await screen.findByText('No pudimos guardar el cambio. Intenta de nuevo.')).toBeInTheDocument();
    expect(sw).toHaveAttribute('aria-checked', 'true');
  });
});
