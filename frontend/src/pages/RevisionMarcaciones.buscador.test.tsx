import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RevisionMarcaciones from './RevisionMarcaciones';
import { olvidarFotos } from '../lib/fotosRevision';

// EL BUSCADOR DE LA REVISIÓN DE MARCACIONES (4 de octubre de 2026).
//
// Aquí el buscador no es solo comodidad: la lista de un día de una empresa
// mediana son cientos de marcaciones y la pantalla muestra UNA cara a la vez,
// así que llegar a la de una persona concreta es pasar de a una.
//
// Lo que más importa probar es que el índice vuelva al principio al filtrar: la
// pantalla pinta `eventos[idx]`, y si se estaba en la tercera y el filtro deja
// una, `eventos[2]` es undefined y el visor queda en blanco.

vi.mock('../lib/api', () => ({ default: { get: vi.fn() } }));
vi.mock('../lib/pistaPantalla', () => ({
  UMBRAL_PISTA: 0.7, pistaDePantalla: vi.fn(), pistaDeUrl: vi.fn(),
}));
import { pistaDePantalla, pistaDeUrl } from '../lib/pistaPantalla';
import api from '../lib/api';
const get = api.get as unknown as ReturnType<typeof vi.fn>;
const mirar = pistaDePantalla as unknown as ReturnType<typeof vi.fn>;
const mirarUrl = pistaDeUrl as unknown as ReturnType<typeof vi.fn>;
const SIN_PISTA = { hay: false, paralelas: 0.3, caras: 1, rasgos: {} as never };

const evento = (p: Record<string, unknown> = {}) => ({
  clave: 'r1:entrada', registroId: 'r1', momento: 'entrada',
  colaboradorId: 'c1', sedeId: null, hora: '2026-09-09T13:00:00.000Z',
  metodo: 'ROSTRO', tieneFoto: true, laPusoElSistema: false, distanciaRepetida: false,
  ...p,
});

const EVENTOS = [
  evento({ clave: 'r1:entrada', registroId: 'r1', colaboradorId: 'c1', hora: '2026-09-09T13:00:00.000Z' }),
  evento({ clave: 'r2:entrada', registroId: 'r2', colaboradorId: 'c1', hora: '2026-09-09T14:00:00.000Z' }),
  evento({ clave: 'r3:entrada', registroId: 'r3', colaboradorId: 'c2', hora: '2026-09-09T15:00:00.000Z' }),
];

const montar = () => {
  get.mockImplementation((url: string) => {
    if (url === '/registros/revision') {
      return Promise.resolve({
        data: {
          desde: '2026-09-09T05:00:00.000Z', hasta: '2026-09-10T05:00:00.000Z',
          dias: 1, truncado: false, eventos: EVENTOS,
          personas: [
            { id: 'c1', nombre: 'Julián', apellido: 'Torres', cargo: 'Mesero' },
            { id: 'c2', nombre: 'Ana', apellido: 'Ruiz', cargo: null },
          ],
        },
      });
    }
    if (url.endsWith('/fotos')) return Promise.resolve({ data: { fotoEntrada: 'data:image/jpeg;base64,zzz', fotoSalida: null } });
    return Promise.reject(new Error('url inesperada: ' + url));
  });
  render(<RevisionMarcaciones />);
  return userEvent.setup();
};

const caja = () => screen.getByRole('textbox', { name: /buscar/i });

beforeEach(() => {
  localStorage.clear();
  olvidarFotos();
  get.mockReset();
  mirar.mockReset(); mirar.mockResolvedValue(SIN_PISTA);
  mirarUrl.mockReset(); mirarUrl.mockResolvedValue(SIN_PISTA);
});

describe('revisión de marcaciones · buscador', () => {
  it('escribir un nombre deja solo las marcaciones de esa persona', async () => {
    const u = montar();
    expect(await screen.findByText('1 / 3')).toBeInTheDocument();
    await u.type(caja(), 'ana');
    expect(await screen.findByText('1 / 1')).toBeInTheDocument();
    // Si Julián quedó filtrado, su nombre no está en ninguna parte de la pantalla.
    expect(screen.queryByText('Julián Torres')).toBeNull();
    expect(screen.getAllByText('Ana Ruiz').length).toBeGreaterThan(0);
  });

  it('las tildes no importan: «julian» encuentra a Julián', async () => {
    const u = montar();
    await screen.findByText('1 / 3');
    await u.type(caja(), 'julian');
    expect(await screen.findByText('1 / 2')).toBeInTheDocument();
  });

  // El visor pinta eventos[idx]: filtrar sin volver al principio lo deja vacío.
  it('al filtrar vuelve a la primera marcación de la lista nueva', async () => {
    const u = montar();
    await screen.findByText('1 / 3');
    await u.click(screen.getByText('10:00'));   // la tercera, 15:00 UTC en Bogotá
    expect(await screen.findByText('3 / 3')).toBeInTheDocument();
    await u.type(caja(), 'julian');
    expect(await screen.findByText('1 / 2')).toBeInTheDocument();
  });

  it('cuando nada coincide lo dice', async () => {
    const u = montar();
    await screen.findByText('1 / 3');
    await u.type(caja(), 'zzz');
    // La frase completa, de un solo elemento: un patrón flojo pasa igual sobre
    // un texto con una palabra repetida o con el plural mal.
    expect(await screen.findByText('No encontramos marcaciones de «zzz» en este período.')).toBeInTheDocument();
    expect(screen.getByText('Hay 3 marcaciones de otras personas.')).toBeInTheDocument();
  });
});
