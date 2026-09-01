import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
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
  { clave: 'salarioMensual', titulo: 'Salario mensual', obligatoria: true, ejemplo: '1', tipo: 'dinero' },
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
    expect(await screen.findByRole('button', { name: /Desc[aá]rgalo aqu[ií]/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Subir el formato/i)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('el formato ya no lleva columna de horario: eso se elige aquí', async () => {
    montar();
    await userEvent.click(await screen.findByRole('button', { name: /Desc[aá]rgalo aqu[ií]/i }));
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
    expect(screen.getByLabelText('Nombre de la fila 1')).toHaveValue('Ana');
    expect(screen.getByLabelText('Cédula de la fila 1')).toHaveValue('111');
    expect(screen.getByLabelText('Nombre de la fila 2')).toHaveValue('Luis');
  });

  it('se puede corregir un dato sin volver a tocar el Excel', async () => {
    montar();
    await subir();
    const campo = screen.getByLabelText('Nombre de la fila 1');
    await userEvent.clear(campo);
    await userEvent.type(campo, 'Ana María');
    expect(campo).toHaveValue('Ana María');
  });

  it('cada persona tiene su propio selector de horario', async () => {
    montar();
    await subir();
    const sel = screen.getByLabelText('Horario de la fila 1');
    await userEvent.selectOptions(sel, 'h2');
    expect(sel).toHaveValue('h2');
    expect(screen.getByLabelText('Horario de la fila 2')).toHaveValue('');
  });

  it('sin horario es una opción válida, no un hueco', async () => {
    montar();
    await subir();
    const sel = screen.getByLabelText('Horario de la fila 1');
    expect(within(sel).getByRole('option', { name: /Sin horario/i })).toBeInTheDocument();
  });

  it('el horario global se lo pone a todos de un golpe', async () => {
    montar();
    await subir();
    await userEvent.selectOptions(screen.getByLabelText(/Horario para todos/i), 'h1');
    expect(screen.getByLabelText('Horario de la fila 1')).toHaveValue('h1');
    expect(screen.getByLabelText('Horario de la fila 2')).toHaveValue('h1');
  });

  it('después del global, cada uno se puede cambiar aparte', async () => {
    montar();
    await subir();
    await userEvent.selectOptions(screen.getByLabelText(/Horario para todos/i), 'h1');
    await userEvent.selectOptions(screen.getByLabelText('Horario de la fila 2'), 'h2');
    expect(screen.getByLabelText('Horario de la fila 1')).toHaveValue('h1');
    expect(screen.getByLabelText('Horario de la fila 2')).toHaveValue('h2');
  });

  it('se puede agregar a alguien que no venía en el archivo', async () => {
    montar();
    await subir();
    await userEvent.click(screen.getByRole('button', { name: /Agregar una fila/i }));
    expect(screen.getByLabelText('Nombre de la fila 3')).toHaveValue('');
  });

  it('y quitar a alguien que no va', async () => {
    montar();
    await subir();
    await userEvent.click(screen.getByRole('button', { name: /Quitar la fila 1/i }));
    expect(screen.getByLabelText('Nombre de la fila 1')).toHaveValue('Luis');
  });
});

describe('los errores, en su celda', () => {
  it('marcan el campo exacto', async () => {
    post.mockResolvedValueOnce({ data: { ...OK, conDatos: 2,
      errores: [{ fila: 3, campo: 'cedula', mensaje: 'La cédula 222 ya está registrada en tu empresa.' }] } });
    montar();
    await subir();
    await waitFor(() => expect(screen.getByLabelText('Cédula de la fila 2')).toHaveAttribute('aria-invalid', 'true'));
    expect(screen.getByLabelText('Cédula de la fila 1')).not.toHaveAttribute('aria-invalid', 'true');
  });

  it('el mensaje no estira la fila: va en un aviso que se abre al pasar por encima', async () => {
    // Un mensaje de cuatro renglones dentro de la celda hacía crecer la fila
    // entera y desalineaba la tabla.
    post.mockResolvedValueOnce({ data: { ...OK, conDatos: 2,
      errores: [{ fila: 3, campo: 'cedula', mensaje: 'La cédula 222 ya está registrada en tu empresa.' }] } });
    montar();
    await subir();
    expect(await screen.findByRole('button', { name: /Qué pasa con Cédula de la fila 2/i })).toBeInTheDocument();
  });

  it('el mensaje sigue en la página, para quien no puede pasar el mouse por encima', async () => {
    // Un globo que solo existe al hacer hover deja fuera a quien navega con
    // teclado o con lector de pantalla.
    post.mockResolvedValueOnce({ data: { ...OK, conDatos: 2,
      errores: [{ fila: 3, campo: 'cedula', mensaje: 'La cédula 222 ya está registrada en tu empresa.' }] } });
    montar();
    await subir();
    expect(await screen.findByRole('tooltip')).toHaveTextContent(/ya está registrada/i);
  });

  it('el campo con error apunta a su explicación', async () => {
    post.mockResolvedValueOnce({ data: { ...OK, conDatos: 2,
      errores: [{ fila: 3, campo: 'cedula', mensaje: 'La cédula 222 ya está registrada en tu empresa.' }] } });
    montar();
    await subir();
    const campo = await screen.findByLabelText('Cédula de la fila 2');
    const id = campo.getAttribute('aria-describedby');
    expect(id).toBeTruthy();
    expect(document.getElementById(id!)).toHaveTextContent(/ya está registrada/i);
  });

  it('una celda sin error no lleva aviso ni apunta a nada', async () => {
    post.mockResolvedValueOnce({ data: { ...OK, conDatos: 2,
      errores: [{ fila: 3, campo: 'cedula', mensaje: 'x' }] } });
    montar();
    await subir();
    await waitFor(() => expect(screen.getByLabelText('Cédula de la fila 2')).toHaveAttribute('aria-invalid', 'true'));
    expect(screen.getByLabelText('Cédula de la fila 1')).not.toHaveAttribute('aria-describedby');
    expect(screen.queryByRole('button', { name: /Qué pasa con Cédula de la fila 1/i })).not.toBeInTheDocument();
  });

  it('borrar la fila del error NO se lo hereda a la siguiente', async () => {
    // Los errores se guardan por número de fila. Al borrar la 1, la que era 2
    // pasa a ser 1: sin corregir el índice, la persona equivocada queda
    // marcada en rojo y la que fallaba ya ni está.
    post.mockResolvedValueOnce({ data: { ...OK, conDatos: 2,
      errores: [{ fila: 2, campo: 'cedula', mensaje: 'La cédula 111 ya está registrada en tu empresa.' }] } });
    montar();
    await subir();
    await waitFor(() => expect(screen.getByLabelText('Cédula de la fila 1')).toHaveAttribute('aria-invalid', 'true'));

    await userEvent.click(screen.getByRole('button', { name: /Quitar la fila 1/i }));

    expect(screen.getByLabelText('Nombre de la fila 1')).toHaveValue('Luis');
    expect(screen.getByLabelText('Cédula de la fila 1')).not.toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('borrar una fila de arriba corre los errores de las de abajo, no los borra', async () => {
    post.mockResolvedValueOnce({ data: { ...OK, conDatos: 2,
      errores: [{ fila: 3, campo: 'cedula', mensaje: 'La cédula 222 ya está registrada en tu empresa.' }] } });
    montar();
    await subir();
    await waitFor(() => expect(screen.getByLabelText('Cédula de la fila 2')).toHaveAttribute('aria-invalid', 'true'));

    await userEvent.click(screen.getByRole('button', { name: /Quitar la fila 1/i }));

    // Luis subió a la fila 1 y su error se fue con él.
    expect(screen.getByLabelText('Nombre de la fila 1')).toHaveValue('Luis');
    expect(screen.getByLabelText('Cédula de la fila 1')).toHaveAttribute('aria-invalid', 'true');
  });

  it('corregir la celda le quita la marca sin esperar al servidor', async () => {
    // Dejarla en rojo mientras se escribe la corrección se lee como que lo
    // nuevo también está mal.
    post.mockResolvedValueOnce({ data: { ...OK, conDatos: 2,
      errores: [{ fila: 2, campo: 'nombre', mensaje: 'Falta el nombre.' }] } });
    montar();
    await subir();
    const campo = screen.getByLabelText('Nombre de la fila 1');
    await waitFor(() => expect(campo).toHaveAttribute('aria-invalid', 'true'));
    await userEvent.type(campo, 'x');
    expect(campo).not.toHaveAttribute('aria-invalid', 'true');
  });
});

describe('crear', () => {
  it('manda lo que quedó en la tabla, no lo que traía el archivo', async () => {
    montar();
    await subir();
    const campo = screen.getByLabelText('Nombre de la fila 1');
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
    expect(screen.getByLabelText('Nombre de la fila 1')).toHaveValue('Ana');
  });
});

describe('la sede, igual que el horario', () => {
  it('cada persona tiene su selector', async () => {
    montar();
    await subir();
    const sel = screen.getByLabelText('Sede de la fila 1');
    await userEvent.selectOptions(sel, 's2');
    expect(sel).toHaveValue('s2');
    expect(screen.getByLabelText('Sede de la fila 2')).toHaveValue('');
  });

  it('y hay uno para ponérsela a todos', async () => {
    montar();
    await subir();
    await userEvent.selectOptions(screen.getByLabelText(/Sede para todos/i), 's1');
    expect(screen.getByLabelText('Sede de la fila 1')).toHaveValue('s1');
    expect(screen.getByLabelText('Sede de la fila 2')).toHaveValue('s1');
  });

  it('poner la sede a todos no le borra el horario a nadie', async () => {
    montar();
    await subir();
    await userEvent.selectOptions(screen.getByLabelText('Horario de la fila 1'), 'h2');
    await userEvent.selectOptions(screen.getByLabelText(/Sede para todos/i), 's1');
    expect(screen.getByLabelText('Horario de la fila 1')).toHaveValue('h2');
  });

  it('sin sedes creadas, la columna no estorba', async () => {
    // Una empresa de una sola oficina no tiene por qué ver una columna que
    // solo puede decir "sin sede".
    get.mockResolvedValue({ data: { columnas: COLUMNAS, horarios: HORARIOS, sedes: [] } });
    montar();
    await subir();
    expect(screen.queryByLabelText(/Sede para todos/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Sede de la fila 1')).not.toBeInTheDocument();
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
    expect(screen.getByLabelText('Fecha de nacimiento de la fila 1')).toHaveValue('1985-12-11');
  });

  it('se corrige con un calendario, no escribiendo el formato de memoria', async () => {
    montar();
    await subir();
    expect(screen.getByLabelText('Fecha de nacimiento de la fila 1')).toHaveAttribute('type', 'date');
  });

  it('una fecha vacía también se llena con el calendario', async () => {
    // Si cayera a texto por estar vacía, habría que escribir AAAA-MM-DD a mano
    // justo en el caso en que más ayuda el calendario.
    montar();
    await subir();
    const campo = screen.getByLabelText('Fecha de nacimiento de la fila 2');
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
    const campo = screen.getByLabelText('Fecha de nacimiento de la fila 1');
    expect(campo).toHaveAttribute('type', 'text');
    expect(campo).toHaveValue('no sé');
  });
});

describe('cerrar sin perder el trabajo', () => {
  it('sin nada subido, el clic fuera cierra de una', async () => {
    const onCerrar = vi.fn();
    montar({ onCerrar });
    await screen.findByLabelText(/Subir el formato/i);
    await userEvent.click(screen.getByTestId('fondo'));
    expect(onCerrar).toHaveBeenCalled();
  });

  it('con la tabla llena NO cierra de una: avisa antes', async () => {
    // Veinte filas corregidas se pierden con un clic torcido.
    const onCerrar = vi.fn();
    montar({ onCerrar });
    await subir();
    await userEvent.click(screen.getByTestId('fondo'));
    expect(onCerrar).not.toHaveBeenCalled();
    expect(screen.getByText(/vas a perder/i)).toBeInTheDocument();
  });

  it('y si confirma, cierra', async () => {
    const onCerrar = vi.fn();
    montar({ onCerrar });
    await subir();
    await userEvent.click(screen.getByTestId('fondo'));
    await userEvent.click(screen.getByRole('button', { name: /Sí, salir/i }));
    expect(onCerrar).toHaveBeenCalled();
  });

  it('si se arrepiente, la tabla sigue ahí', async () => {
    const onCerrar = vi.fn();
    montar({ onCerrar });
    await subir();
    await userEvent.click(screen.getByTestId('fondo'));
    await userEvent.click(screen.getByRole('button', { name: /Seguir editando/i }));
    expect(onCerrar).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Nombre de la fila 1')).toHaveValue('Ana');
  });

  it('la X y Cancelar avisan igual: es el mismo trabajo el que se pierde', async () => {
    const onCerrar = vi.fn();
    montar({ onCerrar });
    await subir();
    await userEvent.click(screen.getByRole('button', { name: /^Cerrar$/i }));
    expect(onCerrar).not.toHaveBeenCalled();
    expect(screen.getByText(/vas a perder/i)).toBeInTheDocument();
  });
});

describe('el salario, como se lee la plata', () => {
  it('llega del Excel ya con sus puntos', async () => {
    montar();
    await subir();
    expect(screen.getByLabelText('Salario mensual de la fila 1')).toHaveValue('1.750.905');
  });

  it('los puntos aparecen solos al escribir', async () => {
    montar();
    await subir();
    const campo = screen.getByLabelText('Salario mensual de la fila 1');
    await userEvent.clear(campo);
    await userEvent.type(campo, '2400000');
    expect(campo).toHaveValue('2.400.000');
  });

  it('borrarlo deja el campo vacío, no un cero', async () => {
    montar();
    await subir();
    const campo = screen.getByLabelText('Salario mensual de la fila 1');
    await userEvent.clear(campo);
    expect(campo).toHaveValue('');
  });

  it('viaja con puntos y el servidor lo entiende', async () => {
    montar();
    await subir();
    post.mockResolvedValueOnce({ data: { ...OK, creados: 2 } });
    await userEvent.click(screen.getByRole('button', { name: /Crear 2 colaboradores/i }));
    const enviado = post.mock.calls[post.mock.calls.length - 1][1] as { filas: Record<string, string>[] };
    expect(enviado.filas[0].salarioMensual).toBe('1.750.905');
  });
});

describe('soltar el archivo encima', () => {
  it('se puede arrastrar hasta la zona, no solo elegirlo', async () => {
    montar();
    const zona = await screen.findByTestId('zona-archivo');
    fireEvent.drop(zona, { dataTransfer: { files: [archivo()] } });
    await screen.findByRole('table');
    expect(leerHoja).toHaveBeenCalled();
  });

  it('soltar algo que no es hoja de cálculo se rechaza igual', async () => {
    montar();
    const zona = await screen.findByTestId('zona-archivo');
    fireEvent.drop(zona, { dataTransfer: { files: [new File(['x'], 'foto.png', { type: 'image/png' })] } });
    expect(await screen.findByText(/Excel/i)).toBeInTheDocument();
    expect(leerHoja).not.toHaveBeenCalled();
  });

  it('soltar sin archivo no rompe nada', async () => {
    montar();
    const zona = await screen.findByTestId('zona-archivo');
    fireEvent.drop(zona, { dataTransfer: { files: [] } });
    expect(leerHoja).not.toHaveBeenCalled();
  });
});
