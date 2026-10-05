import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// El kiosco pausado por falta de pago (4 de octubre de 2026). Se pausa 10 días después de la
// suspensión; antes no se pausaba nunca. Lo que ve el trabajador es un mensaje neutro, sin
// decir que la empresa no pagó: decisión del dueño, porque no es a ellos a quienes hay que
// decírselo.

const h = vi.hoisted(() => ({
  pausado: false,
  // Lo que responde el servidor cuando la cámara reconoce una cara, o al escribir la cédula.
  alReconocer: null as null | (() => never),
  alIngresar: null as null | (() => never),
}));

vi.mock('./marcador/api', () => ({
  infoKiosco: () => Promise.resolve({ empresa: 'Tuercas & Pernos', requiereDispositivo: false, permiteCedula: true, exigeUbicacion: false, pausado: h.pausado }),
  marcar: vi.fn(), avisarNoSoy: vi.fn(), guardarClima: vi.fn(), enviarObservacionClima: vi.fn(),
}));
vi.mock('./marcador/useSesionKiosco', () => ({
  useSesionKiosco: () => ({
    token: null, colaborador: null, estado: null, fotoReferencia: null, parecidoDudoso: false, sedes: [], validaUbicacion: undefined,
    ingresar: async () => { if (h.alIngresar) h.alIngresar(); },
    ingresarRostro: async () => { if (h.alReconocer) h.alReconocer(); },
    cargarEstado: vi.fn(), limpiarSesion: vi.fn(),
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
vi.mock('./marcador/useFlashResultado', () => ({
  useFlashResultado: () => ({ flash: null, cerrandoFlash: false, mostrarFlashOk: vi.fn(), mostrarFlashError: vi.fn(), cerrarFlash: vi.fn() }),
}));
vi.mock('../components/CamaraRostro', () => ({
  default: ({ onCapturado }: { onCapturado: (d: number[][], f: string) => void }) => (
    <button onClick={() => onCapturado([[0.1]], 'data:image/jpeg;base64,ahora')}>Cámara del kiosco</button>
  ),
}));

import Marcador from './Marcador';

const abrir = () => render(
  <MemoryRouter initialEntries={['/marcador/tok-kiosco']}>
    <Routes><Route path="/marcador/:token" element={<Marcador />} /></Routes>
  </MemoryRouter>,
);

beforeEach(() => { h.pausado = false; h.alReconocer = null; h.alIngresar = null; });

const PAUSADO = { response: { status: 402, data: { codigo: 'KIOSCO_PAUSADO', error: 'El kiosco de Tuercas & Pernos está pausado. Avísale al administrador de tu empresa.' } } };

describe('el kiosco pausado', () => {
  it('si el servidor dice que está pausado, lo dice con un mensaje neutro y no deja marcar', async () => {
    h.pausado = true;
    abrir();
    expect(await screen.findByRole('heading', { name: 'El kiosco de Tuercas & Pernos está pausado' })).toBeInTheDocument();
    expect(screen.getByText('Avísale al administrador de tu empresa.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cámara del kiosco' })).toBeNull();
  });

  it('sin pausa, abre normal', async () => {
    abrir();
    expect(await screen.findByRole('button', { name: 'Cámara del kiosco' })).toBeInTheDocument();
    expect(screen.queryByText(/está pausado/)).toBeNull();
  });

  it('si se pausa con la pantalla ya abierta, al intentar entrar lo dice', async () => {
    // La pantalla se cargó antes de la medianoche de la pausa; la persona llega después.
    h.alReconocer = () => { throw PAUSADO; };
    abrir();
    fireEvent.click(await screen.findByRole('button', { name: 'Cámara del kiosco' }));
    expect(await screen.findByRole('heading', { name: 'El kiosco de Tuercas & Pernos está pausado' })).toBeInTheDocument();
  });

  it('igual al entrar con la cédula', async () => {
    h.alIngresar = () => { throw PAUSADO; };
    abrir();
    fireEvent.click(await screen.findByRole('button', { name: /^cédula$/i }));
    const cedula = screen.getByPlaceholderText('Número de cédula');
    fireEvent.change(cedula, { target: { value: '1020304050' } });
    fireEvent.submit(cedula.closest('form')!);
    expect(await screen.findByRole('heading', { name: 'El kiosco de Tuercas & Pernos está pausado' })).toBeInTheDocument();
  });
});
