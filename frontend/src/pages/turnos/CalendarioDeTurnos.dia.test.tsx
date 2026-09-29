import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CalendarioDeTurnos from './CalendarioDeTurnos';
import { hoyEnBogota, inicialDeDia } from './semana';

// LA VISTA DE DÍA, EN HORAS (22 de septiembre de 2026).
//
// Pedido del dueño: «en la parte de día que no vea arriba la M de martes 22, sino las horas, y que
// la barra vaya del color del turno desde la hora de inicio hasta la hora de fin, que muestre todo
// el rango de hora que está ocupando la persona».
//
// Dónde empieza y dónde termina cada barra lo decide `ejeDeHoras`, que es puro y tiene sus 17
// pruebas y sus 6 mutaciones. En jsdom los anchos reales no existen, así que aquí NO se comprueba
// geometría: se comprueba que la pantalla cambió de forma (deja de haber una columna por día y
// pasa a haber un eje de horas) y que cada persona lleva su barra con su rango.
//
// EL CASO QUE ESTE ARCHIVO EXISTE PARA NO PERDER: el guarda NOCTURNO. Una empresa de este producto
// tiene gente de 22:00 a 06:00. Esa jornada cruza la medianoche y se dibuja como UNA sola barra
// continua; partida en dos se leería como si trabajara dos veces el mismo día.

const { get, put, del } = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), del: vi.fn() }));
vi.mock('../../lib/api', () => ({
  default: {
    get: (...a: unknown[]) => get(...a),
    put: (...a: unknown[]) => put(...a),
    delete: (...a: unknown[]) => del(...a),
    post: vi.fn(),
  },
}));

const HOY = hoyEnBogota();

const diaDe = (fecha: string, extra: Record<string, unknown> = {}) => ({
  fecha, estado: 'TRABAJA', horaEntrada: '08:00', horaSalida: '16:00',
  minutosEsperados: 420, esFestivo: false, origen: 'AUTO', turno: null,
  horarioNombre: 'Jornada demo', decision: null, esDescansoObligatorio: false,
  toleranciaMin: 10, toleranciaSalidaMin: 0, ajustaEntrada: false,
  almuerzoMin: 60, almuerzoInicio: '12:00', almuerzoFin: '13:00', descansos: [],
  ...extra,
});

const filaDe = (id: string, nombre: string, apellido: string, dia: Record<string, unknown>) => ({
  id, nombre, apellido, cargo: 'Guarda',
  sedes: [{ id: 's1', nombre: 'Norte' }],
  descanso: { tipo: 'PRESUMIDO', dia: null },
  minutosEsperados: 420, descansosConTurno: 0,
  descansoHabitual: { porMes: {}, mes: HOY.slice(0, 7), trabajados: 0, clase: 'NINGUNO' },
  dias: [dia],
  propuesta: null,
});

// Diurna de 08:00 a 16:00 y nocturna de 22:00 a 06:00. Con esas dos, el eje va de 07:00 a 07:00 del
// día siguiente, y los rótulos de después de medianoche tienen que decir 00, 01... y no 24, 25.
const DIURNA = filaDe('c1', 'Ana', 'Giraldo', diaDe(HOY));
const NOCTURNA = filaDe('c2', 'Julián', 'Torres', diaDe(HOY, {
  horaEntrada: '22:00', horaSalida: '06:00', turno: { id: 'p2', nombre: 'Noche', color: 'cobalto' },
}));
const SIN_TURNO = filaDe('c3', 'Sofía', 'Ramos', diaDe(HOY, {
  estado: 'SIN_TURNO', horaEntrada: null, horaSalida: null, minutosEsperados: 0, horarioNombre: null,
}));

const montar = (filas: unknown[]) => {
  get.mockImplementation((url: string, cfg?: { params?: { desde: string; hasta: string } }) => {
    if (url === '/turnos/calendario') {
      const { desde, hasta } = cfg!.params!;
      return Promise.resolve({ data: { desde, hasta, horasSemanales: 42, filas } });
    }
    if (url === '/plantillas-turno') return Promise.resolve({ data: [] });
    return Promise.reject(new Error('url inesperada: ' + url));
  });
  return render(<CalendarioDeTurnos />);
};

// Espera a que la respuesta haya llegado y la rejilla esté pintada.
//
// Se espera por el CARGO, que todos los fixtures comparten, y NO por un nombre. Esperando por /Ana/
// las dos pruebas del turno nocturno —cuyo fixture solo tiene a Julián— fallaban en el ayudante y
// nunca llegaban a su propia aserción: un rojo, sí, pero por un fallo de la prueba y no por lo que
// dice proteger, que no prueba nada (CLAUDE.md §9.1). Es el mismo tropiezo que ya había dado el
// mismo día esperando por un nombre que salía dos veces.
//
// `findAllByText` y no la versión singular: el cargo sale en la rejilla Y en la tabla de resumen.
const cargado = () => screen.findAllByText('Guarda');

const verEnDia = async (filas: unknown[]) => {
  montar(filas);
  await cargado();
  const usuario = userEvent.setup();
  await usuario.click(screen.getByRole('button', { name: 'Día' }));
  await cargado();
  return usuario;
};

const rejilla = async () => (await screen.findAllByRole('table'))[0];
const encabezado = async () => within(await rejilla()).getAllByRole('row')[0];

beforeEach(() => { get.mockReset(); put.mockReset(); del.mockReset(); });

describe('la rejilla cambia de forma en la vista de día', () => {
  it('desaparece la inicial del día de arriba', async () => {
    // Pedido literal del dueño: «que yo no vea arriba como la M de martes 22 ni nada». En la vista
    // de día esa letra no aporta —el título ya dice qué día es— y ocupa el sitio del eje de horas.
    //
    // AQUÍ HABÍA OTRA ASERCIÓN Y SE CAMBIÓ ANTES DE CORRERLA: contaba que hubiera tres encabezados
    // (persona + el día + el total). Pero en la vista de día YA son tres, así que esa cuenta pasaba
    // igual antes y después de la funcionalidad. Una prueba que no puede ponerse roja no protege
    // nada y hace creer que el caso está cubierto (CLAUDE.md §9.1).
    await verEnDia([DIURNA]);
    expect(within(await encabezado()).queryByText(inicialDeDia(HOY))).toBeNull();
  });

  it('y arriba se ven las HORAS, no la inicial del día', async () => {
    // Pedido literal: «que yo no vea arriba como la M de martes 22». Con una jornada de 08:00 a
    // 16:00 el eje va de 07:00 a 17:00.
    await verEnDia([DIURNA]);
    const cabeza = await encabezado();
    expect(within(cabeza).getByText('07')).toBeInTheDocument();
    expect(within(cabeza).getByText('12')).toBeInTheDocument();
    expect(within(cabeza).getByText('17')).toBeInTheDocument();
  });

  it('las horas pasadas la medianoche se rotulan 00, no 24', async () => {
    await verEnDia([NOCTURNA]);
    const cabeza = await encabezado();
    expect(within(cabeza).getByText('23')).toBeInTheDocument();
    expect(within(cabeza).getByText('00')).toBeInTheDocument();
    expect(within(cabeza).queryByText('24')).toBeNull();
  });
});

describe('cada persona lleva su barra', () => {
  it('con su rango de horas escrito', async () => {
    await verEnDia([DIURNA]);
    const fila = within(await rejilla()).getAllByRole('row')[1];
    expect(within(fila).getByText('08:00–16:00')).toBeInTheDocument();
  });

  it('el turno NOCTURNO es UNA sola barra CONTINUA, no dos pedazos', async () => {
    // Partido se leería como si Julián trabajara dos veces ese día, y el segundo pedazo aparecería
    // a la IZQUIERDA del primero, antes de haber entrado.
    await verEnDia([NOCTURNA]);
    const botones = screen.getAllByRole('button', { name: /Turno de Julián Torres/ });
    expect(botones).toHaveLength(1);

    // CONTAR BOTONES NO BASTA, y esta es la parte que hubo que agregar: con un solo día en pantalla
    // hay un solo botón pase lo que pase, así que esa cuenta sola pasaba también con el dibujo mal.
    //
    // Lo que de verdad decide dónde se pinta la barra es su estilo en línea, y ese sí existe en
    // jsdom aunque los anchos reales no. El turno va de 22:00 a 06:00 sobre un eje de 21:00 a
    // 07:00: entra una hora después de empezar el eje (10 % de 10 horas) y dura ocho (80 %).
    const barra = botones[0].parentElement!;
    expect(parseFloat(barra.style.left)).toBeCloseTo(10, 1);
    expect(parseFloat(barra.style.width)).toBeCloseTo(80, 1);
  });

  it('y la barra abre el panel de la jornada, igual que la celda de la semana', async () => {
    const usuario = await verEnDia([DIURNA]);
    // Doble clic: el clic simple marca la celda para la programación en bloque desde el 28 de
    // septiembre de 2026. La barra de la vista de día pasa por el mismo envoltorio que la celda de la
    // semana, así que hereda el mismo gesto, y eso es justo lo que este caso comprueba.
    await usuario.pointer({ target: screen.getByRole('button', { name: /Turno de Ana Giraldo/ }), keys: '[MouseRight]' });
    const panel = await screen.findByRole('dialog');
    expect(within(panel).getByText('Tolerancia de entrada')).toBeInTheDocument();
  });

  it('quien no tiene turno no lleva barra, pero sí el hueco para agregar', async () => {
    await verEnDia([SIN_TURNO, DIURNA]);
    const filas = within(await rejilla()).getAllByRole('row');
    const deSofia = filas.find(f => within(f).queryByText(/Sofía/));
    expect(deSofia).toBeDefined();
    expect(within(deSofia!).getByText('Agregar')).toBeInTheDocument();
  });
});
