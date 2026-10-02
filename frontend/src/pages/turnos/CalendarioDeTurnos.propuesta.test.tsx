import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CalendarioDeTurnos from './CalendarioDeTurnos';
import { hoyEnBogota, lunesDeLaSemana, diasDeLaSemana } from './semana';
import { fijarElRelojEnUnMiercoles } from '../../pruebas/reloj';

// LA SEMANA DE QUIEN NO TIENE HORARIO SE PROPONE, NO SE ASUME (22 de septiembre de 2026).
//
// Decidido con el dueño: un día en blanco NO se toma como descanso. El olvido de planificarlo y la
// decisión de dejarlo libre producen el mismo dato, así que asumir dejaría de pagar un recargo por
// deducción propia. Pero pedir un clic en cada semana de cada persona es fricción real, así que el
// sistema PROPONE y alguien confirma.
//
// Los cuatro estados los decide el backend (`propuestaDeDescanso`, pura y mutada). Aquí se prueba
// que la pantalla los MUESTRA distintos, y sobre todo que `SIN_DESCANSO` y `AMBIGUA` no digan lo
// mismo: las dos dejan la semana sin descanso, pero una es una omisión y la otra un error ya cometido,
// y a quien planificó dos descansos decirle «no hay descanso» lo manda a buscar lo que no falta.
//
// A QUIÉN LE APLICA, actualizado el 30 de septiembre de 2026: a quien NO tiene horario. Antes era a
// quien tuviera declarado un descanso ROTATIVO; esa declaración por persona se borró y el corte ahora
// es el horario, que es el dato que sí existe.

const { get, put, del } = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), del: vi.fn() }));
vi.mock('../../lib/api', () => ({
  default: {
    get: (...a: unknown[]) => get(...a),
    put: (...a: unknown[]) => put(...a),
    delete: (...a: unknown[]) => del(...a),
    post: vi.fn(),
  },
}));

// La semana de estas pruebas tiene días pasados y días por venir: con el reloj de verdad, de viernes
// a lunes se rompían solas (src/pruebas/reloj.ts).
fijarElRelojEnUnMiercoles();
const HOY = hoyEnBogota();
const LUNES = lunesDeLaSemana(HOY);
const DIAS = diasDeLaSemana(LUNES);
const JUEVES = DIAS[3];
const DOMINGO = DIAS[6];

// `montar` recibe `unknown[]` a propósito, así que NADIE tipa este fixture: cuando la respuesta
// gana un campo hay que agregarlo aquí a mano o las pruebas siguen verdes ejercitando un día que no
// existe (CLAUDE.md §9.2).
const diaDe = (fecha: string) => ({
  fecha, estado: 'TRABAJA', horaEntrada: '06:00', horaSalida: '14:00',
  minutosEsperados: 480, esFestivo: false, origen: 'AUTO', turno: null, horarioNombre: 'Rotativo 7x1',
  decision: null, esDescansoObligatorio: false,
  // Las reglas del día, que el panel de la celda muestra.
  toleranciaMin: 10, toleranciaSalidaMin: 0, ajustaEntrada: false,
  almuerzoMin: 0, almuerzoInicio: null, almuerzoFin: null, descansos: [],
});

const FILA = {
  id: 'c1', nombre: 'Julián', apellido: 'Torres', cargo: 'Guarda',
  descanso: { de: 'PROGRAMACION', dia: null },
  minutosEsperados: 2880, descansosConTurno: 0,
  sedes: [{ id: 's1', nombre: 'Norte' }],
  descansoHabitual: { porMes: {}, mes: HOY.slice(0, 7), trabajados: 0, clase: 'NINGUNO' },
  dias: DIAS.map(diaDe),
  propuesta: null as unknown,
};

// El catálogo son turnos de TRABAJO y nada más. Desde el 23 de septiembre de 2026 confirmar el
// descanso no pinta ninguno de estos: manda la acción y no hay nada que elegir.
const CATALOGO = [
  { id: 'p1', nombre: 'Mañana', color: 'esmeralda', horaEntrada: '06:00', horaSalida: '14:00' },
  { id: 'p2', nombre: 'Noche', color: 'cobalto', horaEntrada: '22:00', horaSalida: '06:00' },
];

const montar = (propuesta: unknown, catalogo: unknown[] = CATALOGO) => {
  get.mockImplementation((url: string) => {
    if (url === '/turnos/calendario') {
      return Promise.resolve({
        data: { desde: LUNES, hasta: DOMINGO, horasSemanales: 42, filas: [{ ...FILA, propuesta }] },
      });
    }
    if (url === '/plantillas-turno') return Promise.resolve({ data: catalogo });
    return Promise.reject(new Error('url inesperada: ' + url));
  });
  return render(<CalendarioDeTurnos />);
};

const PROPUESTA = { estado: 'PROPUESTA', dia: 'JUEVES', fecha: JUEVES };

// Esperar a que la rejilla esté dibujada, ANTES de afirmar que algo no está.
//
// El primer intento fue `findByText(/Julián/)` y no encontraba nada: el nombre está partido entre
// elementos y `getByText` compara el texto de UNO. Las pruebas de ausencia fallaban por eso, no por
// lo que decían comprobar, y tardaban un segundo cada una agotando el tiempo de espera. Se consulta
// por ROL con el nombre accesible, igual que la prueba hermana del planificador.
const esperarLaRejilla = () => screen.findAllByRole('button', { name: /Julián Torres/ });

beforeEach(() => { put.mockReset(); del.mockReset(); });

// ────────── DE UNA PREGUNTA A SIETE TARJETAS (29 de septiembre de 2026, pedido del dueño) ──────────
//
// Esto era una píldora con una sola pregunta: «¿Descansa el jueves?». Sí o nada. Si la propuesta se
// equivocaba, o si no había propuesta porque sobraban varios días libres, desde aquí no se podía
// hacer nada: había que ir a la celda y abrir su panel.
//
// Ahora se ofrecen los SIETE días y la propuesta es la que viene resaltada. Estas tres pruebas
// cambiaron de gesto por eso, no porque estuvieran mal: buscaban un botón llamado «jueves» y ahora
// cada tarjeta se llama por su fecha con palabras, que es lo que oye un lector de pantalla.
const tarjetaDel = (fecha: string) =>
  screen.findByRole('button', { name: new RegExp(`Marcar el ${Number(fecha.slice(8, 10))} de .* como descanso`) });

describe('cuando se puede proponer', () => {
  it('OFRECE LOS SIETE DÍAS, no solo el que sobró', async () => {
    montar(PROPUESTA);
    await esperarLaRejilla();
    const todas = screen.getAllByRole('button', { name: /como descanso de la semana/ });
    expect(todas).toHaveLength(DIAS.length);
  });

  it('y el propuesto es el único que se destaca, sin quedar preseleccionado', async () => {
    // Resaltado NO es elegido: marcar el descanso mueve un recargo, así que sigue haciendo falta un
    // clic. Se comprueba por lo que dice la fila, no por una clase: mientras nadie elija, el aviso
    // sigue diciendo cuál es el descanso de esa semana.
    montar(PROPUESTA);
    await esperarLaRejilla();
    expect(screen.getByText(/Sin marcar, esta semana descansa el domingo/i)).toBeInTheDocument();
    expect(put).not.toHaveBeenCalled();
  });

  it('elegir manda la ACCIÓN de descanso, y ningún turno', async () => {
    // Lo que de verdad importa: que no viaje `plantillaId`. Cuando sí viajaba, era el de una
    // plantilla marcada como descanso, y elegir mal —pintar «Mañana» ahí— convertía la
    // confirmación del descanso en un turno de trabajo. Ese error ya no se puede cometer.
    const usuario = userEvent.setup();
    put.mockResolvedValue({ data: { ok: true } });
    montar(PROPUESTA);
    await usuario.click(await tarjetaDel(JUEVES));

    expect(put).toHaveBeenCalledWith('/turnos/dia', {
      colaboradorId: 'c1', fecha: JUEVES, descanso: true,
    });
  });

  it('SE PUEDE ELEGIR OTRO distinto del propuesto, que es para lo que están las tarjetas', async () => {
    // El caso que la píldora no sabía hacer: la propuesta dice jueves y el acuerdo real es el
    // viernes. Antes había que ir a la celda de ese día y abrir su panel.
    const usuario = userEvent.setup();
    put.mockResolvedValue({ data: { ok: true } });
    montar(PROPUESTA);
    await usuario.click(await tarjetaDel(DIAS[4]));

    expect(put).toHaveBeenCalledWith('/turnos/dia', {
      colaboradorId: 'c1', fecha: DIAS[4], descanso: true,
    });
  });

  it('y lo ofrece aunque el catálogo esté vacío', async () => {
    // ESTA PRUEBA AFIRMABA LO CONTRARIO: sin un turno de descanso en el catálogo el botón no se
    // dibujaba, y en su lugar salía «falta un turno de descanso en el catálogo». Sonaba a guarda
    // prudente y era un botón que no existía para nadie, porque ninguna empresa se había inventado
    // ese turno. Confirmar el descanso ya no depende del catálogo, así que se prueba al revés.
    const usuario = userEvent.setup();
    put.mockResolvedValue({ data: { ok: true } });
    montar(PROPUESTA, []);
    await usuario.click(await tarjetaDel(JUEVES));

    expect(put).toHaveBeenCalledWith('/turnos/dia', {
      colaboradorId: 'c1', fecha: JUEVES, descanso: true,
    });
  });

  it('UN DÍA QUE YA PASÓ NO SE PUEDE ELEGIR', async () => {
    // La misma regla que la rejilla, y aquí importa igual: marcar el descanso de un día ido
    // reescribiría lo que ese día exigía. El servidor lo rechaza, así que ofrecerlo sería ofrecer
    // una escritura que no va a ocurrir.
    //
    // Con el reloj fijo en un miércoles (src/pruebas/reloj.ts) son dos, el lunes y el martes. Lo que
    // se afirma es que son EXACTAMENTE los que la regla dice, y que ninguno futuro sale apagado.
    montar(PROPUESTA);
    await esperarLaRejilla();
    const apagadas = screen.getAllByRole('button', { name: /como descanso de la semana/ })
      .filter(b => b.hasAttribute('disabled'));
    expect(apagadas).toHaveLength(DIAS.filter(f => f < HOY).length);
  });
});

describe('cuando no se puede proponer', () => {
  it('sin descanso deducible avisa que esa semana descansa el DOMINGO', async () => {
    // CORREGIDO EL 1 DE OCTUBRE DE 2026. Esta frase decía «esta semana queda sin descanso», que era
    // cierto durante las horas en que el motor no le daba descanso a nadie sin horario. El motor se
    // arregló y el texto se quedó, así que la pantalla afirmaba lo contrario de lo que pagaba la
    // nómina: le decía al administrador que esa persona no tenía descanso mientras su domingo
    // trabajado sí cobraba el recargo.
    montar({ estado: 'SIN_DESCANSO' });
    expect(await screen.findByText(/esta semana descansa el domingo/i)).toBeInTheDocument();
  });

  it('y no ofrece confirmar nada', async () => {
    montar({ estado: 'SIN_DESCANSO' });
    await screen.findByText(/esta semana descansa el domingo/i);
    // SIGUE OFRECIENDO LAS TARJETAS, y eso cambió a propósito el 29 de septiembre: antes aquí no
    // había nada que tocar, y era justo el caso en que más falta hacía —sobran varios días libres y
    // el sistema no puede deducir cuál—. Lo que no hay es ninguna resaltada: inventarse una sería
    // hacer la deducción que el backend no pudo hacer.
    expect(screen.getAllByRole('button', { name: /como descanso de la semana/ })).toHaveLength(DIAS.length);
    expect(screen.queryByText(/¿Es el/i)).not.toBeInTheDocument();
    // Y NO dice ya la frase vieja. Va explícito porque las aserciones de AUSENCIA de abajo pasarían
    // solas con cualquier texto nuevo: comprobar que la vieja se fue es lo que las sostiene (§9.1).
    expect(screen.queryByText(/queda sin descanso/i)).not.toBeInTheDocument();
  });

  it('dos descansos pintados dicen algo DISTINTO de «sin descanso»', async () => {
    // Las dos dejan la semana sin descanso, pero por razones opuestas. Si el aviso fuera el mismo,
    // quien planificó dos se pondría a buscar el que no falta.
    // OJO con el patrón: el primero fue `/dos/i` y pasaba SIN implementar nada, porque encajaba con
    // el encabezado «DESCANSOS TRABAJA-DOS (MES)» de la tabla de resumen. Una prueba que pasa antes
    // de existir lo que prueba no prueba nada (CLAUDE.md §9.1).
    montar({ estado: 'AMBIGUA' });
    expect(await screen.findByText(/dos descansos/i)).toBeInTheDocument();
    expect(screen.queryByText(/esta semana descansa el domingo/i)).not.toBeInTheDocument();
  });
});

describe('cuando no hay nada que decir', () => {
  it('una semana ya resuelta no propone ni avisa', async () => {
    montar({ estado: 'RESUELTA', dia: 'MIERCOLES', fecha: DIAS[2] });
    await esperarLaRejilla();
    expect(screen.queryByRole('button', { name: /miércoles/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/esta semana descansa el domingo/i)).not.toBeInTheDocument();
  });

  it('a quien tiene horario no se le propone nada', async () => {
    montar({ estado: 'NO_APLICA' });
    await esperarLaRejilla();
    expect(screen.queryByRole('button', { name: /jueves/i })).not.toBeInTheDocument();
  });

  it('y si el rango no era una semana, la propuesta viaja en null y no se pinta nada', async () => {
    // `null` significa «no se calculó para este rango», que es distinto de «no aplica».
    montar(null);
    await esperarLaRejilla();
    expect(screen.queryByText(/esta semana descansa el domingo/i)).not.toBeInTheDocument();
  });
});
