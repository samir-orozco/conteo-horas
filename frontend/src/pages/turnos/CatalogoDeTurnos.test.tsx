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

  // EL CATÁLOGO YA NO TIENE TURNOS DE DESCANSO (23 de septiembre de 2026, decisión del dueño).
  //
  // Aquí había una prueba que afirmaba que «el día de descanso se ve como día libre». Se borró
  // porque el comportamiento que describía dejó de existir, no porque estorbara: un descanso ya no
  // es un turno del catálogo.
  //
  // EL PORQUÉ, medido antes de decidirlo: un turno de descanso solo llevaba nombre y color, y la
  // celda del calendario NO lee ninguno de los dos (pinta un recuadro fijo). Eran dos campos que el
  // formulario pedía y que nadie mostraba jamás. Y marcarlo no hacía nada visible salvo para gente
  // ROTATIVA: para un FIJO o un PRESUMIDO el día quedaba como «sin turno».
  //
  // Esta prueba es la guarda que reemplaza a la que se fue: sin ella, alguien devuelve la casilla
  // mañana y nada se queja.
  it('no ofrece marcar un turno como día de descanso', async () => {
    const u = userEvent.setup();
    montar();
    await u.click(await screen.findByRole('button', { name: /nuevo turno/i }));
    expect(screen.queryByRole('checkbox', { name: /día de descanso/i })).toBeNull();
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

  // AQUÍ HABÍA DOS PRUEBAS MÁS y se borraron el 23 de septiembre de 2026, por la misma razón que la
  // de arriba: describían la casilla «es un día de descanso» y lo que se mandaba al marcarla. Ese
  // camino ya no existe.
  //
  // Lo que ocupa su lugar NO está en este archivo: marcar un día como libre pasó a ser una acción
  // sobre el día, en el calendario, y se prueba allá. Se deja dicho aquí para que nadie las eche de
  // menos y las reponga.

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
