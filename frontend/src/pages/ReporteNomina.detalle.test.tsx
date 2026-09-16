import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReporteNomina from './ReporteNomina';

// EL DETALLE DE UNA PERSONA EN EL REPORTE DE NÓMINA (15 de septiembre de 2026, pedido del dueño).
//
// La columna «Novedades» apretaba todo el período en una celda de tabla. En su lugar va «Detalles»
// con un ojo, y el ojo abre un modal con las asistencias y las novedades de esa persona en ese
// período, con el mismo lenguaje del detalle de una jornada.
//
// Lo que se prueba aquí es lo que ve una persona: que el ojo diga de quién es, que pida los datos
// de ESA persona y ESE rango, y que el modal muestre los días con sus horas y sus novedades.

vi.mock('../lib/api', () => ({ default: { get: vi.fn() } }));
import api from '../lib/api';
const get = api.get as unknown as ReturnType<typeof vi.fn>;

// Un instante dado en hora de Bogotá (UTC-5 todo el año).
const bog = (a: number, mes: number, d: number, h = 0, min = 0) =>
  new Date(Date.UTC(a, mes - 1, d, h + 5, min)).toISOString();

const ANA = {
  colaboradorId: 'c-ana', cedula: '1020345678', nombre: 'Ana', apellido: 'Gómez', cargo: 'Vigilante',
  salarioMensual: 1_750_000, valorHora: 9_114.58, registrosCont: 3, minutosOrdinarios: 1_440,
  liquidacion: [], totalRecargos: 12_500, totalExtra: 0, totalAdicional: 12_500,
  novedades: [{ tipo: 'MEDICO', remunerado: true, dias: 1, parciales: 0 }],
  sedes: [],
};
const LUIS = {
  ...ANA, colaboradorId: 'c-luis', cedula: '1099887766', nombre: 'Luis', apellido: 'Pérez',
  novedades: [], totalRecargos: 0, totalAdicional: 0,
};

// El 3 de septiembre son DOS jornadas: salió y volvió a entrar. `GET /registros` devuelve una fila
// por jornada, no por marcación, así que un día así llega partido y el modal lo junta en una línea.
const REGISTROS_DE_ANA = [
  { id: 'r1', fecha: bog(2026, 9, 3), entrada: bog(2026, 9, 3, 8, 0), salida: bog(2026, 9, 3, 12, 0) },
  { id: 'r1b', fecha: bog(2026, 9, 3), entrada: bog(2026, 9, 3, 14, 0), salida: bog(2026, 9, 3, 17, 0) },
  { id: 'r2', fecha: bog(2026, 9, 10), entrada: bog(2026, 9, 10, 10, 47), salida: null },
];
const PERMISOS_DE_ANA = [
  {
    id: 'p1', tipo: 'MEDICO', fechaInicio: bog(2026, 9, 10), fechaFin: bog(2026, 9, 10),
    aprobado: true, remunerado: true, descripcion: 'Control con el especialista',
  },
];

function montar(registros = REGISTROS_DE_ANA, permisos = PERMISOS_DE_ANA) {
  get.mockImplementation((url: string) => {
    if (url === '/sedes') return Promise.resolve({ data: [] });
    if (url === '/reportes/nomina') {
      return Promise.resolve({ data: { desde: '2026-09-01', hasta: '2026-09-15', colaboradores: [ANA, LUIS] } });
    }
    if (url === '/registros') return Promise.resolve({ data: registros });
    if (url === '/permisos') return Promise.resolve({ data: permisos });
    return Promise.reject(new Error('url inesperada: ' + url));
  });
  return render(<ReporteNomina />);
}

const abrirElDetalleDeAna = async () => {
  const usuario = userEvent.setup();
  montar();
  await usuario.click(await screen.findByRole('button', { name: /Ana Gómez/ }));
  return { usuario, dialogo: await screen.findByRole('dialog') };
};

describe('el detalle de una persona en el reporte de nómina', () => {
  it('la tabla ofrece un ojo por fila, con el nombre de quién es, en vez de la columna de novedades', async () => {
    montar();
    await screen.findByRole('row', { name: /Ana Gómez/ });
    expect(screen.getByRole('columnheader', { name: 'Detalles' })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Novedades' })).not.toBeInTheDocument();
    // Un ojo por persona, y cada uno dice de quién es: «ver» a secas no distingue una fila de otra.
    expect(screen.getByRole('button', { name: /Ana Gómez/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Luis Pérez/ })).toBeInTheDocument();
  });

  it('pide los datos de esa persona y de ese período, no de todos', async () => {
    await abrirElDetalleDeAna();
    expect(get).toHaveBeenCalledWith('/registros', {
      params: { colaboradorId: 'c-ana', desde: '2026-09-01', hasta: '2026-09-15' },
    });
    expect(get).toHaveBeenCalledWith('/permisos', { params: { colaboradorId: 'c-ana' } });
  });

  it('el modal dice de quién es y qué período muestra', async () => {
    const { dialogo } = await abrirElDetalleDeAna();
    expect(dialogo).toHaveTextContent('Ana Gómez');
    expect(dialogo).toHaveTextContent('Vigilante');
  });

  it('muestra un día por marcación, con sus horas, del más reciente al más antiguo', async () => {
    const { dialogo } = await abrirElDetalleDeAna();
    const dias = await within(dialogo).findAllByRole('listitem');
    expect(dias).toHaveLength(2);
    expect(dias[0]).toHaveTextContent('10:47');
    expect(dias[1]).toHaveTextContent('08:00');
    expect(dias[1]).toHaveTextContent('17:00');
  });

  // Un día con varias jornadas se pinta en UNA línea, con la primera entrada y la última salida. Sin
  // decir cuántas fueron, «08:00 a 17:00» se lee como una jornada corrida y esconde que la persona
  // salió y volvió a entrar. Es el caso real de una persona con 4 jornadas el mismo día, visto contra
  // la base local el 15 de septiembre de 2026.
  it('el día con varias jornadas dice cuántas fueron, para que no se lea como una sola', async () => {
    const { dialogo } = await abrirElDetalleDeAna();
    const dias = await within(dialogo).findAllByRole('listitem');
    expect(dias[1]).toHaveTextContent('08:00');
    expect(dias[1]).toHaveTextContent('17:00');
    expect(dias[1]).toHaveTextContent('2 jornadas');
    // El día de una sola jornada no lleva el aviso: sería ruido en todas las filas.
    expect(dias[0]).not.toHaveTextContent('jornada');
  });

  it('el día sin salida lo dice, en vez de dejar un hueco', async () => {
    const { dialogo } = await abrirElDetalleDeAna();
    const dias = await within(dialogo).findAllByRole('listitem');
    expect(dias[0]).toHaveTextContent(/sin salida/i);
  });

  it('el día con novedad la muestra con su nombre legible, no con el código', async () => {
    const { dialogo } = await abrirElDetalleDeAna();
    const dias = await within(dialogo).findAllByRole('listitem');
    expect(dias[0]).toHaveTextContent('Cita médica');
    expect(dias[0]).not.toHaveTextContent('MEDICO');
  });

  // `registrosCont` viene del motor y NO son días: es `registros.filter(r => r.salida).length`, o
  // sea las marcaciones CERRADAS (backend/src/utils/liquidarRegistros.ts). Medido contra la base
  // local el 15 de septiembre de 2026, una persona con 12 marcaciones en 5 días daba 11, y otra que
  // nunca marcó la salida daba 0 teniendo días trabajados. Rotularlo «días con marcación» hacía que
  // la tarjeta de arriba contradijera a la lista de abajo, en el mismo modal.
  it('la tarjeta de días cuenta los días que la lista muestra, no las marcaciones cerradas', async () => {
    const { dialogo } = await abrirElDetalleDeAna();
    const dias = await within(dialogo).findAllByRole('listitem');
    expect(dias).toHaveLength(2);
    // Ana llega del servidor con registrosCont = 3, que es lo que NO se debe mostrar aquí.
    expect(within(dialogo).getByRole('group', { name: 'Días con marcación' })).toHaveTextContent('2');
  });

  it('dice aparte cuántas marcaciones cerradas hubo, que es lo que cuenta el motor', async () => {
    const { dialogo } = await abrirElDetalleDeAna();
    await within(dialogo).findAllByRole('listitem');
    expect(within(dialogo).getByRole('group', { name: 'Marcaciones cerradas' })).toHaveTextContent('3');
  });

  it('sin marcaciones en el período lo dice, en vez de una lista vacía', async () => {
    const usuario = userEvent.setup();
    montar([], []);
    await usuario.click(await screen.findByRole('button', { name: /Ana Gómez/ }));
    const dialogo = await screen.findByRole('dialog');
    expect(dialogo).toHaveTextContent(/no marcó ningún día/i);
  });

  it('se cierra, y al cerrarlo la tabla sigue ahí', async () => {
    const { usuario, dialogo } = await abrirElDetalleDeAna();
    await usuario.click(within(dialogo).getByRole('button', { name: 'Cerrar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('row', { name: /Ana Gómez/ })).toBeInTheDocument();
  });
});
