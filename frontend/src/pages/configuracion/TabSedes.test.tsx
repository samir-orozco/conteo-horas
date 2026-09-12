import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../lib/api', () => ({ default: { get: vi.fn(), delete: vi.fn(), post: vi.fn(), put: vi.fn() } }));
import api from '../../lib/api';
import TabSedes from './TabSedes';

// LO QUE DICE LA PESTAÑA DE SEDES SOBRE LA SEDE PRINCIPAL.
//
// Decisión del dueño del 12 de septiembre de 2026: a quien se queda sin sede no se
// le asigna otra. Si trabaja presencial se le cuenta, al leer, en la Sede principal,
// que es la sede activa más antigua. El diálogo de eliminar no puede prometer que la
// gente «pasa» a otra sede, y si se elimina la principal tiene que decir cuál toma
// su lugar. La regla del texto, con sus casos, en lib/sedePrincipal.test.ts.

const get = api.get as unknown as ReturnType<typeof vi.fn>;

// En el orden en que las manda GET /sedes, que es por nombre: la más antigua que
// queda al quitar la principal (Sur) no es la primera de la lista.
const sede = (id: string, nombre: string, creadoEn: string, principal: boolean) =>
  ({ id, nombre, direccion: null, lat: null, lng: null, radio: 150, creadoEn, principal, _count: { colaboradores: 0 } });
const SEDES = [
  sede('s-norte', 'Norte', '2026-03-01T15:00:00.000Z', false),
  sede('s-principal', 'Sede principal', '2026-01-10T15:00:00.000Z', true),
  sede('s-sur', 'Sur', '2026-02-01T15:00:00.000Z', false),
];

beforeEach(() => {
  get.mockReset();
  get.mockImplementation((url: string) => {
    if (url === '/sedes') return Promise.resolve({ data: SEDES });
    if (url === '/suscripcion/mi-plan') {
      return Promise.resolve({ data: { plan: 'EMPRESARIAL', nombrePlan: 'Empresarial', ilimitado: true, limite: null, features: { multiSede: true } } });
    }
    return Promise.reject(new Error('url inesperada: ' + url));
  });
});

const montar = () => render(<MemoryRouter><TabSedes /></MemoryRouter>);

describe('TabSedes y la Sede principal', () => {
  it('al eliminar la principal, el aviso nombra la sede que quedará como principal y dice que ahí pasan a contarse las marcaciones sin ubicación', async () => {
    const u = userEvent.setup();
    montar();
    await u.click(await screen.findByRole('button', { name: 'Eliminar Sede principal' }));
    expect(screen.getByText(/la principal pasa a ser Sur/)).toBeInTheDocument();
    expect(screen.getByText(/o en Sur si no les queda ninguna, también en fechas pasadas/)).toBeInTheDocument();
  });

  // Revisión del 12 de septiembre de 2026: el aviso prometía que todo lo marcado en la
  // sede «conserva su registro histórico», y eso solo vale para lo que probó la ubicación.
  it('al eliminar otra sede, el aviso dice qué sigue contando ahí y qué pasa a contarse en la principal, también en fechas pasadas', async () => {
    const u = userEvent.setup();
    montar();
    await u.click(await screen.findByRole('button', { name: 'Eliminar Norte' }));
    expect(screen.getByText(/Las marcaciones hechas con ubicación en Norte siguen contando en Norte/)).toBeInTheDocument();
    expect(screen.getByText(/o en Sede principal si no les queda ninguna, también en fechas pasadas/)).toBeInTheDocument();
    expect(screen.queryByText(/conservan su registro histórico/)).toBeNull();
  });

  it('la etiqueta PRINCIPAL explica que ahí se cuenta, no que ahí se asigna', async () => {
    montar();
    expect(await screen.findByTitle('Quien trabaja presencial y no tiene ninguna sede elegida se cuenta en esta'))
      .toHaveTextContent('PRINCIPAL');
  });
});
