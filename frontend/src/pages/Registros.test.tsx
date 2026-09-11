import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../lib/api', () => ({ default: { get: vi.fn(), put: vi.fn(), post: vi.fn(), delete: vi.fn() } }));
import api from '../lib/api';
import Registros from './Registros';

// LA PANTALLA DE REGISTROS, SOLO EN LO QUE TOCA A GUARDAR UNA JORNADA.
//
// Quitar el almuerzo deja sin fila a las fotos de la salida a almorzar y del
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
// Una jornada con almuerzo, las cuatro marcas con foto.
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

describe('guardar una jornada', () => {
  it('manda el almuerzo con su nombre, y nunca con las claves de antes que el servidor rechaza', async () => {
    // Antes el almuerzo viajaba como `descansoSalida`/`descansoRegreso`. Ahora el
    // descanso es otra pausa que no se paga, y el servidor rechaza esas claves
    // para no guardar un almuerzo como descanso.
    put.mockResolvedValueOnce({ data: { ok: true } });
    await editarYGuardar();
    await waitFor(() => expect(put).toHaveBeenCalledTimes(1));
    const [, datos] = put.mock.calls[0];
    expect(datos).toMatchObject({ entrada: '08:00', salida: '17:00', almuerzo: { salida: '12:00', regreso: '13:00' } });
    expect(datos).not.toHaveProperty('descansoSalida');
    expect(datos).not.toHaveProperty('descansoRegreso');
  });
});

describe('guardar una jornada que deja fotos del kiosco sin marca', () => {
  it('pregunta antes de borrarlas, nombrando cada foto con su hora de Bogotá', async () => {
    put.mockRejectedValueOnce(PIDE_CONFIRMAR);
    await editarYGuardar();
    const aviso = await avisoEnPantalla();
    expect(within(aviso).getByText(/Salida a almorzar · 12:00 y Regreso del almuerzo · 13:00/)).toBeInTheDocument();
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
