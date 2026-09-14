import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ColaboradorDetalle from './ColaboradorDetalle';

// La ventana «Editar datos» de la ficha (13 de septiembre de 2026). Guardaba sin atajar el error: si el
// servidor rechazaba el cambio, la ventana se quedaba abierta sin decir nada, con cualquier motivo
// («Horario inválido», un texto que no cabe en su columna). Aquí se prueba qué ve la persona.

const { get, put } = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }));
vi.mock('../lib/api', () => ({
  default: { get: (...a: unknown[]) => get(...a), put: (...a: unknown[]) => put(...a), post: vi.fn(), delete: vi.fn() },
}));
// La ficha toma de la sesión el nombre de la empresa, para el mensaje del enlace de registro facial.
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ usuario: { nombre: 'Admin', empresaNombre: 'Empresa de prueba' } }) }));

// Una ficha como la devuelve GET /colaboradores/:id.
const FICHA = {
  id: 'c1', empresaId: 'e1', nombre: 'María', apellido: 'Gómez', cedula: '1030405060', cargo: 'Supervisora',
  email: null, telefono: null, fechaNacimiento: '1990-07-07T12:00:00.000Z', salarioMensual: 2300000,
  rostroEnroladoEn: null, horarioId: null, modalidad: 'PRESENCIAL', puedeCerrarEnOtraSede: false, activo: true,
  fechaRetiro: null, motivoRetiro: null, retiroProgramado: null, creadoEn: '2026-07-06T05:54:57.228Z',
  actualizadoEn: '2026-08-26T15:11:02.108Z', foto: null, fotoMini: null, horario: null, sedeIds: [],
};
// Lo que responde el servidor a un cargo de 200 caracteres (medido contra la ruta real).
const RECHAZO = { response: { status: 400, data: { error: 'El campo Cargo tiene 200 caracteres y caben 191.' } } };

beforeEach(() => {
  get.mockReset();
  put.mockReset();
  get.mockImplementation((url: string) => {
    if (url === '/colaboradores/c1') return Promise.resolve({ data: FICHA });
    if (url === '/reportes/liquidacion' || url === '/reportes/tardanzas') return Promise.resolve({ data: null });
    return Promise.resolve({ data: [] });
  });
});

async function abrirEditar() {
  render(
    <MemoryRouter initialEntries={['/app/colaboradores/c1']}>
      <Routes><Route path="/app/colaboradores/:id" element={<ColaboradorDetalle />} /></Routes>
    </MemoryRouter>,
  );
  await userEvent.click(await screen.findByRole('button', { name: 'Editar' }));
  expect(screen.getByRole('heading', { name: 'Editar datos' })).toBeInTheDocument();
}

describe('guardar en «Editar datos»', () => {
  it('si el servidor rechaza el cambio, su mensaje se ve dentro de la ventana y la ventana sigue abierta', async () => {
    put.mockRejectedValue(RECHAZO);
    await abrirEditar();
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    const aviso = await screen.findByRole('alert');
    expect(aviso).toHaveTextContent('El campo Cargo tiene 200 caracteres y caben 191.');
    expect(screen.getByRole('button', { name: 'Guardar cambios' }).closest('form')).toContainElement(aviso);
    expect(screen.getByRole('heading', { name: 'Editar datos' })).toBeInTheDocument();
  });

  it('si no hay respuesta del servidor, lo dice con sus palabras', async () => {
    put.mockRejectedValue(new Error('Network Error'));
    await abrirEditar();
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos guardar los cambios. Intenta de nuevo.');
  });

  it('al volver a abrir la ventana, el mensaje de la vez anterior ya no está', async () => {
    put.mockRejectedValue(RECHAZO);
    await abrirEditar();
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await screen.findByRole('alert');
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Editar' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('si guarda bien, manda el PUT de la persona y la ventana se cierra', async () => {
    put.mockResolvedValue({ data: FICHA });
    await abrirEditar();
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Editar datos' })).not.toBeInTheDocument());
    expect(put).toHaveBeenCalledWith('/colaboradores/c1', expect.objectContaining({ nombre: 'María', cargo: 'Supervisora' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
