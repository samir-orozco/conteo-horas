import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ColaboradorDetalle from './ColaboradorDetalle';

// CUANDO EL ROSTRO QUE SE REGISTRA SE PARECE AL DE OTRA PERSONA (2 de octubre de 2026).
//
// Una toma con la cara de otra persona hacía que esa persona marcara como esta
// para siempre. El servidor ahora lo detecta y responde 409 con el nombre de a
// quién se parece; la ficha se lo dice al administrador y le deja decidir, porque
// entre hermanos es normal y bloquearlo los dejaría sin rostro.

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('../lib/api', () => ({
  default: { get: (...a: unknown[]) => get(...a), post: (...a: unknown[]) => post(...a), put: vi.fn(), delete: vi.fn() },
}));
vi.mock('../lib/clipboard', () => ({ copiarTexto: vi.fn() }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ usuario: { nombre: 'Admin', empresaNombre: 'Rosa de Castro SAS' } }) }));
// La cámara de verdad pide permiso y carga modelos: aquí entrega las tomas al tocarla.
const TOMAS = [[0.1], [0.2]];
vi.mock('../components/CamaraRostro', () => ({
  default: ({ onCapturado }: { onCapturado: (d: number[][], f: string) => void }) => (
    <button onClick={() => onCapturado(TOMAS, 'data:image/jpeg;base64,toma')}>Tomar el registro</button>
  ),
}));
vi.mock('../features/colaboradores/foto', async (original) => ({
  ...(await original<typeof import('../features/colaboradores/foto')>()),
  miniaturaDe: () => Promise.resolve('data:image/jpeg;base64,mini'),
}));

const TEXTO = 'Texto de autorización que manda el servidor.';
const FICHA = {
  id: 'c1', empresaId: 'e1', nombre: 'Gloria', apellido: 'Candelo', cedula: '1030405060', cargo: null,
  email: null, telefono: null, fechaNacimiento: null, salarioMensual: 2300000,
  rostroEnroladoEn: null, rostroRechazadoEn: null, horarioId: null, modalidad: 'PRESENCIAL', puedeCerrarEnOtraSede: false,
  activo: true, fechaRetiro: null, motivoRetiro: null, retiroProgramado: null, creadoEn: '2026-07-06T05:54:57.228Z',
  actualizadoEn: '2026-08-26T15:11:02.108Z', foto: null, fotoMini: null, horario: null, sedeIds: [],
  biometria: { tomas: 0, ultimaConstancia: null, enlaceVenceEn: null, permiteCedula: true, textoAutorizacionAdministrador: TEXTO },
};

const parecido = () => Object.assign(new Error('409'), {
  response: { status: 409, data: { error: 'Este rostro se parece mucho al de otra persona de la empresa.', codigo: 'ROSTRO_PARECIDO', parecidos: [{ id: 'c2', nombre: 'Erika Candelo' }] } },
});

beforeEach(() => {
  get.mockReset();
  post.mockReset();
  get.mockImplementation((url: string) => {
    if (url === '/colaboradores/c1') return Promise.resolve({ data: FICHA });
    if (url === '/reportes/liquidacion' || url === '/reportes/tardanzas') return Promise.resolve({ data: null });
    return Promise.resolve({ data: [] });
  });
});

async function registrar() {
  render(
    <MemoryRouter initialEntries={['/app/colaboradores/c1']}>
      <Routes><Route path="/app/colaboradores/:id" element={<ColaboradorDetalle />} /></Routes>
    </MemoryRouter>,
  );
  await userEvent.click(await screen.findByLabelText(TEXTO));
  await userEvent.click(screen.getByRole('button', { name: /registrar rostro/i }));
  await userEvent.click(screen.getByRole('button', { name: 'Tomar el registro' }));
}

describe('registrar un rostro que se parece al de otra persona', () => {
  it('le dice al administrador a quién se parece y no guarda nada todavía', async () => {
    post.mockRejectedValueOnce(parecido());
    await registrar();
    expect(await screen.findByRole('dialog', { name: /se parece mucho al de erika candelo/i })).toBeInTheDocument();
    expect(post).toHaveBeenCalledTimes(1);
    // El primer envío NO confirma: si confirmara, el servidor guardaría sin preguntar.
    expect(post.mock.calls[0][1]).not.toHaveProperty('confirmarParecido');
  });

  it('«Registrar de todos modos» vuelve a mandar las mismas tomas, confirmando', async () => {
    post.mockRejectedValueOnce(parecido()).mockResolvedValueOnce({ data: { ok: true } });
    await registrar();
    await userEvent.click(await screen.findByRole('button', { name: /registrar de todos modos/i }));
    expect(post).toHaveBeenLastCalledWith('/colaboradores/c1/rostro', expect.objectContaining({ descriptores: TOMAS, confirmarParecido: true }));
    expect(await screen.findByText('Rostro registrado con éxito')).toBeInTheDocument();
  });

  it('cancelar no guarda y pide repetir el registro', async () => {
    post.mockRejectedValueOnce(parecido());
    await registrar();
    await userEvent.click(await screen.findByRole('button', { name: /^cancelar$/i }));
    expect(post).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/repite el registro con solo esta persona/i)).toBeInTheDocument();
  });
});
