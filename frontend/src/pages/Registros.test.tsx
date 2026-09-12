import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../lib/api', () => ({ default: { get: vi.fn(), put: vi.fn(), post: vi.fn(), delete: vi.fn() } }));
import api from '../lib/api';
import Registros from './Registros';

// LA PANTALLA DE REGISTROS, SOLO EN LO QUE TOCA A GUARDAR UNA JORNADA.
//
// Quitar el descanso deja sin fila a las fotos de la salida al descanso y del
// regreso: esas marcas ya no existen. Son evidencia de asistencia, así que el
// servidor no las borra sin confirmación y responde con la lista. Lo que se prueba
// aquí es la costura: que esa respuesta se convierta en una pregunta con las
// fotos, que confirmar vuelva a guardar diciéndolo, y que cancelar no guarde.

const get = api.get as unknown as ReturnType<typeof vi.fn>;
const put = api.put as unknown as ReturnType<typeof vi.fn>;

const bog = (h: number, m = 0) => new Date(Date.UTC(2026, 8, 1, h + 5, m)).toISOString();
const marca = (id: string, entrada: string, salida: string, salidaAlmuerzo: boolean) => ({
  id, entrada, salida, salidaAlmuerzo, entradaEstimada: false, salidaEstimada: false,
  tieneFotoEntrada: true, tieneFotoSalida: true, tieneNovedadLigada: false,
});
const COLABORADOR = { id: 'c1', nombre: 'Julián', apellido: 'Restrepo' };
// Una jornada con descanso, las cuatro marcas con foto.
const JORNADA = {
  id: 'a', colaboradorId: 'c1', colaborador: COLABORADOR,
  fecha: bog(0), entrada: bog(8), salida: bog(17), tipo: 'NORMAL', observacion: null,
  sede: null, sedeSalida: null, minutosTarde: null, minutosContados: 480, minutosAlmuerzoAqui: 60,
  tieneFotoEntrada: true, tieneFotoSalida: true, salidaEstimada: false, salidaAlmuerzo: false,
  almuerzo: null, novedad: null,
  marcaciones: [marca('a', bog(8), bog(12), true), marca('b', bog(13), bog(17), false)],
};
const PIDE_CONFIRMAR = {
  response: {
    status: 409,
    data: {
      codigo: 'BORRA_FOTOS',
      error: 'Guardar así borra 2 fotos del kiosco que ya no pertenecen a ninguna marca de la jornada.',
      fotos: [{ momento: 'SALIDA_ALMUERZO', hora: bog(12) }, { momento: 'REGRESO_ALMUERZO', hora: bog(13) }],
    },
  },
};
const TITULO = '¿Guardar y borrar fotos del kiosco?';

// Con llaves: lo que devuelve un beforeEach, Vitest lo toma como limpieza.
beforeEach(() => {
  get.mockReset();
  put.mockReset();
  get.mockImplementation((url: string) => Promise.resolve({
    data: url === '/registros' ? [JORNADA] : url === '/colaboradores' ? [COLABORADOR] : [],
  }));
});

async function editarYGuardar() {
  const usuario = userEvent.setup();
  render(<Registros />);
  await usuario.click(await screen.findByRole('button', { name: 'Más acciones de la jornada' }));
  await usuario.click(screen.getByRole('menuitem', { name: 'Editar' }));
  await usuario.click(screen.getByRole('button', { name: 'Guardar' }));
  return usuario;
}

// El recuadro de la pregunta: el título y sus dos botones viven juntos.
const avisoEnPantalla = async () => (await screen.findByText(TITULO)).closest('div')!;

describe('guardar una jornada que deja fotos del kiosco sin marca', () => {
  it('pregunta antes de borrarlas, nombrando cada foto con su hora de Bogotá', async () => {
    put.mockRejectedValueOnce(PIDE_CONFIRMAR);
    await editarYGuardar();
    const aviso = await avisoEnPantalla();
    expect(within(aviso).getByText(/Salida a descanso · 12:00 y Regreso del descanso · 13:00/)).toBeInTheDocument();
    expect(put).toHaveBeenCalledTimes(1);
    expect(put.mock.calls[0][1]).not.toHaveProperty('confirmarBorrarFotos');
  });

  it('confirmar vuelve a guardar lo mismo, diciendo que se aceptó borrar las fotos', async () => {
    put.mockRejectedValueOnce(PIDE_CONFIRMAR).mockResolvedValueOnce({ data: { ok: true } });
    const usuario = await editarYGuardar();
    await usuario.click(within(await avisoEnPantalla()).getByRole('button', { name: 'Borrar fotos y guardar' }));
    await waitFor(() => expect(put).toHaveBeenCalledTimes(2));
    const [url1, datos1] = put.mock.calls[0];
    const [url2, datos2] = put.mock.calls[1];
    expect(url2).toBe(url1);
    expect(datos2).toEqual({ ...datos1, confirmarBorrarFotos: true });
    await waitFor(() => expect(screen.queryByText('Editar jornada')).toBeNull());
  });

  it('cancelar no guarda y deja el formulario abierto para corregir', async () => {
    put.mockRejectedValueOnce(PIDE_CONFIRMAR);
    const usuario = await editarYGuardar();
    await usuario.click(within(await avisoEnPantalla()).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByText(TITULO)).toBeNull();
    expect(screen.getByText('Editar jornada')).toBeInTheDocument();
    expect(put).toHaveBeenCalledTimes(1);
  });

  it('cualquier otro rechazo se sigue mostrando como error, sin preguntar por fotos', async () => {
    put.mockRejectedValueOnce({ response: { status: 400, data: { error: 'La jornada necesita una hora de entrada.' } } });
    await editarYGuardar();
    expect(await screen.findByText('La jornada necesita una hora de entrada.')).toBeInTheDocument();
    expect(screen.queryByText(TITULO)).toBeNull();
  });
});

// LA SEDE DE UNA JORNADA QUE LA UBICACIÓN NO PROBÓ.
//
// Decisión del dueño del 12 de septiembre de 2026, «mostrarla al leer»: el servidor
// manda en `sedeAtribuida` la sede que se le cuenta a un presencial cuya jornada no
// abrió en una sede probada. La tabla la muestra con «por defecto» y el filtro de
// sede la incluye; «cruzó de sede» sigue mirando solo `sede` y `sedeSalida`.
describe('la sede de una jornada que la ubicación no probó', () => {
  const NORTE = { id: 's-norte', nombre: 'Norte' };
  const SUR = { id: 's-sur', nombre: 'Sur' };
  const PRINCIPAL = { id: 's-principal', nombre: 'Sede principal' };
  const porDefecto = (s: { id: string; nombre: string }) => ({ ...s, activa: true, porDefecto: true });
  const jornadaDe = (nombre: string, sedes: Record<string, unknown>) => ({
    ...JORNADA, id: `j-${nombre}`, colaboradorId: `c-${nombre}`,
    colaborador: { id: `c-${nombre}`, nombre, apellido: 'Prueba' },
    marcaciones: [marca(`m-${nombre}`, bog(8), bog(17), false)],
    sede: null, sedeSalida: null, sedeAtribuida: null, ...sedes,
  });
  const JORNADAS = [
    // Marcó sin ubicación: la sede se la atribuye el servidor.
    jornadaDe('Ana', { sedeAtribuida: porDefecto(PRINCIPAL) }),
    // Abrió en una sede probada.
    jornadaDe('Beto', { sede: NORTE }),
    // Entró sin ubicación y cerró en una sede probada; la de entrada es atribuida.
    jornadaDe('Caro', { sedeAtribuida: porDefecto(NORTE), sedeSalida: SUR }),
  ];

  beforeEach(() => {
    get.mockImplementation((url: string) => Promise.resolve({
      data: url === '/registros' ? JORNADAS : url === '/sedes' ? [NORTE, SUR, PRINCIPAL] : [],
    }));
  });

  const filaDe = (nombre: string) => screen.queryByRole('row', { name: new RegExp(nombre) });

  it('sin sede probada, la celda dice la sede atribuida con «por defecto»', async () => {
    render(<Registros />);
    expect(await screen.findByRole('row', { name: /Ana/ })).toHaveTextContent('Sede principal (por defecto)');
    expect(filaDe('Beto')).toHaveTextContent('Norte');
    expect(filaDe('Beto')).not.toHaveTextContent('por defecto');
  });

  it('con la salida probada, la celda dice dónde cerró y no la sede por defecto', async () => {
    render(<Registros />);
    const caro = await screen.findByRole('row', { name: /Caro/ });
    expect(caro).toHaveTextContent('Cerró en Sur');
    expect(caro).not.toHaveTextContent('por defecto');
  });

  // Revisión del 12 de septiembre de 2026: la columna la decide la empresa, como en los
  // reportes, y no cuántas sedes distintas traen las filas (la regla, en
  // sedeDeJornada.test.ts). Filtrando a una persona, lo normal es que todas sus
  // jornadas digan la misma sede por defecto, y la columna desaparecía justo ahí.
  it('con Norte y Sur activas, las jornadas de una persona que cuentan en Sur por defecto: la columna aparece y dice «Sur (por defecto)»', async () => {
    const eva = (dia: number) => ({
      ...jornadaDe('Eva', { sedeAtribuida: porDefecto(SUR) }),
      id: `j-eva-${dia}`, fecha: new Date(Date.UTC(2026, 8, dia, 5)).toISOString(),
      marcaciones: [marca(`m-eva-${dia}`, bog(8), bog(17), false)],
    });
    get.mockImplementation((url: string) => Promise.resolve({
      data: url === '/registros' ? [eva(1), eva(2)] : url === '/sedes' ? [NORTE, SUR] : [],
    }));
    render(<Registros />);
    const filas = await screen.findAllByRole('row', { name: /Eva/ });
    expect(filas).toHaveLength(2);
    expect(await screen.findByRole('columnheader', { name: 'Sede' })).toBeInTheDocument();
    for (const f of filas) expect(f).toHaveTextContent('Sur (por defecto)');
  });

  it('con una sola sede activa y solo la sede por defecto en las filas, la columna no aparece', async () => {
    get.mockImplementation((url: string) => Promise.resolve({
      data: url === '/registros' ? [jornadaDe('Ana', { sedeAtribuida: porDefecto(PRINCIPAL) })] : url === '/sedes' ? [PRINCIPAL] : [],
    }));
    render(<Registros />);
    await screen.findByRole('row', { name: /Ana/ });
    // Esperar a que lleguen las sedes: sin esto pasaría con la lista todavía vacía.
    await waitFor(() => expect(get).toHaveBeenCalledWith('/sedes'));
    await act(async () => {});
    expect(screen.queryByRole('columnheader', { name: 'Sede' })).toBeNull();
    expect(filaDe('Ana')).not.toHaveTextContent('por defecto');
  });

  it('con una sola sede activa, la columna aparece si alguna jornada abrió en una sede probada, aunque ya no esté activa', async () => {
    get.mockImplementation((url: string) => Promise.resolve({
      data: url === '/registros' ? [jornadaDe('Beto', { sede: NORTE })] : url === '/sedes' ? [PRINCIPAL] : [],
    }));
    render(<Registros />);
    await screen.findByRole('row', { name: /Beto/ });
    expect(await screen.findByRole('columnheader', { name: 'Sede' })).toBeInTheDocument();
    expect(filaDe('Beto')).toHaveTextContent('Norte');
  });

  it('el filtro por sede incluye la sede atribuida', async () => {
    const usuario = userEvent.setup();
    render(<Registros />);
    await screen.findByRole('row', { name: /Ana/ });
    await usuario.click(screen.getByRole('button', { name: 'Filtros' }));
    await usuario.click(screen.getByRole('button', { name: 'Norte' }));
    // Beto abrió en Norte; Caro solo cuenta ahí por atribución; Ana, en la principal.
    expect(filaDe('Beto')).not.toBeNull();
    expect(filaDe('Caro')).not.toBeNull();
    expect(filaDe('Ana')).toBeNull();
  });
});
