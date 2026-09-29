import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CalendarioDeTurnos from './CalendarioDeTurnos';
import { hoyEnBogota, lunesDeLaSemana, diasDeLaSemana } from './semana';

// EL MODAL DEL DESCANSO TRABAJADO (22 de septiembre de 2026).
//
// Antes de esto el sistema pagaba el recargo y no guardaba NINGUNA constancia de qué se acordó. En
// un reclamo laboral eso deja a la empresa sin con qué contestar, y el registro es justamente lo que
// la protege.
//
// POR QUÉ ESTE MODAL NO CUELGA DEL BOTÓN DE PINTAR, que es el hallazgo que definió el diseño: la
// rejilla envuelve una celda en el botón de pintar solo cuando `sePuedePintar`, o sea hoy o futuro.
// Pero un descanso trabajado es por definición PASADO o de hoy, porque alguien ya marcó. Colgando de
// ahí, casi ninguno sería alcanzable. La celda de descanso trabajado es su PROPIO botón, y no mira
// `sePuedePintar`: decidir la compensación de un día pasado es legítimo, al revés que repintarlo.
//
// LO QUE LA LEY OBLIGA A MOSTRAR, y por eso tiene pruebas y no solo copy:
//   ocasional -> dos opciones, y la elección es DEL TRABAJADOR (art. 180, «a su elección»).
//   habitual  -> no hay elección: el compensatorio va ADEMÁS del dinero (art. 181).

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
// El LUNES de la semana en curso: hoy o pasado cualquier día que se corra la suite, así que sirve
// para probar que un día ya pasado también se puede abrir.
const TRABAJADO = DIAS[0];
const numeroDe = (f: string) => Number(f.slice(8, 10));

// `montar` recibe `unknown[]` a propósito, así que NADIE tipa este fixture: cuando la respuesta
// gana un campo hay que agregarlo aquí a mano o las pruebas siguen verdes ejercitando un día que no
// existe (CLAUDE.md §9.2).
const diaDe = (fecha: string, extra: Record<string, unknown> = {}) => ({
  fecha, estado: 'TRABAJA', horaEntrada: '06:00', horaSalida: '14:00',
  minutosEsperados: 480, esFestivo: false, origen: 'AUTO', turno: null,
  horarioNombre: 'Jornada demo', esDescansoObligatorio: false,
  // Las reglas del día, que el panel de la celda muestra.
  toleranciaMin: 10, toleranciaSalidaMin: 0, ajustaEntrada: false,
  almuerzoMin: 0, almuerzoInicio: null, almuerzoFin: null, descansos: [],
  ...extra,
});

const FILA = {
  id: 'c1', nombre: 'Julián', apellido: 'Torres', cargo: 'Guarda',
  descanso: { tipo: 'ROTATIVO', dia: null },
  minutosEsperados: 2880, descansosConTurno: 1,
  sedes: [{ id: 's1', nombre: 'Norte' }],
  descansoHabitual: { porMes: {}, mes: HOY.slice(0, 7), trabajados: 1, clase: 'OCASIONAL' },
  propuesta: null,
  dias: DIAS.map(f => (f === TRABAJADO ? diaDe(f, { estado: 'DESCANSO_TRABAJADO' }) : diaDe(f))),
};

const OCASIONAL = {
  fecha: TRABAJADO, decision: 'PENDIENTE', fechaCompensatorio: null, nota: null,
  claseAlDecidir: null, decididoPor: null, decididoEn: null,
  claseActual: 'OCASIONAL', opciones: ['DINERO', 'COMPENSATORIO'], eligeElTrabajador: true,
  revision: 'SIN_DECIDIR', cambios: [],
};

const montar = (decision: Record<string, unknown> = OCASIONAL) => {
  get.mockImplementation((url: string) => {
    if (url === '/turnos/calendario') {
      return Promise.resolve({ data: { desde: LUNES, hasta: DIAS[6], horasSemanales: 42, filas: [FILA] } });
    }
    if (url === '/plantillas-turno') return Promise.resolve({ data: [] });
    if (url === '/turnos/descanso-trabajado') return Promise.resolve({ data: decision });
    return Promise.reject(new Error('url inesperada: ' + url));
  });
  return render(<CalendarioDeTurnos />);
};

// Monta el calendario poniéndole campos extra AL DÍA de la rejilla, que es otra cosa que `montar`:
// aquel decide qué contesta el modal al abrirse, y este qué trae la fila del calendario.
//
// La diferencia importa porque el aviso de «pendiente» lo pinta la CELDA con lo que ya viene en
// `/turnos/calendario`, sin abrir nada: ese era justamente el punto del pedido.
const montarCon = (extraDelDia: Record<string, unknown>) => {
  get.mockImplementation((url: string) => {
    if (url === '/turnos/calendario') {
      return Promise.resolve({
        data: {
          desde: LUNES, hasta: DIAS[6], horasSemanales: 42,
          filas: [{
            ...FILA,
            dias: DIAS.map(f => (f === TRABAJADO
              ? diaDe(f, { estado: 'DESCANSO_TRABAJADO', ...extraDelDia })
              : diaDe(f))),
          }],
        },
      });
    }
    if (url === '/plantillas-turno') return Promise.resolve({ data: [] });
    if (url === '/turnos/descanso-trabajado') return Promise.resolve({ data: OCASIONAL });
    return Promise.reject(new Error('url inesperada: ' + url));
  });
  return render(<CalendarioDeTurnos />);
};

const abrir = async () => {
  const usuario = userEvent.setup();
  // CLIC DERECHO desde el 28 de septiembre de 2026, y es el segundo movimiento de este gesto en el
  // mismo día: primero pasó de clic simple a doble clic, porque el simple empezó a MARCAR la celda
  // para la programación en bloque; y ahora del doble al derecho, porque el doble pasó a ser el cuarto
  // gesto de la maqueta («borra todo y deja solo esa»). Lo que este archivo comprueba —qué obliga la
  // ley a mostrar y qué se guarda— no cambia con ninguno de los dos.
  await usuario.pointer({
    target: await screen.findByRole('button', {
      name: new RegExp(`descanso trabajado.*${numeroDe(TRABAJADO)}`, 'i'),
    }),
    keys: '[MouseRight]',
  });
  return { usuario, dialogo: await screen.findByRole('dialog', { name: /descanso trabajado/i }) };
};

beforeEach(() => { get.mockReset(); put.mockReset(); del.mockReset(); });

// LA CELDA TIENE QUE DECIR SI LA DECISIÓN ESTÁ PENDIENTE (22 de septiembre de 2026).
//
// Pedido del dueño. Hasta ahora un descanso trabajado se pintaba ámbar y nada decía si ya se había
// resuelto qué hacer con él: había que abrir el modal uno por uno para saberlo.
//
// Cuando está decidido, la celda NO dice nada extra: la ausencia de la palabra es la señal de que
// está atendido. Poner también un «resuelto» llenaría la rejilla de ruido y haría que «pendiente»
// dejara de saltar a la vista, que es justo lo que tiene que hacer.
describe('la celda avisa lo que falta', () => {
  const celda = () => screen.findByRole('button', {
    name: new RegExp(`descanso trabajado.*${numeroDe(TRABAJADO)}`, 'i'),
  });

  it('un descanso trabajado SIN decidir lo dice en la celda', async () => {
    montarCon({ decision: 'PENDIENTE' });
    expect(await celda()).toHaveTextContent(/pendiente/i);
  });

  it('uno ya decidido NO lo dice', async () => {
    montarCon({ decision: 'COMPENSATORIO' });
    expect(await celda()).not.toHaveTextContent(/pendiente/i);
  });

  it('un día sin campo `decision` tampoco lo dice', async () => {
    // `undefined` y no `null`: una respuesta vieja en caché, o un backend anterior. Tratarlo como
    // pendiente llenaría la rejilla de avisos falsos.
    montarCon({});
    expect(await celda()).not.toHaveTextContent(/pendiente/i);
  });
});

describe('llegar al modal', () => {
  it('un descanso trabajado se puede abrir AUNQUE el día ya haya pasado', async () => {
    // Es el punto que define el diseño: si colgara del botón de pintar, que es solo hacia adelante,
    // casi ningún descanso trabajado sería alcanzable.
    montar();
    const { dialogo } = await abrir();
    expect(dialogo).toBeInTheDocument();
  });

  it('pide al servidor la decisión de ESE día y de ESA persona', async () => {
    montar();
    await abrir();
    expect(get).toHaveBeenCalledWith('/turnos/descanso-trabajado', {
      params: { colaboradorId: 'c1', fecha: TRABAJADO },
    });
  });
});

describe('lo que la ley obliga a mostrar', () => {
  it('siendo ocasional ofrece las dos y dice que ELIGE EL TRABAJADOR', async () => {
    montar();
    const { dialogo } = await abrir();
    expect(within(dialogo).getByRole('button', { name: /dinero/i })).toBeInTheDocument();
    expect(within(dialogo).getByRole('button', { name: /compensatorio/i })).toBeInTheDocument();
    expect(within(dialogo).getByText(/elige el trabajador|a su elección/i)).toBeInTheDocument();
  });

  it('siendo habitual NO ofrece elegir: van los dos', async () => {
    // El recargo se paga igual; lo que deja de ser opcional es el día libre. Ofrecer «dinero» aquí
    // sería ofrecerle a la empresa saltarse algo que no es opcional.
    montar({
      ...OCASIONAL, claseActual: 'HABITUAL',
      opciones: ['COMPENSATORIO'], eligeElTrabajador: false,
    });
    const { dialogo } = await abrir();
    expect(within(dialogo).queryByRole('button', { name: /^dinero$/i })).not.toBeInTheDocument();
    expect(within(dialogo).getByText(/además|sin perjuicio/i)).toBeInTheDocument();
  });

  // SIN NINGÚN DESCANSO TRABAJADO EN EL MES NO SE PUEDE DECIR «HABITUAL» (28 de septiembre de 2026).
  //
  // Encontrado mirando la pantalla con datos reales, no leyendo el código. Julián Torres tenía
  // `clase: NINGUNO` y `trabajados: 0` en la respuesta de `/turnos/calendario`, la tarjeta de arriba
  // decía «0 · Trabajaron su descanso» y la columna del resumen decía «—»... y el modal afirmaba
  // «Trabajó su descanso de forma HABITUAL: el día compensatorio va además del recargo. No hay nada
  // que elegir». O sea que le decía a la empresa que debe un día libre por el artículo 181, sobre
  // alguien que según el propio motor no está en ese supuesto.
  //
  // LA CAUSA es la de CLAUDE.md §9.4: el texto se elegía con un ternario sobre `eligeElTrabajador`,
  // que es un booleano, cuando las clases son TRES. `opcionesDeCompensacion` devuelve
  // `eligeElTrabajador: false` tanto para HABITUAL como para NINGUNO, así que NINGUNO caía en la
  // rama escrita para HABITUAL. La función estaba probada (descansoCompensatorio.test.ts:51) y la
  // FRASE no: las pruebas de pantalla que usan `clase: NINGUNO` no abren este modal.
  it('sin descansos trabajados en el mes NO dice «habitual» ni promete compensatorio', async () => {
    montar({
      ...OCASIONAL, claseActual: 'NINGUNO',
      opciones: [], eligeElTrabajador: false,
    });
    const { dialogo } = await abrir();
    expect(within(dialogo).queryByText(/habitual/i)).not.toBeInTheDocument();
    expect(within(dialogo).queryByText(/además|sin perjuicio/i)).not.toBeInTheDocument();
    // Y tampoco ofrece elegir nada, que es lo que ya dice `opciones: []`.
    expect(within(dialogo).queryByRole('button', { name: /^dinero$/i })).not.toBeInTheDocument();
  });
});

describe('guardar la decisión', () => {
  it('elegir dinero la manda sin día compensatorio', async () => {
    put.mockResolvedValue({ data: { ok: true } });
    montar();
    const { usuario, dialogo } = await abrir();
    await usuario.click(within(dialogo).getByRole('button', { name: /dinero/i }));

    expect(put).toHaveBeenCalledWith('/turnos/descanso-trabajado', expect.objectContaining({
      colaboradorId: 'c1', fecha: TRABAJADO, decision: 'DINERO',
    }));
  });

  it('elegir compensatorio EXIGE un día antes de dejar guardar', async () => {
    // Guardar «se le debe un día» sin decir cuál deja una constancia que no prueba nada, que es
    // peor que no tenerla porque parece que sí. El backend lo rechaza; la pantalla no lo ofrece.
    put.mockResolvedValue({ data: { ok: true } });
    montar();
    const { usuario, dialogo } = await abrir();
    await usuario.click(within(dialogo).getByRole('button', { name: /compensatorio/i }));
    expect(put).not.toHaveBeenCalled();
    expect(within(dialogo).getByText(/qué día|elige el día/i)).toBeInTheDocument();
  });
});

describe('lo que el modal tiene que advertir', () => {
  it('si el mes cruzó a habitual después de decidir, lo avisa', async () => {
    // El caso que el dueño decidió NO resolver en el código: se avisa para que lo mire una persona.
    montar({
      ...OCASIONAL, decision: 'DINERO', claseAlDecidir: 'OCASIONAL',
      claseActual: 'HABITUAL', revision: 'REVISAR_COMPENSATORIO',
      opciones: ['COMPENSATORIO'], eligeElTrabajador: false,
    });
    const { dialogo } = await abrir();
    // OJO con el patrón: el primero fue `/revisar|pasó a habitual/i` y encajaba con DOS elementos a
    // la vez, el `<p>` y el `<b>` que lleva dentro. Se afirma una frase que vive en el texto propio
    // de un solo elemento. Es el tercer patrón flojo de esta sesión; los tres se cazaron igual.
    expect(within(dialogo).getByText(/Conviene revisar/i)).toBeInTheDocument();
  });

  it('muestra el rastro de quién cambió qué', async () => {
    // Editar libremente sin rastro convierte la constancia en nada: solo sobrevive el estado final.
    montar({
      ...OCASIONAL, decision: 'COMPENSATORIO', fechaCompensatorio: DIAS[3],
      cambios: [{ campo: 'decision', antes: 'DINERO', despues: 'COMPENSATORIO', quien: 'Admin Demo', cuando: '2026-09-22T14:00:00.000Z' }],
    });
    const { dialogo } = await abrir();
    expect(within(dialogo).getByText(/Admin Demo/)).toBeInTheDocument();
    expect(within(dialogo).getByText(/DINERO/)).toBeInTheDocument();
  });

  it('el camino inverso avisa algo DISTINTO: el mes bajó y el compensatorio sobra', async () => {
    // ESTA PRUEBA NACIÓ VERDE: se escribió después del código, así que es una guarda contra
    // regresión y no una prueba vista roja. Lo que la respalda es su mutación.
    //
    // El caso existe porque el modal se puede editar libremente, que fue lo que pidió el dueño: si
    // alguien corrige el tercer descanso, el mes deja de ser habitual y el día libre que se dio por
    // obligatorio ya no lo era. Los dos avisos tienen que leerse DISTINTO: uno manda a dar algo que
    // falta y el otro a revisar algo que sobra.
    montar({
      ...OCASIONAL, decision: 'COMPENSATORIO', fechaCompensatorio: DIAS[3],
      claseAlDecidir: 'HABITUAL', claseActual: 'OCASIONAL', revision: 'REVISAR_SOBRANTE',
    });
    const { dialogo } = await abrir();
    expect(within(dialogo).getByText(/ya no lo es/i)).toBeInTheDocument();
    expect(within(dialogo).queryByText(/Conviene revisar si además/i)).not.toBeInTheDocument();
  });
});
