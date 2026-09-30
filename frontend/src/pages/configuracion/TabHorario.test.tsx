import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../lib/api', () => ({ default: { get: vi.fn(), put: vi.fn(), post: vi.fn(), delete: vi.fn() } }));
import api from '../../lib/api';
import TabHorario from './TabHorario';

// LA PANTALLA DE HORARIOS, EN LO QUE TOCA A LOS DESCANSOS NO REMUNERADOS.
//
// Decisión del dueño del 12 de septiembre de 2026: varios descansos por franja, cada
// uno con su desde y su hasta, debajo del almuerzo, y ninguno se paga. Esta pantalla no
// tenía pruebas; estas cubren la costura con el servidor (qué se muestra de lo que llega
// y qué se manda al guardar), que es donde un descanso se pierde sin avisar.

const get = api.get as unknown as ReturnType<typeof vi.fn>;
const put = api.put as unknown as ReturnType<typeof vi.fn>;

// El horario del ejemplo del dueño: lunes a viernes de 07:00 a 16:00, almuerzo de 12:00
// a 13:00 y descansos de 09:00 a 09:15 y de 15:00 a 15:10. Más un sábado corto sin
// almuerzo ni descansos.
const OFICINA = {
  id: 'h1', nombre: 'Oficina', toleranciaMin: 10, almuerzoMin: 60, toleranciaSalidaMin: 0, ajustaEntrada: false,
  fotoEnDescanso: true, activo: true, _count: { colaboradores: 3 },
  franjas: [
    {
      id: 'f1', horarioId: 'h1', dias: ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'], horaEntrada: '07:00', horaSalida: '16:00',
      tieneAlmuerzo: true, almuerzoInicio: '12:00', almuerzoFin: '13:00',
      descansos: [{ inicio: '09:00', fin: '09:15' }, { inicio: '15:00', fin: '15:10' }],
    },
    {
      id: 'f2', horarioId: 'h1', dias: ['SABADO'], horaEntrada: '08:00', horaSalida: '12:00',
      tieneAlmuerzo: false, almuerzoInicio: null, almuerzoFin: null, descansos: [],
    },
  ],
};
// Otro horario con un solo descanso, para la tarjeta.
const PLANTA = {
  ...OFICINA, id: 'h2', nombre: 'Planta', _count: { colaboradores: 1 },
  franjas: [{ ...OFICINA.franjas[0], id: 'f3', horarioId: 'h2', descansos: [{ inicio: '10:00', fin: '10:15' }] }],
};
const LEGALES = { fechaReferencia: '2026-09-12', jornadaSemanal: 42, horasMes: 210, tiposHoraVigentes: [], calendarioJornadas: [] };
const RECARGA = 'Esta pantalla quedó desactualizada. Recarga la página y vuelve a guardar el horario.';

// Con llaves: lo que devuelve un beforeEach, Vitest lo toma como limpieza.
beforeEach(() => {
  get.mockReset();
  put.mockReset();
  get.mockImplementation((url: string) => Promise.resolve({
    data: url === '/horarios' ? [OFICINA, PLANTA]
      : url === '/configuracion/legales' ? LEGALES
      : url === '/suscripcion/mi-plan' ? { features: { multiHorario: true } }
      : {},
  }));
});

const montar = () => render(<MemoryRouter><TabHorario /></MemoryRouter>);

async function abrirOficina() {
  const usuario = userEvent.setup();
  montar();
  await usuario.click(await screen.findByRole('button', { name: 'Editar el horario Oficina' }));
  return usuario;
}

describe('TabHorario · los descansos no remunerados', () => {
  it('la tarjeta dice el descanso cuando es uno, y cuántos cuando son varios', async () => {
    montar();
    expect(await screen.findByText(/· 2 descansos/)).toBeInTheDocument();
    expect(screen.getByText(/· descanso 10:00–10:15/)).toBeInTheDocument();
  });

  it('editar muestra los descansos debajo del almuerzo de su franja, y guardar manda la lista, también vacía en la franja sin descansos', async () => {
    put.mockResolvedValueOnce({ data: { regeneracion: { hoy: 0, diferidos: [] } } });
    const usuario = await abrirOficina();
    expect(screen.getByLabelText('Descanso 1 desde')).toHaveValue('09:00');
    expect(screen.getByLabelText('Descanso 2 hasta')).toHaveValue('15:10');
    const almuerzo = screen.getByText('Horario del almuerzo');
    expect(almuerzo.compareDocumentPosition(screen.getByLabelText('Descanso 1 desde')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    await usuario.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(put).toHaveBeenCalledTimes(1));
    const [url, cuerpo] = put.mock.calls[0];
    expect(url).toBe('/horarios/h1');
    expect(cuerpo.franjas[0].descansos).toEqual([{ inicio: '09:00', fin: '09:15' }, { inicio: '15:00', fin: '15:10' }]);
    expect(cuerpo.franjas[1]).toHaveProperty('descansos', []);
    expect(cuerpo.franjas[0]).not.toHaveProperty('descansoInicio');
  });

  it('agregar un descanso en el sábado lo manda en esa franja', async () => {
    put.mockResolvedValueOnce({ data: {} });
    const usuario = await abrirOficina();
    const botones = screen.getAllByRole('button', { name: 'Agregar descanso' });
    await usuario.click(botones[botones.length - 1]);
    const desde = screen.getAllByLabelText('Descanso 1 desde');
    const hasta = screen.getAllByLabelText('Descanso 1 hasta');
    fireEvent.change(desde[desde.length - 1], { target: { value: '10:00' } });
    fireEvent.change(hasta[hasta.length - 1], { target: { value: '10:15' } });
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(put).toHaveBeenCalledTimes(1));
    expect(put.mock.calls[0][1].franjas[1].descansos).toEqual([{ inicio: '10:00', fin: '10:15' }]);
    expect(put.mock.calls[0][1].franjas[0].descansos).toHaveLength(2);
  });

  it('la jornada semanal ya descuenta los dos descansos', async () => {
    await abrirOficina();
    // Lunes a viernes: 540 − 60 − 25 = 455 min, por 5 días son 2275. Sábado: 240.
    // 2515 min son 41.9 h.
    expect(screen.getByText('41.9 h')).toBeInTheDocument();
  });

  it('si el servidor pide recargar porque la pantalla quedó vieja, se muestra su mensaje tal cual', async () => {
    put.mockRejectedValueOnce({ response: { status: 400, data: { error: RECARGA, codigo: 'FORMATO_VIEJO' } } });
    const usuario = await abrirOficina();
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText(RECARGA)).toBeInTheDocument();
  });

  // La duración de una franja sale de la misma regla que la del almuerzo y los descansos
  // (lib/descansos.ts, `minutosEntre`), y no de una copia propia (12 de septiembre de 2026).
  it('un turno nocturno que cruza la medianoche cuenta sus horas en la jornada semanal y no avisa que dura poco', async () => {
    const NOCHE = {
      ...OFICINA, id: 'h3', nombre: 'Noche', almuerzoMin: 0, _count: { colaboradores: 2 },
      franjas: [{
        id: 'f4', horarioId: 'h3', dias: ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'], horaEntrada: '22:00', horaSalida: '06:00',
        tieneAlmuerzo: false, almuerzoInicio: null, almuerzoFin: null, descansos: [{ inicio: '02:00', fin: '02:12' }],
      }],
    };
    get.mockImplementation((url: string) => Promise.resolve({
      data: url === '/horarios' ? [OFICINA, PLANTA, NOCHE]
        : url === '/configuracion/legales' ? LEGALES
        : url === '/suscripcion/mi-plan' ? { features: { multiHorario: true } }
        : {},
    }));
    const usuario = userEvent.setup();
    montar();
    await usuario.click(await screen.findByRole('button', { name: 'Editar el horario Noche' }));
    // De 22:00 a 06:00 son 480 min; menos el descanso de 12 quedan 468, por 5 días 2340: 39 h.
    expect(screen.getByText('39 h')).toBeInTheDocument();
    expect(screen.queryByText(/Esta franja dura/)).toBeNull();
  });

  // Con la copia de antes, una hora borrada daba NaN, y el resumen decía «NaN h» y «Supera la
  // jornada legal en NaN h». Con la regla compartida, a una franja sin sus dos horas no se le
  // cuenta duración.
  it('una franja a la que se le borra la salida no deja la jornada semanal en NaN: esa franja no suma', async () => {
    await abrirOficina();
    fireEvent.change(screen.getByDisplayValue('16:00'), { target: { value: '' } });
    // Queda solo el sábado: 240 min, 4 h.
    expect(screen.getByText('4 h')).toBeInTheDocument();
    expect(screen.queryByText(/NaN/)).toBeNull();
  });
});
