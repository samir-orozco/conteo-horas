import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../lib/api', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }));
import api from '../../lib/api';
import CatalogoDeTurnos from './CatalogoDeTurnos';

// EL CATÁLOGO DE TURNOS (19 de septiembre de 2026, turnos rotativos paso 1).
//
// Un turno es una franja sin días: «Mañana 06:00-14:00», «Noche 22:00-06:00», «Descanso». El
// planificador los usará después como brocha para pintar el calendario; esta pantalla es donde se
// definen, y se puede enseñar sola.
//
// Se consulta por lo que ve una persona (texto y rol), nunca por clases de CSS: una prueba que se
// rompe al renombrar una clase no está probando comportamiento.

const get = api.get as unknown as ReturnType<typeof vi.fn>;
const post = api.post as unknown as ReturnType<typeof vi.fn>;

const TURNOS = [
  {
    id: 'p1', nombre: 'Mañana', color: 'ambar', esDescanso: false, sedeId: null,
    horaEntrada: '06:00', horaSalida: '14:00', tieneAlmuerzo: true,
    almuerzoInicio: '10:00', almuerzoFin: '10:30', descansos: [{ inicio: '08:00', fin: '08:15' }],
  },
  {
    id: 'p2', nombre: 'Noche', color: 'indigo', esDescanso: false, sedeId: null,
    horaEntrada: '22:00', horaSalida: '06:00', tieneAlmuerzo: false,
    almuerzoInicio: null, almuerzoFin: null, descansos: [],
  },
  {
    id: 'p3', nombre: 'Descanso', color: 'grafito', esDescanso: true, sedeId: null,
    horaEntrada: null, horaSalida: null, tieneAlmuerzo: false,
    almuerzoInicio: null, almuerzoFin: null, descansos: [],
  },
];

const SEDES = [{ id: 's1', nombre: 'Norte' }, { id: 's2', nombre: 'Sur' }];

beforeEach(() => {
  get.mockReset();
  post.mockReset();
  post.mockResolvedValue({ data: {} });
  get.mockImplementation((url: string) => {
    if (url === '/plantillas-turno') return Promise.resolve({ data: TURNOS });
    if (url === '/sedes') return Promise.resolve({ data: SEDES });
    return Promise.reject(new Error('url inesperada: ' + url));
  });
});

const montar = () => render(<MemoryRouter><CatalogoDeTurnos /></MemoryRouter>);

describe('el catálogo de turnos', () => {
  it('muestra cada turno con su horario', async () => {
    montar();
    expect(await screen.findByText('Mañana')).toBeInTheDocument();
    expect(screen.getByText(/06:00 a 14:00/)).toBeInTheDocument();
    expect(screen.getByText(/22:00 a 06:00/)).toBeInTheDocument();
  });

  // El día libre no tiene horario, y decirlo es parte de lo que la pantalla enseña: un turno sin
  // horas en blanco se leería como «todavía sin configurar».
  it('el día de descanso se ve como día libre, no como un turno sin horas', async () => {
    montar();
    expect(await screen.findByText('Descanso')).toBeInTheDocument();
    expect(screen.getByText(/día libre/i)).toBeInTheDocument();
  });

  it('sin turnos todavía, lo dice en vez de dejar el cuadro vacío', async () => {
    get.mockImplementation((url: string) =>
      Promise.resolve({ data: url === '/plantillas-turno' ? [] : SEDES }));
    montar();
    expect(await screen.findByText(/todavía no hay turnos/i)).toBeInTheDocument();
  });
});

describe('crear un turno', () => {
  it('el formulario pide nombre y horario', async () => {
    const u = userEvent.setup();
    montar();
    await u.click(await screen.findByRole('button', { name: /nuevo turno/i }));
    expect(screen.getByLabelText(/^nombre/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/hora de entrada/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/hora de salida/i)).toBeInTheDocument();
  });

  // ESTA ES LA DECISIÓN DE LA PANTALLA. Al marcar que es un día de descanso, el horario deja de
  // tener sentido y desaparece: un día libre con hora de entrada es una contradicción que el
  // administrador no debería poder escribir.
  it('al marcar que es un día de descanso, el horario desaparece', async () => {
    const u = userEvent.setup();
    montar();
    await u.click(await screen.findByRole('button', { name: /nuevo turno/i }));
    expect(screen.getByLabelText(/hora de entrada/i)).toBeInTheDocument();
    await u.click(screen.getByRole('checkbox', { name: /día de descanso/i }));
    expect(screen.queryByLabelText(/hora de entrada/i)).toBeNull();
  });

  // Lo que se manda no puede contradecir lo que se marcó, aunque el servidor lo descarte igual.
  it('un descanso se guarda sin ninguna hora', async () => {
    const u = userEvent.setup();
    montar();
    await u.click(await screen.findByRole('button', { name: /nuevo turno/i }));
    await u.type(screen.getByLabelText(/^nombre/i), 'Día libre');
    await u.click(screen.getByRole('checkbox', { name: /día de descanso/i }));
    await u.click(screen.getByRole('button', { name: /^guardar$/i }));

    expect(post).toHaveBeenCalledWith('/plantillas-turno', expect.objectContaining({
      nombre: 'Día libre', esDescanso: true,
    }));
    const cuerpo = post.mock.calls[0][1] as Record<string, unknown>;
    expect(Object.keys(cuerpo)).not.toContain('horaEntrada');
    expect(Object.keys(cuerpo)).not.toContain('horaSalida');
  });

  // El servidor es el que valida de verdad, así que su motivo tiene que llegar a la pantalla. Sin
  // esto, guardar algo imposible no hace nada y no dice nada.
  it('si el servidor rechaza, muestra su motivo', async () => {
    post.mockRejectedValue({ response: { data: { error: 'La entrada y la salida no pueden ser la misma hora.' } } });
    const u = userEvent.setup();
    montar();
    await u.click(await screen.findByRole('button', { name: /nuevo turno/i }));
    await u.type(screen.getByLabelText(/^nombre/i), 'Raro');
    await u.click(screen.getByRole('button', { name: /^guardar$/i }));
    expect(await screen.findByText(/no pueden ser la misma hora/i)).toBeInTheDocument();
  });
});
