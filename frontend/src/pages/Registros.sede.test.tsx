import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../lib/api', () => ({ default: { get: vi.fn(), put: vi.fn(), post: vi.fn(), delete: vi.fn() } }));
import api from '../lib/api';
import Registros from './Registros';

// LA SEDE EN LA TABLA DE REGISTROS (4 de octubre de 2026, petición 21 del dueño).
//
// Dos datos distintos que estaban mezclados en una sola celda:
//
//   - la sede ASIGNADA de la persona, que es su configuración, va bajo el nombre;
//   - la sede DONDE MARCÓ, que es un hecho de esa jornada, va en su columna.
//
// Lo que había: la columna mostraba la sede atribuida —la que el servidor le pone
// al leer a un presencial que no marcó en ninguna— con el mismo aspecto que una
// probada, así que en la tabla no había forma de distinguir «marcó en Norte» de
// «no marcó en ninguna y cuenta en Norte».
//
// LAS ASERCIONES VAN POR CELDA, buscando la columna por su encabezado. Preguntar
// por texto no sirve aquí: Testing Library mira el texto DIRECTO de cada
// elemento, así que el rótulo que va en `sr-only` queda en un hijo aparte y no
// se ve en la consulta, y «Norte» aparece en dos celdas a la vez.

const get = api.get as unknown as ReturnType<typeof vi.fn>;

const NORTE = { id: 's1', nombre: 'Norte' };
const bog = (h: number) => new Date(Date.UTC(2026, 8, 1, h + 5)).toISOString();
const COLABORADOR = { id: 'c1', nombre: 'Julián', apellido: 'Restrepo', sedeIds: ['s1'], sedeNombres: ['Norte'] };

const jornada = (extra: Record<string, unknown>) => ({
  id: 'j1', colaboradorId: 'c1', colaborador: { id: 'c1', nombre: 'Julián', apellido: 'Restrepo' },
  fecha: bog(0), entrada: bog(8), salida: bog(17), tipo: 'NORMAL', observacion: null,
  sede: null, sedeSalida: null, sedeAtribuida: null,
  minutosTarde: null, minutosContados: 480, minutosAlmuerzoAqui: 0,
  tieneFotoEntrada: false, tieneFotoSalida: false, salidaEstimada: false, salidaAlmuerzo: false,
  almuerzo: null, novedad: null, marcaciones: [],
  ...extra,
});

const montar = (jornadas: unknown[], colaboradores: unknown[] = [COLABORADOR]) => {
  get.mockReset();
  get.mockImplementation((url: string) => Promise.resolve({
    data: url === '/registros' ? jornadas : url === '/colaboradores' ? colaboradores : url === '/sedes' ? [NORTE] : [],
  }));
  render(<Registros />);
};

// La celda de una columna, buscada por el encabezado que ve una persona y no por
// una posición a mano: la columna de sede solo aparece si la empresa tiene sedes.
const celda = async (encabezado: string) => {
  const fila = (await screen.findByText('08:00')).closest('tr')!;
  const titulos = Array.from(document.querySelectorAll('thead th')).map(th => th.textContent?.trim() ?? '');
  const i = titulos.indexOf(encabezado);
  expect(i, `no hay columna «${encabezado}»; hay: ${titulos.join(' | ')}`).toBeGreaterThanOrEqual(0);
  return fila.querySelectorAll('td')[i];
};

beforeEach(() => { get.mockReset(); });

describe('Registros · la sede asignada y la sede donde marcó', () => {
  it('bajo el nombre va la sede asignada de la persona, con su rótulo para el lector de pantalla', async () => {
    montar([jornada({ sede: NORTE, sedeSalida: NORTE })]);
    expect((await celda('Colaborador')).textContent).toContain('Sede asignada:');
    expect((await celda('Colaborador')).textContent).toContain('Norte');
  });

  it('quien marcó en una sede la ve en su columna, dicha sin más', async () => {
    montar([jornada({ sede: NORTE, sedeSalida: NORTE })]);
    expect((await celda('Sede')).textContent?.trim()).toBe('Norte');
  });

  // La petición: en la jornada aparece solo dónde marcó. La atribuida sigue
  // visible, porque es la que cuenta en los reportes, pero dicha como lo que es.
  it('sin sede probada, la columna no dice el nombre a secas: dice que solo cuenta ahí', async () => {
    montar([jornada({ sedeAtribuida: NORTE })]);
    const texto = (await celda('Sede')).textContent?.trim();
    expect(texto).not.toBe('Norte');
    expect(texto).toContain('cuenta en Norte');
  });

  it('quien no tiene sede asignada no lleva nada bajo el nombre', async () => {
    montar([jornada({ sede: NORTE, sedeSalida: NORTE })], [{ ...COLABORADOR, sedeIds: [], sedeNombres: [] }]);
    expect((await celda('Colaborador')).textContent).not.toContain('Sede asignada');
  });

  // Quien ya no está activo no viene en GET /colaboradores: la fila tiene que
  // pintarse igual, sin la línea y sin romperse.
  it('una persona retirada, que no viene en la lista, no lleva la línea', async () => {
    montar([jornada({ sede: NORTE, sedeSalida: NORTE })], []);
    expect((await celda('Colaborador')).textContent).toContain('Julián Restrepo');
    expect((await celda('Colaborador')).textContent).not.toContain('Sede asignada');
  });
});
