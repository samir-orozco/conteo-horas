import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CalendarioDeTurnos from './CalendarioDeTurnos';
import { hoyEnBogota, lunesDeLaSemana, diasDeLaSemana, sumarDias } from './semana';

// LA PROGRAMACIÓN EN BLOQUE (28 de septiembre de 2026).
//
// Programar a veinte personas una semana pintando día por día son ciento cuarenta clics. Lo que hace
// viable el planificador es marcar VARIAS celdas y aplicarles una sola cosa.
//
// POR QUÉ LOS GESTOS SON ESTOS TRES Y NO EL CLIC SUELTO: en la maqueta la selección está siempre
// activa porque allí no existe el panel de la jornada. En la aplicación sí existe, es lo que el dueño
// pidió el 22 de septiembre («cuando le doy clic en jornada, que salga más un input con las
// opciones»), y lleva dentro las tolerancias, el almuerzo y los descansos de ESE día. Quedarse con la
// maqueta al pie de la letra sería borrarlo. Así que el clic suelto sigue abriendo el panel, y el
// bloque entra por arrastrar, por el nombre de la persona (su fila) y por el encabezado del día (su
// columna), que son los otros tres gestos que la maqueta ya tenía.
//
// LO QUE NO SE ESCRIBE TAMBIÉN SE DICE. Un día ya pasado no se toca, y la tarjeta lo cuenta aparte:
// escribir menos de lo que alguien creyó haber pedido, sin avisar, es la forma en que esta pantalla
// se rompería en silencio.

const { get, put, del } = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), del: vi.fn() }));
vi.mock('../../lib/api', () => ({
  default: {
    get: (...a: unknown[]) => get(...a),
    put: (...a: unknown[]) => put(...a),
    delete: (...a: unknown[]) => del(...a),
    post: vi.fn(),
  },
}));

// Las fechas se derivan con los MISMOS ayudantes que usa la pantalla, así que la prueba no puede
// desalinearse del componente al pasar el tiempo.
const HOY = hoyEnBogota();
const LUNES = lunesDeLaSemana(HOY);
const DIAS = diasDeLaSemana(LUNES);
const DOMINGO = DIAS[6];
const SABADO = DIAS[5];
const VIERNES = DIAS[4];
const numeroDe = (fecha: string) => Number(fecha.slice(8, 10));

// OJO CON ESTE FIXTURE: `montar` recibe `unknown[]` a propósito, y el precio es que NADIE lo tipa.
// Cuando la respuesta gane un campo hay que agregarlo aquí a mano o la prueba sigue verde ejercitando
// un día que no existe (CLAUDE.md §9.2).
const diaDe = (fecha: string, extra: Record<string, unknown> = {}) => ({
  fecha, estado: 'TRABAJA', horaEntrada: '10:00', horaSalida: '16:00',
  minutosEsperados: 300, esFestivo: false, origen: 'AUTO', turno: null,
  horarioNombre: null, decision: null, esDescansoObligatorio: false,
  toleranciaMin: 10, toleranciaSalidaMin: 0, ajustaEntrada: false,
  almuerzoMin: 60, almuerzoInicio: '12:00', almuerzoFin: '13:00', descansos: [],
  ...extra,
});

const personaDe = (id: string, nombre: string, apellido: string, dias: string[] = DIAS) => ({
  id, nombre, apellido, cargo: 'Guarda',
  descanso: { tipo: 'PRESUMIDO', dia: null },
  minutosEsperados: 2100, descansosConTurno: 0,
  descansoHabitual: { porMes: {}, mes: HOY.slice(0, 7), trabajados: 0, clase: 'NINGUNO' },
  propuesta: { estado: 'NO_APLICA' },
  dias: dias.map(f => diaDe(f)),
});

// Tres personas: con una sola no se puede comprobar que el rectángulo abarca filas, que es la mitad
// de lo que este gesto viene a hacer.
const ANA = personaDe('c1', 'Ana', 'Ríos');
const BETO = personaDe('c2', 'Beto', 'Lara');
const CIRO = personaDe('c3', 'Ciro', 'Peña');

const CATALOGO = [
  { id: 'p1', nombre: 'Mañana', color: 'esmeralda', horaEntrada: '06:00', horaSalida: '14:00' },
  { id: 'p2', nombre: 'Noche', color: 'cobalto', horaEntrada: '22:00', horaSalida: '06:00' },
];

const montar = (filas: unknown[] = [ANA, BETO, CIRO]) => {
  get.mockImplementation((url: string) => {
    if (url === '/turnos/calendario') {
      return Promise.resolve({ data: { desde: LUNES, hasta: DOMINGO, horasSemanales: 42, filas } });
    }
    if (url === '/plantillas-turno') return Promise.resolve({ data: CATALOGO });
    return Promise.reject(new Error('url inesperada: ' + url));
  });
  return render(<CalendarioDeTurnos />);
};

// La celda de una persona en un día, por lo que ve una persona y no por una clase de CSS.
const celda = (quien: string, fecha: string) =>
  screen.findByRole('button', { name: new RegExp(`${quien}.*día ${numeroDe(fecha)}\\b`) });

// La tarjeta de abajo. Aparece solo cuando hay algo marcado, así que `findBy` es parte de la
// afirmación: si no aparece, la prueba falla ahí.
const tarjeta = () => screen.findByRole('region', { name: /marcad/i });

// CON LA PREVIA EN MEDIO, ELEGIR EN LA TARJETA YA NO ESCRIBE: abre «Antes de aplicar» y una persona
// confirma. Estos casos nacieron antes de la previa y daban por hecho que el clic escribía de una, así
// que se pasan por el botón, que es lo que hace una persona de verdad. Lo que afirman —qué se manda y
// con qué— no cambia, y es lo que tienen que seguir sujetando.
const aplicarEnLaPrevia = async (usuario: ReturnType<typeof userEvent.setup>) => {
  const caja = await screen.findByRole('dialog', { name: /antes de aplicar/i });
  await usuario.click(within(caja).getByRole('button', { name: /aplicar/i }));
};

// EL ARRASTRE, con los eventos que el componente escucha de verdad. Lo que se afirma después es lo
// que la tarjeta DICE, no cómo se implementó el gesto.
//
// `pointerover` Y NO `pointerenter`: enter NO BURBUJEA. Los manejadores viven en la celda de la
// tabla y aquí se dispara sobre el botón de dentro, así que con `pointerenter` el evento no llegaría
// nunca y la prueba estaría midiendo el silencio (CLAUDE.md §12.2).
const arrastrarDe = async (desde: HTMLElement, hasta: HTMLElement) => {
  fireEvent.pointerDown(desde, { pointerId: 1, button: 0 });
  fireEvent.pointerOver(hasta, { pointerId: 1 });
  fireEvent.pointerUp(window, { pointerId: 1 });
};

beforeEach(() => { put.mockReset(); del.mockReset(); });

describe('marcar varias celdas', () => {
  it('arrastrar de una celda a otra marca el rectángulo', async () => {
    montar();
    await arrastrarDe(await celda('Ana', VIERNES), await celda('Beto', DOMINGO));
    // Dos personas por tres días. El número es la afirmación: un rectángulo que abarcara mal
    // escribiría sobre gente que nadie marcó.
    expect(await tarjeta()).toHaveTextContent(/6 jornadas/);
  });

  it('la tarjeta dice de cuántas personas y cuántos días, no solo el total', async () => {
    // «6 jornadas» puede ser 2 personas por 3 días o 6 por 1, y antes de escribir eso importa.
    montar();
    await arrastrarDe(await celda('Ana', VIERNES), await celda('Beto', DOMINGO));
    expect(await tarjeta()).toHaveTextContent(/2 personas · 3 días/);
  });

  it('con una sola persona dice su NOMBRE, no «1 persona»', async () => {
    // «1 persona · 7 días» obliga a recordar a quién se marcó. El nombre lo dice.
    //
    // Se marca por la fila y no con un clic en una celda a propósito: un clic suelto tiene que
    // seguir abriendo el panel de la jornada, que es lo que el dueño pidió el 22 de septiembre y lo
    // que prueban los diecinueve casos de `CalendarioDeTurnos.panel.test.tsx`.
    const usuario = userEvent.setup();
    montar();
    await usuario.click(await screen.findByRole('button', { name: /marcar la semana de Ana Ríos/i }));
    expect(await tarjeta()).toHaveTextContent(/Ana Ríos · 7 días/);
  });

  it('el nombre de la persona marca su fila entera', async () => {
    const usuario = userEvent.setup();
    montar();
    await usuario.click(await screen.findByRole('button', { name: /marcar la semana de Ana Ríos/i }));
    expect(await tarjeta()).toHaveTextContent(/7 jornadas/);
  });

  it('y volver a tocarlo la desmarca', async () => {
    // Sin esto, marcar una fila por error obliga a limpiar todo y empezar de nuevo.
    const usuario = userEvent.setup();
    montar();
    const suFila = await screen.findByRole('button', { name: /marcar la semana de Ana Ríos/i });
    await usuario.click(suFila);
    await tarjeta();
    await usuario.click(suFila);
    expect(screen.queryByRole('region', { name: /marcad/i })).not.toBeInTheDocument();
  });

  it('el encabezado del día marca la columna entera', async () => {
    const usuario = userEvent.setup();
    montar();
    await usuario.click(await screen.findByRole('button', {
      name: new RegExp(`marcar el día ${numeroDe(DOMINGO)} de todos`, 'i'),
    }));
    expect(await tarjeta()).toHaveTextContent(/3 jornadas/);
  });

  it('UN CLIC MARCA esa celda, como en la maqueta', async () => {
    // EL GESTO CAMBIÓ A PROPÓSITO el 28 de septiembre de 2026, con el dueño mirando la maqueta al
    // lado: «falta la selección en lote». En la maqueta un clic marca, y clic en una esquina más clic
    // en la otra cierra el rectángulo. Arrastrar sirve para una semana, pero en la vista de mes hay
    // 31 columnas y arrastrar obliga a desplazar con el botón apretado, que es inviable.
    //
    // Antes este mismo clic abría el panel del día. No se pierde: pasa al DOBLE clic, y su caso está
    // más abajo. Los dos gestos no pueden vivir en el mismo clic.
    const usuario = userEvent.setup();
    montar();
    await usuario.click(await celda('Ana', DOMINGO));
    expect(await tarjeta()).toHaveTextContent(/1 jornada/);
  });

  it('el SEGUNDO clic cierra el rectángulo entre las dos esquinas', async () => {
    const usuario = userEvent.setup();
    montar();
    await usuario.click(await celda('Ana', VIERNES));
    await usuario.click(await celda('Beto', DOMINGO));
    // Dos personas por tres días, sin arrastrar ni una vez.
    expect(await tarjeta()).toHaveTextContent(/6 jornadas/);
  });

  it('da igual por qué esquina se empiece', async () => {
    const usuario = userEvent.setup();
    montar();
    await usuario.click(await celda('Beto', DOMINGO));
    await usuario.click(await celda('Ana', VIERNES));
    expect(await tarjeta()).toHaveTextContent(/6 jornadas/);
  });

  it('con el rango ya cerrado, un clic en una celda marcada la desmarca', async () => {
    // Sin esto, equivocarse en una sola celda de un rectángulo de doscientas obliga a limpiar y
    // empezar de nuevo.
    const usuario = userEvent.setup();
    montar();
    await usuario.click(await celda('Ana', SABADO));
    await usuario.click(await celda('Ana', DOMINGO));
    expect(await tarjeta()).toHaveTextContent(/2 jornadas/);
    await usuario.click(await celda('Ana', DOMINGO));
    expect(await tarjeta()).toHaveTextContent(/1 jornada/);
  });

  it('el DOBLE clic abre el panel del día, que es donde se fue ese gesto', async () => {
    // El panel con las tolerancias, el almuerzo y los descansos del día sigue existiendo: lo pidió el
    // dueño el 22 de septiembre y es lo único que muestra las reglas con las que ESE día se liquida.
    const usuario = userEvent.setup();
    montar();
    await usuario.dblClick(await celda('Ana', DOMINGO));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('apretar y mover DENTRO de la misma celda no arma un rectángulo', async () => {
    // `pointerover` BURBUJEA y se vuelve a disparar al pasar por los elementos de dentro de la propia
    // celda. Sin la comprobación de «llegó a OTRA celda», moverse un pelo con el botón apretado
    // contaría como arrastre y cerraría el rango en la misma celda, dejando el gesto a medias.
    montar();
    const suya = await celda('Ana', DOMINGO);
    fireEvent.pointerDown(suya, { pointerId: 1, button: 0 });
    fireEvent.pointerOver(suya, { pointerId: 1 });
    fireEvent.pointerUp(window, { pointerId: 1 });
    // Queda marcada la celda (es un clic), pero el rango sigue ABIERTO: el siguiente clic tiene que
    // cerrar un rectángulo, no desmarcarla.
    expect(await tarjeta()).toHaveTextContent(/1 jornada/);
  });

  it('Cancelar limpia lo marcado y la tarjeta se va', async () => {
    const usuario = userEvent.setup();
    montar();
    await arrastrarDe(await celda('Ana', VIERNES), await celda('Beto', DOMINGO));
    await usuario.click(within(await tarjeta()).getByRole('button', { name: /cancelar/i }));
    expect(screen.queryByRole('region', { name: /marcad/i })).not.toBeInTheDocument();
  });

  it('los días que ya pasaron se cuentan aparte y se dicen', async () => {
    // El caso que la pantalla tiene que distinguir de «no marcaste nada»: aquí sí hubo selección, y
    // la respuesta honesta es que parte no se puede escribir.
    const ayer = sumarDias(HOY, -1);
    const usuario = userEvent.setup();
    montar([personaDe('c1', 'Ana', 'Ríos', [ayer, ...DIAS])]);
    await usuario.click(await screen.findByRole('button', { name: /marcar la semana de Ana Ríos/i }));
    expect(await tarjeta()).toHaveTextContent(/1 ya pasó y no se escribe/);
  });
});

describe('las pastillas de turno dicen a qué hora es ese turno', () => {
  // SALIÓ DE COMPARAR CON LA MAQUETA (28 de septiembre de 2026). Allí cada pastilla lleva el nombre y
  // debajo su horario («Mañana · 7:00 – 15:00»); aquí solo el nombre.
  //
  // NO ES COSMÉTICO, y se ve en la pantalla real del dueño: sus tres turnos se llaman «test»,
  // «test 2» y «Test largo». Al aplicar a un bloque de veinte personas, la tarjeta no deja confirmar
  // QUÉ horario se va a escribir: hay que acordarse de memoria o salir al catálogo y perder la
  // selección. Y lo que se escribe es lo que ese día va a exigir.
  //
  // EL DATO YA LLEGA: `GET /plantillas-turno` responde con `horaEntrada` y `horaSalida` de cada turno
  // (el fixture de arriba los trae porque son los de la respuesta real). Se estaban descartando en el
  // borde de tipos, no faltaba pedirlos.

  it('la pastilla del carril muestra el horario además del nombre', async () => {
    const usuario = userEvent.setup();
    montar();
    await usuario.click(await screen.findByRole('button', { name: /marcar la semana de Ana Ríos/i }));
    const boton = within(await tarjeta()).getByRole('button', { name: /Noche/ });
    expect(boton).toHaveTextContent('22:00');
    expect(boton).toHaveTextContent('06:00');
  });

  it('un turno sin horas no inventa ninguna', async () => {
    // Un turno de descanso del catálogo no tiene entrada ni salida. Poner un guion o un «00:00»
    // sería afirmar una jornada que no existe.
    const usuario = userEvent.setup();
    get.mockImplementation((url: string) => {
      if (url === '/turnos/calendario') {
        return Promise.resolve({ data: { desde: LUNES, hasta: DOMINGO, horasSemanales: 42, filas: [ANA] } });
      }
      if (url === '/plantillas-turno') {
        return Promise.resolve({
          data: [{ id: 'p9', nombre: 'Libre', color: 'grafito', horaEntrada: null, horaSalida: null }],
        });
      }
      return Promise.reject(new Error('url inesperada: ' + url));
    });
    render(<CalendarioDeTurnos />);
    await usuario.click(await screen.findByRole('button', { name: /marcar la semana de Ana Ríos/i }));
    const boton = within(await tarjeta()).getByRole('button', { name: /Libre/ });
    expect(boton).toHaveTextContent('Libre');
    expect(boton.textContent).not.toMatch(/\d{2}:\d{2}/);
  });
});

describe('aplicar a lo marcado', () => {
  const marcarDosCeldas = async () => {
    montar();
    await arrastrarDe(await celda('Ana', SABADO), await celda('Ana', DOMINGO));
    return await tarjeta();
  };

  it('elegir un turno escribe en CADA celda marcada', async () => {
    const usuario = userEvent.setup();
    put.mockResolvedValue({ data: { ok: true } });
    const caja = await marcarDosCeldas();
    await usuario.click(within(caja).getByRole('button', { name: /Noche/ }));
    await aplicarEnLaPrevia(usuario);

    expect(put).toHaveBeenCalledWith('/turnos/dia', { colaboradorId: 'c1', fecha: SABADO, plantillaId: 'p2' });
    expect(put).toHaveBeenCalledWith('/turnos/dia', { colaboradorId: 'c1', fecha: DOMINGO, plantillaId: 'p2' });
    expect(put).toHaveBeenCalledTimes(2);
  });

  it('Descanso manda la ACCIÓN de descanso, y ningún turno', async () => {
    const usuario = userEvent.setup();
    put.mockResolvedValue({ data: { ok: true } });
    const caja = await marcarDosCeldas();
    await usuario.click(within(caja).getByRole('button', { name: /^Descanso$/ }));
    await aplicarEnLaPrevia(usuario);

    expect(put).toHaveBeenCalledWith('/turnos/dia', { colaboradorId: 'c1', fecha: SABADO, descanso: true });
    expect(put).toHaveBeenCalledTimes(2);
  });

  it('Quitar turno borra en cada celda marcada', async () => {
    // LOS DÍAS TIENEN QUE TENER ALGO PINTADO, y antes no lo tenían: este caso montaba días que el
    // horario resuelve solo y pedía borrarlos. La previa dice —con razón— que ahí no hay nada que
    // quitar y deja el botón apagado, así que la prueba estaba afirmando un borrado imposible. Lo que
    // el backend contestaría es «ese día no tiene ningún turno pintado».
    const usuario = userEvent.setup();
    del.mockResolvedValue({ data: { ok: true } });
    const pintados = personaDe('c1', 'Ana', 'Ríos', DIAS).dias.map(d => ({
      ...d, origen: 'MANUAL', turno: { id: 'p2', nombre: 'Noche', color: 'cobalto' },
    }));
    montar([{ ...personaDe('c1', 'Ana', 'Ríos'), dias: pintados }]);
    await arrastrarDe(await celda('Ana', SABADO), await celda('Ana', DOMINGO));
    await usuario.click(within(await tarjeta()).getByRole('button', { name: /quitar turno/i }));
    await aplicarEnLaPrevia(usuario);

    expect(del).toHaveBeenCalledWith('/turnos/dia', { params: { colaboradorId: 'c1', fecha: SABADO } });
    expect(del).toHaveBeenCalledTimes(2);
  });

  it('NO escribe en los días que ya pasaron', async () => {
    // La misma regla que la rejilla usa para no ofrecer el «+». Si aquí se decidiera distinto, la
    // pantalla mandaría peticiones que el servidor rechaza una por una.
    const ayer = sumarDias(HOY, -1);
    const usuario = userEvent.setup();
    put.mockResolvedValue({ data: { ok: true } });
    montar([personaDe('c1', 'Ana', 'Ríos', [ayer, DOMINGO])]);
    await usuario.click(await screen.findByRole('button', { name: /marcar la semana de Ana Ríos/i }));
    await usuario.click(within(await tarjeta()).getByRole('button', { name: /Noche/ }));
    await aplicarEnLaPrevia(usuario);

    expect(put).toHaveBeenCalledTimes(1);
    expect(put).toHaveBeenCalledWith('/turnos/dia', { colaboradorId: 'c1', fecha: DOMINGO, plantillaId: 'p2' });
  });

  it('al terminar dice cuántas jornadas quedaron escritas', async () => {
    const usuario = userEvent.setup();
    put.mockResolvedValue({ data: { ok: true } });
    const caja = await marcarDosCeldas();
    await usuario.click(within(caja).getByRole('button', { name: /Noche/ }));
    await aplicarEnLaPrevia(usuario);
    expect(await screen.findByRole('status')).toHaveTextContent(/2 jornadas/);
  });

  it('si una escritura se niega, lo dice y NO se lo calla', async () => {
    // El caso real: alguien ya empezó su jornada de hoy. Escribir 19 de 20 y no decirlo es la forma
    // en que esta pantalla mentiría.
    const usuario = userEvent.setup();
    put.mockRejectedValue({ response: { data: { error: 'Esa persona ya empezó su jornada de hoy.' } } });
    const caja = await marcarDosCeldas();
    await usuario.click(within(caja).getByRole('button', { name: /Noche/ }));
    await aplicarEnLaPrevia(usuario);
    expect(await screen.findByRole('alert')).toHaveTextContent(/no se pudieron escribir/i);
  });
});
