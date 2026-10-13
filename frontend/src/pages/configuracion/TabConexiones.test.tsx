import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../lib/api', () => ({ default: { get: vi.fn(), put: vi.fn(), post: vi.fn() } }));
import api from '../../lib/api';
import { invalidarMiPlan } from '../../lib/plan';
import TabConexiones from './TabConexiones';

// LOS DOS AVISOS DE TELEGRAM (11 de octubre de 2026). Al de llegadas tarde se suma «no ha llegado».
// Comparten el chat, así que los pasos para conectarlo tienen que verse con CUALQUIERA de los dos
// encendido: antes colgaban del de llegadas tarde, y quien solo quisiera el nuevo no podía poner el chat.

const get = api.get as unknown as ReturnType<typeof vi.fn>;
const put = api.put as unknown as ReturnType<typeof vi.fn>;

const conConfig = (cfg: Record<string, string>) => {
  get.mockImplementation((url: string) => {
    if (url === '/configuracion') return Promise.resolve({ data: cfg });
    if (url === '/suscripcion/mi-plan') {
      return Promise.resolve({ data: { plan: 'PROFESIONAL', nombrePlan: 'Profesional', ilimitado: false, limite: 50, features: { telegram: true } } });
    }
    return Promise.reject(new Error('url inesperada: ' + url));
  });
};
const montar = () => render(<MemoryRouter><TabConexiones /></MemoryRouter>);
const interruptor = (nombre: RegExp) => screen.findByRole('switch', { name: nombre });

beforeEach(() => { get.mockReset(); put.mockReset(); put.mockResolvedValue({ data: { ok: true } }); invalidarMiPlan(); });

describe('TabConexiones: los avisos de Telegram', () => {
  it('encender «no ha llegado» guarda su clave', async () => {
    conConfig({});
    montar();
    const sw = await interruptor(/quién no ha llegado/i);
    await waitFor(() => expect(sw).toBeEnabled());
    expect(sw).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(sw);
    expect(put).toHaveBeenLastCalledWith('/configuracion', { TELEGRAM_NO_HA_LLEGADO: '1' });
    expect(sw).toHaveAttribute('aria-checked', 'true');
  });

  it('con solo «no ha llegado» encendido, se ven los pasos para conectar el chat', async () => {
    conConfig({ TELEGRAM_NO_HA_LLEGADO: '1', TELEGRAM_CHAT_ID: '-100123' });
    montar();
    expect(await screen.findByLabelText(/id del chat de telegram/i)).toHaveValue('-100123');
    expect(await interruptor(/llegadas tarde/i)).toHaveAttribute('aria-checked', 'false');
  });

  it('con los dos apagados, los pasos no se ven', async () => {
    conConfig({ TELEGRAM_CHAT_ID: '-100123' });
    montar();
    await waitFor(async () => expect(await interruptor(/quién no ha llegado/i)).toBeEnabled());
    expect(screen.queryByLabelText(/id del chat de telegram/i)).not.toBeInTheDocument();
  });

  it('el de llegadas tarde sigue funcionando como antes', async () => {
    conConfig({ TELEGRAM_ALERTAS_TARDE: '1' });
    montar();
    const sw = await interruptor(/llegadas tarde/i);
    await waitFor(() => expect(sw).toHaveAttribute('aria-checked', 'true'));
    await userEvent.click(sw);
    expect(put).toHaveBeenLastCalledWith('/configuracion', { TELEGRAM_ALERTAS_TARDE: '0' });
  });

  // Encontrado en el navegador el 11 de octubre: el servidor se reinició justo al apagar el aviso, el
  // guardado falló y la pantalla quedó diciendo «apagado» con el aviso encendido en la base. Quien lo
  // apagó cree que ya no llegan, y siguen llegando al grupo.
  it('si no se pudo guardar, el interruptor vuelve a como estaba y lo dice', async () => {
    conConfig({ TELEGRAM_NO_HA_LLEGADO: '1', TELEGRAM_ALERTAS_TARDE: '1' });
    put.mockRejectedValue(new Error('red'));
    montar();
    const noLlego = await interruptor(/quién no ha llegado/i);
    await waitFor(() => expect(noLlego).toHaveAttribute('aria-checked', 'true'));
    await userEvent.click(noLlego);
    expect(await screen.findByText('No pudimos guardar el cambio. Intenta de nuevo.')).toBeInTheDocument();
    expect(noLlego).toHaveAttribute('aria-checked', 'true');

    const tarde = await interruptor(/llegadas tarde/i);
    await userEvent.click(tarde);
    expect(tarde).toHaveAttribute('aria-checked', 'true');
  });

  it('el aviso de novedades por aprobar tiene su interruptor y también muestra los pasos del chat', async () => {
    conConfig({ TELEGRAM_NOVEDADES: '1' });
    montar();
    const sw = await interruptor(/novedades por aprobar/i);
    await waitFor(() => expect(sw).toHaveAttribute('aria-checked', 'true'));
    expect(screen.getByLabelText(/id del chat de telegram/i)).toBeInTheDocument();
    await userEvent.click(sw);
    expect(put).toHaveBeenLastCalledWith('/configuracion', { TELEGRAM_NOVEDADES: '0' });
  });

  it('el aviso de pausas sin volver tiene su interruptor y también muestra los pasos del chat (13 de octubre de 2026)', async () => {
    conConfig({ TELEGRAM_PAUSAS: '1' });
    montar();
    const sw = await interruptor(/no ha vuelto de su pausa/i);
    await waitFor(() => expect(sw).toHaveAttribute('aria-checked', 'true'));
    expect(screen.getByLabelText(/id del chat de telegram/i)).toBeInTheDocument();
    await userEvent.click(sw);
    expect(put).toHaveBeenLastCalledWith('/configuracion', { TELEGRAM_PAUSAS: '0' });
  });

  it('el mensaje de turnos cerrados solos tiene su interruptor y también muestra los pasos del chat (13 de octubre de 2026)', async () => {
    conConfig({ TELEGRAM_TURNOS_CERRADOS: '1' });
    montar();
    const sw = await interruptor(/turnos cerrados solos/i);
    await waitFor(() => expect(sw).toHaveAttribute('aria-checked', 'true'));
    expect(screen.getByLabelText(/id del chat de telegram/i)).toBeInTheDocument();
    await userEvent.click(sw);
    expect(put).toHaveBeenLastCalledWith('/configuracion', { TELEGRAM_TURNOS_CERRADOS: '0' });
  });
});
