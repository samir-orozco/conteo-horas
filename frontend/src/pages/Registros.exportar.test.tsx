import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../lib/api', () => ({ default: { get: vi.fn(), put: vi.fn(), post: vi.fn(), delete: vi.fn() } }));
// El motor de Excel se simula: lo que importa aquí es QUÉ se le manda. Que escriba
// un .xlsx de verdad lo cubre lib/exportar, y SheetJS no se carga en una prueba.
vi.mock('../lib/exportar', () => ({ descargarExcelHojas: vi.fn() }));
import api from '../lib/api';
import { descargarExcelHojas } from '../lib/exportar';
import { COLUMNAS_REGISTROS } from '../features/registros/exportarRegistros';
import Registros from './Registros';

// EL BOTÓN DE EXPORTAR DE LA PANTALLA DE REGISTROS (peticiones 7, 19 y 32).
//
// Lo que se protege, y es lo único que puede salir mal de verdad: que baje LO QUE
// SE ESTÁ VIENDO. Un botón conectado a la página en curso exporta 50 filas de 300
// sin avisar, y uno conectado a la lista cruda ignora los filtros puestos. Las dos
// formas de equivocarse dan un archivo plausible.

const get = api.get as unknown as ReturnType<typeof vi.fn>;
const exportar = descargarExcelHojas as unknown as ReturnType<typeof vi.fn>;

const bog = (h: number, m = 0, d = 1) => new Date(Date.UTC(2026, 8, d, h + 5, m)).toISOString();
const COLABORADOR = { id: 'c1', nombre: 'Ana María', apellido: 'Gómez', cedula: '1020304050' };

const jornada = (id: string, extra: Record<string, unknown> = {}) => ({
  id, colaboradorId: 'c1', colaborador: { id: 'c1', nombre: 'Ana María', apellido: 'Gómez' },
  fecha: bog(0), entrada: bog(8), salida: bog(17), tipo: 'NORMAL', observacion: null,
  sede: null, sedeSalida: null, sedeAtribuida: null,
  minutosTarde: 0, minutosContados: 480, minutosAlmuerzoAqui: 60,
  tieneFotoEntrada: false, tieneFotoSalida: false, salidaEstimada: false, salidaAlmuerzo: false,
  almuerzo: null, novedad: null, marcaciones: [],
  ...extra,
});

const montar = (jornadas: unknown[]) => {
  get.mockReset();
  exportar.mockReset();
  get.mockImplementation((url: string) => Promise.resolve({
    data: url === '/registros' ? jornadas : url === '/colaboradores' ? [COLABORADOR] : [],
  }));
  render(<Registros />);
  return userEvent.setup();
};

const boton = () => screen.findByRole('button', { name: /exportar/i });
// La hoja que recibió el motor de Excel.
const hoja = () => exportar.mock.calls[0][1][0] as { nombre: string; columnas: string[]; filas: unknown[][] };

beforeEach(() => { get.mockReset(); exportar.mockReset(); });

describe('Registros · exportar a Excel', () => {
  it('manda una hoja con las columnas y una fila por jornada', async () => {
    const u = montar([jornada('a'), jornada('b', { entrada: bog(14), salida: bog(18) })]);
    await u.click(await boton());
    expect(exportar).toHaveBeenCalledTimes(1);
    expect(hoja().columnas).toEqual(COLUMNAS_REGISTROS);
    expect(hoja().filas).toHaveLength(2);
    expect(hoja().filas[0][COLUMNAS_REGISTROS.indexOf('Colaborador')]).toBe('Ana María Gómez');
    // La cédula sale de la lista de colaboradores: la jornada no la trae.
    expect(hoja().filas[0][COLUMNAS_REGISTROS.indexOf('Cédula')]).toBe('1020304050');
  });

  it('el archivo lleva el rango de fechas en el nombre', async () => {
    const u = montar([jornada('a')]);
    await u.click(await boton());
    expect(exportar.mock.calls[0][0]).toMatch(/^Registros_\d{4}-\d{2}-\d{2}_a_\d{4}-\d{2}-\d{2}$/);
  });

  // LA QUE IMPORTA: con un filtro puesto baja solo lo filtrado.
  it('con un filtro puesto, exporta solo lo que queda en la tabla', async () => {
    const u = montar([jornada('a'), jornada('estimada', { salidaEstimada: true })]);
    await u.click(await screen.findByRole('button', { name: /filtros/i }));
    // Las opciones del menú de filtros son botones con aria-pressed, no casillas.
    await u.click(await screen.findByRole('button', { name: 'No marcó salida' }));
    await u.click(await boton());
    expect(hoja().filas).toHaveLength(1);
    expect(hoja().filas[0][COLUMNAS_REGISTROS.indexOf('Salida estimada')]).toBe('Sí');
  });

  // LA OTRA: la tabla pagina de 50 en 50 y el archivo no se pagina.
  it('exporta todas las filtradas, no solo la página que se ve', async () => {
    const muchas = Array.from({ length: 51 }, (_, i) =>
      jornada(`j${i}`, { fecha: bog(0, 0, (i % 28) + 1), entrada: bog(8, 0, (i % 28) + 1) }));
    const u = montar(muchas);
    await u.click(await boton());
    expect(hoja().filas).toHaveLength(51);
  });

  it('sin nada que exportar, el botón no se puede oprimir', async () => {
    montar([]);
    expect(await boton()).toBeDisabled();
  });
});
