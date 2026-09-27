import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AdminCuenta from './AdminCuenta';

const { get, put, refrescarUsuario, USUARIO } = vi.hoisted(() => ({
  get: vi.fn(), put: vi.fn(), refrescarUsuario: vi.fn(),
  // Estable entre renders, como el que entrega el contexto de verdad. Uno nuevo en cada llamada
  // haría que cualquier efecto que dependa de él se dispare sin parar.
  USUARIO: { id: 'u1', nombre: 'Samir Orozco', email: 'samir@horapro.co', rol: 'SUPER_ADMIN', emailVerificado: true },
}));
vi.mock('../../lib/api', () => ({ default: { get: (...a: unknown[]) => get(...a), put: (...a: unknown[]) => put(...a) } }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ usuario: USUARIO, refrescarUsuario }) }));

const ACCESOS = [
  {
    id: 'a1', tipo: 'ACCESO', origen: 'SERVIDOR', veces: 12,
    primeraVez: '2026-09-23T08:00:00.000Z', ultimaVez: '2026-09-23T19:40:00.000Z',
    metodo: 'POST', ruta: '/api/auth/login', estado: null,
    mensaje: 'Contraseña incorrecta: samir@horapro.co',
    ip: '45.153.160.8', usuarioEmail: 'samir@horapro.co', usuarioNombre: null,
    empresaId: null, empresaNombre: null, navegador: 'curl/8.4',
  },
];

beforeEach(() => {
  get.mockReset(); put.mockReset(); refrescarUsuario.mockReset();
  get.mockImplementation(async () => ({ data: { eventos: ACCESOS, total: 1, pagina: 1, porPagina: 50 } }));
  put.mockImplementation(async () => ({ data: { ok: true } }));
});

const pintar = () => render(<MemoryRouter><AdminCuenta /></MemoryRouter>);

describe('AdminCuenta', () => {
  it('se presenta con quién eres y con qué permisos', async () => {
    pintar();
    expect(await screen.findByText('Samir Orozco')).toBeInTheDocument();
    expect(screen.getByText('Super administrador · HoraPro')).toBeInTheDocument();
    expect(screen.getByText('SO')).toBeInTheDocument(); // iniciales, porque no guardamos foto
  });

  it('guarda el nombre y el correo, y refresca la sesión para que el cambio se vea arriba', async () => {
    pintar();
    const nombre = await screen.findByLabelText(/Nombre/i);
    await userEvent.clear(nombre);
    await userEvent.type(nombre, 'Samir O.');
    await userEvent.click(screen.getByRole('button', { name: /Guardar/i }));

    expect(put).toHaveBeenCalledWith('/auth/me', { nombre: 'Samir O.', email: 'samir@horapro.co' });
    expect(refrescarUsuario).toHaveBeenCalled();
  });

  it('en Seguridad, dice qué le falta a la contraseña mientras se escribe', async () => {
    pintar();
    await userEvent.click(await screen.findByRole('button', { name: /Seguridad/i }));
    await userEvent.type(screen.getByLabelText('Nueva contraseña'), 'contrasena');
    expect(await screen.findByText(/un número/i)).toBeInTheDocument();
    expect(screen.getByText(/una mayúscula/i)).toBeInTheDocument();
  });

  it('no manda nada al servidor si las dos contraseñas nuevas no coinciden', async () => {
    pintar();
    await userEvent.click(await screen.findByRole('button', { name: /Seguridad/i }));
    await userEvent.type(screen.getByLabelText('Contraseña actual'), 'laDeAhora');
    await userEvent.type(screen.getByLabelText('Nueva contraseña'), 'nuevaClave1');
    await userEvent.type(screen.getByLabelText('Repite la nueva contraseña'), 'otraCosa9');
    await userEvent.click(screen.getByRole('button', { name: /Cambiar contraseña/i }));

    expect(await screen.findByText(/no coinciden/i)).toBeInTheDocument();
    expect(put).not.toHaveBeenCalled();
  });

  it('cambia la contraseña y NO deja los campos escritos después', async () => {
    pintar();
    await userEvent.click(await screen.findByRole('button', { name: /Seguridad/i }));
    await userEvent.type(screen.getByLabelText('Contraseña actual'), 'laDeAhora');
    await userEvent.type(screen.getByLabelText('Nueva contraseña'), 'nuevaClave1');
    await userEvent.type(screen.getByLabelText('Repite la nueva contraseña'), 'nuevaClave1');
    await userEvent.click(screen.getByRole('button', { name: /Cambiar contraseña/i }));

    expect(put).toHaveBeenCalledWith('/auth/me', { passwordActual: 'laDeAhora', passwordNueva: 'nuevaClave1' });
    expect(await screen.findByText(/actualizada/i)).toBeInTheDocument();
    expect((screen.getByLabelText('Contraseña actual') as HTMLInputElement).value).toBe('');
  });

  it('si el servidor rechaza la contraseña actual, lo dice con sus palabras', async () => {
    put.mockImplementation(async () => {
      throw Object.assign(new Error('400'), { isAxiosError: true, config: {}, response: { status: 400, data: { error: 'La contraseña actual no es correcta' } } });
    });
    pintar();
    await userEvent.click(await screen.findByRole('button', { name: /Seguridad/i }));
    await userEvent.type(screen.getByLabelText('Contraseña actual'), 'equivocada');
    await userEvent.type(screen.getByLabelText('Nueva contraseña'), 'nuevaClave1');
    await userEvent.type(screen.getByLabelText('Repite la nueva contraseña'), 'nuevaClave1');
    await userEvent.click(screen.getByRole('button', { name: /Cambiar contraseña/i }));

    expect(await screen.findByText(/La contraseña actual no es correcta/i)).toBeInTheDocument();
  });

  it('muestra quién ha intentado entrar a TU cuenta, del registro del sistema', async () => {
    pintar();
    const panel = (await screen.findByText(/Intentos contra tu cuenta/i)).closest('section')!;
    expect(within(panel).getByText('45.153.160.8')).toBeInTheDocument();
    expect(within(panel).getByText(/12 veces/)).toBeInTheDocument();
    expect(get.mock.calls.some(([url]) => String(url).includes('tipo=ACCESO'))).toBe(true);
    expect(get.mock.calls.some(([url]) => String(url).includes('samir%40horapro.co'))).toBe(true);
  });

  it('si no hay intentos, lo dice en positivo en vez de dejar un hueco', async () => {
    get.mockImplementation(async () => ({ data: { eventos: [], total: 0, pagina: 1, porPagina: 50 } }));
    pintar();
    expect(await screen.findByText(/Nadie ha intentado entrar/i)).toBeInTheDocument();
  });
});
