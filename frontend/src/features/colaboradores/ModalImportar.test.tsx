import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
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
  { clave: 'salarioMensual', titulo: 'Salario mensual', obligatoria: true, ejemplo: '1' },
  { clave: 'fechaNacimiento', titulo: 'Fecha de nacimiento', obligatoria: false, ejemplo: '1990-05-20', tipo: 'fecha' },
];
const HORARIOS = [{ id: 'h1', nombre: 'Turno diurno' }, { id: 'h2', nombre: 'Turno nocturno' }];
const SEDES = [{ id: 's1', nombre: 'Sede norte' }, { id: 's2', nombre: 'Sede centro' }];

const OK = { validas: [], errores: [], excedeCupo: false, vacio: false, conDatos: 0, creados: 0 };

const archivo = () => new File(['x'], 'gente.xlsx',
  { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

const montar = (props = {}) => render(<ModalImportar onCerrar={vi.fn()} onListo={vi.fn()} {...props} />);

beforeEach(() => {
  vi.clearAllMocks();
  get.mockResolvedValue({ data: { columnas: COLUMNAS, horarios: HORARIOS, sedes: SEDES } });
  leerHoja.mockResolvedValue([
    ['Nombre', 'Cédula', 'Salario mensual', 'Fecha de nacimiento'],
    ['Ana', '111', '1750905', '11/12/85'],
    ['Luis', '222', '2000000', ''],
  ]);
  post.mockResolvedValue({ data: OK });
});

const subir = async () => {
  await userEvent.upload(await screen.findByLabelText(/Subir el formato/i), archivo());
  await screen.findByRole('table');
};

describe('antes de subir nada', () => {
  it('ofrece descargar el formato y subirlo', async () => {
    montar();
    expect(await screen.findByRole('button', { name: /Descargar el formato/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Subir el formato/i)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('el formato ya no lleva columna de horario: eso se elige aquí', async () => {
    montar();
    await userEvent.click(await screen.findByRole('button', { name: /Descargar el formato/i }));
    expect(descargarFormato).toHaveBeenCalledWith(COLUMNAS);
  });

  it('un archivo que no es hoja de cálculo se rechaza antes de leerlo', async () => {
    montar();
    await userEvent.upload(await screen.findByLabelText(/Subir el formato/i),
      new File(['x'], 'foto.png', { type: 'image/png' }), { applyAccept: false });
    expect(await screen.findByText(/Excel/i)).toBeInTheDocument();
    expect(leerHoja).not.toHaveBeenCalled();
  });
});

describe('la tabla que queda después de subir', () => {
  it('precarga lo que traía el archivo, en campos que se pueden tocar', async () => {
    montar();
    await subir();
    expect(screen.getByLabelText(/Nombre de la fila 1/i)).toHaveValue('Ana');
    expect(screen.getByLabelText(/Cédula de la fila 1/i)).toHaveValue('111');
    expect(screen.getByLabelText(/Nombre de la fila 2/i)).toHaveValue('Luis');
  });

  it('se puede corregir un dato sin volver a tocar el Excel', async () => {
    montar();
    await subir();
    const campo = screen.getByLabelText(/Nombre de la fila 1/i);
    await userEvent.clear(campo);
    await userEvent.type(campo, 'Ana María');
    expect(campo).toHaveValue('Ana María');
  });

  it('cada persona tiene su propio selector de horario', async () => {
    montar();
    await subir();
    const sel = screen.getByLabelText(/Horario de la fila 1/i);
    await userEvent.selectOptions(sel, 'h2');
    expect(sel).toHaveValue('h2');
    expect(screen.getByLabelText(/Horario de la fila 2/i)).toHaveValue('');
  });

  it('sin horario es una opción válida, no un hueco', async () => {
    montar();
    await subir();
    const sel = screen.getByLabelText(/Horario de la fila 1/i);
    expect(within(sel).getByRole('option', { name: /Sin horario/i })).toBeInTheDocument();
  });

  it('el horario global se lo pone a todos de un golpe', async () => {
    montar();
    await subir();
    await userEvent.selectOptions(screen.getByLabelText(/Horario para todos/i), 'h1');
    expect(screen.getByLabelText(/Horario de la fila 1/i)).toHaveValue('h1');
    expect(screen.getByLabelText(/Horario de la fila 2/i)).toHaveValue('h1');
  });

  it('después del global, cada uno se puede cambiar aparte', async () => {
    montar();
    await subir();
    await userEvent.selectOptions(screen.getByLabelText(/Horario para todos/i), 'h1');
    await userEvent.selectOptions(screen.getByLabelText(/Horario de la fila 2/i), 'h2');
    expect(screen.getByLabelText(/Horario de la fila 1/i)).toHaveValue('h1');
    expect(screen.getByLabelText(/Horario de la fila 2/i)).toHaveValue('h2');
  });

  it('se puede agregar a alguien que no venía en el archivo', async () => {
    montar();
    await subir();
    await userEvent.click(screen.getByRole('button', { name: /Agregar una fila/i }));
    expect(screen.getByLabelText(/Nombre de la fila 3/i)).toHaveValue('');
  });

  it('y quitar a alguien que no va', async () => {
    montar();
    await subir();
    await userEvent.click(screen.getByRole('button', { name: /Quitar la fila 1/i }));
    expect(screen.getByLabelText(/Nombre de la fila 1/i)).toHaveValue('Luis');
  });
});

describe('los errores, en su celda', () => {
  it('marcan el campo exacto y dicen qué pasa', async () => {
    post.mockResolvedValueOnce({ data: { ...OK, conDatos: 2,
      errores: [{ fila: 3, campo: 'cedula', mensaje: 'La cédula 222 ya está registrada en tu empresa.' }] } });
    montar();
    await subir();
    expect(await screen.findByText(/ya está registrada/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Cédula de la fila 2/i)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText(/Cédula de la fila 1/i)).not.toHaveAttribute('aria-invalid', 'true');
  });

  it('corregir la celda le quita la marca sin esperar al servidor', async () => {
    // Dejarla en rojo mientras se escribe la corrección se lee como que lo
    // nuevo también está mal.
    post.mockResolvedValueOnce({ data: { ...OK, conDatos: 2,
      errores: [{ fila: 2, campo: 'nombre', mensaje: 'Falta el nombre.' }] } });
    montar();
    await subir();
    const campo = screen.getByLabelText(/Nombre de la fila 1/i);
    await waitFor(() => expect(campo).toHaveAttribute('aria-invalid', 'true'));
    await userEvent.type(campo, 'x');
    expect(campo).not.toHaveAttribute('aria-invalid', 'true');
  });
});

describe('crear', () => {
  it('manda lo que quedó en la tabla, no lo que traía el archivo', async () => {
    montar();
    await subir();
    const campo = screen.getByLabelText(/Nombre de la fila 1/i);
    await userEvent.clear(campo);
    await userEvent.type(campo, 'Corregida');
    await userEvent.selectOptions(screen.getByLabelText(/Horario para todos/i), 'h1');

    post.mockResolvedValueOnce({ data: { ...OK, creados: 2 } });
    await userEvent.click(screen.getByRole('button', { name: /Crear 2 colaboradores/i }));

    const enviado = post.mock.calls[post.mock.calls.length - 1][1] as { filas: Record<string, string>[]; soloValidar: boolean };
    expect(enviado.soloValidar).toBe(false);
    expect(enviado.filas[0].nombre).toBe('Corregida');
    expect(enviado.filas[0].horarioId).toBe('h1');
  });

  it('si el servidor encuentra errores no crea, los muestra y la tabla sigue ahí', async () => {
    montar();
    await subir();
    post.mockResolvedValueOnce({ data: { ...OK, conDatos: 2,
      errores: [{ fila: 2, campo: 'salarioMensual', mensaje: 'Falta el salario, o no es un número.' }] } });
    const onListo = vi.fn();
    montar({ onListo });
    await userEvent.click(screen.getAllByRole('button', { name: /Crear 2 colaboradores/i })[0]);
    expect(onListo).not.toHaveBeenCalled();
  });

  it('cuando sí crea, avisa cuántos', async () => {
    const onListo = vi.fn();
    montar({ onListo });
    await subir();
    post.mockResolvedValueOnce({ data: { ...OK, creados: 2 } });
    await userEvent.click(screen.getByRole('button', { name: /Crear 2 colaboradores/i }));
    await waitFor(() => expect(onListo).toHaveBeenCalledWith(2));
  });

  it('no ofrece crear cuando no hay ninguna fila con datos', async () => {
    leerHoja.mockResolvedValueOnce([['Nombre', 'Cédula', 'Salario mensual']]);
    montar();
    await userEvent.upload(await screen.findByLabelText(/Subir el formato/i), archivo());
    expect(await screen.findByText(/no tiene ninguna fila/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Crear \d+/i })).not.toBeInTheDocument();
  });

  it('si no caben en el plan lo dice y no deja crear', async () => {
    post.mockResolvedValueOnce({ data: { ...OK, excedeCupo: true, conDatos: 2, cupoDisponible: 1, nombrePlan: 'Empresarial' } });
    montar();
    await subir();
    expect(await screen.findByText(/No caben en tu plan/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Crear \d+/i })).not.toBeInTheDocument();
  });

  it('si el servidor se cae lo dice, sin perder lo que ya estaba escrito', async () => {
    montar();
    await subir();
    post.mockRejectedValueOnce({ response: { data: { error: 'Internal Server Error' } } });
    await userEvent.click(screen.getByRole('button', { name: /Crear 2 colaboradores/i }));
    expect(await screen.findByText(/Internal Server Error/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre de la fila 1/i)).toHaveValue('Ana');
  });
});

describe('la sede, igual que el horario', () => {
  it('cada persona tiene su selector', async () => {
    montar();
    await subir();
    const sel = screen.getByLabelText(/Sede de la fila 1/i);
    await userEvent.selectOptions(sel, 's2');
    expect(sel).toHaveValue('s2');
    expect(screen.getByLabelText(/Sede de la fila 2/i)).toHaveValue('');
  });

  it('y hay uno para ponérsela a todos', async () => {
    montar();
    await subir();
    await userEvent.selectOptions(screen.getByLabelText(/Sede para todos/i), 's1');
    expect(screen.getByLabelText(/Sede de la fila 1/i)).toHaveValue('s1');
    expect(screen.getByLabelText(/Sede de la fila 2/i)).toHaveValue('s1');
  });

  it('poner la sede a todos no le borra el horario a nadie', async () => {
    montar();
    await subir();
    await userEvent.selectOptions(screen.getByLabelText(/Horario de la fila 1/i), 'h2');
    await userEvent.selectOptions(screen.getByLabelText(/Sede para todos/i), 's1');
    expect(screen.getByLabelText(/Horario de la fila 1/i)).toHaveValue('h2');
  });

  it('sin sedes creadas, la columna no estorba', async () => {
    // Una empresa de una sola oficina no tiene por qué ver una columna que
    // solo puede decir "sin sede".
    get.mockResolvedValue({ data: { columnas: COLUMNAS, horarios: HORARIOS, sedes: [] } });
    montar();
    await subir();
    expect(screen.queryByLabelText(/Sede para todos/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Sede de la fila 1/i)).not.toBeInTheDocument();
  });

  it('la sede viaja al crear', async () => {
    montar();
    await subir();
    await userEvent.selectOptions(screen.getByLabelText(/Sede para todos/i), 's2');
    post.mockResolvedValueOnce({ data: { ...OK, creados: 2 } });
    await userEvent.click(screen.getByRole('button', { name: /Crear 2 colaboradores/i }));
    const enviado = post.mock.calls[post.mock.calls.length - 1][1] as { filas: Record<string, string>[] };
    expect(enviado.filas[0].sedeId).toBe('s2');
  });
});

describe('la fecha de nacimiento', () => {
  it('llega ya acomodada desde el Excel, no como la escribió quien lo llenó', async () => {
    // "11/12/85" en la hoja tiene que verse como la fecha que se va a guardar.
    montar();
    await subir();
    expect(screen.getByLabelText(/Fecha de nacimiento de la fila 1/i)).toHaveValue('1985-12-11');
  });

  it('se corrige con un calendario, no escribiendo el formato de memoria', async () => {
    montar();
    await subir();
    expect(screen.getByLabelText(/Fecha de nacimiento de la fila 1/i)).toHaveAttribute('type', 'date');
  });

  it('una fecha vacía también se llena con el calendario', async () => {
    // Si cayera a texto por estar vacía, habría que escribir AAAA-MM-DD a mano
    // justo en el caso en que más ayuda el calendario.
    montar();
    await subir();
    const campo = screen.getByLabelText(/Fecha de nacimiento de la fila 2/i);
    expect(campo).toHaveValue('');
    expect(campo).toHaveAttribute('type', 'date');
  });

  it('lo que no se pudo acomodar se deja como texto, para poder verlo y arreglarlo', async () => {
    leerHoja.mockResolvedValueOnce([
      ['Nombre', 'Cédula', 'Salario mensual', 'Fecha de nacimiento'],
      ['Ana', '111', '1750905', 'no sé'],
    ]);
    montar();
    await subir();
    const campo = screen.getByLabelText(/Fecha de nacimiento de la fila 1/i);
    expect(campo).toHaveAttribute('type', 'text');
    expect(campo).toHaveValue('no sé');
  });
});
