import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';

vi.mock('../lib/api', () => ({ default: { get: vi.fn(), put: vi.fn(), post: vi.fn(), delete: vi.fn() } }));
import api from '../lib/api';
import Registros from './Registros';

// LA ETIQUETA DE «2.º INGRESO» EN LA TABLA DE REGISTROS (4 de octubre de 2026).
//
// Pedido del dueño: cuando alguien tiene más de una jornada el mismo día, que la
// tabla lo diga, para no tener que cruzar fechas con el dedo buscando si eso es
// un turno partido o una marcación duplicada.

const get = api.get as unknown as ReturnType<typeof vi.fn>;

// Un instante dado en hora de Bogotá, que es UTC-5 todo el año. El 1 de
// septiembre de 2026 para todas, salvo donde la prueba dice otra cosa.
const bog = (h: number, m = 0, d = 1) => new Date(Date.UTC(2026, 8, d, h + 5, m)).toISOString();
const COLABORADOR = { id: 'c1', nombre: 'Julián', apellido: 'Restrepo' };

const jornada = (id: string, entrada: string, salida: string, dia = 1) => ({
  id, colaboradorId: 'c1', colaborador: COLABORADOR,
  fecha: bog(0, 0, dia), entrada, salida, tipo: 'NORMAL', observacion: null,
  sede: null, sedeSalida: null, minutosTarde: null, minutosContados: 240, minutosAlmuerzoAqui: 0,
  tieneFotoEntrada: false, tieneFotoSalida: false, salidaEstimada: false, salidaAlmuerzo: false,
  almuerzo: null, novedad: null, marcaciones: [],
});

const montar = (jornadas: unknown[]) => {
  get.mockReset();
  get.mockImplementation((url: string) => Promise.resolve({
    data: url === '/registros' ? jornadas : url === '/colaboradores' ? [COLABORADOR] : [],
  }));
  render(<Registros />);
};

const filaDe = async (hora: string) => (await screen.findByText(hora)).closest('tr')!;

beforeEach(() => { get.mockReset(); });

describe('Registros · segundo ingreso del día', () => {
  it('con dos jornadas el mismo día, la segunda queda marcada y la primera no', async () => {
    // Como las manda el servidor: lo más reciente primero.
    montar([jornada('b', bog(14), bog(18)), jornada('a', bog(8), bog(12))]);
    expect(within(await filaDe('14:00')).getByText('2.º ingreso')).toBeInTheDocument();
    expect(within(await filaDe('08:00')).queryByText(/ingreso/)).toBeNull();
  });

  it('con una sola jornada no hay etiqueta', async () => {
    montar([jornada('a', bog(8), bog(12))]);
    await screen.findByText('08:00');
    expect(screen.queryByText(/º ingreso/)).toBeNull();
  });

  it('dos jornadas en días distintos no son un segundo ingreso', async () => {
    // Horas distintas a propósito: con las dos a las 08:00, la búsqueda por
    // texto encuentra dos elementos y la prueba falla por el fixture y no por
    // lo que dice probar.
    montar([jornada('b', bog(9, 0, 2), bog(12, 0, 2), 2), jornada('a', bog(8), bog(12))]);
    await screen.findByText('08:00');
    expect(screen.queryByText(/º ingreso/)).toBeNull();
  });

  it('con tres, la tercera dice 3.º ingreso', async () => {
    montar([jornada('c', bog(19), bog(21)), jornada('b', bog(14), bog(18)), jornada('a', bog(8), bog(12))]);
    expect(within(await filaDe('19:00')).getByText('3.º ingreso')).toBeInTheDocument();
    expect(within(await filaDe('14:00')).getByText('2.º ingreso')).toBeInTheDocument();
  });
});
