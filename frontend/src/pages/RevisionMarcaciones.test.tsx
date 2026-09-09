import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RevisionMarcaciones from './RevisionMarcaciones';

// LA PANTALLA DE REVISIÓN DE MARCACIONES.
//
// Lo que más importa probar aquí no es que pinte bonito, sino QUE NO CARGUE
// FOTOS QUE NADIE PIDIÓ. La política de tratamiento de datos que está publicada
// afirma que los datos biométricos «no se exponen en los listados del sistema y
// solo se entregan a solicitud expresa de un usuario autorizado». Si esta
// pantalla precargara las fotos de la lista, esa frase de un documento legal en
// línea dejaría de ser cierta. Por eso hay una prueba dedicada a contar
// peticiones, y no solo a mirar lo que se ve.

vi.mock('../lib/api', () => ({ default: { get: vi.fn() } }));
import api from '../lib/api';
const get = api.get as unknown as ReturnType<typeof vi.fn>;

const evento = (p: Record<string, unknown> = {}) => ({
  clave: 'r1:entrada', registroId: 'r1', momento: 'entrada',
  colaboradorId: 'c1', sedeId: null, hora: '2026-09-09T13:00:00.000Z',
  metodo: 'ROSTRO', tieneFoto: true,
  laPusoElSistema: false, distanciaRepetida: false,
  ...p,
});

const respuesta = (eventos: ReturnType<typeof evento>[]) => ({
  desde: '2026-09-09T05:00:00.000Z', hasta: '2026-09-10T05:00:00.000Z',
  dias: 1, truncado: false, eventos,
  personas: [
    { id: 'c1', nombre: 'Julián', apellido: 'Torres', cargo: 'Mesero' },
    { id: 'c2', nombre: 'Ana', apellido: 'Ruiz', cargo: null },
  ],
});

const FOTO = 'data:image/jpeg;base64,zzz';

function montarCon(eventos: ReturnType<typeof evento>[]) {
  get.mockImplementation((url: string) => {
    if (url === '/registros/revision') return Promise.resolve({ data: respuesta(eventos) });
    if (url.endsWith('/fotos')) return Promise.resolve({ data: { fotoEntrada: FOTO, fotoSalida: null } });
    return Promise.reject(new Error('url inesperada: ' + url));
  });
  return render(<RevisionMarcaciones />);
}

beforeEach(() => { get.mockReset(); });

describe('revisión de marcaciones', () => {
  it('LA GUARDA: solo pide la foto de la marcación que se está mirando', async () => {
    // Tres marcaciones en la lista, UNA sola petición de foto. Si alguien
    // cambiara la pantalla para precargarlas, esta prueba se pone roja y con
    // ella se entera de que está contradiciendo la política publicada.
    montarCon([
      evento({ clave: 'r1:entrada', registroId: 'r1' }),
      evento({ clave: 'r2:entrada', registroId: 'r2', colaboradorId: 'c2' }),
      evento({ clave: 'r3:entrada', registroId: 'r3' }),
    ]);
    // El contador es único; el nombre aparece dos veces, en la lista y en la cabecera.
    await screen.findByText('1 / 3');
    await waitFor(() => expect(get.mock.calls.filter(c => String(c[0]).endsWith('/fotos'))).toHaveLength(1));
    expect(get.mock.calls.filter(c => String(c[0]).endsWith('/fotos'))[0][0]).toBe('/registros/r1/fotos');
  });

  it('muestra la foto de quien se está mirando, y dice de quién es', async () => {
    montarCon([evento()]);
    const img = await screen.findByRole('img');
    expect(img).toHaveAttribute('src', FOTO);
    expect(img).toHaveAccessibleName(/Julián Torres/);
  });

  it('con la flecha derecha se pasa a la siguiente y se pide SU foto', async () => {
    // Es lo que hace que revisar cuarenta caras sea viable. Sin teclado, nadie
    // termina la lista.
    montarCon([
      evento({ clave: 'r1:entrada', registroId: 'r1' }),
      evento({ clave: 'r2:entrada', registroId: 'r2', colaboradorId: 'c2' }),
    ]);
    await screen.findByText('1 / 2');
    await userEvent.keyboard('{ArrowRight}');
    await screen.findByText('2 / 2');
    await waitFor(() =>
      expect(get.mock.calls.some(c => c[0] === '/registros/r2/fotos')).toBe(true));
  });

  it('cuando no hay foto explica POR QUÉ, sin adivinar', async () => {
    // Antes el producto decía «marcó con cédula o se cargó a mano» porque no
    // sabía cuál era. Ahora lo sabe.
    montarCon([evento({ tieneFoto: false, metodo: 'CEDULA' })]);
    expect(await screen.findByText(/marcó con su cédula/i)).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('una hora que puso el sistema se dice tal cual', async () => {
    montarCon([evento({ tieneFoto: false, metodo: 'SIN_DATO', laPusoElSistema: true })]);
    expect(await screen.findByText(/la puso el sistema/i)).toBeInTheDocument();
  });

  it('avisa cuando el reconocimiento dio el mismo resultado más de una vez', async () => {
    // La única señal fiable que hay: dos capturas vivas nunca coinciden al
    // milímetro.
    montarCon([evento({ distanciaRepetida: true })]);
    expect(await screen.findByText(/exactamente el mismo resultado/i)).toBeInTheDocument();
  });

  it('sin marcaciones lo dice, en vez de dejar la pantalla en blanco', async () => {
    montarCon([]);
    expect(await screen.findByText(/no hay marcaciones en este período/i)).toBeInTheDocument();
    expect(get.mock.calls.filter(c => String(c[0]).endsWith('/fotos'))).toHaveLength(0);
  });

  it('si la petición falla lo dice y no se cae', async () => {
    get.mockImplementation(() => Promise.reject(new Error('caída')));
    render(<RevisionMarcaciones />);
    expect(await screen.findByText(/no pudimos cargar las marcaciones/i)).toBeInTheDocument();
  });
});
