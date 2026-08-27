import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ModalImportar from './ModalImportar';

const get = vi.fn();
const post = vi.fn();
vi.mock('../../lib/api', () => ({ default: { get: (...a: unknown[]) => get(...a), post: (...a: unknown[]) => post(...a) } }));

const leerHoja = vi.fn();
const descargarFormato = vi.fn();
vi.mock('./formatoImportacion', async (real) => ({
  ...(await real<Record<string, unknown>>()),
  leerHoja: (...a: unknown[]) => leerHoja(...a),
  descargarFormato: (...a: unknown[]) => descargarFormato(...a),
}));

const COLUMNAS = [
  { clave: 'nombre', titulo: 'Nombre', obligatoria: true, ejemplo: 'Ana' },
  { clave: 'cedula', titulo: 'Cédula', obligatoria: true, ejemplo: '123' },
];

const archivo = () => new File(['x'], 'gente.xlsx',
  { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

const montar = (props = {}) =>
  render(<ModalImportar onCerrar={vi.fn()} onListo={vi.fn()} {...props} />);

beforeEach(() => {
  // Sin esto las llamadas se acumulan entre pruebas y "la segunda llamada" es
  // la de otra prueba.
  vi.clearAllMocks();
  get.mockResolvedValue({ data: { columnas: COLUMNAS, horarios: ['Turno diurno'] } });
  leerHoja.mockResolvedValue([['Nombre', 'Cédula'], ['Ana', '123']]);
});

const subir = async () => {
  await userEvent.upload(await screen.findByLabelText(/Subir el formato/i), archivo());
};

describe('el modal de carga masiva', () => {
  it('explica los dos pasos antes de pedir nada', async () => {
    montar();
    expect(await screen.findByRole('button', { name: /Descargar el formato/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Subir el formato/i)).toBeInTheDocument();
  });

  it('descarga el formato con los horarios reales de la empresa', async () => {
    montar();
    await userEvent.click(await screen.findByRole('button', { name: /Descargar el formato/i }));
    expect(descargarFormato).toHaveBeenCalledWith(COLUMNAS, ['Turno diurno']);
  });

  it('al subir un archivo lo valida SIN crear nada todavía', async () => {
    // La vista previa tiene que pasar por el servidor: si validara el
    // navegador, lo que se ve podría no ser lo que el servidor va a hacer.
    post.mockResolvedValueOnce({ data: { validas: [{ nombre: 'Ana' }], errores: [], excedeCupo: false, vacio: false, creados: 0 } });
    montar();
    await subir();
    await waitFor(() => expect(post).toHaveBeenCalled());
    expect(post.mock.calls[0][1]).toMatchObject({ soloValidar: true });
    expect(await screen.findByRole('button', { name: /Crear 1 colaborador/i })).toBeInTheDocument();
  });

  it('muestra los errores por fila, con el número que se ve en Excel', async () => {
    post.mockResolvedValueOnce({ data: {
      validas: [], excedeCupo: false, vacio: false, creados: 0,
      errores: [{ fila: 7, campo: 'cedula', mensaje: 'La cédula 123 ya está registrada en tu empresa.' }],
    } });
    montar();
    await subir();
    expect(await screen.findByText(/Fila 7/i)).toBeInTheDocument();
    expect(screen.getByText(/ya está registrada/i)).toBeInTheDocument();
  });

  it('con errores no deja crear: primero se arregla el archivo', async () => {
    post.mockResolvedValueOnce({ data: {
      validas: [], excedeCupo: false, vacio: false, creados: 0,
      errores: [{ fila: 2, campo: 'nombre', mensaje: 'Falta el nombre.' }],
    } });
    montar();
    await subir();
    await screen.findByText(/Falta el nombre/i);
    expect(screen.queryByRole('button', { name: /Crear \d+ colaborador/i })).not.toBeInTheDocument();
  });

  it('si no caben en el plan lo dice con números', async () => {
    post.mockResolvedValueOnce({ data: {
      validas: [{}, {}, {}], errores: [], excedeCupo: true, vacio: false, conDatos: 5,
      cupoDisponible: 2, nombrePlan: 'Empresarial', creados: 0,
    } });
    montar();
    await subir();
    // Habla del archivo (5 filas), no de las que sirven.
    expect(await screen.findByText(/trae 5 colaboradores/i)).toBeInTheDocument();
    expect(screen.getByText(/Empresarial/)).toBeInTheDocument();
    expect(screen.getByText(/cupo para/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Crear \d+ colaborador/i })).not.toBeInTheDocument();
  });

  it('un archivo sin filas lo dice, en vez de dejar el modal mudo', async () => {
    post.mockResolvedValueOnce({ data: { validas: [], errores: [], excedeCupo: false, vacio: true, creados: 0 } });
    montar();
    await subir();
    expect(await screen.findByText(/no tiene ninguna fila/i)).toBeInTheDocument();
  });

  it('confirmar crea de verdad y avisa cuántos', async () => {
    post.mockResolvedValueOnce({ data: { validas: [{}, {}], errores: [], excedeCupo: false, vacio: false, creados: 0 } });
    post.mockResolvedValueOnce({ data: { creados: 2, errores: [], validas: [{}, {}], excedeCupo: false, vacio: false } });
    const onListo = vi.fn();
    montar({ onListo });
    await subir();
    await userEvent.click(await screen.findByRole('button', { name: /Crear 2 colaboradores/i }));
    await waitFor(() => expect(onListo).toHaveBeenCalledWith(2));
    expect(post.mock.calls[1][1]).toMatchObject({ soloValidar: false });
  });

  it('un archivo que no es una hoja de cálculo se rechaza antes de subirlo', async () => {
    montar();
    // applyAccept: false imita a quien elige "todos los archivos" en el
    // diálogo del sistema, que es la única forma de que llegue un PNG.
    await userEvent.upload(await screen.findByLabelText(/Subir el formato/i),
      new File(['x'], 'foto.png', { type: 'image/png' }), { applyAccept: false });
    expect(await screen.findByText(/Excel/i)).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });

  it('si el servidor falla lo dice, en vez de quedarse pensando', async () => {
    post.mockRejectedValueOnce({ response: { data: { error: 'El archivo trae más de 500 filas.' } } });
    montar();
    await subir();
    expect(await screen.findByText(/más de 500 filas/i)).toBeInTheDocument();
  });
});
