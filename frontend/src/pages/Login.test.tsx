import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Login from './Login';

// Un servidor apagado NO es una contraseña equivocada (23 de septiembre de 2026).
//
// El formulario decía "Email o contraseña incorrectos" ante cualquier fallo. Con el backend local
// caído, eso manda a buscar el problema en la contraseña, que estaba bien. Pasó de verdad.

const { login } = vi.hoisted(() => ({ login: vi.fn() }));
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ login, usuario: null, loading: false }),
}));

const entrar = async () => {
  await userEvent.type(screen.getByLabelText(/Correo/i), 'ana@empresa.co');
  await userEvent.type(screen.getByLabelText(/Contraseña/i), 'lo-que-sea');
  await userEvent.click(screen.getByRole('button', { name: /Iniciar sesión/i }));
};

describe('Login', () => {
  it('cuando el servidor no responde lo dice, en vez de culpar a la contraseña', async () => {
    login.mockImplementation(async () => { throw Object.assign(new Error('Network Error'), { isAxiosError: true, code: 'ERR_NETWORK', config: {} }); });
    render(<MemoryRouter><Login /></MemoryRouter>);
    await entrar();
    expect(await screen.findByText(/conexión con el servidor/i)).toBeInTheDocument();
    expect(screen.queryByText(/contraseña incorrectos/i)).not.toBeInTheDocument();
  });

  it('cuando el servidor sí rechaza las credenciales, dice lo que el servidor dijo', async () => {
    login.mockImplementation(async () => {
      throw Object.assign(new Error('401'), {
        isAxiosError: true, config: {}, response: { status: 401, data: { error: 'Credenciales inválidas' } },
      });
    });
    render(<MemoryRouter><Login /></MemoryRouter>);
    await entrar();
    expect(await screen.findByText(/Credenciales inválidas/i)).toBeInTheDocument();
  });

  it('un fallo sin forma reconocible sigue teniendo su mensaje de siempre', async () => {
    login.mockImplementation(async () => { throw 'algo raro'; });
    render(<MemoryRouter><Login /></MemoryRouter>);
    await entrar();
    expect(await screen.findByText(/Email o contraseña incorrectos/i)).toBeInTheDocument();
  });
});
