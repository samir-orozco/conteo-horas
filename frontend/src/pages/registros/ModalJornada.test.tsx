import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../../lib/api', () => ({ default: { get: vi.fn(), put: vi.fn(), delete: vi.fn() } }));
import api from '../../lib/api';
import ModalJornada, { type Jornada } from './ModalJornada';

const get = api.get as unknown as ReturnType<typeof vi.fn>;
const bog = (h: number, m = 0) => new Date(Date.UTC(2026, 8, 10, h + 5, m)).toISOString();
const POBLADO = { id: 's1', nombre: 'El Poblado', activa: true };
const LAURELES = { id: 's2', nombre: 'Laureles', activa: true };

// La PRIMERA marcación de una jornada con almuerzo, que es la que abre la fila de
// la tabla: su salida es la del almuerzo, no la del día.
function jornada(p: { salidaAlDescansoEn: typeof POBLADO | null; sedes?: Jornada['sedes'] }): Jornada {
  return {
    registro: {
      id: 'a', colaboradorId: 'c1', fecha: bog(0), entrada: bog(8), salida: bog(12),
      tipo: 'NORMAL', observacion: null, salidaEstimada: false, salidaAlmuerzo: true, entradaEstimada: false,
      creadoEn: bog(8), editadoPor: null, editadoEn: null,
      sede: POBLADO, sedeSalida: p.salidaAlDescansoEn,
      tieneFotoEntrada: false, tieneFotoSalida: false,
    },
    colaborador: { nombre: 'Julián', apellido: 'Restrepo', cargo: null },
    fecha: bog(0),
    dia: null,
    tramos: [],
    almuerzo: {
      estado: 'SIN_VENTANA', ventana: null, salida: null, regreso: null, minutos: null, minutosVentana: null,
      minutosDescontados: 0, regresoEstimado: false, seExcedio: false, minutosDeMas: 0,
    },
    minutosDelDia: 0, minutosTarde: null, motivoSinTardanza: 'NO_PROGRAMADO', festivo: null, novedad: null,
    ...(p.sedes !== undefined ? { sedes: p.sedes } : {}),
  };
}

function montar(j: Jornada) {
  get.mockImplementation((url: string) => Promise.resolve(
    url.endsWith('/jornada') ? { data: j } : { data: { fecha: bog(0), fotos: [] } },
  ));
  render(<ModalJornada registroId="a" onCerrar={vi.fn()} onEditar={vi.fn()} onEliminar={vi.fn()} onVerMarcacion={vi.fn()} />);
}

// Con llaves a propósito: lo que DEVUELVE un beforeEach, Vitest lo toma como
// limpieza y lo llama al terminar la prueba. `mockReset` devuelve el propio mock,
// así que sin llaves se llamaba `get()` sin URL después de cada prueba.
beforeEach(() => { get.mockReset(); });

describe('las sedes en el detalle de la jornada', () => {
  it('dice dónde cerró la JORNADA, no dónde salió a almorzar', async () => {
    // Un supervisor con el permiso: entró en El Poblado, salió a almorzar en
    // Laureles y cerró otra vez en El Poblado. La tabla dice «El Poblado».
    montar(jornada({ salidaAlDescansoEn: LAURELES, sedes: { abrio: POBLADO, cerro: POBLADO } }));
    expect(await screen.findByText('El Poblado')).toBeInTheDocument();
    expect(screen.queryByText(/Cerró en/)).toBeNull();
    expect(screen.queryByText(/Laureles/)).toBeNull();
  });

  it('si la jornada abrió en una sede y cerró en otra lo dice, aunque almorzara en la de apertura', async () => {
    montar(jornada({ salidaAlDescansoEn: POBLADO, sedes: { abrio: POBLADO, cerro: LAURELES } }));
    expect(await screen.findByText('Abrió en El Poblado')).toBeInTheDocument();
    expect(screen.getByText('Cerró en Laureles')).toBeInTheDocument();
  });

  it('con un servidor anterior, que no manda las sedes de la jornada, solo dice dónde abrió', async () => {
    montar(jornada({ salidaAlDescansoEn: null }));
    expect(await screen.findByText('El Poblado')).toBeInTheDocument();
    expect(screen.queryByText(/Cerró en/)).toBeNull();
  });
});
