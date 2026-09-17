import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import MarcadorLink from './MarcadorLink';

// LA PANTALLA DEL MARCADOR DICE QUÉ ESTÁ PASANDO CON EL KIOSCO (16 de septiembre de 2026).
//
// Antes mostraba el link, un interruptor y tres tarjetas de texto fijo. No distinguía una
// empresa protegida de una expuesta, ni una tablet marcando de una colgada, y el link no se
// podía cambiar: quien se llevara la URL podía abrir el kiosco para siempre.
//
// El reloj va fijo: el «hace cuánto» de la última marcación cambiaría de resultado cada día.

vi.mock('../lib/api', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }));
vi.mock('../lib/plan', () => ({ useMiPlan: () => ({ plan: { features: { multiDispositivo: true } } }) }));
// jsdom no dibuja en canvas: la librería de QR se simula y se comprueba que se le pidió el link.
// Se exponen las DOS formas —`default` y nombrada— porque `qrcode` declara funciones con nombre y
// el componente puede importarla de cualquiera de las dos; con una sola, la prueba fallaría por la
// forma del módulo y no por lo que dice probar.
vi.mock('qrcode', () => {
  const toDataURL = vi.fn(async () => 'data:image/png;base64,QR-FALSO');
  return { default: { toDataURL }, toDataURL };
});

import api from '../lib/api';
import { toDataURL as toDataURLReal } from 'qrcode';
const get = api.get as unknown as ReturnType<typeof vi.fn>;
const post = api.post as unknown as ReturnType<typeof vi.fn>;
const toDataURL = toDataURLReal as unknown as ReturnType<typeof vi.fn>;

const TOKEN = 'cmreivbqd0002m4wukmvn0cu9';
const AHORA = new Date('2026-09-16T15:00:00Z');

type Estado = { activos: number; conRostro: number; ultimaMarcacion: string | null };

function montar(opciones: {
  soloDispositivos?: boolean;
  dispositivos?: number;
  estado?: Estado;
} = {}) {
  const { soloDispositivos = false, dispositivos = 0 } = opciones;
  const estado: Estado = opciones.estado ?? { activos: 3, conRostro: 2, ultimaMarcacion: '2026-09-16T14:00:00Z' };
  get.mockImplementation((url: string) => {
    if (url === '/configuracion/marcador-link') return Promise.resolve({ data: { marcadorToken: TOKEN, soloDispositivos } });
    if (url === '/configuracion/dispositivos') {
      return Promise.resolve({
        data: Array.from({ length: dispositivos }, (_, i) => ({
          id: `d${i}`, nombre: `Tablet ${i + 1}`, creadoEn: '2026-09-01T12:00:00Z', ultimoUso: null,
        })),
      });
    }
    if (url === '/configuracion/kiosco-estado') return Promise.resolve({ data: estado });
    return Promise.reject(new Error('url inesperada: ' + url));
  });
  return render(<MemoryRouter><MarcadorLink /></MemoryRouter>);
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(AHORA);
});
afterEach(() => { vi.useRealTimers(); });

describe('el aviso de si el kiosco está protegido', () => {
  it('sin la protección activa, avisa que cualquiera con el link puede marcar', async () => {
    montar({ soloDispositivos: false });
    expect(await screen.findByRole('status', { name: 'Estado de la protección' }))
      .toHaveTextContent(/cualquiera con este link puede marcar/i);
  });

  it('con la protección activa y ningún dispositivo, avisa que NADIE puede marcar', async () => {
    montar({ soloDispositivos: true, dispositivos: 0 });
    expect(await screen.findByRole('status', { name: 'Estado de la protección' }))
      .toHaveTextContent(/nadie puede marcar/i);
  });

  it('con la protección activa y un dispositivo vinculado, no alarma', async () => {
    montar({ soloDispositivos: true, dispositivos: 1 });
    const aviso = await screen.findByRole('status', { name: 'Estado de la protección' });
    expect(aviso).not.toHaveTextContent(/cualquiera con este link/i);
    expect(aviso).not.toHaveTextContent(/nadie puede marcar/i);
  });
});

describe('las tarjetas dicen el estado real, no texto fijo', () => {
  it('el reconocimiento facial dice cuánta gente lo tiene registrado', async () => {
    montar({ estado: { activos: 3, conRostro: 2, ultimaMarcacion: null } });
    expect(await screen.findByRole('group', { name: 'Reconocimiento facial' })).toHaveTextContent('2 de 3');
  });

  it('una empresa sin gente activa no sale como «nadie registrado»', async () => {
    montar({ estado: { activos: 0, conRostro: 0, ultimaMarcacion: null } });
    expect(await screen.findByRole('group', { name: 'Reconocimiento facial' })).not.toHaveTextContent('0 de 0');
  });

  it('dice cuánto lleva el kiosco sin una marcación', async () => {
    montar({ estado: { activos: 3, conRostro: 2, ultimaMarcacion: '2026-09-16T14:00:00Z' } });
    expect(await screen.findByRole('group', { name: 'Última marcación' })).toHaveTextContent(/hace 1 h/i);
  });

  it('sin ninguna marcación en la historia, lo dice en vez de inventar un tiempo', async () => {
    montar({ estado: { activos: 3, conRostro: 0, ultimaMarcacion: null } });
    expect(await screen.findByRole('group', { name: 'Última marcación' })).toHaveTextContent(/todavía nadie/i);
  });
});

describe('cambiar el link del kiosco', () => {
  it('no lo cambia hasta que se confirma, y avisa que se caen los dispositivos', async () => {
    const usuario = userEvent.setup();
    montar({ soloDispositivos: true, dispositivos: 2 });
    await usuario.click(await screen.findByRole('button', { name: /Generar link nuevo/i }));
    const dialogo = await screen.findByRole('dialog');
    expect(dialogo).toHaveTextContent(/dispositivos/i);
    expect(post).not.toHaveBeenCalled();
    await usuario.click(within(dialogo).getByRole('button', { name: /Cancelar/i }));
    expect(post).not.toHaveBeenCalled();
  });

  it('al confirmar, pide el link nuevo y lo muestra', async () => {
    const usuario = userEvent.setup();
    post.mockResolvedValue({ data: { marcadorToken: 'token-nuevo-9999', dispositivosRevocados: 2 } });
    montar({ soloDispositivos: true, dispositivos: 2 });
    await usuario.click(await screen.findByRole('button', { name: /Generar link nuevo/i }));
    const dialogo = await screen.findByRole('dialog');
    await usuario.click(within(dialogo).getByRole('button', { name: /Sí, generar/i }));
    expect(post).toHaveBeenCalledWith('/configuracion/marcador-link/regenerar');
    expect(await screen.findByText(new RegExp('token-nuevo-9999'))).toBeInTheDocument();
  });
});

describe('el código QR', () => {
  it('se genera con el link del kiosco y se puede descargar', async () => {
    montar();
    await screen.findByRole('img', { name: /código qr/i });
    expect(toDataURL).toHaveBeenCalledWith(expect.stringContaining(TOKEN), expect.anything());
    expect(screen.getByRole('button', { name: /Descargar QR/i })).toBeInTheDocument();
  });
});
