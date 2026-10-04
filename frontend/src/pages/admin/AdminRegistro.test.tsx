import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AdminRegistro from './AdminRegistro';

// La pantalla del registro del sistema. Se consulta por lo que ve una persona (texto, rol) y no
// por clases de CSS: una prueba que se rompe al renombrar una clase no está probando nada
// (CLAUDE.md §7).

const { get, borrar } = vi.hoisted(() => ({ get: vi.fn(), borrar: vi.fn() }));
vi.mock('../../lib/api', () => ({
  default: { get: (...a: unknown[]) => get(...a), delete: (...a: unknown[]) => borrar(...a), post: vi.fn(), put: vi.fn() },
}));

const ERROR_DE_NOMINA = {
  id: 'ev1', tipo: 'ERROR', origen: 'SERVIDOR', veces: 47,
  primeraVez: '2026-09-20T14:00:00.000Z', ultimaVez: '2026-09-23T19:22:00.000Z',
  metodo: 'POST', ruta: '/api/reportes/nomina', estado: 500,
  mensaje: "Cannot read properties of null (reading 'salario')",
  ip: '190.24.1.1', usuarioEmail: 'ana@empresa.co', usuarioNombre: 'Ana Ruiz',
  empresaId: 'e1', empresaNombre: 'Ferretería La 30', navegador: 'Mozilla/5.0',
};

const INTENTO_DE_BOT = {
  id: 'ev2', tipo: 'ACCESO', origen: 'SERVIDOR', veces: 312,
  primeraVez: '2026-09-23T08:00:00.000Z', ultimaVez: '2026-09-23T08:40:00.000Z',
  metodo: 'POST', ruta: '/api/auth/login', estado: null,
  mensaje: 'Demasiados intentos seguidos',
  ip: '45.153.160.8', usuarioEmail: null, usuarioNombre: null,
  empresaId: null, empresaNombre: null, navegador: 'curl/8.4',
};

const listaCon = (...eventos: unknown[]) => ({ data: { eventos, total: eventos.length, pagina: 1, porPagina: 50 } });
const RESUMEN = {
  data: {
    total: 359,
    porTipo: [
      { tipo: 'ERROR', filas: 1, ocurrencias: 47 },
      { tipo: 'ACCESO', filas: 1, ocurrencias: 312 },
      { tipo: 'AUDITORIA', filas: 0, ocurrencias: 0 },
    ],
  },
};

function responder(eventos: unknown[]) {
  get.mockImplementation((url: string) => {
    if (url.includes('/resumen')) return Promise.resolve(RESUMEN);
    if (url.includes('/admin/empresas')) return Promise.resolve({ data: [{ id: 'e1', nombre: 'Ferretería La 30' }] });
    if (/\/admin\/eventos\/ev\d/.test(url)) {
      return Promise.resolve({ data: { ...ERROR_DE_NOMINA, detalle: 'TypeError: Cannot read properties of null\n    at liquidar (/srv/app/dist/utils/liquidar.js:12:5)' } });
    }
    return Promise.resolve(listaCon(...eventos));
  });
}

const pintar = () => render(<MemoryRouter><AdminRegistro /></MemoryRouter>);

beforeEach(() => {
  get.mockReset();
  borrar.mockReset();
  responder([ERROR_DE_NOMINA]);
});

describe('AdminRegistro', () => {
  it('muestra el error con dónde pasó, cuántas veces y de qué empresa', async () => {
    pintar();
    // Dentro de la fila y no en toda la pantalla: el nombre de la empresa sale también en el
    // desplegable del filtro, y `getByText` suelto encontraba dos (memoria del proyecto: una
    // consulta floja da verdes y rojos falsos).
    const fila = (await screen.findByText('POST /api/reportes/nomina')).closest('tr')!;
    expect(within(fila).getByText("Cannot read properties of null (reading 'salario')")).toBeInTheDocument();
    expect(within(fila).getByText('47 veces')).toBeInTheDocument();
    expect(within(fila).getByText('Ferretería La 30')).toBeInTheDocument();
  });

  it('la hora que pinta es la de Bogotá: 19:22 UTC son las 2:22 p. m., no las 12:22', async () => {
    pintar();
    const fila = (await screen.findByText('POST /api/reportes/nomina')).closest('tr')!;
    expect(within(fila).getByText(/2:22/)).toBeInTheDocument();
    expect(within(fila).queryByText(/12:22/)).not.toBeInTheDocument();
  });

  it('al abrir un evento se ve el rastro completo, que es para lo que se guarda', async () => {
    pintar();
    await userEvent.click(await screen.findByText('POST /api/reportes/nomina'));
    expect(await screen.findByText(/at liquidar/)).toBeInTheDocument();
  });

  // Desde el 4 de octubre de 2026 la fila guarda el lugar y la persona de la ÚLTIMA vez, igual que su
  // fecha. Antes eran los de la primera, y nada lo decía (cambiosAlRepetirse en el servidor).
  it('un evento repetido dice que el lugar y la persona son los de la última vez', async () => {
    pintar();
    await userEvent.click(await screen.findByText('POST /api/reportes/nomina'));
    expect(await screen.findByText(/la ip y el navegador son los de la última vez/i)).toBeInTheDocument();
  });

  it('uno que pasó una sola vez no necesita aclararlo', async () => {
    get.mockImplementation((url: string) => {
      if (url.includes('/resumen')) return Promise.resolve(RESUMEN);
      if (url.includes('/admin/empresas')) return Promise.resolve({ data: [] });
      if (/\/admin\/eventos\/ev\d/.test(url)) return Promise.resolve({ data: { ...ERROR_DE_NOMINA, veces: 1, detalle: 'at liquidar' } });
      return Promise.resolve(listaCon({ ...ERROR_DE_NOMINA, veces: 1 }));
    });
    pintar();
    await userEvent.click(await screen.findByText('POST /api/reportes/nomina'));
    expect(await screen.findByText(/at liquidar/)).toBeInTheDocument();
    expect(screen.queryByText(/son los de la última vez/i)).not.toBeInTheDocument();
  });

  it('la pestaña de accesos pide al servidor ese tipo y enseña la IP', async () => {
    pintar();
    await screen.findByText('POST /api/reportes/nomina');
    responder([INTENTO_DE_BOT]);

    await userEvent.click(screen.getByRole('button', { name: /Accesos/ }));

    expect(await screen.findByText('Demasiados intentos seguidos')).toBeInTheDocument();
    expect(screen.getByText('45.153.160.8')).toBeInTheDocument();
    expect(get.mock.calls.some(([url]) => String(url).includes('tipo=ACCESO'))).toBe(true);
  });

  it('el buscador se lo pasa al servidor: filtrar en el navegador solo filtraría la página que se ve', async () => {
    pintar();
    await screen.findByText('POST /api/reportes/nomina');

    await userEvent.type(screen.getByPlaceholderText(/Buscar/i), '45.153.160.8');

    await vi.waitFor(() => {
      expect(get.mock.calls.some(([url]) => String(url).includes('buscar=45.153.160.8'))).toBe(true);
    });
  });

  it('borrar todo el registro no pasa con un solo clic', async () => {
    pintar();
    await screen.findByText('POST /api/reportes/nomina');

    await userEvent.click(screen.getByRole('button', { name: /Borrar/i }));
    await userEvent.click(await screen.findByRole('button', { name: /Borrar todo el registro/i }));

    expect(borrar).not.toHaveBeenCalled();
    // Hay que confirmarlo aparte.
    await userEvent.click(await screen.findByRole('button', { name: /Sí, borrar/i }));
    expect(borrar).toHaveBeenCalledWith('/admin/eventos', { data: { todo: true } });
  });

  it('borrar un período manda las dos fechas, no "todo"', async () => {
    pintar();
    await screen.findByText('POST /api/reportes/nomina');

    await userEvent.type(screen.getByLabelText(/Desde/i), '2026-01-01');
    await userEvent.type(screen.getByLabelText(/Hasta/i), '2026-06-30');
    await userEvent.click(screen.getByRole('button', { name: /Borrar/i }));
    await userEvent.click(await screen.findByRole('button', { name: /Borrar el período/i }));
    await userEvent.click(await screen.findByRole('button', { name: /Sí, borrar/i }));

    expect(borrar).toHaveBeenCalledWith('/admin/eventos', {
      data: { desde: '2026-01-01', hasta: '2026-06-30', tipo: 'ERROR' },
    });
  });

  it('cuando no hay nada que mostrar lo dice, en vez de dejar la tabla en blanco', async () => {
    responder([]);
    pintar();
    expect(await screen.findByText(/No hay nada registrado/i)).toBeInTheDocument();
  });
});
