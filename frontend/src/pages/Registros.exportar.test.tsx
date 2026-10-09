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
const COLABORADOR = { id: 'c1', nombre: 'Ana María', apellido: 'Gómez', cedula: '1020304050', sedeNombres: ['Norte'] };

const jornada = (id: string, extra: Record<string, unknown> = {}) => ({
  id, colaboradorId: 'c1', colaborador: { id: 'c1', nombre: 'Ana María', apellido: 'Gómez' },
  fecha: bog(0), entrada: bog(8), salida: bog(17), tipo: 'NORMAL', observacion: null,
  sede: null, sedeSalida: null, sedeAtribuida: null,
  minutosTarde: 0, minutosContados: 480, minutosAlmuerzoAqui: 60,
  tieneFotoEntrada: false, tieneFotoSalida: false, salidaEstimada: false, salidaAlmuerzo: false,
  almuerzo: null, novedad: null, marcaciones: [],
  ...extra,
});

const BEATRIZ = { id: 'c2', nombre: 'Beatriz', apellido: 'Ruiz', cedula: '555', sedeNombres: ['Norte'] };

const montar = (jornadas: unknown[], colaboradores: unknown[] = [COLABORADOR]) => {
  get.mockReset();
  exportar.mockReset();
  get.mockImplementation((url: string) => Promise.resolve({
    data: url === '/registros' ? jornadas : url === '/colaboradores' ? colaboradores : [],
  }));
  render(<Registros />);
  return userEvent.setup();
};

const boton = () => screen.findByRole('button', { name: /exportar/i });
// La hoja que recibió el motor de Excel.
type Hoja = { nombre: string; columnas: string[]; filas: unknown[][] };
const hoja = () => exportar.mock.calls[0][1][0] as Hoja;
const hojas = () => exportar.mock.calls[0][1] as Hoja[];

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

  // Las dos columnas de sede salen de fuentes distintas: «Sede» de la ficha de la persona (la lista de
  // colaboradores) y «Marcó en» de la jornada. Si la pantalla no le pasa a la función de dónde sacar la
  // primera, la columna sale vacía en TODAS las filas y el archivo parece bien armado.
  it('«Sede» es la de la persona y «Marcó en» la de la jornada', async () => {
    const sur = { id: 's2', nombre: 'Sur' };
    const u = montar([jornada('a', { sede: sur, sedeSalida: sur })]);
    await u.click(await boton());
    expect(hoja().filas[0][COLUMNAS_REGISTROS.indexOf('Sede')]).toBe('Norte');
    expect(hoja().filas[0][COLUMNAS_REGISTROS.indexOf('Marcó en')]).toBe('Sur');
  });

  // LA HOJA «ENTRADAS POR DÍA» (petición del dueño del 9 de octubre): personas por días, con la hora de
  // la primera entrada. Va como segunda hoja del MISMO archivo, así que respeta lo mismo que la primera.
  describe('la hoja «Entradas por día»', () => {
    const enMatriz = () => hojas()[1];

    it('va como segunda hoja, después de «Registros»', async () => {
      const u = montar([jornada('a')]);
      await u.click(await boton());
      expect(hojas().map(h => h.nombre)).toEqual(['Registros', 'Entradas por día']);
      expect(enMatriz().columnas[0]).toBe('Colaborador');
      expect(enMatriz().columnas.slice(1).every(c => /^\d{4}-\d{2}-\d{2}$/.test(c))).toBe(true);
    });

    it('trae la hora de entrada de la persona en el día de su jornada', async () => {
      const u = montar([jornada('a', { entrada: bog(8, 30) })]);
      await u.click(await boton());
      const col = enMatriz().columnas.indexOf('2026-09-01');
      expect(col).toBeGreaterThan(0);
      expect(enMatriz().filas[0][0]).toBe('Ana María Gómez');
      expect(enMatriz().filas[0][col]).toBe('08:30');
    });

    // Sin filtros, la persona que no marcó nada sale con su fila en blanco: es a quien se busca.
    it('sin filtros, una persona activa sin marcaciones sale con la fila en blanco', async () => {
      const u = montar([jornada('a')], [COLABORADOR, BEATRIZ]);
      await u.click(await boton());
      const nombres = enMatriz().filas.map(f => f[0]);
      expect(nombres).toEqual(['Ana María Gómez', 'Beatriz Ruiz']);
      expect(enMatriz().filas[1].slice(1).every(c => c === '')).toBe(true);
    });

    // Con una persona elegida, la matriz es de ELLA: las demás personas activas no se suman en blanco. El
    // servidor ya devuelve solo sus jornadas, y el simulacro lo respeta.
    it('con una persona elegida, solo ella sale, aunque haya otras activas', async () => {
      const u = montar([], [COLABORADOR, BEATRIZ]);
      const todas = [jornada('a'), jornada('b', { colaboradorId: 'c2', colaborador: { id: 'c2', nombre: 'Beatriz', apellido: 'Ruiz' } })];
      get.mockImplementation((url: string, cfg?: { params?: { colaboradorId?: string } }) => Promise.resolve({
        data: url === '/registros'
          ? todas.filter(j => !cfg?.params?.colaboradorId || j.colaboradorId === cfg.params.colaboradorId)
          : url === '/colaboradores' ? [COLABORADOR, BEATRIZ] : [],
      }));
      await u.click(await screen.findByRole('button', { name: /todos los colaboradores/i }));
      await u.click(await screen.findByRole('button', { name: /Beatriz Ruiz/ }));
      await u.click(await boton());
      expect(enMatriz().filas.map(f => f[0])).toEqual(['Beatriz Ruiz']);
    });

    // LA QUE IMPORTA: con un filtro de jornadas puesto, una celda en blanco querría decir «la filtré» y no
    // «faltó». Se vuelve a lo que se está viendo: solo quien tiene jornadas en lo filtrado. Tres personas:
    // Ana (jornada normal), Beatriz (jornada con la salida puesta por el sistema) y Carlos (activo, sin
    // marcas). Filtrando por «No marcó salida» solo debe quedar Beatriz: Ana sale por el filtro, y a Carlos
    // no se le suma en blanco.
    it('con un filtro de jornadas puesto, la matriz es solo lo filtrado, sin sumar a nadie en blanco', async () => {
      const CARLOS = { id: 'c3', nombre: 'Carlos', apellido: 'Peña', cedula: '777', sedeNombres: ['Norte'] };
      const u = montar([
        jornada('a'),
        jornada('b', { colaboradorId: 'c2', colaborador: { id: 'c2', nombre: 'Beatriz', apellido: 'Ruiz' }, salidaEstimada: true }),
      ], [COLABORADOR, BEATRIZ, CARLOS]);
      await u.click(await screen.findByRole('button', { name: /filtros/i }));
      await u.click(await screen.findByRole('button', { name: 'No marcó salida' }));
      await u.click(await boton());
      expect(enMatriz().filas.map(f => f[0])).toEqual(['Beatriz Ruiz']);
    });
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
