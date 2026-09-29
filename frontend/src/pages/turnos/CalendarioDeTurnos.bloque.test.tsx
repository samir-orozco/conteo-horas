import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CalendarioDeTurnos from './CalendarioDeTurnos';
import { vistaDelCalendario } from './vistaDelCalendario';
import { hoyEnBogota, lunesDeLaSemana, diasDeLaSemana, sumarDias, sePuedePintar } from './semana';

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

// CUÁNTOS DÍAS DE ESTA SEMANA SE PUEDEN ESCRIBIR TODAVÍA (29 de septiembre de 2026).
//
// Estas pruebas decían «7 jornadas» a pelo, y eso dejó de ser cierto el día que una celda de un día
// pasado dejó de poder marcarse: la semana en curso lleva entre cero y seis días ya idos, así que el
// número cambia SEGÚN EL DÍA EN QUE SE CORRA LA SUITE. Un lunes son siete y un domingo es uno.
//
// SE DERIVA CON `sePuedePintar`, la misma función que usa la pantalla, y no con una comparación
// escrita aquí: con una copia, esta prueba y el componente podrían discrepar y la prueba seguiría
// verde. Quién decide la regla lo prueban `seleccionEnBloque.test.ts` y `semana.test.ts`; lo que estas
// comprueban es el GESTO, o sea que tocar el nombre marca la fila.
const ESCRIBIBLES = DIAS.filter(f => sePuedePintar(f, HOY));
const CUANTAS = new RegExp(`${ESCRIBIBLES.length} jornada`);

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
  // Se agrega a mano porque nadie tipa este fixture: sin esto la prueba seguiría verde ejercitando una
  // fila que no existe (CLAUDE.md §9.2). En plural, como viene de la respuesta.
  sedes: [{ id: 's1', nombre: 'Norte' }],
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
  // EL MOCK CONTESTA EL RANGO QUE LE PIDEN, igual que el servidor (29 de septiembre de 2026). Antes
  // devolvía siempre la semana en curso, y la pantalla deriva `cargando` de comparar el `desde` que
  // contestó contra el que tiene en pantalla: al navegar a otra semana se quedaba en «Cargando» para
  // siempre, sin filas. Ninguna prueba lo notaba porque las que navegaban solo comprobaban que la
  // tarjeta DESAPARECÍA, y desaparecía por el motivo equivocado.
  get.mockImplementation((url: string, cfg?: { params?: { desde?: string; hasta?: string } }) => {
    if (url === '/turnos/calendario') {
      return Promise.resolve({ data: {
        desde: cfg?.params?.desde ?? LUNES, hasta: cfg?.params?.hasta ?? DOMINGO,
        horasSemanales: 42, filas,
      } });
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
  // LA BARRA DE HERRAMIENTAS (28 de septiembre de 2026). La maqueta la tiene desde el principio y la
  // vista no la tenía: buscador, filtro de sede y filtro de cargo.
  //
  // NO ES ADORNO, Y POR ESO ESTAS PRUEBAS VIVEN EN ESTE ARCHIVO Y NO EN EL DE LA VISTA: filtrar cambia
  // la lista que recorre la SELECCIÓN. Marcar una columna o arrastrar un rectángulo solo puede alcanzar
  // a quien se está viendo, y lo que se aplique se le escribe a esa gente y a nadie más.

  // Cuántas personas se ven, contadas por el botón que marca su fila.
  const personasALaVista = () =>
    screen.getAllByRole('button', { name: /^Marcar la semana de/ }).map(b => b.getAttribute('aria-label'));

  it('el buscador deja solo a quien coincide', async () => {
    const usuario = userEvent.setup();
    montar();
    await celda('Ana', DOMINGO);
    expect(personasALaVista()).toHaveLength(3);

    await usuario.type(screen.getByRole('searchbox', { name: /buscar/i }), 'beto');

    expect(personasALaVista()).toEqual(['Marcar la semana de Beto Lara']);
  });

  it('el buscador ignora las tildes, que es como la gente escribe', async () => {
    const usuario = userEvent.setup();
    montar([{ ...personaDe('c1', 'Julián', 'Torres') }, BETO]);
    await celda('Julián', DOMINGO);

    await usuario.type(screen.getByRole('searchbox', { name: /buscar/i }), 'julian');

    expect(personasALaVista()).toEqual(['Marcar la semana de Julián Torres']);
  });

  it('el filtro de cargo deja solo ese cargo', async () => {
    const usuario = userEvent.setup();
    montar([ANA, { ...personaDe('c2', 'Beto', 'Lara'), cargo: 'Supervisor' }, CIRO]);
    await celda('Ana', DOMINGO);

    await usuario.selectOptions(screen.getByRole('combobox', { name: /cargo/i }), 'Supervisor');

    expect(personasALaVista()).toEqual(['Marcar la semana de Beto Lara']);
  });

  it('el filtro de sede deja a quien la TIENE ENTRE LAS SUYAS', async () => {
    // El caso que la maqueta no puede tener, porque allí cada persona tiene una sola sede: Beto está
    // en las dos, y filtrando por cualquiera de ellas tiene que aparecer.
    const usuario = userEvent.setup();
    montar([
      ANA,
      { ...personaDe('c2', 'Beto', 'Lara'), sedes: [{ id: 's1', nombre: 'Norte' }, { id: 's2', nombre: 'Centro' }] },
      { ...personaDe('c3', 'Ciro', 'Peña'), sedes: [{ id: 's2', nombre: 'Centro' }] },
    ]);
    await celda('Ana', DOMINGO);

    await usuario.selectOptions(screen.getByRole('combobox', { name: /sede/i }), 's2');

    expect(personasALaVista()).toEqual([
      'Marcar la semana de Beto Lara',
      'Marcar la semana de Ciro Peña',
    ]);
  });

  it('los desplegables NO se quedan sin opciones al filtrar', async () => {
    // Se llenan con la lista SIN filtrar. Llenándolos con la filtrada, al elegir «Supervisor»
    // desaparecerían los demás cargos del propio desplegable y no habría forma de volver: el filtro se
    // convertiría en una puerta de una sola dirección.
    const usuario = userEvent.setup();
    montar([ANA, { ...personaDe('c2', 'Beto', 'Lara'), cargo: 'Supervisor' }, CIRO]);
    await celda('Ana', DOMINGO);

    const deCargo = screen.getByRole('combobox', { name: /cargo/i });
    await usuario.selectOptions(deCargo, 'Supervisor');

    expect(within(deCargo).getByRole('option', { name: 'Guarda' })).toBeInTheDocument();
    expect(within(deCargo).getByRole('option', { name: /todos los cargos/i })).toBeInTheDocument();
  });

  it('una respuesta SIN el campo de sedes no deja la pantalla en blanco', async () => {
    // ESTO PASÓ DE VERDAD hoy, y en 110 pruebas a la vez: con `sedes` ausente, el `flatMap` que llena
    // el desplegable reventaba con «Cannot read properties of undefined» y el componente no dibujaba
    // NADA. Un `<body><div /></body>`.
    //
    // Y pasa en producción sin que nadie toque el código: una respuesta vieja en caché, o un backend
    // anterior al 28 de septiembre de 2026, no traen el campo. Quedarse sin filtro de sede es mucho
    // menos grave que quedarse sin calendario.
    //
    // La prueba existe porque el arreglo es UNA guarda de tres caracteres, y sin esto la suite seguiría
    // verde el día que alguien la quite: los demás fixtures ya traen el campo.
    // `sedes: undefined` y no una desestructuración que descarte el campo: dice lo mismo, se lee
    // mejor, y no deja una variable tirada que el linter marca con razón.
    montar([{ ...personaDe('c1', 'Ana', 'Ríos'), sedes: undefined }]);

    expect(await celda('Ana', DOMINGO)).toBeInTheDocument();
    const deSede = screen.getByRole('combobox', { name: /sede/i });
    expect(within(deSede).getAllByRole('option')).toHaveLength(1);
  });

  it('FILTRAR LIMPIA LO MARCADO, y esa es la parte que cuesta dinero', async () => {
    // Sin esto quedarían celdas marcadas de gente que dejó de verse, y al aplicar se les escribiría a
    // ciegas: jornadas puestas a alguien que quien programa ni siquiera tenía en pantalla.
    const usuario = userEvent.setup();
    montar();
    await usuario.click(await screen.findByRole('button', { name: /marcar la semana de Ana Ríos/i }));
    expect(await tarjeta()).toHaveTextContent(CUANTAS);

    await usuario.type(screen.getByRole('searchbox', { name: /buscar/i }), 'beto');

    expect(screen.queryByRole('region', { name: /marcad/i })).not.toBeInTheDocument();
  });

  // LA FILA DE RESUMEN Y LA LEYENDA (28 de septiembre de 2026). La maqueta tiene cuatro tarjetas y una
  // leyenda de colores; la vista tenía otras cuatro tarjetas y ninguna leyenda.
  //
  // Quedan SEIS por decisión del dueño: las cuatro de la maqueta más las dos suyas que ella no tiene.
  // La que sale es «trabajaron su descanso», y su alarma NO se pierde: el aviso de descanso habitual
  // pasa a ser la nota de «descansos marcados», que es donde se lee en contexto.

  it('la fila de resumen tiene las seis tarjetas', async () => {
    montar();
    await celda('Ana', DOMINGO);

    for (const rotulo of [
      /personas en la lista/i,
      /turnos programados/i,
      /descansos marcados/i,
      /semanas por encima/i,
      /horas programadas/i,
      /promedio por persona/i,
    ]) {
      expect(screen.getByText(rotulo)).toBeInTheDocument();
    }
  });

  it('cuenta los turnos programados y los descansos marcados', async () => {
    // Ana: dos días con turno y uno libre. La cuenta la decide `conteoDeLaRejilla`, que es pura y está
    // mutada; aquí se comprueba que la pantalla la APLICA y muestra sus dos números.
    const dias = DIAS.map((f, i) => (i === 0
      ? diaDe(f, { estado: 'DESCANSO' })
      : i < 3 ? diaDe(f) : diaDe(f, { estado: 'SIN_TURNO', horaEntrada: null, horaSalida: null, minutosEsperados: 0 })));
    montar([{ ...personaDe('c1', 'Ana', 'Ríos'), dias }]);
    await celda('Ana', DOMINGO);

    const turnos = screen.getByText(/turnos programados/i).closest('div')!.parentElement!;
    expect(turnos).toHaveTextContent('2');
    const descansos = screen.getByText(/descansos marcados/i).closest('div')!.parentElement!;
    expect(descansos).toHaveTextContent('1');
  });

  it('la leyenda dice de qué color es cada turno del catálogo', async () => {
    // El catálogo de este archivo tiene «Mañana» y «Noche». La leyenda los nombra a los dos y agrega
    // «Descanso», que no es un turno del catálogo y por eso va aparte y en gris.
    montar();
    await celda('Ana', DOMINGO);

    const leyenda = screen.getByRole('list', { name: /colores de los turnos/i });
    expect(within(leyenda).getByText('Mañana')).toBeInTheDocument();
    expect(within(leyenda).getByText('Noche')).toBeInTheDocument();
    expect(within(leyenda).getByText('Descanso')).toBeInTheDocument();
  });

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
    expect(await tarjeta()).toHaveTextContent(new RegExp(`Ana Ríos · ${ESCRIBIBLES.length} día`));
  });

  it('el nombre de la persona marca su fila entera', async () => {
    const usuario = userEvent.setup();
    montar();
    await usuario.click(await screen.findByRole('button', { name: /marcar la semana de Ana Ríos/i }));
    expect(await tarjeta()).toHaveTextContent(CUANTAS);
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

  it('el DOBLE clic deja marcada SOLO esa celda', async () => {
    // Es el cuarto gesto de la maqueta, escrito allí con estas palabras: «doble clic: borra todo y
    // deja solo esa». Sirve para corregir una selección grande sin empezar de cero.
    const usuario = userEvent.setup();
    montar();
    await usuario.click(await screen.findByRole('button', { name: /marcar la semana de Ana Ríos/i }));
    expect(await tarjeta()).toHaveTextContent(CUANTAS);

    // Dos toques seguidos sobre la misma celda.
    const suya = await celda('Ana', DOMINGO);
    await usuario.dblClick(suya);

    expect(await tarjeta()).toHaveTextContent(/1 jornada/);
  });

  it('una celda vacía MARCADA deja de ofrecer el «+»', async () => {
    // En la maqueta, una celda vacía seleccionada esconde el «+» y muestra el visto grande en su
    // lugar: `.jornada.t-vacio.sel .n { display: none }`. El «+» es la invitación a agregar, y una
    // celda ya marcada no está invitando a nada: está esperando que se elija qué ponerle.
    // OJO CON EL FIXTURE: `diaDe` pone `estado: 'TRABAJA'` con horario, así que una celda cualquiera
    // NO está vacía: muestra «Sin asignar». La primera versión de esta prueba afirmaba el «+» sobre
    // una celda con turno y fallaba en su primera línea, o sea por una premisa falsa mía y no por un
    // defecto de la pantalla. Un día vacío es `SIN_TURNO` y sin horas (CLAUDE.md §9.2).
    const usuario = userEvent.setup();
    const vacios = DIAS.map(f => diaDe(f, {
      estado: 'SIN_TURNO', horaEntrada: null, horaSalida: null, minutosEsperados: 0, horarioNombre: null,
    }));
    montar([{ ...personaDe('c1', 'Ana', 'Ríos'), dias: vacios }]);

    expect(await celda('Ana', DOMINGO)).toHaveTextContent(/agregar/i);

    await usuario.click(await screen.findByRole('button', { name: /marcar la semana de Ana Ríos/i }));

    expect(await celda('Ana', DOMINGO)).not.toHaveTextContent(/agregar/i);
  });

  // AQUÍ VIVÍA «el doble clic abre el panel del día», y se BORRA en vez de dejarse saltada: el panel se
  // movió al clic derecho el 28 de septiembre de 2026, porque el doble clic pasó a ser el cuarto gesto
  // de la maqueta. Que ese panel abre y qué muestra lo sujetan las diez pruebas de `panel`,
  // `planificar`, `dia` y `decision`, ya migradas. Una prueba saltada no comprueba nada y se queda
  // para siempre.

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

  it('cambiar de período LIMPIA lo marcado', async () => {
    // SALIÓ DE VER 87 JORNADAS ARMADAS EN PANTALLA que nadie había marcado a propósito (28 de
    // septiembre de 2026), en una página recién cargada y solo tras cambiar a vista de mes.
    //
    // No depende de saber qué las disparó: una selección hecha sobre UN período no puede seguir
    // armada en OTRO, donde las columnas ni siquiera son las mismas. Lo que se ve marcado y lo que
    // está marcado tienen que coincidir, porque de la tarjeta a escribir hay un clic. La maqueta
    // limpia al cambiar de vista y al mover las flechas; esto no lo hacía.
    const usuario = userEvent.setup();
    montar();
    await usuario.click(await screen.findByRole('button', { name: /marcar la semana de Ana Ríos/i }));
    await tarjeta();

    await usuario.click(screen.getByRole('button', { name: 'Mes' }));
    expect(screen.queryByRole('region', { name: /marcad/i })).not.toBeInTheDocument();
  });

  it('y mover las flechas también', async () => {
    // El mismo peligro por el otro camino: marcar esta semana, pasar a la siguiente, y quedarse con
    // celdas armadas de una semana que ya no está en pantalla.
    const usuario = userEvent.setup();
    montar();
    await usuario.click(await screen.findByRole('button', { name: /marcar la semana de Ana Ríos/i }));
    await tarjeta();

    await usuario.click(screen.getByRole('button', { name: /semana siguiente/i }));
    expect(screen.queryByRole('region', { name: /marcad/i })).not.toBeInTheDocument();
  });

  it('Cancelar limpia lo marcado y la tarjeta se va', async () => {
    const usuario = userEvent.setup();
    montar();
    await arrastrarDe(await celda('Ana', VIERNES), await celda('Beto', DOMINGO));
    await usuario.click(within(await tarjeta()).getByRole('button', { name: /cancelar/i }));
    expect(screen.queryByRole('region', { name: /marcad/i })).not.toBeInTheDocument();
  });

  // ────────── UN DÍA QUE YA PASÓ NO ENTRA A LA SELECCIÓN (29 de septiembre de 2026) ──────────
  //
  // Pedido del dueño con estas palabras: «si no lo puedo cambiar, sería bueno que no lo deje
  // seleccionar tampoco». Hasta hoy entraba, se pintaba apagado, y la tarjeta lo contaba aparte
  // («1 ya pasó y no se escribe»). Eso es contarle a alguien que parte de lo que pidió no se hizo,
  // cuando salía más barato no dejárselo pedir.
  //
  // ESTAS PRUEBAS SUSTITUYEN A «los días que ya pasaron se cuentan aparte y se dicen», que afirmaba
  // justo lo contrario y era correcta hasta hoy. No se borró un caso: se le dio la vuelta.
  //
  // EL CONTADOR DE LA TARJETA NO SE QUITÓ, y no es olvido. `hoy` se vuelve a leer en cada dibujado, así
  // que una pestaña abierta que cruza la medianoche despierta con celdas marcadas ayer que ahora son
  // del pasado. Ese es el único camino que le queda, y es el que tiene que seguir cubriendo.

  it('tocar el nombre de la persona NO marca el día que ya pasó', async () => {
    const ayer = sumarDias(HOY, -1);
    const usuario = userEvent.setup();
    montar([personaDe('c1', 'Ana', 'Ríos', [ayer, ...DIAS])]);
    await usuario.click(await screen.findByRole('button', { name: /marcar la semana de Ana Ríos/i }));
    const caja = await tarjeta();
    // La fila tiene un día MÁS que la semana (ayer) y aun así se marcan los mismos.
    expect(caja).toHaveTextContent(CUANTAS);
    expect(caja).not.toHaveTextContent(/ya pasó/);
  });

  it('NI UN CLIC NI UN ARRASTRE marcan una celda que ya pasó', async () => {
    // Es el caso más directo de lo que pidió el dueño, y el único que toca la guarda del gesto: los
    // otros dos pasan por el botón de la fila y por el del encabezado.
    //
    // SE NAVEGA A LA SEMANA ANTERIOR para que TODAS las columnas sean del pasado. Contra la semana en
    // curso esto dependería del día en que se corriera la suite, y un lunes no habría ninguna celda
    // pasada que tocar.
    //
    // SE BUSCAN COMO CELDAS DE LA TABLA Y NO COMO BOTONES a propósito: una celda que ya pasó se dibuja
    // como un `div`, sin botón, desde antes de este cambio. Lo que la seguía metiendo en la selección
    // era el `pointerdown` del `td` que la envuelve, y es eso lo que esta prueba aprieta.
    const usuario = userEvent.setup();
    montar();
    await usuario.click(await screen.findByRole('button', { name: /semana anterior/i }));
    // SE LLEGA A LA FILA POR EL BOTÓN DE LA PERSONA y de ahí al `tr`, que es la única forma: el gesto
    // vive en el `td`, que no tiene rol ni nombre accesible por los que preguntar. Es la excepción a
    // «consultar por lo que ve una persona» y es deliberada: lo que se está apretando es justamente un
    // manejador colgado de un elemento sin semántica.
    const suBoton = await screen.findByRole('button', { name: /marcar la semana de Ana Ríos/i });
    const suFila = suBoton.closest('tr') as HTMLElement;
    const celdas = within(suFila).getAllByRole('cell');
    // [0] es la persona y la última el total; en medio, un `td` por columna.
    const primera = celdas[1];
    const ultima = celdas[celdas.length - 2];

    await usuario.click(primera);
    expect(screen.queryByRole('region', { name: /marcad/i })).not.toBeInTheDocument();

    await arrastrarDe(primera, ultima);
    expect(screen.queryByRole('region', { name: /marcad/i })).not.toBeInTheDocument();
  });

  it('un arrastre que CRUZA la frontera solo marca la parte de adelante', async () => {
    // El otro camino del filtro, y el que faltaba: el arrastre no puede EMPEZAR en una celda ida —de
    // eso se encarga la guarda del gesto— pero sí puede TERMINAR en una, y entonces el rectángulo
    // abarca columnas de los dos lados.
    //
    // SE HACE EN LA VISTA DE MES porque ahí la frontera está dentro de la rejilla siempre: el mes
    // empieza en el lunes de la semana del día 1, que salvo un caso al año queda por detrás de hoy. En
    // la vista de semana esto sería vacuo los lunes.
    //
    // EL NÚMERO ESPERADO SE DERIVA de la misma vista y la misma regla que usa la pantalla, no de un
    // literal: con un número escrito a mano, esta prueba cambiaría de veredicto cada día.
    const usuario = userEvent.setup();
    const mes = vistaDelCalendario('MES', HOY);
    const delMes = mes.dias.filter(f => sePuedePintar(f, HOY));
    montar([personaDe('c1', 'Ana', 'Ríos', mes.dias)]);
    await usuario.click(await screen.findByRole('button', { name: /^Mes$/ }));

    const suBoton = await screen.findByRole('button', { name: /marcar el mes de Ana Ríos/i });
    const celdas = within(suBoton.closest('tr') as HTMLElement).getAllByRole('cell');
    // DÓNDE CAE EL `td` DE UN DÍA. La fila no es [persona, 42 días, total]: la vista de mes intercala
    // un total por semana, así que los días y las celdas no van uno a uno. Con `length - 2` se apunta
    // al total de la última semana y el arrastre no arranca (probado: la tarjeta no aparecía).
    const tdDelDia = (i: number) => celdas[1 + i + Math.floor(i / 7)];

    // DE HOY HACIA ATRÁS, hasta la primera columna del mes. El rectángulo abarca todo lo ido más hoy,
    // y de eso solo hoy se puede escribir.
    await arrastrarDe(tdDelDia(mes.dias.indexOf(HOY)), tdDelDia(0));
    expect(await tarjeta()).toHaveTextContent(/1 jornada/);
    expect(delMes.length).toBeLessThan(mes.dias.length); // que de verdad haya frontera que cruzar
  });

  // ────────── Y SE DICE POR QUÉ (29 de septiembre de 2026, pedido del dueño) ──────────
  //
  // No basta con que el clic no haga nada: «apagada» no le explica nada a quien acaba de intentarlo,
  // y lo normal es volver a hacer clic. Sale un aviso con el motivo.
  //
  // EL AVISO NO SE APILA: sube un número. Ocho avisos idénticos tapando la esquina no dicen nada que
  // no dijera el primero, y encima esconden los avisos de verdad que puedan salir detrás.

  const avisos = () => screen.queryAllByRole('status');

  const tocarUnDiaIdo = async (usuario: ReturnType<typeof userEvent.setup>, veces: number) => {
    const suBoton = await screen.findByRole('button', { name: /marcar la semana de Ana Ríos/i });
    const celda = within(suBoton.closest('tr') as HTMLElement).getAllByRole('cell')[1];
    for (let i = 0; i < veces; i++) {
      fireEvent.pointerDown(celda, { pointerId: 1, button: 0 });
      fireEvent.pointerUp(window, { pointerId: 1 });
      // Un respiro entre clics: sin él, React agrupa los `setState` y la cuenta sube de golpe, que es
      // lo que pasa de verdad al pulsar rápido pero no lo que esta prueba quiere medir.
      await usuario.click(document.body);
    }
  };

  it('AL TOCAR UN DÍA IDO SALE UN AVISO QUE DICE POR QUÉ', async () => {
    const usuario = userEvent.setup();
    montar();
    await usuario.click(await screen.findByRole('button', { name: /semana anterior/i }));
    await tocarUnDiaIdo(usuario, 1);

    expect(avisos()).toHaveLength(1);
    // Por lo que LEE una persona, no por una clase: el aviso tiene que decir que ya pasó.
    expect(avisos()[0]).toHaveTextContent(/ya pasó y no se puede programar/i);
  });

  it('y al repetirlo NO se apila: es el mismo con un número', async () => {
    const usuario = userEvent.setup();
    montar();
    await usuario.click(await screen.findByRole('button', { name: /semana anterior/i }));
    await tocarUnDiaIdo(usuario, 3);

    expect(avisos()).toHaveLength(1);
    expect(avisos()[0]).toHaveTextContent(/^3/);
  });

  it('EL PRIMERO NO LLEVA NÚMERO: un «1» al lado de un aviso recién salido no informa de nada', async () => {
    const usuario = userEvent.setup();
    montar();
    await usuario.click(await screen.findByRole('button', { name: /semana anterior/i }));
    await tocarUnDiaIdo(usuario, 1);
    expect(avisos()[0]).not.toHaveTextContent(/^1/);
  });

  it('y se planta en «9+», que es donde el dueño pidió que dejara de subir', async () => {
    const usuario = userEvent.setup();
    montar();
    await usuario.click(await screen.findByRole('button', { name: /semana anterior/i }));
    await tocarUnDiaIdo(usuario, 14);

    expect(avisos()).toHaveLength(1);
    expect(avisos()[0]).toHaveTextContent(/^9\+/);
  });

  it('PASADO EL TOPE LA PASTILLA DEJA DE TEMBLAR, que es lo que se ve de «no deja dar más»', async () => {
    // ESTA AFIRMACIÓN EXISTE PORQUE LA ANTERIOR NO ALCANZA. Se descubrió mutando: quitándole el tope
    // a `sumarRepeticion`, la prueba de arriba seguía verde, porque el rótulo pinta «9+» para
    // cualquier número de diez en adelante y once se ve igual que diez.
    //
    // Lo que SÍ cambia es esto: el temblor se redispara montando un elemento nuevo (la `key` es el
    // número). Si la cuenta siguiera subiendo, cada clic pasado el tope montaría otra pastilla y
    // seguiría temblando. Que sea el MISMO nodo es la forma observable de «la cuenta se detuvo».
    const usuario = userEvent.setup();
    montar();
    await usuario.click(await screen.findByRole('button', { name: /semana anterior/i }));

    await tocarUnDiaIdo(usuario, 10);
    const pastilla = within(avisos()[0]).getByText('9+');

    await tocarUnDiaIdo(usuario, 3);
    expect(within(avisos()[0]).getByText('9+')).toBe(pastilla);
  });

  it('Y AL PULSARLO SALE EL MISMO AVISO, con su contador', async () => {
    // Pedido del dueño al ver el aviso de la celda: «ojalá lo podamos aplicar también a las columnas
    // de las fechas que no permiten». Es el MISMO aviso, así que un clic en la celda y otro en el
    // encabezado suben el mismo contador en vez de sacar dos avisos que dicen lo mismo.
    const usuario = userEvent.setup();
    montar();
    await usuario.click(await screen.findByRole('button', { name: /semana anterior/i }));
    const idos = (await screen.findAllByRole('button', { name: /^Marcar el día / }))
      .filter(b => b.getAttribute('aria-disabled') === 'true');

    await usuario.click(idos[0]);
    expect(avisos()).toHaveLength(1);
    expect(avisos()[0]).toHaveTextContent(/ya pasó y no se puede programar/i);

    await usuario.click(idos[1]);
    expect(avisos()).toHaveLength(1);
    expect(avisos()[0]).toHaveTextContent(/^2/);
  });

  it('y el nombre de una persona cuyos días ya pasaron avisa igual', async () => {
    // Mismo silencio, mismo remedio: el botón de la fila tampoco tenía nada que marcar y no lo decía.
    //
    // LOS DÍAS SE LE PONEN A LA PERSONA y no se navega a una semana pasada, porque `marcarFila` mira
    // los días de la FILA —los que trae la respuesta— y no las columnas que se ven. La primera versión
    // de esta prueba navegaba y fallaba: la fila seguía trayendo los días de esta semana.
    const usuario = userEvent.setup();
    const idos = [sumarDias(HOY, -3), sumarDias(HOY, -2), sumarDias(HOY, -1)];
    montar([personaDe('c1', 'Ana', 'Ríos', idos)]);
    await usuario.click(await screen.findByRole('button', { name: /marcar la semana de Ana Ríos/i }));

    expect(avisos()).toHaveLength(1);
    expect(avisos()[0]).toHaveTextContent(/ya pasó y no se puede programar/i);
  });

  it('con TODA la fila en el pasado, la tarjeta no aparece', async () => {
    // Antes aparecía diciendo «0 se escriben, 3 ya pasaron», o sea una tarjeta que ofrecía aplicar
    // nada. Ahora no hay nada que marcar y por tanto nada que ofrecer.
    const usuario = userEvent.setup();
    const idos = [sumarDias(HOY, -3), sumarDias(HOY, -2), sumarDias(HOY, -1)];
    montar([personaDe('c1', 'Ana', 'Ríos', idos)]);
    await usuario.click(await screen.findByRole('button', { name: /marcar la semana de Ana Ríos/i }));
    expect(screen.queryByRole('region', { name: /marcad/i })).not.toBeInTheDocument();
  });

  it('el encabezado de un día que ya pasó se anuncia como no disponible', async () => {
    // Un botón que se pulsa y no hace nada es peor que uno apagado: se pulsa dos veces, se mira si
    // pasó algo, y se acaba dudando de la pantalla. Se consulta por el rol y el estado, que es lo que
    // ve quien usa lector de pantalla, no por una clase de CSS.
    //
    // SE NAVEGA A LA SEMANA ANTERIOR Y A LA SIGUIENTE, y no se cuentan los apagados de la semana en
    // curso. La primera versión de esta prueba hacía eso y era VACUA LOS LUNES: con la semana entera
    // por delante esperaba cero apagados, que es lo que sale también sin la guarda puesta. Verde un
    // día de cada siete sin comprobar nada. Contra una semana entera ida y otra entera por venir, los
    // dos extremos se afirman siempre.
    const usuario = userEvent.setup();
    montar();
    // `aria-disabled` Y NO `disabled` desde el 29 de septiembre de 2026: el botón se puede pulsar y
    // explica por qué no se puede programar ese día. `disabled` lo sacaba del recorrido del tabulador,
    // así que quien navega con teclado nunca llegaba a la explicación.
    const apagados = async () =>
      (await screen.findAllByRole('button', { name: /^Marcar el día / }))
        .filter(b => b.getAttribute('aria-disabled') === 'true');

    await usuario.click(await screen.findByRole('button', { name: /semana anterior/i }));
    expect(await apagados()).toHaveLength(7);

    await usuario.click(screen.getByRole('button', { name: /semana siguiente/i }));
    await usuario.click(screen.getByRole('button', { name: /semana siguiente/i }));
    expect(await apagados()).toHaveLength(0);
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
    // POR EL NOMBRE ACCESIBLE COMPLETO, y no por un trozo. En pantalla el botón dice solo «Quitar»
    // desde el 29 de septiembre de 2026, y a secas eso se lee como «deseleccionar»: es lo contrario,
    // porque ESCRIBE en los días marcados dejándolos sin turno, y «Cancelar» está justo al lado.
    // Afirmando el nombre entero, esta prueba también guarda esa desambiguación.
    await usuario.click(within(await tarjeta()).getByRole('button', { name: 'Quitar el turno de lo marcado' }));
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

  it('MIENTRAS ESCRIBE, una ventana dice por dónde va y deja detener', async () => {
    // Hoy esto es una línea dentro de la tarjeta: «Bloque 2 de 7 · no cierres esta ventana». Con siete
    // bloques informa; con treinta, quien mira no sabe si va por la mitad o por el final. Y sobre
    // todo: no hay forma de PARAR. Un envío de un mes para veinte personas son cien bloques en serie,
    // y hoy, una vez arrancado, no se puede hacer nada más que esperar o cerrar el navegador.
    //
    // LAS ESCRITURAS SE DEJAN PENDIENTES A PROPÓSITO. Con `mockResolvedValue` todo termina dentro del
    // mismo ciclo y la ventana abriría y se cerraría sin que nada pueda observarla: la prueba pasaría
    // o fallaría por azar. Aquí se controla cuándo resuelven, así que el estado «en vuelo» es un hecho
    // y no una carrera.
    const usuario = userEvent.setup();
    const resolver: ((v: unknown) => void)[] = [];
    put.mockImplementation(() => new Promise(r => { resolver.push(r); }));

    const caja = await marcarDosCeldas();
    await usuario.click(within(caja).getByRole('button', { name: /Noche/ }));
    await aplicarEnLaPrevia(usuario);

    const ventana = await screen.findByRole('dialog', { name: /cómo va la programación/i });
    expect(within(ventana).getByRole('button', { name: /detener al terminar este bloque/i }))
      .toBeInTheDocument();

    // Las dos escrituras se soltaron, así que la ventana deja de estar «escribiendo».
    resolver.forEach(r => r({ data: { ok: true } }));
    await waitFor(() => expect(within(ventana).getByText(/listo/i)).toBeInTheDocument());
  });

  it('DETENER deja sin escribir los bloques que faltaban', async () => {
    // Es lo único que este botón promete, y lo que promete es algo que NO va a pasar: que las jornadas
    // de los bloques siguientes no se escriban. Sin esta prueba, quitar el corte del bucle no pondría
    // roja ninguna otra.
    //
    // SE DETIENE AL TERMINAR EL BLOQUE EN CURSO, no a mitad: lo que ya salió en vuelo se termina,
    // porque cortarlo dejaría seis peticiones de las que nadie sabe cuáles llegaron.
    //
    // CUÁNTAS CELDAS SON PINTABLES DEPENDE DEL DÍA en que se corra la suite: un domingo solo queda un
    // día por delante. Por eso se afirma `min(6, N)` y no un número escrito a mano. El día que N no
    // pase de seis, este caso no discrimina nada —hay un solo bloque y no hay nada que detener—, y
    // vale más decirlo aquí que poner un número que falle los sábados.
    const usuario = userEvent.setup();
    const resolver: ((v: unknown) => void)[] = [];
    put.mockImplementation(() => new Promise(r => { resolver.push(r); }));

    montar();
    // Las tres filas enteras, que es la selección más grande que se puede armar con tres clics.
    for (const quien of ['Ana', 'Beto', 'Ciro']) {
      await usuario.click(await screen.findByRole('button', { name: new RegExp(`marcar la semana de ${quien}`, 'i') }));
    }
    const caja = await tarjeta();
    await usuario.click(within(caja).getByRole('button', { name: /Noche/ }));
    await aplicarEnLaPrevia(usuario);

    const pintables = DIAS.filter(f => f >= HOY).length * 3;
    const ventana = await screen.findByRole('dialog', { name: /cómo va la programación/i });
    await usuario.click(within(ventana).getByRole('button', { name: /detener al terminar este bloque/i }));

    // Se sueltan las que ya estaban en vuelo: son las del bloque en curso y ninguna más.
    resolver.forEach(r => r({ data: { ok: true } }));
    await waitFor(() => expect(within(ventana).getByRole('button', { name: /cerrar/i })).toBeInTheDocument());

    expect(put).toHaveBeenCalledTimes(Math.min(6, pintables));
  });

  it('y al terminar se QUEDA ABIERTA diciendo cómo quedó', async () => {
    // Pedido del dueño en la maqueta, con estas palabras: antes se cerraba sola y el final se veía
    // como un parpadeo, sin decir cuánto se escribió. La cierra la persona.
    const usuario = userEvent.setup();
    put.mockResolvedValue({ data: { ok: true } });

    const caja = await marcarDosCeldas();
    await usuario.click(within(caja).getByRole('button', { name: /Noche/ }));
    await aplicarEnLaPrevia(usuario);

    const ventana = await screen.findByRole('dialog', { name: /cómo va la programación/i });
    expect(ventana).toHaveTextContent(/2 jornadas/);
    // Sigue ahí: no se desvanece sola.
    expect(screen.getByRole('dialog', { name: /cómo va la programación/i })).toBeInTheDocument();

    await usuario.click(within(ventana).getByRole('button', { name: /cerrar/i }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /cómo va la programación/i })).not.toBeInTheDocument();
    });
  });

  it('DESHACER despinta los días que nadie había pintado', async () => {
    // EL CASO QUE SE HACE MAL. Esos dos días los resolvía el horario de la persona: no tenían turno
    // puesto a mano. Deshacer ahí es DESPINTAR, no repintar. Si se devolvieran con un turno quedarían
    // clavados a mano para siempre, y el defecto no se ve el día que se deshace: se ve semanas después
    // cuando alguien cambia el horario y esos días no cambian con él.
    //
    // Deshacer va por el MISMO camino que aplicar —en bloques, con su ventana—, que es lo que pidió el
    // dueño: «un proceso parcial, no de inmediato».
    const usuario = userEvent.setup();
    put.mockResolvedValue({ data: { ok: true } });
    del.mockResolvedValue({ data: { ok: true } });

    const caja = await marcarDosCeldas();
    await usuario.click(within(caja).getByRole('button', { name: /Noche/ }));
    await aplicarEnLaPrevia(usuario);
    expect(put).toHaveBeenCalledTimes(2);

    const ventana = await screen.findByRole('dialog', { name: /cómo va la programación/i });
    await usuario.click(within(ventana).getByRole('button', { name: /deshacer esta programación/i }));

    await waitFor(() => expect(del).toHaveBeenCalledTimes(2));
    expect(del).toHaveBeenCalledWith('/turnos/dia', { params: { colaboradorId: 'c1', fecha: SABADO } });
    expect(del).toHaveBeenCalledWith('/turnos/dia', { params: { colaboradorId: 'c1', fecha: DOMINGO } });
    // Y NO se repintó nada: las dos únicas escrituras siguen siendo las del envío original.
    expect(put).toHaveBeenCalledTimes(2);
  });

  it('y devuelve su turno anterior al día que sí tenía uno', async () => {
    // El otro lado de la misma decisión: aquí sí había algo puesto a mano, y deshacer es volver a ESE
    // turno. Por identidad y no por nombre, que dos turnos pueden llamarse igual.
    const usuario = userEvent.setup();
    put.mockResolvedValue({ data: { ok: true } });
    del.mockResolvedValue({ data: { ok: true } });

    const conTurno = personaDe('c1', 'Ana', 'Ríos', DIAS).dias.map(d => (
      d.fecha === SABADO
        ? { ...d, origen: 'MANUAL', turno: { id: 'p1', nombre: 'Mañana', color: 'esmeralda' } }
        : d
    ));
    montar([{ ...personaDe('c1', 'Ana', 'Ríos'), dias: conTurno }]);
    await arrastrarDe(await celda('Ana', SABADO), await celda('Ana', DOMINGO));
    await usuario.click(within(await tarjeta()).getByRole('button', { name: /Noche/ }));
    await aplicarEnLaPrevia(usuario);

    const ventana = await screen.findByRole('dialog', { name: /cómo va la programación/i });
    await usuario.click(within(ventana).getByRole('button', { name: /deshacer esta programación/i }));

    // El sábado vuelve a su turno de antes; el domingo, que no tenía nada, se despinta.
    await waitFor(() => {
      expect(put).toHaveBeenCalledWith('/turnos/dia', { colaboradorId: 'c1', fecha: SABADO, plantillaId: 'p1' });
    });
    expect(del).toHaveBeenCalledWith('/turnos/dia', { params: { colaboradorId: 'c1', fecha: DOMINGO } });
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
