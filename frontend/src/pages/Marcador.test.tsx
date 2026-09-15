import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Marcador from './Marcador';

// Con qué abre el kiosco (decisión del dueño del 15 de septiembre de 2026): primero el rostro, y la
// cédula como segunda opción cuando la empresa la permite. Después de cada marcación vuelve al
// rostro, aunque quien marcó haya entrado con la cédula.

const h = vi.hoisted(() => ({ permiteCedula: true, salir: undefined as undefined | (() => void) }));

vi.mock('./marcador/api', () => ({
  infoKiosco: () => Promise.resolve({ empresa: 'Tuercas & Pernos', requiereDispositivo: false, permiteCedula: h.permiteCedula, exigeUbicacion: false }),
  marcar: vi.fn(),
}));
vi.mock('./marcador/useSesionKiosco', () => ({
  useSesionKiosco: () => ({
    token: null, colaborador: null, sedes: [], validaUbicacion: undefined, estado: null,
    ingresar: vi.fn(), ingresarRostro: vi.fn(), cargarEstado: vi.fn(), limpiarSesion: vi.fn(),
  }),
}));
vi.mock('./marcador/useGeolocalizacion', () => ({
  useGeolocalizacion: () => ({
    ubicOk: false, buscandoUbic: false, errorUbic: null, setErrorUbic: vi.fn(), permiso: 'sin-preguntar',
    limpiar: vi.fn(), activarUbicacion: vi.fn(), obtenerUbicacion: vi.fn(),
  }),
}));
vi.mock('./marcador/useVinculoDispositivo', () => ({
  useVinculoDispositivo: () => ({
    claveDispositivo: null, requiereVinculo: false, setRequiereVinculo: vi.fn(), codigoVinculo: '', setCodigoVinculo: vi.fn(),
    errorVinculo: '', setErrorVinculo: vi.fn(), vinculando: false, vincular: vi.fn(), getDeviceToken: () => null, olvidarDispositivo: vi.fn(),
  }),
}));
// Se guarda el `salir` que el kiosco le entrega: es lo que corre al cerrarse el aviso de una marcación.
vi.mock('./marcador/useFlashResultado', () => ({
  useFlashResultado: (salir: () => void) => {
    h.salir = salir;
    return { flash: null, cerrandoFlash: false, mostrarFlashOk: vi.fn(), mostrarFlashError: vi.fn(), cerrarFlash: vi.fn() };
  },
}));
// La cámara de verdad carga los modelos de reconocimiento y pide permiso; aquí basta saber si está.
vi.mock('../components/CamaraRostro', () => ({ default: () => <div>Cámara del kiosco</div> }));

const abrir = async () => {
  render(
    <MemoryRouter initialEntries={['/marcador/tok-kiosco']}>
      <Routes><Route path="/marcador/:token" element={<Marcador />} /></Routes>
    </MemoryRouter>,
  );
  await screen.findByText('Tuercas & Pernos');
};

beforeEach(() => {
  h.permiteCedula = true;
  h.salir = undefined;
});

describe('Marcador · con qué abre el kiosco', () => {
  it('con la cédula permitida abre en el rostro, y la cédula es la segunda opción', async () => {
    await abrir();
    expect(screen.getByText('Cámara del kiosco')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Número de cédula')).not.toBeInTheDocument();
    const [primera, segunda] = screen.getAllByRole('button', { name: /^(rostro|cédula)$/i });
    expect(primera).toHaveAccessibleName(/^rostro$/i);
    expect(segunda).toHaveAccessibleName(/^cédula$/i);
  });

  it('la cédula queda a un toque', async () => {
    await abrir();
    fireEvent.click(screen.getByRole('button', { name: /^cédula$/i }));
    expect(screen.getByPlaceholderText('Número de cédula')).toBeInTheDocument();
    expect(screen.queryByText('Cámara del kiosco')).not.toBeInTheDocument();
  });

  it('después de una marcación vuelve al rostro, aunque la persona haya entrado con la cédula', async () => {
    await abrir();
    fireEvent.click(screen.getByRole('button', { name: /^cédula$/i }));
    act(() => h.salir!());
    expect(screen.getByText('Cámara del kiosco')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Número de cédula')).not.toBeInTheDocument();
  });

  it('sin la cédula permitida abre en el rostro y no ofrece la cédula', async () => {
    h.permiteCedula = false;
    await abrir();
    expect(screen.getByText('Cámara del kiosco')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^cédula$/i })).not.toBeInTheDocument();
  });
});
