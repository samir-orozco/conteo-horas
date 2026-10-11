import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../lib/api', () => ({ default: { get: vi.fn(), delete: vi.fn(), post: vi.fn(), put: vi.fn() } }));
import api from '../../lib/api';
import { invalidarMiPlan } from '../../lib/plan';
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

// SIN EL PERMISO DE GPS (15 de septiembre de 2026). Una sede con ubicación activa la geocerca en el
// kiosco, así que ponérsela o moverla es parte de la marcación por GPS del plan. Quitarla sí se puede.
// El servidor lo exige igual (routes/sedes.gps.test.ts); aquí se prueba que la pantalla no lo ofrezca.
describe('TabSedes sin el permiso de GPS', () => {
  const conPlan = (features: Record<string, boolean>, sedes: object[] = SEDES) => {
    invalidarMiPlan();
    get.mockImplementation((url: string) => {
      if (url === '/sedes') return Promise.resolve({ data: sedes });
      if (url === '/suscripcion/mi-plan') {
        return Promise.resolve({ data: { plan: 'ESENCIAL', nombrePlan: 'Esencial', ilimitado: false, limite: 10, features } });
      }
      return Promise.reject(new Error('url inesperada: ' + url));
    });
  };

  it('una sede nueva no puede exigir ubicación, y la pantalla dice por qué', async () => {
    conPlan({ multiSede: true, gps: false });
    const u = userEvent.setup();
    montar();
    await u.click(await screen.findByRole('button', { name: /nueva sede/i }));
    expect(await screen.findByText(/tu plan no incluye la marcación por gps/i)).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Exigir ubicación para marcar' })).toBeDisabled();
  });

  it('a la sede que ya tenía ubicación se la puede quitar, pero no mover', async () => {
    conPlan({ multiSede: false, gps: false }, [{ ...SEDES[1], lat: 6.2087, lng: -75.5674 }]);
    const u = userEvent.setup();
    montar();
    await u.click(await screen.findByRole('button', { name: 'Editar' }));
    expect(await screen.findByText(/tu plan no incluye la marcación por gps/i)).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Exigir ubicación para marcar' })).toBeEnabled();
    expect(screen.getByPlaceholderText('6.208700')).toBeDisabled();
    expect(screen.getByPlaceholderText('-75.567400')).toBeDisabled();
    expect(screen.getByRole('button', { name: /usar mi ubicación actual/i })).toBeDisabled();
    expect(screen.getByRole('spinbutton', { name: 'Radio permitido (metros)' })).toBeDisabled();
  });

  it('con el permiso de GPS, la ubicación se puede poner', async () => {
    conPlan({ multiSede: true, gps: true });
    const u = userEvent.setup();
    montar();
    await u.click(await screen.findByRole('button', { name: /nueva sede/i }));
    await u.click(screen.getByRole('switch', { name: 'Exigir ubicación para marcar' }));
    expect(screen.getByPlaceholderText('6.208700')).toBeEnabled();
  });
});

// MARCAR FUERA DE LA GEOCERCA, CON ALERTA (11 de octubre de 2026, PENDIENTES nº 11). Dos ajustes en la
// sede, como los pidió el dueño: si se permite y hasta cuántos metros más allá del radio. Se guardan en
// un solo número, `margenFuera`, donde 0 es «no se permite». El servidor valida igual
// (utils/ubicacionDeSede.ts y routes/sedes.gps.test.ts).
describe('TabSedes · marcar fuera de la geocerca', () => {
  const put = api.put as unknown as ReturnType<typeof vi.fn>;
  const NORTE = { ...SEDES[0], lat: 6.2087, lng: -75.5674, margenFuera: 0 };
  const conSedes = (sedes: object[], features: Record<string, boolean> = { multiSede: true, gps: true }) => {
    invalidarMiPlan();
    put.mockReset();
    put.mockResolvedValue({ data: {} });
    get.mockImplementation((url: string) => {
      if (url === '/sedes') return Promise.resolve({ data: sedes });
      if (url === '/suscripcion/mi-plan') {
        return Promise.resolve({ data: { plan: 'EMPRESARIAL', nombrePlan: 'Empresarial', ilimitado: true, limite: null, features } });
      }
      return Promise.reject(new Error('url inesperada: ' + url));
    });
  };
  const PERMITIR = 'Permitir marcar fuera de la geocerca';
  const METROS = 'Metros más allá del radio';
  const editar = async (u: ReturnType<typeof userEvent.setup>) => {
    montar();
    await u.click((await screen.findAllByRole('button', { name: 'Editar' }))[0]);
  };
  const cuerpo = () => put.mock.calls[0][1] as Record<string, unknown>;

  it('encenderlo propone 200 m y los guarda', async () => {
    conSedes([NORTE]);
    const u = userEvent.setup();
    await editar(u);
    expect(screen.getByRole('switch', { name: PERMITIR })).toHaveAttribute('aria-checked', 'false');
    await u.click(screen.getByRole('switch', { name: PERMITIR }));
    expect(screen.getByRole('spinbutton', { name: METROS })).toHaveValue(200);
    await u.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(cuerpo().margenFuera).toBe(200);
  });

  it('una sede con margen lo trae puesto, y apagarlo guarda 0', async () => {
    conSedes([{ ...NORTE, margenFuera: 300 }]);
    const u = userEvent.setup();
    await editar(u);
    expect(screen.getByRole('switch', { name: PERMITIR })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('spinbutton', { name: METROS })).toHaveValue(300);
    await u.click(screen.getByRole('switch', { name: PERMITIR }));
    await u.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(cuerpo().margenFuera).toBe(0);
  });

  it('sin exigir ubicación no se ofrece, porque no hay geocerca de la cual salirse, y se guarda 0', async () => {
    conSedes([{ ...NORTE, lat: null, lng: null }]);
    const u = userEvent.setup();
    await editar(u);
    expect(screen.queryByRole('switch', { name: PERMITIR })).toBeNull();
    await u.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(cuerpo().margenFuera).toBe(0);
  });

  it('quitarle la ubicación a una sede con margen lo apaga también: sin geocerca no hay margen', async () => {
    conSedes([{ ...NORTE, margenFuera: 300 }]);
    const u = userEvent.setup();
    await editar(u);
    await u.click(screen.getByRole('switch', { name: 'Exigir ubicación para marcar' }));
    await u.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(cuerpo()).toMatchObject({ lat: null, lng: null, margenFuera: 0 });
  });

  it('encendido con 0 o con más de 1000 m no se guarda, y dice por qué', async () => {
    conSedes([NORTE]);
    const u = userEvent.setup();
    await editar(u);
    await u.click(screen.getByRole('switch', { name: PERMITIR }));
    const metros = screen.getByRole('spinbutton', { name: METROS });
    for (const malo of ['0', '1500']) {
      await u.clear(metros);
      await u.type(metros, malo);
      await u.click(screen.getByRole('button', { name: 'Guardar' }));
      expect(screen.getByText('Escribe hasta cuántos metros más allá del radio, entre 1 y 1000.')).toBeInTheDocument();
    }
    expect(put).not.toHaveBeenCalled();
  });

  it('la lista dice el margen de la sede que lo tiene', async () => {
    conSedes([{ ...NORTE, margenFuera: 300 }]);
    montar();
    expect(await screen.findByText(/hasta 300 m más, con alerta/)).toBeInTheDocument();
  });

  it('sin el permiso de GPS no se puede cambiar: abrirlo agranda la geocerca', async () => {
    conSedes([NORTE], { multiSede: true, gps: false });
    const u = userEvent.setup();
    await editar(u);
    expect(screen.getByRole('switch', { name: PERMITIR })).toBeDisabled();
  });
});
