import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CalendarioDeTurnos from './CalendarioDeTurnos';
import { hoyEnBogota, lunesDeLaSemana, diasDeLaSemana, sumarDias, sePuedePintar } from './semana';
import { fijarElRelojEnUnMiercoles } from '../../pruebas/reloj';

// LA SEMANA ENTERA, DESDE SU RÓTULO, EN LA VISTA DE MES (5 de octubre de 2026, petición 25 del dueño).
//
// «En turnos rotativos, en el mes, cuando le doy a la semana, que se seleccionen todos los días de
// allí.» El renglón de arriba del mes ya decía «Semana 2 · 5 oct – 11 oct» como texto; ahora es un
// botón que marca esos siete días de todas las personas, igual que el encabezado de un día marca esa
// columna y el nombre de una persona marca su fila.
//
// SE TRABAJA SOBRE LA VISTA QUE YA EXISTE, no sobre una maqueta aparte (CLAUDE.md §13): el gesto, el
// aviso del día pasado y el interruptor son los mismos de la columna y de la fila, y por eso estas
// pruebas se escriben contra la pantalla de verdad.
//
// QUÉ SE AFIRMA, y por qué esto y no más: CUÁNTAS jornadas queda marcando la tarjeta. Quién decide qué
// celdas entran y en qué orden lo prueba `seleccionEnBloque.test.ts`, y qué se puede escribir lo prueba
// `alternarConjunto`; lo que se comprueba aquí es que el rótulo los USA.

const { get, put, del } = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), del: vi.fn() }));
vi.mock('../../lib/api', () => ({
  default: {
    get: (...a: unknown[]) => get(...a),
    put: (...a: unknown[]) => put(...a),
    delete: (...a: unknown[]) => del(...a),
    post: vi.fn(),
  },
}));

// UN MIÉRCOLES FIJO: 30 de septiembre de 2026. Septiembre empieza un martes, así que la vista de mes
// va del lunes 31 de agosto al domingo 4 de octubre: cinco semanas, las cuatro primeras ENTERAS en el
// pasado y la quinta —28 sep a 4 oct— a medias. Y octubre, un mes después, tiene una semana entera por
// venir: la 2.ª, del 5 al 11. Son los tres casos que importan, y el reloj de verdad no los garantiza
// ningún día de la semana (src/pruebas/reloj.ts).
fijarElRelojEnUnMiercoles();
const HOY = hoyEnBogota();
const SEMANA_EN_CURSO = diasDeLaSemana(lunesDeLaSemana(HOY));
const ESCRIBIBLES_EN_CURSO = SEMANA_EN_CURSO.filter(f => sePuedePintar(f, HOY));

// OJO CON ESTE FIXTURE, igual que en las otras pruebas del calendario: nadie lo tipa, así que cuando la
// respuesta gane un campo hay que agregarlo aquí a mano o la prueba sigue verde ejercitando un día que
// no existe (CLAUDE.md §9.2).
const diaDe = (fecha: string) => ({
  fecha, estado: 'TRABAJA', horaEntrada: '10:00', horaSalida: '16:00',
  minutosEsperados: 300, esFestivo: false, origen: 'AUTO', turno: null,
  horarioNombre: null, decision: null, esDescansoObligatorio: false,
  toleranciaMin: 10, toleranciaSalidaMin: 0, ajustaEntrada: false,
  almuerzoMin: 60, almuerzoInicio: '12:00', almuerzoFin: '13:00', descansos: [],
});

const personaDe = (id: string, nombre: string, apellido: string, dias: string[]) => ({
  id, nombre, apellido, cargo: 'Guarda',
  sedes: [{ id: 's1', nombre: 'Norte' }],
  descanso: { tipo: 'PRESUMIDO', dia: null },
  minutosEsperados: 2100, descansosConTurno: 0,
  descansoHabitual: { porMes: {}, mes: HOY.slice(0, 7), trabajados: 0, clase: 'NINGUNO' },
  propuesta: { estado: 'NO_APLICA' },
  dias: dias.map(diaDe),
});

const NOMBRES: [string, string, string][] = [['c1', 'Ana', 'Ríos'], ['c2', 'Beto', 'Lara'], ['c3', 'Ciro', 'Peña']];

// El servidor de mentira RESPONDE A LO QUE LE PIDEN y le da a cada persona TODOS los días del rango,
// como el de verdad: con una semana fija, el mes pediría 35 columnas y la fila traería 7.
const montar = (personas: [string, string, string][] = NOMBRES) => {
  get.mockImplementation((url: string, cfg?: { params?: { desde: string; hasta: string } }) => {
    if (url === '/turnos/calendario') {
      const { desde, hasta } = cfg!.params!;
      const dias: string[] = [];
      for (let d = desde; d <= hasta; d = sumarDias(d, 1)) dias.push(d);
      return Promise.resolve({
        data: { desde, hasta, horasSemanales: 42, filas: personas.map(([i, n, a]) => personaDe(i, n, a, dias)) },
      });
    }
    if (url === '/plantillas-turno') return Promise.resolve({ data: [] });
    return Promise.reject(new Error('url inesperada: ' + url));
  });
  return render(<CalendarioDeTurnos />);
};

const alMes = async (usuario: ReturnType<typeof userEvent.setup>) => {
  await usuario.click(await screen.findByRole('button', { name: 'Mes' }));
};

// El botón del rótulo de una semana, por lo que ve una persona: «Semana 2 · …». El nombre empieza
// distinto a propósito de «Marcar la semana de Ana» (la fila) y de «Marcar el día 7 de todos» (la
// columna): tres botones que marcan cosas distintas no pueden llamarse casi igual.
const rotulo = (numero: number) =>
  screen.findByRole('button', { name: new RegExp(`^Marcar todos los días de la Semana ${numero} `) });

const tarjeta = () => screen.findByRole('region', { name: /marcad/i });
const sinTarjeta = () => screen.queryByRole('region', { name: /marcad/i });
const avisos = () => screen.queryAllByRole('status');

beforeEach(() => { get.mockReset(); put.mockReset(); del.mockReset(); });

describe('el rótulo de una semana, en la vista de mes', () => {
  it('marca los siete días de todas las personas', async () => {
    const usuario = userEvent.setup();
    montar();
    await alMes(usuario);
    await usuario.click(await screen.findByRole('button', { name: /mes siguiente/i }));

    await usuario.click(await rotulo(2));

    // Tres personas por siete días. Ni uno más: marcar de más escribiría sobre días que quien lo pidió
    // no tocó, y ni uno menos dejaría la semana a medias sin decirlo.
    expect(await tarjeta()).toHaveTextContent(/21 jornadas/);
  });

  it('tocarlo otra vez la desmarca: el interruptor de siempre', async () => {
    const usuario = userEvent.setup();
    montar();
    await alMes(usuario);
    await usuario.click(await screen.findByRole('button', { name: /mes siguiente/i }));

    await usuario.click(await rotulo(2));
    await tarjeta();
    await usuario.click(await rotulo(2));

    expect(sinTarjeta()).not.toBeInTheDocument();
  });

  // `every` Y NO `some`, como en la fila y la columna: con un día ya marcado, el segundo gesto tiene
  // que COMPLETAR la semana. Con `some`, el toque apagaría lo poco que llevaba armado.
  it('con un día de esa semana ya marcado, la completa en vez de apagarla', async () => {
    const usuario = userEvent.setup();
    montar();
    await alMes(usuario);
    await usuario.click(await screen.findByRole('button', { name: /mes siguiente/i }));

    await usuario.click(await screen.findByRole('button', { name: 'Marcar el día 7 de todos' }));
    expect(await tarjeta()).toHaveTextContent(/3 jornadas/);

    await usuario.click(await rotulo(2));
    expect(await tarjeta()).toHaveTextContent(/21 jornadas/);
  });

  it('se anuncia como marcado solo cuando la semana está entera', async () => {
    const usuario = userEvent.setup();
    montar();
    await alMes(usuario);
    await usuario.click(await screen.findByRole('button', { name: /mes siguiente/i }));

    expect(await rotulo(2)).toHaveAttribute('aria-pressed', 'false');

    // Un solo día no la hace «entera».
    await usuario.click(await screen.findByRole('button', { name: 'Marcar el día 7 de todos' }));
    expect(await rotulo(2)).toHaveAttribute('aria-pressed', 'false');

    await usuario.click(await rotulo(2));
    expect(await rotulo(2)).toHaveAttribute('aria-pressed', 'true');
    // Y las otras semanas no cambian por haber marcado esta.
    expect(await rotulo(3)).toHaveAttribute('aria-pressed', 'false');
  });

  // LA SEMANA EN CURSO TIENE DÍAS IDOS Y NO SE ESCRIBEN: marcar los siete escribiría sobre un pasado que
  // quizá ya se liquidó. Se deriva con `sePuedePintar`, la misma regla que usa la pantalla, y no con un
  // número escrito aquí: con una copia, la prueba y el componente podrían discrepar sin que ninguna
  // se pusiera roja.
  it('en la semana en curso marca solo lo que todavía se puede escribir', async () => {
    const usuario = userEvent.setup();
    montar();
    await alMes(usuario);
    // Septiembre: la semana de hoy es la quinta, del 28 de septiembre al 4 de octubre.
    await usuario.click(await rotulo(5));

    expect(ESCRIBIBLES_EN_CURSO.length).toBeGreaterThan(0);
    expect(ESCRIBIBLES_EN_CURSO.length).toBeLessThan(7);
    expect(await tarjeta()).toHaveTextContent(new RegExp(`${ESCRIBIBLES_EN_CURSO.length * NOMBRES.length} jornadas`));
  });

  it('una semana que ya pasó entera no marca nada y lo dice', async () => {
    const usuario = userEvent.setup();
    montar();
    await alMes(usuario);
    const primera = await rotulo(1);

    // Se ve y se anuncia apagado, pero se puede pulsar para que explique por qué (`aria-disabled` y no
    // `disabled`: lo segundo lo saca del tabulador y quien navega con teclado nunca llega a la razón).
    expect(primera).toHaveAttribute('aria-disabled', 'true');
    await usuario.click(primera);

    expect(avisos()).toHaveLength(1);
    expect(avisos()[0]).toHaveTextContent(/ya pasó y no se puede programar/i);
    expect(sinTarjeta()).not.toBeInTheDocument();
  });

  it('una semana con días por venir no se anuncia apagada', async () => {
    montar();
    const usuario = userEvent.setup();
    await alMes(usuario);
    expect(await rotulo(5)).not.toHaveAttribute('aria-disabled', 'true');
  });

  // Sin nadie a la vista no hay a quién marcarle: decir «ese día ya pasó» sería un aviso que miente.
  it('sin personas a la vista no avisa que el día pasó', async () => {
    const usuario = userEvent.setup();
    montar([]);
    await alMes(usuario);
    await usuario.click(await screen.findByRole('button', { name: /mes siguiente/i }));
    const botones = screen.queryAllByRole('button', { name: /^Marcar todos los días de la Semana/ });
    // Si con cero personas la rejilla ni siquiera pinta el renglón de semanas, la guarda es inalcanzable
    // y no hay nada que comprobar; si lo pinta, tocarlo no puede decir nada del pasado.
    for (const b of botones) await usuario.click(b);
    expect(avisos()).toHaveLength(0);
    expect(sinTarjeta()).not.toBeInTheDocument();
  });
});
