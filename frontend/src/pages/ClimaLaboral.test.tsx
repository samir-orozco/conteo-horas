import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// EL PANEL DEL CLIMA LABORAL (4 de octubre de 2026). docs/CLIMA_LABORAL.md §3.6. Se consulta por lo que
// lee el administrador, no por clases.

const { get, put } = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }));
vi.mock('../lib/api', () => ({ default: { get: (...a: unknown[]) => get(...a), put: (...a: unknown[]) => put(...a) } }));
let mockPlan: () => { plan: { features: Record<string, boolean> } | null };
vi.mock('../lib/plan', () => ({ useMiPlan: () => mockPlan() }));
import ClimaLaboral from './ClimaLaboral';

const RESUMEN = {
  total: 60, personas: 38, promedio: 3.8, variacion: 0.2, jornadas: 80, negativas: 11,
  distribucion: { 1: 5, 2: 6, 3: 10, 4: 25, 5: 14 },
  motivos: [{ motivo: 'Mucho trabajo', veces: 9, porcentaje: 43 }, { motivo: 'Compañeros', veces: 4, porcentaje: 19 }],
  semanas: [
    { semana: '2026-09-28T05:00:00.000Z', promedio: 3.6, total: 30 },
    { semana: '2026-10-05T05:00:00.000Z', promedio: 3.9, total: 30 },
  ],
  porSede: [
    { sedeId: 's1', nombre: 'Principal', promedio: 4.1, total: 40, jornadas: 50, participacion: 80 },
    { sedeId: 's2', nombre: 'Norte', promedio: 3.2, total: 20, jornadas: 25, participacion: 80 },
    { sedeId: 's3', nombre: 'Sur', promedio: 2.5, total: 4, jornadas: 5, participacion: 80 },
  ],
  atencion: [
    { colaboradorId: 'c1', nombre: 'Andrea Gómez', cargo: 'Cajera', sedes: ['Norte'], dias: 6, desde: '2026-10-01T05:00:00.000Z', motivo: 'Mucho trabajo' },
    { colaboradorId: 'c3', nombre: 'Jorge Vargas', cargo: null, sedes: ['Sur'], dias: 5, desde: '2026-10-01T05:00:00.000Z', motivo: null },
    { colaboradorId: 'c4', nombre: 'Esteban Salazar', cargo: null, sedes: ['Principal'], dias: 4, desde: '2026-10-01T05:00:00.000Z', motivo: null },
    { colaboradorId: 'c5', nombre: 'Mariana Giraldo', cargo: null, sedes: ['Sur'], dias: 3, desde: '2026-10-01T05:00:00.000Z', motivo: null },
    { colaboradorId: 'c6', nombre: 'Johana Ospina', cargo: null, sedes: ['Sin sede'], dias: 3, desde: '2026-10-01T05:00:00.000Z', motivo: null },
  ],
  recientes: [
    { colaboradorId: 'c1', nombre: 'Andrea Gómez', fecha: '2026-10-07T05:00:00.000Z', carita: 2, motivos: ['Mucho trabajo'], observacion: 'Me dejaron sola en el cierre' },
    { colaboradorId: 'c2', nombre: 'Luis Pérez', fecha: '2026-10-07T05:00:00.000Z', carita: 5, motivos: [], observacion: null },
  ],
};
const BUZON = { semanas: [{ semana: '2026-10-05T05:00:00.000Z', notas: ['El microondas lleva un mes dañado', 'Los turnos se publican tarde'] }] };
const MOTIVOS = {
  motivos: ['Mucho trabajo', 'Jefe o supervisor', 'Compañeros', 'Me tocó quedarme más tiempo', 'Algo personal'],
  otro: 'Otro', maximo: 5,
  predeterminados: ['Mucho trabajo', 'Jefe o supervisor', 'Compañeros', 'Me tocó quedarme más tiempo', 'Algo personal'],
  catalogo: [{ tema: 'Las personas', motivos: ['Jefe o supervisor', 'Compañeros', 'Clientes difíciles'] }],
};

const HISTORIAL = {
  nombre: 'Andrea Gómez', cargo: 'Cajera', sedes: ['Norte'],
  respuestas: [
    { fecha: '2026-10-03T05:00:00.000Z', carita: 1, motivos: ['Mucho trabajo'], observacion: 'Me dejaron sola en el cierre otra vez' },
    { fecha: '2026-10-02T05:00:00.000Z', carita: 2, motivos: ['Mucho trabajo', 'Jefe o supervisor'], observacion: null },
    { fecha: '2026-09-30T05:00:00.000Z', carita: 4, motivos: [], observacion: null },
  ],
};
const respuestas = (sobre: Record<string, unknown> = {}) => (url: string) => {
  const datos: Record<string, unknown> = { '/clima/resumen': RESUMEN, '/clima/buzon': BUZON, '/clima/motivos': MOTIVOS, '/sedes': [], '/clima/persona/c1': HISTORIAL, ...sobre };
  return url in datos ? Promise.resolve({ data: datos[url] }) : Promise.reject(new Error(`sin respuesta para ${url}`));
};
const abrir = async (ruta = '/app/clima') => {
  render(<MemoryRouter initialEntries={[ruta]}><ClimaLaboral /></MemoryRouter>);
  await act(async () => {});
};

beforeEach(() => {
  get.mockReset();
  put.mockReset();
  get.mockImplementation(respuestas());
  put.mockImplementation((_u: string, body: { motivos: string[] }) => Promise.resolve({ data: { motivos: body.motivos } }));
  mockPlan = () => ({ plan: { features: { clima: true } } });
});

describe('el plan', () => {
  it('sin el módulo ofrece subir al Empresarial y no pide nada al servidor', async () => {
    mockPlan = () => ({ plan: { features: { clima: false } } });
    await abrir();
    expect(screen.getByText('Plan Empresarial')).toBeInTheDocument();
    expect(get).not.toHaveBeenCalledWith('/clima/resumen', expect.anything());
  });

  it('un supervisor ve que es solo del administrador', async () => {
    get.mockImplementation((url: string) => (url.startsWith('/clima')
      ? Promise.reject({ response: { status: 403, data: { codigo: 'SOLO_ADMIN', error: 'Solo el administrador ve el clima laboral.' } } })
      : Promise.resolve({ data: [] })));
    await abrir();
    expect(screen.getByText('Solo el administrador ve el clima laboral.')).toBeInTheDocument();
  });
});

describe('resumen', () => {
  it('las tarjetas: ánimo con su variación, quiénes respondieron y las respuestas negativas', async () => {
    await abrir();
    const animo = screen.getByRole('group', { name: 'Ánimo promedio' });
    expect(within(animo).getByText('3,8')).toBeInTheDocument();
    expect(within(animo).getByText('▲ 0,2')).toBeInTheDocument();
    const resp = screen.getByRole('group', { name: 'Respondieron' });
    expect(within(resp).getByText('75 %')).toBeInTheDocument();
    expect(within(resp).getByText('60 de 80 jornadas')).toBeInTheDocument();
    // «Días malos: 11» no decía que eran respuestas ni de cuántas: ahora es un porcentaje del total.
    const neg = screen.getByRole('group', { name: 'Respuestas negativas' });
    expect(within(neg).getByText('18,3 %')).toBeInTheDocument(); // 11 de 60
    expect(within(neg).getByText('11 respuestas: Muy mal o Mal')).toBeInTheDocument();
  });

  it('las tendencias van antes de las personas: primero el panorama, después el detalle', async () => {
    await abrir();
    const evolucion = screen.getByRole('group', { name: 'Evolución del ánimo' });
    const atencion = screen.getByRole('group', { name: 'Necesitan atención' });
    expect(evolucion.compareDocumentPosition(atencion) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('pide el resumen del mes en curso por defecto', async () => {
    await abrir();
    const [, opciones] = get.mock.calls.find(([u]) => u === '/clima/resumen')!;
    expect(opciones.params.desde).toMatch(/^\d{4}-\d{2}-01$/);
  });

  it('la línea de las semanas dice debajo a qué semanas corresponde', async () => {
    await abrir();
    const g = screen.getByRole('group', { name: 'Evolución del ánimo' });
    expect(within(g).getByText('28 de sept')).toBeInTheDocument();
    expect(within(g).getByText('5 de oct')).toBeInTheDocument();
  });

  it('cuántas caritas de cada una, con su nombre', async () => {
    await abrir();
    const dist = screen.getByRole('group', { name: 'Cómo se sintieron' });
    expect(within(dist).getByText('Muy bien')).toBeInTheDocument();
    expect(within(dist).getByText('25')).toBeInTheDocument();
  });

  it('los motivos de los días que no fueron buenos, con su porcentaje', async () => {
    await abrir();
    const m = screen.getByRole('group', { name: 'Por qué no fue un buen día' });
    expect(within(m).getByText('Mucho trabajo')).toBeInTheDocument();
    expect(within(m).getByText('43 %')).toBeInTheDocument();
  });

  it('el promedio de cada sede, con sus respuestas y su participación', async () => {
    await abrir();
    const s = screen.getByRole('group', { name: 'Por sede' });
    expect(within(s).getByText('Norte')).toBeInTheDocument();
    expect(within(s).getByText('3,2')).toBeInTheDocument();
    expect(within(s).getByText('20 respuestas · 80 % de participación')).toBeInTheDocument();
  });

  it('destaca la sede más baja, pero no una con pocas respuestas', async () => {
    await abrir();
    const s = screen.getByRole('group', { name: 'Por sede' });
    // Sur tiene el promedio más bajo (2,5) con solo 4 respuestas: se avisa, no se destaca.
    expect(within(s).getByText('Pocas respuestas')).toBeInTheDocument();
    const norte = within(s).getByText('Norte').closest('li')!;
    expect(within(norte).getByText('Más bajo')).toBeInTheDocument();
    expect(within(s).getAllByText('Más bajo')).toHaveLength(1);
  });

  it('quién necesita atención: respuestas, no días, y su motivo', async () => {
    await abrir();
    const a = screen.getByRole('group', { name: 'Necesitan atención' });
    expect(within(a).getByText('Andrea Gómez')).toBeInTheDocument();
    // Los días sin respuesta no cortan la cuenta: no son días de calendario seguidos.
    expect(within(a).getByText(/6 respuestas negativas consecutivas/)).toBeInTheDocument();
    expect(within(a).queryByText(/días seguidos/)).toBeNull();
    expect(within(a).getByText(/Más repetido: Mucho trabajo/)).toBeInTheDocument();
  });

  it('una tarjeta compacta: cuántas personas, tres a la vista y el resto a un toque', async () => {
    await abrir();
    const a = screen.getByRole('group', { name: 'Necesitan atención' });
    expect(within(a).getByText('5 personas')).toBeInTheDocument();
    expect(within(a).getAllByRole('button', { name: /^Revisar/ })).toHaveLength(3);
    expect(within(a).queryByText('Mariana Giraldo')).toBeNull();
    fireEvent.click(within(a).getByRole('button', { name: 'Ver las 5' }));
    expect(within(a).getAllByRole('button', { name: /^Revisar/ })).toHaveLength(5);
    expect(within(a).getByText('Mariana Giraldo')).toBeInTheDocument();
  });

  it('«Revisar» abre el historial de esa persona: respuestas, motivos y comentarios', async () => {
    await abrir();
    const a = screen.getByRole('group', { name: 'Necesitan atención' });
    await act(async () => { fireEvent.click(within(a).getByRole('button', { name: 'Revisar a Andrea Gómez' })); });
    expect(get).toHaveBeenCalledWith('/clima/persona/c1');
    const panel = screen.getByRole('dialog', { name: 'Andrea Gómez' });
    expect(within(panel).getByText('«Me dejaron sola en el cierre otra vez»')).toBeInTheDocument();
    expect(within(panel).getByText('Jefe o supervisor')).toBeInTheDocument();
    expect(within(within(panel).getByRole('list', { name: 'Respuestas' })).getAllByRole('listitem')).toHaveLength(3);
  });

  it('el resumen del historial es cada carita con cuántas veces la escogió, no una tira de caritas', async () => {
    // Pedido del dueño (4 de octubre de 2026): treinta caritas seguidas eran invasivas.
    await abrir();
    const a = screen.getByRole('group', { name: 'Necesitan atención' });
    await act(async () => { fireEvent.click(within(a).getByRole('button', { name: 'Revisar a Andrea Gómez' })); });
    const conteo = within(screen.getByRole('dialog')).getByRole('list', { name: 'Cuántas veces escogió cada carita' });
    expect(within(conteo).getAllByRole('listitem').map(li => li.getAttribute('aria-label')))
      .toEqual(['Muy mal: 1 vez', 'Mal: 1 vez', 'Normal: ninguna', 'Bien: 1 vez', 'Muy bien: ninguna']);
  });

  it('el historial se cierra con su botón y con Escape', async () => {
    await abrir();
    const a = screen.getByRole('group', { name: 'Necesitan atención' });
    await act(async () => { fireEvent.click(within(a).getByRole('button', { name: 'Revisar a Andrea Gómez' })); });
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cerrar' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    await act(async () => { fireEvent.click(within(a).getByRole('button', { name: 'Revisar a Andrea Gómez' })); });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('las calificaciones recientes, con nombre y su observación directa', async () => {
    await abrir();
    const r = screen.getByRole('group', { name: 'Calificaciones recientes' });
    expect(within(r).getByText('Luis Pérez')).toBeInTheDocument();
    expect(within(r).getByText('«Me dejaron sola en el cierre»')).toBeInTheDocument();
  });

  it('sin calificaciones en el período lo dice, en vez de mostrar ceros', async () => {
    get.mockImplementation(respuestas({
      '/clima/resumen': { ...RESUMEN, total: 0, personas: 0, promedio: null, variacion: null, negativas: 0, motivos: [], semanas: [], porSede: [], atencion: [], recientes: [], distribucion: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
    }));
    await abrir();
    expect(screen.getByText('Todavía nadie calificó su día en este período.')).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Ánimo promedio' })).toBeNull();
  });
});

describe('buzón confidencial', () => {
  it('muestra las notas por semana, sin nombre, y explica por qué', async () => {
    await abrir('/app/clima?tab=buzon');
    expect(screen.getByText('Semana del 5 de oct')).toBeInTheDocument();
    expect(screen.getByText('«El microondas lleva un mes dañado»')).toBeInTheDocument();
    expect(screen.getByText(/aparecen al día siguiente/)).toBeInTheDocument();
  });

  it('sin notas lo dice', async () => {
    get.mockImplementation(respuestas({ '/clima/buzon': { semanas: [] } }));
    await abrir('/app/clima?tab=buzon');
    expect(screen.getByText('No hay observaciones confidenciales en las últimas 12 semanas.')).toBeInTheDocument();
  });
});

describe('motivos', () => {
  it('muestra los cinco de la empresa y «Otro», que va fijo', async () => {
    await abrir('/app/clima?tab=motivos');
    const lista = screen.getByRole('list', { name: 'Motivos de la empresa' });
    expect(within(lista).getAllByRole('listitem')).toHaveLength(5);
    expect(screen.getByText(/«Otro» va siempre al final/)).toBeInTheDocument();
  });

  it('con cinco no se puede agregar otro hasta quitar uno', async () => {
    await abrir('/app/clima?tab=motivos');
    expect(screen.getByRole('button', { name: 'Agregar «Clientes difíciles»' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Quitar «Algo personal»' }));
    expect(screen.getByRole('button', { name: 'Agregar «Clientes difíciles»' })).toBeEnabled();
  });

  it('cambiar uno y guardar manda la lista nueva', async () => {
    await abrir('/app/clima?tab=motivos');
    fireEvent.click(screen.getByRole('button', { name: 'Quitar «Algo personal»' }));
    fireEvent.click(screen.getByRole('button', { name: 'Agregar «Clientes difíciles»' }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Guardar motivos' })); });
    expect(put).toHaveBeenCalledWith('/clima/motivos', {
      motivos: ['Mucho trabajo', 'Jefe o supervisor', 'Compañeros', 'Me tocó quedarme más tiempo', 'Clientes difíciles'],
    });
    expect(screen.getByText('Motivos guardados.')).toBeInTheDocument();
  });

  it('se puede escribir un motivo propio', async () => {
    await abrir('/app/clima?tab=motivos');
    fireEvent.click(screen.getByRole('button', { name: 'Quitar «Algo personal»' }));
    fireEvent.change(screen.getByLabelText('Motivo propio'), { target: { value: 'Falta de uniformes' } });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));
    expect(within(screen.getByRole('list', { name: 'Motivos de la empresa' })).getByText('Falta de uniformes')).toBeInTheDocument();
  });

  it('si el servidor rechaza, se ve por qué', async () => {
    put.mockImplementation(() => Promise.reject({ response: { data: { error: 'Hay motivos repetidos.' } } }));
    await abrir('/app/clima?tab=motivos');
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Guardar motivos' })); });
    expect(screen.getByText('Hay motivos repetidos.')).toBeInTheDocument();
  });
});
