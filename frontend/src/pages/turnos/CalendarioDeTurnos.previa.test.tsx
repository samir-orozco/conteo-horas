import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CalendarioDeTurnos from './CalendarioDeTurnos';
import { hoyEnBogota, lunesDeLaSemana, diasDeLaSemana, sumarDias } from './semana';

// LO QUE SE DICE ANTES DE ESCRIBIR (28 de septiembre de 2026).
//
// Marcar cien celdas y darle a un turno escribe cien jornadas de las que alguien es responsable. Sin
// un paso en medio, el clic que programa una semana entera pesa lo mismo que el clic que programa un
// día, y eso es justo lo que no puede ser.
//
// POR QUÉ UN PASO MÁS AQUÍ Y NO EN LA CELDA SUELTA: pintar un día es reversible y barato, así que su
// panel escribe de una («elegir ES la acción», y así sigue). Un bloque no: toca a varias personas a la
// vez, y dos de sus consecuencias cuestan dinero —pintar sobre el descanso obligatorio paga recargo, y
// cruzar el tercero del mes convierte el compensatorio en obligación—. Esas dos hay que poder leerlas
// antes de decir sí.
//
// LAS CUENTAS Y LOS AVISOS NO SE DECIDEN AQUÍ: son `conteoDePrevia`, `descansosPisados` y
// `cruzanAHabitual`, que son puros y están probados y mutados aparte. Esta prueba comprueba que la
// pantalla los APLICA y que lo que muestra es lo que dicen.

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
const DOMINGO = DIAS[6];
const SABADO = DIAS[5];
const VIERNES = DIAS[4];
const numeroDe = (fecha: string) => Number(fecha.slice(8, 10));

// OJO: `montar` recibe `unknown[]` a propósito, así que NADIE tipa este fixture. Cuando la respuesta
// gane un campo hay que agregarlo aquí a mano o la prueba sigue verde ejercitando un día que no
// existe (CLAUDE.md §9.2).
const diaDe = (fecha: string, extra: Record<string, unknown> = {}) => ({
  fecha, estado: 'TRABAJA', horaEntrada: '10:00', horaSalida: '16:00',
  minutosEsperados: 300, esFestivo: false, origen: 'AUTO', turno: null,
  horarioNombre: null, decision: null, esDescansoObligatorio: false,
  toleranciaMin: 10, toleranciaSalidaMin: 0, ajustaEntrada: false,
  almuerzoMin: 60, almuerzoInicio: '12:00', almuerzoFin: '13:00', descansos: [],
  ...extra,
});

const personaDe = (
  id: string, nombre: string, apellido: string,
  dias: { fecha: string; extra?: Record<string, unknown> }[],
  fila: Record<string, unknown> = {},
) => ({
  id, nombre, apellido, cargo: 'Guarda',
  descanso: { tipo: 'PRESUMIDO', dia: null },
  minutosEsperados: 2100, descansosConTurno: 0,
  descansoHabitual: { porMes: {}, mes: HOY.slice(0, 7), trabajados: 0, clase: 'NINGUNO' },
  propuesta: { estado: 'NO_APLICA' },
  dias: dias.map(d => diaDe(d.fecha, d.extra)),
  ...fila,
});

const CATALOGO = [
  { id: 'p1', nombre: 'Mañana', color: 'esmeralda', horaEntrada: '06:00', horaSalida: '14:00' },
  { id: 'p2', nombre: 'Noche', color: 'cobalto', horaEntrada: '22:00', horaSalida: '06:00' },
];

// `minimoHabitual` viaja en la respuesta igual que `horasSemanales`: son los dos números legales que
// la pantalla nombra, y escribirlos aquí a mano los congelaría.
const montar = (filas: unknown[], extraRespuesta: Record<string, unknown> = {}) => {
  get.mockImplementation((url: string) => {
    if (url === '/turnos/calendario') {
      return Promise.resolve({
        data: { desde: LUNES, hasta: DOMINGO, horasSemanales: 42, minimoHabitual: 3, filas, ...extraRespuesta },
      });
    }
    if (url === '/plantillas-turno') return Promise.resolve({ data: CATALOGO });
    return Promise.reject(new Error('url inesperada: ' + url));
  });
  return render(<CalendarioDeTurnos />);
};

const celda = (quien: string, fecha: string) =>
  screen.findByRole('button', { name: new RegExp(`${quien}.*día ${numeroDe(fecha)}\\b`) });

const tarjeta = () => screen.findByRole('region', { name: /marcad/i });
const previa = () => screen.findByRole('dialog', { name: /antes de aplicar/i });

// `pointerover` y no `pointerenter`: enter no burbujea, así que colgado de la celda de la tabla no
// llegaría desde el botón de dentro.
const arrastrarDe = (desde: HTMLElement, hasta: HTMLElement) => {
  fireEvent.pointerDown(desde, { pointerId: 1, button: 0 });
  fireEvent.pointerOver(hasta, { pointerId: 1 });
  fireEvent.pointerUp(window, { pointerId: 1 });
};

// Marca la fila de esa persona y elige un turno del carril, que es el camino normal.
const marcarFilaYElegir = async (
  usuario: ReturnType<typeof userEvent.setup>, quien: string, turno: RegExp,
) => {
  await usuario.click(await screen.findByRole('button', { name: new RegExp(`marcar la semana de ${quien}`, 'i') }));
  await usuario.click(within(await tarjeta()).getByRole('button', { name: turno }));
};

beforeEach(() => { put.mockReset(); del.mockReset(); });

describe('elegir algo en la tarjeta no escribe: primero lo cuenta', () => {
  it('abre la previa y NO ha escrito nada todavía', async () => {
    const usuario = userEvent.setup();
    montar([personaDe('c1', 'Ana', 'Ríos', [{ fecha: SABADO }, { fecha: DOMINGO }])]);
    await marcarFilaYElegir(usuario, 'Ana Ríos', /Noche/);

    expect(await previa()).toBeInTheDocument();
    expect(put).not.toHaveBeenCalled();
  });

  it('dice cuántas jornadas se van a escribir', async () => {
    const usuario = userEvent.setup();
    montar([personaDe('c1', 'Ana', 'Ríos', [{ fecha: SABADO }, { fecha: DOMINGO }])]);
    await marcarFilaYElegir(usuario, 'Ana Ríos', /Noche/);
    expect(await previa()).toHaveTextContent(/Se escriben.*2 jornadas/s);
  });

  it('separa las que YA tenían ese mismo turno', async () => {
    // Sin esta separación, repasar una semana ya programada anunciaría escrituras que no cambian
    // nada, y un cambio real quedaría indistinguible de un repaso.
    const usuario = userEvent.setup();
    montar([personaDe('c1', 'Ana', 'Ríos', [
      // El turno viaja con su `id`, que es la forma real de la respuesta: comparar por nombre sería
      // frágil porque dos turnos del catálogo pueden llamarse igual. Este fixture llevaba un
      // `plantillaId` inventado, y con él la prueba habría pasado en verde mientras en producción la
      // comparación era siempre contra `undefined` (CLAUDE.md §9.2).
      { fecha: SABADO, extra: { origen: 'MANUAL', turno: { id: 'p2', nombre: 'Noche', color: 'cobalto' } } },
      { fecha: DOMINGO },
    ])]);
    await marcarFilaYElegir(usuario, 'Ana Ríos', /Noche/);
    const caja = await previa();
    expect(caja).toHaveTextContent(/Se escriben.*1 jornada/s);
    expect(caja).toHaveTextContent(/Ya tenían ese mismo turno.*1/s);
  });

  it('cuenta aparte las que no se tocan porque el día ya pasó', async () => {
    const usuario = userEvent.setup();
    const ayer = sumarDias(HOY, -1);
    montar([personaDe('c1', 'Ana', 'Ríos', [{ fecha: ayer }, { fecha: DOMINGO }])]);
    await marcarFilaYElegir(usuario, 'Ana Ríos', /Noche/);
    expect(await previa()).toHaveTextContent(/ya pasó.*1/s);
  });
});

describe('los avisos que cuestan dinero', () => {
  it('avisa que pintarías sobre el descanso obligatorio, y de quién es', async () => {
    // El caso que cuesta plata: ese día pasa a ser descanso trabajado y paga recargo.
    const usuario = userEvent.setup();
    montar([personaDe('c1', 'Ana', 'Ríos', [{ fecha: DOMINGO, extra: { esDescansoObligatorio: true } }])]);
    await marcarFilaYElegir(usuario, 'Ana Ríos', /Noche/);
    const caja = await previa();
    expect(caja).toHaveTextContent(/descanso obligatorio/i);
    expect(caja).toHaveTextContent(/Ana Ríos/);
  });

  it('y dice la fecha como la diría una persona, no en crudo', async () => {
    // Visto en el navegador: el aviso mostraba «Julián Torres, el 2026-09-28». Esa cadena es la clave
    // con la que se escribe el día, no algo que un administrador tenga que leer; en el resto del
    // producto las fechas se dicen con palabras. Se reutiliza el rótulo de día que ya existe y está
    // probado, en vez de armar aquí un formato nuevo.
    const usuario = userEvent.setup();
    montar([personaDe('c1', 'Ana', 'Ríos', [{ fecha: DOMINGO, extra: { esDescansoObligatorio: true } }])]);
    await marcarFilaYElegir(usuario, 'Ana Ríos', /Noche/);
    const caja = await previa();
    expect(caja).not.toHaveTextContent(DOMINGO);
    expect(caja).toHaveTextContent(new RegExp(`${numeroDe(DOMINGO)} de `));
  });

  it('marcar DESCANSO sobre ese mismo día NO lo avisa', async () => {
    // Marcar descanso ES el descanso. Avisarlo volvería ruido la acción que hace lo correcto.
    const usuario = userEvent.setup();
    montar([personaDe('c1', 'Ana', 'Ríos', [{ fecha: DOMINGO, extra: { esDescansoObligatorio: true } }])]);
    await usuario.click(await screen.findByRole('button', { name: /marcar la semana de Ana Ríos/i }));
    await usuario.click(within(await tarjeta()).getByRole('button', { name: /^Descanso$/ }));
    expect(await previa()).not.toHaveTextContent(/descanso obligatorio/i);
  });

  it('avisa a quien cruzaría a descanso HABITUAL con esto', async () => {
    // El aviso que cambia una obligación: hasta dos, compensar con tiempo es opcional; desde el
    // tercero del mes, no. Dos ya trabajados más uno que pisa este envío son tres.
    const usuario = userEvent.setup();
    montar([personaDe('c1', 'Ana', 'Ríos',
      [{ fecha: DOMINGO, extra: { esDescansoObligatorio: true } }],
      { descansoHabitual: { porMes: {}, mes: HOY.slice(0, 7), trabajados: 2, clase: 'OCASIONAL' } })]);
    await marcarFilaYElegir(usuario, 'Ana Ríos', /Noche/);
    expect(await previa()).toHaveTextContent(/habitual/i);
  });

  it('a quien NO cruza no se le avisa de habitual', async () => {
    const usuario = userEvent.setup();
    montar([personaDe('c1', 'Ana', 'Ríos',
      [{ fecha: DOMINGO, extra: { esDescansoObligatorio: true } }],
      { descansoHabitual: { porMes: {}, mes: HOY.slice(0, 7), trabajados: 0, clase: 'NINGUNO' } })]);
    await marcarFilaYElegir(usuario, 'Ana Ríos', /Noche/);
    expect(await previa()).not.toHaveTextContent(/habitual/i);
  });

  it('si el umbral no viene en la respuesta, NO se inventa uno', async () => {
    // Una respuesta vieja en caché o un backend anterior no traen `minimoHabitual`. Escribir un 3 de
    // respaldo en la pantalla sería la segunda copia de una regla legal; callar el aviso es lo
    // honesto, y los otros dos siguen saliendo.
    const usuario = userEvent.setup();
    montar([personaDe('c1', 'Ana', 'Ríos',
      [{ fecha: DOMINGO, extra: { esDescansoObligatorio: true } }],
      { descansoHabitual: { porMes: {}, mes: HOY.slice(0, 7), trabajados: 2, clase: 'OCASIONAL' } })],
    { minimoHabitual: undefined });
    await marcarFilaYElegir(usuario, 'Ana Ríos', /Noche/);
    const caja = await previa();
    expect(caja).not.toHaveTextContent(/habitual/i);
    expect(caja).toHaveTextContent(/descanso obligatorio/i);
  });
});

describe('decidir', () => {
  it('Cancelar no escribe nada y deja lo marcado como estaba', async () => {
    // Deja lo marcado: cancelar la previa es «déjame mirarlo otra vez», no «empieza de cero».
    const usuario = userEvent.setup();
    montar([personaDe('c1', 'Ana', 'Ríos', [{ fecha: SABADO }, { fecha: DOMINGO }])]);
    await marcarFilaYElegir(usuario, 'Ana Ríos', /Noche/);
    await usuario.click(within(await previa()).getByRole('button', { name: /cancelar/i }));

    expect(put).not.toHaveBeenCalled();
    expect(await tarjeta()).toHaveTextContent(/2 jornadas/);
  });

  it('Escape cierra la previa y NO escribe nada', async () => {
    // LA TECLA QUE CIERRA NO PUEDE SER LA QUE CONFIRMA. Se escribió al ver un `PUT /turnos/dia` en el
    // registro de red del navegador justo después de cerrar una previa con Escape, sin haber pulsado
    // Aplicar. La explicación probable era otra (alguien trasteando en la misma pantalla), pero la
    // alternativa —que cerrar escriba— es lo bastante grave como para no dejarla a una suposición.
    const usuario = userEvent.setup();
    montar([personaDe('c1', 'Ana', 'Ríos', [{ fecha: SABADO }, { fecha: DOMINGO }])]);
    await marcarFilaYElegir(usuario, 'Ana Ríos', /Noche/);
    await previa();
    await usuario.keyboard('{Escape}');

    expect(put).not.toHaveBeenCalled();
    expect(del).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { name: /antes de aplicar/i })).not.toBeInTheDocument();
    // Y lo marcado sigue ahí: cerrar es «déjame mirarlo otra vez», no «empieza de cero».
    expect(await tarjeta()).toHaveTextContent(/2 jornadas/);
  });

  it('Aplicar escribe cada celda y cierra la previa', async () => {
    const usuario = userEvent.setup();
    put.mockResolvedValue({ data: { ok: true } });
    montar([personaDe('c1', 'Ana', 'Ríos', [{ fecha: SABADO }, { fecha: DOMINGO }])]);
    await marcarFilaYElegir(usuario, 'Ana Ríos', /Noche/);
    await usuario.click(within(await previa()).getByRole('button', { name: /aplicar/i }));

    expect(put).toHaveBeenCalledWith('/turnos/dia', { colaboradorId: 'c1', fecha: SABADO, plantillaId: 'p2' });
    expect(put).toHaveBeenCalledWith('/turnos/dia', { colaboradorId: 'c1', fecha: DOMINGO, plantillaId: 'p2' });
    expect(await screen.findByRole('status')).toHaveTextContent(/2 jornadas/);
  });

  it('con todo en el pasado, no ofrece aplicar nada', async () => {
    // Un botón que no puede escribir ninguna jornada promete algo que no va a pasar.
    const usuario = userEvent.setup();
    const ayer = sumarDias(HOY, -1);
    const antier = sumarDias(HOY, -2);
    montar([personaDe('c1', 'Ana', 'Ríos', [{ fecha: antier }, { fecha: ayer }])]);
    await marcarFilaYElegir(usuario, 'Ana Ríos', /Noche/);
    const caja = await previa();
    expect(within(caja).getByRole('button', { name: /aplicar/i })).toBeDisabled();
  });

  it('el rectángulo también pasa por la previa', async () => {
    // El otro camino de selección tiene que llegar al mismo sitio: si uno se saltara la previa,
    // habría una forma de escribir un bloque sin leer los avisos.
    const usuario = userEvent.setup();
    montar([
      personaDe('c1', 'Ana', 'Ríos', [{ fecha: VIERNES }, { fecha: SABADO }, { fecha: DOMINGO }]),
      personaDe('c2', 'Beto', 'Lara', [{ fecha: VIERNES }, { fecha: SABADO }, { fecha: DOMINGO }]),
    ]);
    arrastrarDe(await celda('Ana', VIERNES), await celda('Beto', DOMINGO));
    await usuario.click(within(await tarjeta()).getByRole('button', { name: /Noche/ }));
    expect(await previa()).toHaveTextContent(/Se escriben.*6 jornadas/s);
  });
});
