import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Login from './Login';
import { MENSAJE_BLOQUEO, guardarRecarga } from '../lib/bloqueoDelHosting';

// Un servidor apagado NO es una contraseña equivocada (23 de septiembre de 2026).
//
// El formulario decía "Email o contraseña incorrectos" ante cualquier fallo. Con el backend local
// caído, eso manda a buscar el problema en la contraseña, que estaba bien. Pasó de verdad.

const { login, recargarPagina } = vi.hoisted(() => ({ login: vi.fn(), recargarPagina: vi.fn() }));
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ login, usuario: null, loading: false }),
}));
// La recarga se sustituye: jsdom no navega, y lo que se prueba es QUE se pide, no que ocurra.
vi.mock('../lib/recargar', () => ({ recargarPagina: () => recargarPagina() }));

beforeEach(() => {
  login.mockReset();
  recargarPagina.mockReset();
  sessionStorage.clear();
});

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

// UN 403 QUE NO ES DE LA APP, AL INICIAR SESIÓN (6 de octubre de 2026). Ver `lib/bloqueoDelHosting.ts`.
//
// A veces el login salía «Request failed with status code 403» y solo recargando la página se podía
// volver a entrar. Ahora la página se recarga sola, una vez, y explica qué pasó. LA CONTRASEÑA NO
// SOBREVIVE A LA RECARGA —no se guarda en ninguna parte—, así que se vuelve a escribir.

const bloqueo = () => Object.assign(new Error('Request failed with status code 403'), {
  isAxiosError: true, config: {},
  response: { status: 403, data: '<html>One moment, please...</html>' },
});

describe('Login · un 403 de otra capa', () => {
  it('recarga la página sola, una vez', async () => {
    login.mockImplementation(async () => { throw bloqueo(); });
    render(<MemoryRouter><Login /></MemoryRouter>);
    await entrar();
    expect(recargarPagina).toHaveBeenCalledTimes(1);
  });

  // EL CASO QUE LA PRIMERA VERSIÓN DEJABA PASAR: el hosting contesta con JSON, y sin `error`.
  it('un 403 con el JSON de Imunify360 también recarga la página sola', async () => {
    login.mockImplementation(async () => {
      throw Object.assign(new Error('Request failed with status code 403'), {
        isAxiosError: true, config: {},
        response: { status: 403, data: {
          message: 'Access denied by Imunify360 bot-protection. IPs used for automation should be whitelisted',
        } },
      });
    });
    render(<MemoryRouter><Login /></MemoryRouter>);
    await entrar();
    expect(recargarPagina).toHaveBeenCalledTimes(1);
  });

  it('y si ya se recargó hace poco, con ese JSON tampoco hay bucle: avisa', async () => {
    guardarRecarga(sessionStorage, Date.now() - 2_000, 'ana@empresa.co');
    login.mockImplementation(async () => {
      throw Object.assign(new Error('Request failed with status code 403'), {
        isAxiosError: true, config: {},
        response: { status: 403, data: { message: 'Access denied by Imunify360 bot-protection.' } },
      });
    });
    render(<MemoryRouter><Login /></MemoryRouter>);
    await userEvent.type(screen.getByLabelText(/Contraseña/i), 'lo-que-sea');
    await userEvent.click(screen.getByRole('button', { name: /Iniciar sesión/i }));
    expect(await screen.findByText(MENSAJE_BLOQUEO)).toBeInTheDocument();
    expect(recargarPagina).not.toHaveBeenCalled();
  });

  it('antes de recargar guarda el correo y la hora, y NUNCA la contraseña', async () => {
    login.mockImplementation(async () => { throw bloqueo(); });
    render(<MemoryRouter><Login /></MemoryRouter>);
    await entrar();
    const guardado = JSON.stringify({ ...sessionStorage });
    expect(guardado).toContain('ana@empresa.co');
    expect(guardado).not.toContain('lo-que-sea');
    expect(sessionStorage.length).toBe(2);
  });

  // La guarda contra el bucle: si recargar no arregló nada, volver a recargar tampoco.
  it('si ya se recargó hace poco, no recarga otra vez: avisa', async () => {
    guardarRecarga(sessionStorage, Date.now() - 2_000, 'ana@empresa.co');
    login.mockImplementation(async () => { throw bloqueo(); });
    render(<MemoryRouter><Login /></MemoryRouter>);
    // Con la recarga reciente el correo YA viene escrito: una persona solo escribe la contraseña.
    // Teclear también el correo lo duplicaría, y un correo duplicado no pasa la validación del
    // formulario: la prueba fallaba por eso y no por lo que dice comprobar.
    await userEvent.type(screen.getByLabelText(/Contraseña/i), 'lo-que-sea');
    await userEvent.click(screen.getByRole('button', { name: /Iniciar sesión/i }));
    expect(await screen.findByText(MENSAJE_BLOQUEO)).toBeInTheDocument();
    expect(recargarPagina).not.toHaveBeenCalled();
  });

  it('pasado un rato, una recarga vieja no impide la siguiente', async () => {
    guardarRecarga(sessionStorage, Date.now() - 10 * 60_000, 'ana@empresa.co');
    login.mockImplementation(async () => { throw bloqueo(); });
    render(<MemoryRouter><Login /></MemoryRouter>);
    await entrar();
    expect(recargarPagina).toHaveBeenCalledTimes(1);
  });

  // LO QUE NO PUEDE PASAR: recargar sobre un rechazo de la app y taparle a la persona el motivo.
  it('un 403 de la app NO recarga, y dice lo que la app dijo', async () => {
    login.mockImplementation(async () => {
      throw Object.assign(new Error('403'), {
        isAxiosError: true, config: {}, response: { status: 403, data: { error: 'Empresa inactiva. Contacta a HoraPro.' } },
      });
    });
    render(<MemoryRouter><Login /></MemoryRouter>);
    await entrar();
    expect(await screen.findByText(/Empresa inactiva/i)).toBeInTheDocument();
    expect(recargarPagina).not.toHaveBeenCalled();
  });

  it('una contraseña equivocada (401) NO recarga', async () => {
    login.mockImplementation(async () => {
      throw Object.assign(new Error('401'), {
        isAxiosError: true, config: {}, response: { status: 401, data: { error: 'Credenciales inválidas' } },
      });
    });
    render(<MemoryRouter><Login /></MemoryRouter>);
    await entrar();
    expect(await screen.findByText(/Credenciales inválidas/i)).toBeInTheDocument();
    expect(recargarPagina).not.toHaveBeenCalled();
    expect(sessionStorage.length).toBe(0);
  });
});

describe('Login · después de la recarga', () => {
  it('trae el correo ya escrito y avisa por qué la página se recargó', () => {
    guardarRecarga(sessionStorage, Date.now() - 1_500, 'ana@empresa.co');
    render(<MemoryRouter><Login /></MemoryRouter>);
    expect(screen.getByLabelText(/Correo/i)).toHaveValue('ana@empresa.co');
    expect(screen.getByText(/se recargó sola/i)).toBeInTheDocument();
    expect(screen.getByText(/escribe tu contraseña otra vez/i)).toBeInTheDocument();
  });

  it('la contraseña viene VACÍA, y el cursor cae en ella', () => {
    guardarRecarga(sessionStorage, Date.now() - 1_500, 'ana@empresa.co');
    render(<MemoryRouter><Login /></MemoryRouter>);
    expect(screen.getByLabelText(/Contraseña/i)).toHaveValue('');
    expect(screen.getByLabelText(/Contraseña/i)).toHaveFocus();
  });

  it('sin una recarga reciente, el formulario es el de siempre', () => {
    render(<MemoryRouter><Login /></MemoryRouter>);
    expect(screen.getByLabelText(/Correo/i)).toHaveValue('');
    expect(screen.queryByText(/se recargó sola/i)).not.toBeInTheDocument();
  });

  it('una recarga de hace una hora no precarga nada', () => {
    guardarRecarga(sessionStorage, Date.now() - 60 * 60_000, 'ana@empresa.co');
    render(<MemoryRouter><Login /></MemoryRouter>);
    expect(screen.getByLabelText(/Correo/i)).toHaveValue('');
    expect(screen.queryByText(/se recargó sola/i)).not.toBeInTheDocument();
  });

  it('al entrar bien, olvida la recarga', async () => {
    guardarRecarga(sessionStorage, Date.now() - 1_500, 'ana@empresa.co');
    login.mockResolvedValue({ rol: 'ADMIN' });
    render(<MemoryRouter><Login /></MemoryRouter>);
    await userEvent.type(screen.getByLabelText(/Contraseña/i), 'lo-que-sea');
    await userEvent.click(screen.getByRole('button', { name: /Iniciar sesión/i }));
    await vi.waitFor(() => expect(login).toHaveBeenCalled());
    await vi.waitFor(() => expect(sessionStorage.length).toBe(0));
  });
});
