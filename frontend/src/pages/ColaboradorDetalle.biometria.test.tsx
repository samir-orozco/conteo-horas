import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ColaboradorDetalle from './ColaboradorDetalle';
import { mensajeDelEnlace } from '../features/colaboradores/biometria';

// EL REGISTRO FACIAL EN LA FICHA (14 de septiembre de 2026): la etiqueta, cuántas tomas tiene y quién
// lo registró, el aviso cuando alguien no autorizó y la empresa no deja marcar con cédula, y el enlace
// que el administrador crea para que la persona se registre sola.

const { get, post, copiar } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), copiar: vi.fn() }));
vi.mock('../lib/api', () => ({
  default: { get: (...a: unknown[]) => get(...a), post: (...a: unknown[]) => post(...a), put: vi.fn(), delete: vi.fn() },
}));
vi.mock('../lib/clipboard', () => ({ copiarTexto: (...a: unknown[]) => copiar(...a) }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ usuario: { nombre: 'Admin', empresaNombre: 'Rosa de Castro SAS' } }) }));

// Distinto del texto de siempre a propósito: así se ve que la casilla pinta el que manda el servidor,
// que es el que queda en la constancia.
const TEXTO_DEL_SERVIDOR = 'Texto de autorización que manda el servidor.';

// Una ficha como la devuelve GET /colaboradores/:id.
const FICHA = {
  id: 'c1', empresaId: 'e1', nombre: 'María', apellido: 'Gómez', cedula: '1030405060', cargo: 'Supervisora',
  email: null, telefono: null, fechaNacimiento: '1990-07-07T12:00:00.000Z', salarioMensual: 2300000,
  rostroEnroladoEn: null, rostroRechazadoEn: null, horarioId: null, modalidad: 'PRESENCIAL', puedeCerrarEnOtraSede: false,
  activo: true, fechaRetiro: null, motivoRetiro: null, retiroProgramado: null, creadoEn: '2026-07-06T05:54:57.228Z',
  actualizadoEn: '2026-08-26T15:11:02.108Z', foto: null, fotoMini: null, horario: null, sedeIds: [],
  biometria: { tomas: 0, ultimaConstancia: null, enlaceVenceEn: null, permiteCedula: true, textoAutorizacionAdministrador: TEXTO_DEL_SERVIDOR },
};
type Ficha = typeof FICHA;

beforeEach(() => {
  get.mockReset();
  post.mockReset();
  copiar.mockReset();
});

async function abrir(ficha: Ficha) {
  get.mockImplementation((url: string) => {
    if (url === '/colaboradores/c1') return Promise.resolve({ data: ficha });
    if (url === '/reportes/liquidacion' || url === '/reportes/tardanzas') return Promise.resolve({ data: null });
    return Promise.resolve({ data: [] });
  });
  render(
    <MemoryRouter initialEntries={['/app/colaboradores/c1']}>
      <Routes><Route path="/app/colaboradores/:id" element={<ColaboradorDetalle />} /></Routes>
    </MemoryRouter>,
  );
  await screen.findByRole('heading', { name: /Reconocimiento facial/ });
}

describe('el estado del registro facial', () => {
  it('sin registro, la casilla del administrador dice el texto que manda el servidor', async () => {
    await abrir(FICHA);
    expect(await screen.findByLabelText(TEXTO_DEL_SERVIDOR)).toBeInTheDocument();
  });

  it('con rostro registrado desde el enlace: etiqueta, cuántas tomas y que lo hizo la persona', async () => {
    await abrir({
      ...FICHA, rostroEnroladoEn: '2026-09-10T15:00:00.000Z',
      biometria: { ...FICHA.biometria, tomas: 5, ultimaConstancia: { decision: 'AUTORIZA', origen: 'ENLACE', creadoEn: '2026-09-10T15:00:00.000Z' } },
    } as unknown as Ficha);
    expect(screen.getByText('Rostro registrado')).toBeInTheDocument();
    expect(screen.getByText(/5 tomas/)).toBeInTheDocument();
    expect(screen.getByText(/lo registró la persona desde su enlace/)).toBeInTheDocument();
  });

  it('con rostro registrado por el administrador, lo dice', async () => {
    await abrir({
      ...FICHA, rostroEnroladoEn: '2026-09-10T15:00:00.000Z',
      biometria: { ...FICHA.biometria, tomas: 3, ultimaConstancia: { decision: 'AUTORIZA', origen: 'ADMINISTRADOR', creadoEn: '2026-09-10T15:00:00.000Z' } },
    } as unknown as Ficha);
    expect(screen.getByText(/lo registró el administrador/)).toBeInTheDocument();
  });

  // Todos los registros que ya había en producción son de antes de las constancias.
  it('con un registro de antes de las constancias: dice las tomas y no inventa quién lo hizo', async () => {
    await abrir({
      ...FICHA, rostroEnroladoEn: '2026-08-01T15:00:00.000Z',
      biometria: { ...FICHA.biometria, tomas: 4, ultimaConstancia: null },
    } as unknown as Ficha);
    expect(screen.getByText('4 tomas')).toBeInTheDocument();
    expect(screen.queryByText(/lo registró/)).not.toBeInTheDocument();
  });

  it('no autorizó: etiqueta y desde cuándo', async () => {
    await abrir({ ...FICHA, rostroRechazadoEn: '2026-09-12T15:00:00.000Z' } as unknown as Ficha);
    expect(screen.getByText('No autorizó')).toBeInTheDocument();
    expect(screen.getByText(/12 de septiembre de 2026/)).toBeInTheDocument();
    expect(screen.queryByText(/no permite marcar con cédula/)).not.toBeInTheDocument();
  });

  it('no autorizó y la empresa no deja marcar con cédula: avisa que así no podrá marcar', async () => {
    await abrir({ ...FICHA, rostroRechazadoEn: '2026-09-12T15:00:00.000Z', biometria: { ...FICHA.biometria, permiteCedula: false } } as unknown as Ficha);
    expect(screen.getByText(/no permite marcar con cédula/)).toBeInTheDocument();
  });
});

describe('el enlace de registro', () => {
  it('crea el enlace, muestra la dirección y copia el mensaje con la hora de vencimiento', async () => {
    post.mockResolvedValue({ data: { token: 'tok123', venceEn: '2026-09-14T20:45:00.000Z' } });
    await abrir(FICHA);
    await userEvent.click(screen.getByRole('button', { name: 'Crear enlace de registro facial' }));
    expect(post).toHaveBeenCalledWith('/colaboradores/c1/enlace-rostro');
    const url = `${window.location.origin}/registro-facial/tok123`;
    expect(await screen.findByDisplayValue(url)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Copiar mensaje' }));
    expect(copiar).toHaveBeenCalledWith(mensajeDelEnlace({ nombre: 'María', empresa: 'Rosa de Castro SAS', url, venceEn: '2026-09-14T20:45:00.000Z' }));
    expect(await screen.findByText('Mensaje copiado')).toBeInTheDocument();
  });

  it('si hay un enlace sin usar, dice a qué hora vence', async () => {
    await abrir({ ...FICHA, biometria: { ...FICHA.biometria, enlaceVenceEn: '2026-09-14T20:45:00.000Z' } } as unknown as Ficha);
    expect(screen.getByText(/enlace sin usar que vence a las 3:45 p\. m\./)).toBeInTheDocument();
  });

  it('a una persona retirada no se le ofrece el enlace', async () => {
    await abrir({ ...FICHA, activo: false, fechaRetiro: '2026-09-01T05:00:00.000Z', motivoRetiro: 'RENUNCIA' } as unknown as Ficha);
    expect(screen.queryByRole('button', { name: 'Crear enlace de registro facial' })).not.toBeInTheDocument();
  });
});
