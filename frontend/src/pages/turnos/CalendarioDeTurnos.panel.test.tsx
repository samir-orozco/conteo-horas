import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CalendarioDeTurnos from './CalendarioDeTurnos';
import { hoyEnBogota, lunesDeLaSemana, diasDeLaSemana } from './semana';

// EL PANEL DE LA CELDA (22 de septiembre de 2026).
//
// Tres pedidos del dueño en uno:
//   2. «Nos hace falta más info, similar a como tenemos en la creación de horario: las
//      tolerancias, cómo se maneja el almuerzo, descansos no remunerados.»
//   3. «Cuando le doy clic en jornada, que salga más un input con las opciones en vez de un modal.»
//   4. «Cuando no exista nada, que se vea un cuadro gris con un más adentro para agregar.»
//
// Y la condición que vale para TODOS los elementos de esta clase, dicha aparte: «no deben de
// ocultarse con la pantalla, que se acomode al espacio». Esa parte es geometría pura y vive en
// `lib/posicionDePanel.ts`, con sus ocho pruebas y sus cuatro mutaciones: en jsdom todos los
// rectángulos miden cero, así que comprobarla AQUÍ no probaría nada. Aquí se comprueba lo demás.
//
// LA DIFERENCIA ENTRE UN MODAL Y UN PANEL no es estética y por eso se afirma: un modal bloquea la
// página y se anuncia como tal (`aria-modal`), un panel anclado deja seguir. Lo que el dueño pidió
// es lo segundo.

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
const LUNES = lunesDeLaSemana(HOY);
const DIAS = diasDeLaSemana(LUNES);
// El domingo de la semana en curso: es hoy o futuro cualquier día que se corra la suite, así que
// `sePuedePintar` lo deja tocar sin necesidad de congelar el reloj.
const DOMINGO = DIAS[6];
const numeroDe = (fecha: string) => Number(fecha.slice(8, 10));

// UN DÍA COMPLETO, con las reglas puestas. Los valores son los que las aserciones van a buscar, y
// esa es la idea: si alguien vacía el fixture, las pruebas se caen en vez de pasar sobre
// `undefined` (CLAUDE.md §9.2).
const diaDe = (fecha: string, extra: Record<string, unknown> = {}) => ({
  fecha, estado: 'TRABAJA', horaEntrada: '08:00', horaSalida: '16:00',
  minutosEsperados: 420, esFestivo: false, origen: 'AUTO', turno: null,
  horarioNombre: 'Jornada demo', decision: null, esDescansoObligatorio: false,
  toleranciaMin: 10, toleranciaSalidaMin: 15, ajustaEntrada: false,
  almuerzoMin: 60, almuerzoInicio: '12:00', almuerzoFin: '13:00',
  descansos: [{ inicio: '10:00', fin: '10:15' }],
  ...extra,
});

const FILA = {
  id: 'c1', nombre: 'Julián', apellido: 'Torres', cargo: 'Guarda',
  descanso: { tipo: 'PRESUMIDO', dia: null },
  minutosEsperados: 2940, descansosConTurno: 0,
  descansoHabitual: { porMes: {}, mes: HOY.slice(0, 7), trabajados: 0, clase: 'NINGUNO' },
  dias: DIAS.map(f => diaDe(f)),
  propuesta: null,
};

// CON SUS HORAS, como las manda la respuesta de verdad (28 de septiembre de 2026). Esta fixture era
// la única del módulo que no las traía, y por eso fue la única que NO se rompió al empezar a pintar
// el horario dentro de la pastilla: sin horas no se pinta ninguna y el nombre accesible no cambia.
//
// O sea que estaba verde ejercitando un turno que no existe en producción (CLAUDE.md §9.2). Al
// ponérselas, las dos consultas por cadena exacta de más abajo pasan a buscar «Mañana 06:00–14:00»,
// y eso es justo lo que se quiere: que esta prueba toque lo que la pantalla muestra de verdad.
const CATALOGO = [
  { id: 'p1', nombre: 'Mañana', color: 'esmeralda', horaEntrada: '06:00', horaSalida: '14:00' },
  { id: 'p2', nombre: 'Noche', color: 'cobalto', horaEntrada: '22:00', horaSalida: '06:00' },
];

const montar = (filas: unknown[] = [FILA]) => {
  get.mockImplementation((url: string) => {
    if (url === '/turnos/calendario') {
      return Promise.resolve({ data: { desde: LUNES, hasta: DOMINGO, horasSemanales: 42, filas } });
    }
    if (url === '/plantillas-turno') return Promise.resolve({ data: CATALOGO });
    return Promise.reject(new Error('url inesperada: ' + url));
  });
  return render(<CalendarioDeTurnos />);
};

const celdaDelDomingo = () =>
  screen.findByRole('button', { name: new RegExp(`Julián Torres.*día ${numeroDe(DOMINGO)}`) });

const abrirPanel = async () => {
  const usuario = userEvent.setup();
  // DOBLE CLIC desde el 28 de septiembre de 2026: el clic simple ahora MARCA la celda para la
  // programación en bloque, que es el gesto del trabajo diario, y el panel de la jornada se movió un
  // gesto más adentro. Lo que este archivo comprueba —qué dice el panel y qué deja hacer— no cambia.
  await usuario.pointer({ target: await celdaDelDomingo(), keys: '[MouseRight]' });
  return { usuario, panel: await screen.findByRole('dialog') };
};

beforeEach(() => { put.mockReset(); del.mockReset(); });

describe('el panel se abre anclado, no como modal', () => {
  it('un clic en la jornada abre el panel', async () => {
    montar();
    const { panel } = await abrirPanel();
    expect(panel).toBeInTheDocument();
  });

  it('y NO se anuncia como modal, porque no bloquea la página', async () => {
    // La diferencia que pidió el dueño entre «un input» y «un modal», dicha en la única forma que
    // un lector de pantalla entiende.
    montar();
    const { panel } = await abrirPanel();
    expect(panel).not.toHaveAttribute('aria-modal');
  });

  it('se cierra con Escape', async () => {
    montar();
    const { usuario } = await abrirPanel();
    await usuario.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('el panel cuenta las reglas del día', () => {
  it('dice la jornada y las horas que ya vienen sin almuerzo', async () => {
    montar();
    const { panel } = await abrirPanel();
    expect(within(panel).getByText('08:00 a 16:00')).toBeInTheDocument();
    expect(within(panel).getByText(/7 h esperadas/)).toBeInTheDocument();
  });

  it('dice las dos tolerancias, que no son la misma cosa', async () => {
    montar();
    const { panel } = await abrirPanel();
    expect(within(panel).getByText('Tolerancia de entrada')).toBeInTheDocument();
    expect(within(panel).getByText('Tolerancia de salida')).toBeInTheDocument();
    expect(within(panel).getByText('10 minutos')).toBeInTheDocument();
    expect(within(panel).getByText('15 minutos')).toBeInTheDocument();
  });

  it('dice cómo se maneja el almuerzo, con su ventana', async () => {
    montar();
    const { panel } = await abrirPanel();
    expect(within(panel).getByText('60 minutos')).toBeInTheDocument();
    expect(within(panel).getByText('Entre 12:00 y 13:00.')).toBeInTheDocument();
  });

  it('dice los descansos no remunerados y a qué hora son', async () => {
    montar();
    const { panel } = await abrirPanel();
    expect(within(panel).getByText('Descansos no remunerados')).toBeInTheDocument();
    expect(within(panel).getByText('1 descanso')).toBeInTheDocument();
    expect(within(panel).getByText('10:00 a 10:15')).toBeInTheDocument();
  });

  it('un día sin horas no inventa reglas', async () => {
    // El día que el horario no programa. Sin esto, la pantalla mostraría tolerancias y almuerzo de
    // un día que nadie trabaja.
    montar([{
      ...FILA,
      dias: FILA.dias.map(d => (d.fecha === DOMINGO
        ? diaDe(d.fecha, { estado: 'SIN_TURNO', horaEntrada: null, horaSalida: null, minutosEsperados: 0 })
        : d)),
    }]);
    const { panel } = await abrirPanel();
    expect(within(panel).queryByText('Tolerancia de entrada')).toBeNull();
  });
});

describe('el panel sigue sirviendo para pintar', () => {
  it('ofrece los turnos del catálogo', async () => {
    montar();
    const { panel } = await abrirPanel();
    // Por expresión y no por cadena exacta: la pastilla ahora dice el nombre Y su horario, así que su
    // nombre accesible es «Mañana 06:00–14:00». Afirmar la cadena entera ataría esta prueba al formato
    // del horario, que es otra cosa y tiene su propio caso en `bloque.test.tsx`.
    expect(within(panel).getByRole('button', { name: /^Mañana/ })).toBeInTheDocument();
  });

  it('elegir uno lo pinta, sin un «guardar» aparte', async () => {
    montar();
    const { usuario, panel } = await abrirPanel();
    put.mockResolvedValue({ data: { ok: true } });
    await usuario.click(within(panel).getByRole('button', { name: /^Noche/ }));
    expect(put).toHaveBeenCalledWith('/turnos/dia', {
      colaboradorId: 'c1', fecha: DOMINGO, plantillaId: 'p2',
    });
  });
});

// MARCAR UN DÍA COMO DESCANSO (23 de septiembre de 2026, decisión del dueño).
//
// «Descanso es siempre descanso», así que dejó de ser un turno del catálogo que cada empresa tenía
// que inventarse, con su nombre y su color que nadie mostraba, y pasó a ser una ACCIÓN sobre el día.
//
// LO QUE VIAJA ES LA ACCIÓN, no un identificador: `{ descanso: true }` y ningún `plantillaId`. Esa
// es toda la diferencia con pintar un turno, y es lo que hace que no haya nada que crear antes.
describe('marcar un día como descanso', () => {
  it('el panel lo ofrece, sin que haya que crear ningún turno antes', async () => {
    montar();
    const { panel } = await abrirPanel();
    expect(within(panel).getByRole('button', { name: /marcar como descanso/i })).toBeInTheDocument();
  });

  it('manda la acción y NINGÚN turno', async () => {
    montar();
    const { usuario, panel } = await abrirPanel();
    put.mockResolvedValue({ data: { ok: true } });
    await usuario.click(within(panel).getByRole('button', { name: /marcar como descanso/i }));
    expect(put).toHaveBeenCalledWith('/turnos/dia', {
      colaboradorId: 'c1', fecha: DOMINGO, descanso: true,
    });
  });

  it('se ofrece aunque el catálogo esté vacío', async () => {
    // El caso que prueba que ya no depende del catálogo. Antes, sin un turno de descanso creado a
    // mano, no había forma de marcar un día libre: el popover solo listaba turnos de trabajo.
    get.mockImplementation((url: string, cfg?: { params?: { desde: string; hasta: string } }) => {
      if (url === '/turnos/calendario') {
        const { desde, hasta } = cfg!.params!;
        return Promise.resolve({ data: { desde, hasta, horasSemanales: 42, filas: [FILA] } });
      }
      if (url === '/plantillas-turno') return Promise.resolve({ data: [] });
      return Promise.reject(new Error('url inesperada: ' + url));
    });
    render(<CalendarioDeTurnos />);
    const usuario = userEvent.setup();
    // DOBLE CLIC desde el 28 de septiembre de 2026: el clic simple ahora MARCA la celda para la
  // programación en bloque, que es el gesto del trabajo diario, y el panel de la jornada se movió un
  // gesto más adentro. Lo que este archivo comprueba —qué dice el panel y qué deja hacer— no cambia.
  await usuario.pointer({ target: await celdaDelDomingo(), keys: '[MouseRight]' });
    const panel = await screen.findByRole('dialog');
    expect(within(panel).getByRole('button', { name: /marcar como descanso/i })).toBeInTheDocument();
  });
});

describe('cuando no hay nada, el hueco se ve y se puede llenar', () => {
  it('un día vacío muestra un recuadro para agregar, no una raya', async () => {
    // Pedido 4. La raya `—` decía «aquí no hay nada» sin decir que se podía poner algo: el hueco
    // se leía como un dato, no como una invitación.
    montar([{
      ...FILA,
      dias: FILA.dias.map(d => (d.fecha === DOMINGO
        ? diaDe(d.fecha, { estado: 'SIN_TURNO', horaEntrada: null, horaSalida: null, minutosEsperados: 0, horarioNombre: null })
        : d)),
    }]);
    const celda = await celdaDelDomingo();
    expect(within(celda).getByText('Agregar')).toBeInTheDocument();
    expect(celda).not.toHaveTextContent('—');
  });

  // LA OTRA MITAD DEL PEDIDO, con las palabras del dueño: «cuando yo le pongo en ese horario el
  // descanso, me aparece el botón de agregar. Debería verse una tarjeta que diga descanso».
  //
  // El defecto que reportó estaba en el SERVIDOR —no devolvía el estado DESCANSO para gente FIJA ni
  // PRESUMIDA, que es toda la suya—, y se arregló allá con `descansoPintado`. Esta prueba cubre
  // este lado, que no tenía ninguna: que llegando DESCANSO, la celda lo diga y NO ofrezca agregar.
  it('un día marcado como descanso muestra su tarjeta, y no el botón de agregar', async () => {
    montar([{
      ...FILA,
      dias: FILA.dias.map(d => (d.fecha === DOMINGO
        ? diaDe(d.fecha, { estado: 'DESCANSO', horaEntrada: null, horaSalida: null, minutosEsperados: 0, horarioNombre: null })
        : d)),
    }]);
    const celda = await celdaDelDomingo();
    expect(within(celda).getByText('Descanso')).toBeInTheDocument();
    expect(within(celda).queryByText('Agregar')).toBeNull();
  });
});
