import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor, act, fireEvent } from '@testing-library/react';
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

  // Unión con el descanso no remunerado (12 de septiembre de 2026): la columna de Sede
  // la decide la empresa (`muestraColumnaSede`) y la de Descansos las jornadas. Las dos
  // decisiones llegaron por ramas distintas y chocaron en la misma línea. Desde los
  // varios descansos del mismo día, la jornada trae `descansos`, una lista.
  it('con Norte y Sur activas y un descanso marcado, las columnas de Sede y de Descansos aparecen juntas en la misma fila', async () => {
    const DESCANSO_MARCADO = {
      estado: 'MARCADO', ventana: { inicio: '09:00', fin: '09:15' }, salida: bog(9), regreso: bog(9, 15),
      minutos: 15, minutosVentana: 15, minutosDescontados: 0, regresoEstimado: false, seExcedio: false, minutosDeMas: 0,
    };
    const dora = {
      ...jornadaDe('Dora', { sedeAtribuida: porDefecto(SUR) }),
      descansos: [DESCANSO_MARCADO], minutosDescansoAqui: 0,
      marcaciones: [{ ...marca('m-dora-1', bog(8), bog(9), false), salidaDescanso: true }, marca('m-dora-2', bog(9, 15), bog(17), false)],
    };
    get.mockImplementation((url: string) => Promise.resolve({
      data: url === '/registros' ? [dora] : url === '/sedes' ? [NORTE, SUR] : [],
    }));
    render(<Registros />);
    const fila = await screen.findByRole('row', { name: /Dora/ });
    expect(await screen.findByRole('columnheader', { name: 'Sede' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Descansos' })).toBeInTheDocument();
    expect(fila).toHaveTextContent('Sur (por defecto)');
    expect(fila).toHaveTextContent('09:00 → 09:15');
  });
});

// VARIOS DESCANSOS NO REMUNERADOS POR JORNADA (decisión del dueño del 12 de septiembre
// de 2026): hasta tres por franja, además del almuerzo. Una jornada con todos marcados
// son cinco marcaciones, y la tabla la sigue mostrando en una fila.
describe('varios descansos en la tabla y en el editor de la jornada', () => {
  const conPausa = (id: string, entrada: string, salida: string, pausa?: 'ALMUERZO' | 'DESCANSO') => ({
    ...marca(id, entrada, salida, pausa === 'ALMUERZO'), salidaDescanso: pausa === 'DESCANSO',
  });
  const resumen = (p: Record<string, unknown>) => ({
    estado: 'NO_MARCADO', ventana: { inicio: '09:00', fin: '09:15' }, salida: null, regreso: null, minutos: null,
    minutosVentana: 15, minutosDescontados: 0, regresoEstimado: false, seExcedio: false, minutosDeMas: 0, ...p,
  });
  // Ana, con el horario del ejemplo: 07:00-09:00 descanso, 09:15-12:00 almuerzo,
  // 13:00-15:00 descanso y 15:10-16:00.
  const ANA = {
    ...JORNADA, id: 'm1', entrada: bog(7), salida: bog(16), minutosContados: 455,
    marcaciones: [
      conPausa('m1', bog(7), bog(9), 'DESCANSO'), conPausa('m2', bog(9, 15), bog(12), 'ALMUERZO'),
      conPausa('m3', bog(13), bog(15), 'DESCANSO'), conPausa('m4', bog(15, 10), bog(16)),
    ],
    descansos: [],
  };
  // Tres descansos y el almuerzo: cinco marcaciones, el máximo de una jornada.
  const CINCO = {
    ...ANA,
    marcaciones: [
      conPausa('m1', bog(7), bog(9), 'DESCANSO'), conPausa('m2', bog(9, 15), bog(10), 'DESCANSO'),
      conPausa('m3', bog(10, 15), bog(12), 'ALMUERZO'), conPausa('m4', bog(13), bog(15), 'DESCANSO'),
      conPausa('m5', bog(15, 10), bog(16)),
    ],
  };
  // El detalle de una marcación, lo justo para que el modal abra.
  const detalleDe = (id: string) => ({
    registro: {
      id, colaboradorId: 'c1', fecha: bog(0), entrada: bog(7), salida: bog(9), tipo: 'NORMAL', observacion: null,
      salidaEstimada: false, salidaAlmuerzo: false, salidaDescanso: true, entradaEstimada: false,
      creadoEn: bog(7), editadoPor: null, editadoEn: null, sede: null, sedeSalida: null, tieneFotoEntrada: false, tieneFotoSalida: false,
    },
    colaborador: { nombre: 'Julián', apellido: 'Restrepo', cargo: null }, fecha: bog(0), dia: null, tramos: [],
    almuerzo: resumen({ estado: 'SIN_VENTANA', ventana: null, minutosVentana: null }),
    descansos: [], minutosDelDia: 455, minutosTarde: null, motivoSinTardanza: 'NO_PROGRAMADO', festivo: null, novedad: null,
  });
  const servir = (jornadas: unknown[]) => get.mockImplementation((url: string) => Promise.resolve({
    data: url === '/registros' ? jornadas
      : url === '/colaboradores' ? [COLABORADOR]
      : url.endsWith('/jornada/fotos') ? { fecha: bog(0), fotos: [] }
      : url.endsWith('/jornada') ? detalleDe(url.split('/')[2])
      : [],
  }));
  const abrirEditor = async () => {
    const usuario = userEvent.setup();
    render(<Registros />);
    await usuario.click(await screen.findByRole('button', { name: 'Más acciones de la jornada' }));
    await usuario.click(screen.getByRole('menuitem', { name: 'Editar' }));
    return usuario;
  };

  it('editar una jornada con dos descansos y guardar manda `descansos` con los dos en orden', async () => {
    servir([ANA]);
    put.mockResolvedValueOnce({ data: { ok: true } });
    await editarYGuardar();
    await waitFor(() => expect(put).toHaveBeenCalledTimes(1));
    const [url, datos] = put.mock.calls[0];
    expect(url).toBe('/registros/jornada/m1');
    expect(datos).toMatchObject({
      entrada: '07:00', salida: '16:00', almuerzo: { salida: '12:00', regreso: '13:00' },
      descansos: [{ salida: '09:00', regreso: '09:15' }, { salida: '15:00', regreso: '15:10' }],
    });
    expect(datos).not.toHaveProperty('descanso');
  });

  it('en el editor, quitar el primer descanso y agregar otro manda la lista como quedó', async () => {
    servir([ANA]);
    put.mockResolvedValueOnce({ data: { ok: true } });
    const usuario = await abrirEditor();
    expect(screen.getByLabelText('Descanso 1: salió')).toHaveValue('09:00');
    await usuario.click(screen.getByRole('button', { name: 'Quitar el descanso 1' }));
    expect(screen.getByLabelText('Descanso 1: salió')).toHaveValue('15:00');
    expect(screen.queryByLabelText('Descanso 2: salió')).toBeNull();
    await usuario.click(screen.getByRole('button', { name: 'Agregar descanso' }));
    fireEvent.change(screen.getByLabelText('Descanso 2: salió'), { target: { value: '10:30' } });
    fireEvent.change(screen.getByLabelText('Descanso 2: regresó'), { target: { value: '10:40' } });
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(put).toHaveBeenCalledTimes(1));
    expect(put.mock.calls[0][1].descansos).toEqual([{ salida: '15:00', regreso: '15:10' }, { salida: '10:30', regreso: '10:40' }]);
  });

  it('con tres descansos no se puede agregar un cuarto', async () => {
    servir([CINCO]);
    await abrirEditor();
    expect(screen.getByLabelText('Descanso 3: salió')).toHaveValue('15:00');
    expect(screen.getByRole('button', { name: 'Agregar descanso' })).toBeDisabled();
  });

  // Antes el detalle solo abría el editor de la jornada con tres marcaciones o menos; a
  // una de cinco la mandaba al editor de UNA marcación, que no sabe de sus pausas.
  it('desde el detalle, Editar abre el editor de la jornada también con cinco marcaciones', async () => {
    servir([CINCO]);
    const usuario = userEvent.setup();
    render(<Registros />);
    await usuario.click(await screen.findByRole('button', { name: 'Ver el detalle de la jornada' }));
    await usuario.click(await screen.findByRole('button', { name: 'Editar' }));
    expect(await screen.findByText('Editar jornada')).toBeInTheDocument();
    expect(screen.queryByText('Editar marcación')).toBeNull();
  });

  it('la columna Descansos: Carla dice «2 · 25 min», y quien no marcó uno de los dos, «1 de 2 sin marcar»', async () => {
    const persona = (nombre: string, descansos: unknown[]) => ({
      ...JORNADA, id: `j-${nombre}`, colaboradorId: `c-${nombre}`, colaborador: { id: `c-${nombre}`, nombre, apellido: 'Prueba' },
      marcaciones: [marca(`m-${nombre}`, bog(7), bog(16), false)], descansos,
    });
    // Carla salió a las 10:00 y el kiosco la anotó en el de las 15:00; su salida de las
    // 15:00 quedó en el de las 09:00.
    const carla = persona('Carla', [
      resumen({ estado: 'MARCADO', salida: bog(15), regreso: bog(15, 10), minutos: 10, minutosDescontados: 15 }),
      resumen({
        estado: 'MARCADO', ventana: { inicio: '15:00', fin: '15:10' }, minutosVentana: 10,
        salida: bog(10), regreso: bog(10, 15), minutos: 15, seExcedio: true, minutosDeMas: 5,
      }),
    ]);
    const beto = persona('Beto', [
      resumen({ estado: 'MARCADO', salida: bog(9), regreso: bog(9, 15), minutos: 15 }),
      resumen({ ventana: { inicio: '15:00', fin: '15:10' }, minutosVentana: 10, minutosDescontados: 10 }),
    ]);
    servir([carla, beto]);
    render(<Registros />);
    const filaCarla = await screen.findByRole('row', { name: /Carla/ });
    expect(screen.getByRole('columnheader', { name: 'Descansos' })).toBeInTheDocument();
    expect(filaCarla).toHaveTextContent('2 · 25 min');
    expect(screen.getByRole('row', { name: /Beto/ })).toHaveTextContent('1 de 2 sin marcar');
  });

  // «Descanso N» del mensaje del servidor es la posición en que llega la fila, contando las
  // vacías (backend/src/utils/jornada.ts, leerDescansosDelCuerpo, 12 de septiembre de 2026).
  // Este servidor de mentira numera igual, así que lo que se prueba es la costura: que la
  // fila que la pantalla llama «Descanso 2» llegue en la posición 2.
  it('con el Descanso 1 vacío y el Descanso 2 con solo el regreso, el mensaje nombra el descanso 2, el mismo de la pantalla', async () => {
    servir([{ ...ANA, marcaciones: [conPausa('m1', bog(7), bog(16))] }]);
    put.mockImplementation((_url: string, datos: { descansos?: { salida: string; regreso: string }[] }) => {
      const i = (datos.descansos ?? []).findIndex(d => d.regreso && !d.salida);
      return i < 0
        ? Promise.resolve({ data: { ok: true } })
        : Promise.reject({ response: { status: 400, data: { error: `Para registrar el regreso del descanso ${i + 1} hace falta la hora en que salió.` } } });
    });
    const usuario = await abrirEditor();
    await usuario.click(screen.getByRole('button', { name: 'Agregar descanso' }));
    await usuario.click(screen.getByRole('button', { name: 'Agregar descanso' }));
    fireEvent.change(screen.getByLabelText('Descanso 2: regresó'), { target: { value: '09:15' } });
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('Para registrar el regreso del descanso 2 hace falta la hora en que salió.')).toBeInTheDocument();
    expect(screen.getByLabelText('Descanso 2: salió')).toHaveValue('');
    expect(screen.getByLabelText('Descanso 2: regresó')).toHaveValue('09:15');
    expect(put.mock.calls[0][1].descansos).toEqual([{ salida: '', regreso: '' }, { salida: '', regreso: '09:15' }]);
  });

  it('una empresa sin descansos no ve la columna', async () => {
    servir([{ ...ANA, marcaciones: [conPausa('m1', bog(7), bog(16))] }]);
    render(<Registros />);
    await screen.findByRole('row', { name: /Julián/ });
    expect(screen.queryByRole('columnheader', { name: /Descanso/ })).toBeNull();
  });
});
