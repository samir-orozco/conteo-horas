import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CalendarioDeTurnos from './CalendarioDeTurnos';
import { hoyEnBogota, lunesDeLaSemana, diasDeLaSemana, sumarDias } from './semana';

// LA VENTANA DE ROTACIÓN (28 de septiembre de 2026).
//
// Pedido del dueño, con sus palabras: «si seleccionamos el nombre de la persona podamos poner en el
// modal donde están los turnos de que se ponga el 6x1 o el 4x2 para que semanalmente se apliquen los
// cambios, como que solo se seleccione el tipo de rotación, los días y el turno». Los días son la
// selección que ya está hecha en la rejilla, así que aquí solo quedan tres decisiones: el patrón, el
// turno que se trabaja, y en qué punto del ciclo arranca.
//
// Y LA RAZÓN DE SER DE LA VENTANA, también con sus palabras: «que el sistema lea todo el mes y me diga
// que por norma no le estás dando el día de descanso». Un 6x1 o un 5x2 duran siete días y dejan el
// descanso siempre en el mismo; un 4x2 o un 2x2 no cuadran con la semana y lo corren, que es de donde
// salen los incumplimientos que ninguna celda «pisada» delata.
//
// EL MOTOR NO SE PRUEBA AQUÍ: `accionDelDia`, `proyeccionDelMes` y `semanasSinDescanso` son puros y
// están probados y mutados aparte. Esto comprueba que la pantalla los APLICA, que pide el mes para
// poder juzgarlo, y que no escribe sin pasar por la previa.

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
const MES = HOY.slice(0, 7);

const diaDe = (fecha: string, extra: Record<string, unknown> = {}) => ({
  fecha, estado: 'TRABAJA', horaEntrada: '10:00', horaSalida: '16:00',
  minutosEsperados: 300, esFestivo: false, origen: 'AUTO', turno: null,
  horarioNombre: null, decision: null, esDescansoObligatorio: false,
  toleranciaMin: 10, toleranciaSalidaMin: 0, ajustaEntrada: false,
  almuerzoMin: 60, almuerzoInicio: '12:00', almuerzoFin: '13:00', descansos: [],
  ...extra,
});

const personaDe = (id: string, nombre: string, apellido: string, fechas: string[] = DIAS) => ({
  id, nombre, apellido, cargo: 'Guarda',
  sedes: [{ id: 's1', nombre: 'Norte' }],
  descanso: { tipo: 'PRESUMIDO', dia: null },
  minutosEsperados: 2100, descansosConTurno: 0,
  descansoHabitual: { porMes: {}, mes: MES, trabajados: 0, clase: 'NINGUNO' },
  propuesta: { estado: 'NO_APLICA' },
  dias: fechas.map(f => diaDe(f)),
});

const CATALOGO = [
  { id: 'p1', nombre: 'Mañana', color: 'esmeralda', horaEntrada: '06:00', horaSalida: '14:00' },
  { id: 'p2', nombre: 'Noche', color: 'cobalto', horaEntrada: '22:00', horaSalida: '06:00' },
];

// EL SERVIDOR DE MENTIRA RESPONDE A LO QUE LE PIDEN, como haría el de verdad: si le piden la semana
// devuelve la semana, y si le piden el mes devuelve el mes. Un doble que ignorara el rango dejaría
// pasar justamente el defecto de juzgar el mes con los datos de una semana (CLAUDE.md §9.2).
const montar = (filas: unknown[] = [personaDe('c1', 'Ana', 'Ríos')]) => {
  get.mockImplementation((url: string, cfg?: { params?: { desde: string; hasta: string } }) => {
    if (url === '/turnos/calendario') {
      const desde = cfg?.params?.desde ?? LUNES;
      const hasta = cfg?.params?.hasta ?? DOMINGO;
      const fechas: string[] = [];
      let d = desde;
      while (d <= hasta) { fechas.push(d); d = sumarDias(d, 1); }
      // SE DISTINGUE POR EL TAMAÑO DEL RANGO Y NO POR LA FECHA DE INICIO, y no es un capricho: con
      // `desde === primero-del-mes`, un día en que hoy caiga lunes y primero, el lunes de la semana
      // SERÍA el primero del mes y la petición de la semana se leería como la del mes. Fallaría un día
      // al mes. Las pruebas de este lado corren fijadas fuera de Bogotá justamente para que nada
      // dependa de cuándo se ejecutan (CLAUDE.md §7), y un doble que se confunde solo a veces es peor
      // que uno que se confunde siempre. Una semana son siete días; un mes, veintiocho o más.
      const esElMes = fechas.length > 7;
      return Promise.resolve({
        data: {
          desde, hasta, horasSemanales: 42, minimoHabitual: 3,
          filas: esElMes
            // El mes viene con TODO trabajado, que es el punto de partida incómodo: así el veredicto
            // tiene algo que reprochar y se puede comprobar que sabe decir que no.
            ? [personaDe('c1', 'Ana', 'Ríos', fechas)]
            : filas,
        },
      });
    }
    if (url === '/plantillas-turno') return Promise.resolve({ data: CATALOGO });
    return Promise.reject(new Error('url inesperada: ' + url));
  });
  return render(<CalendarioDeTurnos />);
};

const tarjeta = () => screen.findByRole('region', { name: /marcad/i });
const ventana = () => screen.findByRole('dialog', { name: /rotación de/i });

const marcarFilaDe = async (usuario: ReturnType<typeof userEvent.setup>, quien: string) =>
  usuario.click(await screen.findByRole('button', { name: new RegExp(`marcar la semana de ${quien}`, 'i') }));

beforeEach(() => { put.mockReset(); del.mockReset(); });

describe('llegar a la rotación', () => {
  it('la tarjeta ofrece Rotación', async () => {
    const usuario = userEvent.setup();
    montar();
    await marcarFilaDe(usuario, 'Ana Ríos');
    expect(within(await tarjeta()).getByRole('button', { name: /rotación/i })).toBeInTheDocument();
  });

  it('y su nombre accesible dice ROTACIÓN, no el texto del tooltip', async () => {
    // ESTA PRUEBA NACIÓ DE MIRAR EL NAVEGADOR DE VERDAD (28 de septiembre de 2026), y es la clase de
    // defecto que esta suite NO puede cazar sola: con un `title` y sin `aria-label`, el navegador
    // expone el botón como «Aplicar un patrón 6x1, 4x2…» mientras jsdom lo expone como «Rotación»,
    // porque calculan el nombre accesible con distinta precedencia. O sea que el caso de arriba pasaba
    // en verde por un motivo que no se cumple en producción: quien navegue con lector de pantalla
    // buscaría «Rotación» y no lo encontraría.
    //
    // Por eso aquí se afirma el ATRIBUTO y no el rol: el atributo sí significa lo mismo en los dos
    // sitios. Y el `aria-label` lleva además el motivo cuando está apagado, que es justo lo que el
    // tooltip le daba solo a quien puede ver.
    const usuario = userEvent.setup();
    montar();
    await marcarFilaDe(usuario, 'Ana Ríos');
    const boton = within(await tarjeta()).getByRole('button', { name: /rotación/i });
    expect(boton).toHaveAttribute('aria-label', expect.stringMatching(/^Rotación/));
  });

  it('con DOS personas marcadas la rotación NO se puede usar', async () => {
    // No es una limitación técnica: un ciclo arranca en un día concreto, y aplicar el mismo 4x2 con el
    // mismo arranque a diez personas las deja a todas descansando el mismo día, que es lo contrario de
    // para lo que existe una rotación.
    const usuario = userEvent.setup();
    montar([personaDe('c1', 'Ana', 'Ríos'), personaDe('c2', 'Beto', 'Lara')]);
    await marcarFilaDe(usuario, 'Ana Ríos');
    await marcarFilaDe(usuario, 'Beto Lara');
    expect(within(await tarjeta()).getByRole('button', { name: /rotación/i })).toBeDisabled();
  });

  it('abre la ventana con el nombre de quien es', async () => {
    const usuario = userEvent.setup();
    montar();
    await marcarFilaDe(usuario, 'Ana Ríos');
    await usuario.click(within(await tarjeta()).getByRole('button', { name: /rotación/i }));
    expect(await ventana()).toHaveTextContent(/Rotación de Ana Ríos/);
  });

  it('ofrece los cuatro patrones y los turnos del catálogo', async () => {
    const usuario = userEvent.setup();
    montar();
    await marcarFilaDe(usuario, 'Ana Ríos');
    await usuario.click(within(await tarjeta()).getByRole('button', { name: /rotación/i }));
    const caja = await ventana();
    for (const patron of ['6x1', '5x2', '4x2', '2x2']) {
      expect(within(caja).getByRole('button', { name: new RegExp(patron) })).toBeInTheDocument();
    }
    expect(within(caja).getByRole('button', { name: /Noche/ })).toBeInTheDocument();
  });

  it('pide el MES para poder juzgarlo, no se conforma con la semana', async () => {
    // Sin el mes, el veredicto juzgaría siete días y diría «todo bien» de un mes que no ha visto.
    const usuario = userEvent.setup();
    montar();
    await marcarFilaDe(usuario, 'Ana Ríos');
    await usuario.click(within(await tarjeta()).getByRole('button', { name: /rotación/i }));
    await ventana();
    const rangos = get.mock.calls.filter(c => c[0] === '/turnos/calendario').map(c => c[1]?.params);
    expect(rangos).toContainEqual(expect.objectContaining({ desde: `${MES}-01` }));
  });
});

describe('el veredicto del mes', () => {
  const abrir = async (usuario: ReturnType<typeof userEvent.setup>) => {
    montar();
    await marcarFilaDe(usuario, 'Ana Ríos');
    await usuario.click(within(await tarjeta()).getByRole('button', { name: /rotación/i }));
    return ventana();
  };

  it('avisa cuando por norma quedarían semanas sin descanso', async () => {
    // El mes de mentira viene trabajado entero y solo hay UNA semana marcada, así que las demás
    // conservan sus siete días trabajados. Es justo el caso que ninguna celda «pisada» delata.
    const usuario = userEvent.setup();
    const caja = await abrir(usuario);
    expect(await within(caja).findByText(/no le estarías dando el día de descanso/i)).toBeInTheDocument();
  });

  it('y dice en qué semanas, no solo que las hay', async () => {
    const usuario = userEvent.setup();
    const caja = await abrir(usuario);
    expect(await within(caja).findByText(/semana del/i)).toBeInTheDocument();
  });

  it('nombra el mes A SECAS, sin pegarle el año', async () => {
    // Visto en el navegador: decía «en 2 semanas de septiembre de 2026». El año sobra y estorba, y la
    // redacción que se aprobó era «de septiembre». Sale de reutilizar el rótulo del encabezado, que sí
    // necesita el año porque titula la vista de mes; aquí no.
    const usuario = userEvent.setup();
    const caja = await abrir(usuario);
    const veredicto = await within(caja).findByText(/no le estarías dando el día de descanso/i);
    expect(veredicto.textContent ?? '').not.toMatch(/\b20\d{2}\b/);
  });

  it('cambiar el patrón vuelve a juzgar', async () => {
    // El veredicto tiene que seguir a lo que se elige; si se quedara con el primero, diría lo de 6x1
    // mientras la persona mira un 2x2.
    const usuario = userEvent.setup();
    const caja = await abrir(usuario);
    await usuario.click(within(caja).getByRole('button', { name: /2x2/ }));
    expect(within(caja).getByText(/el descanso se corre tres días cada semana/i)).toBeInTheDocument();
  });

  it('correr el arranque del ciclo también vuelve a juzgar', async () => {
    const usuario = userEvent.setup();
    const caja = await abrir(usuario);
    const antes = caja.textContent ?? '';
    await usuario.click(within(caja).getByRole('button', { name: /correr un día adelante/i }));
    expect(caja.textContent).not.toBe(antes);
  });
});

describe('aplicar la rotación', () => {
  it('«Ver antes de aplicar» NO escribe: abre la MISMA previa', async () => {
    // Un segundo camino de escritura sería un segundo sitio donde equivocarse, y la rotación se
    // saltaría los avisos que la previa ya sabe dar.
    const usuario = userEvent.setup();
    montar();
    await marcarFilaDe(usuario, 'Ana Ríos');
    await usuario.click(within(await tarjeta()).getByRole('button', { name: /rotación/i }));
    await usuario.click(within(await ventana()).getByRole('button', { name: /ver antes de aplicar/i }));

    expect(await screen.findByRole('dialog', { name: /antes de aplicar/i })).toBeInTheDocument();
    expect(put).not.toHaveBeenCalled();
  });

  it('y al aplicar, cada día recibe lo que el ciclo le toca: unos turno y otros descanso', async () => {
    // Lo que distingue una rotación de pintar un turno: la MISMA aplicación escribe turnos en unos
    // días y descansos en otros, por el mismo camino de escritura.
    const usuario = userEvent.setup();
    put.mockResolvedValue({ data: { ok: true } });
    montar();
    await marcarFilaDe(usuario, 'Ana Ríos');
    await usuario.click(within(await tarjeta()).getByRole('button', { name: /rotación/i }));
    await usuario.click(within(await ventana()).getByRole('button', { name: /ver antes de aplicar/i }));
    await usuario.click(within(await screen.findByRole('dialog', { name: /antes de aplicar/i }))
      .getByRole('button', { name: /aplicar/i }));

    const cuerpos = put.mock.calls.map(c => c[1] as Record<string, unknown>);
    expect(cuerpos.some(c => c.plantillaId !== undefined)).toBe(true);
    expect(cuerpos.some(c => c.descanso === true)).toBe(true);
  });

  it('Cancelar cierra la ventana sin escribir ni perder lo marcado', async () => {
    const usuario = userEvent.setup();
    montar();
    await marcarFilaDe(usuario, 'Ana Ríos');
    await usuario.click(within(await tarjeta()).getByRole('button', { name: /rotación/i }));
    await usuario.click(within(await ventana()).getByRole('button', { name: /cancelar/i }));

    expect(put).not.toHaveBeenCalled();
    expect(await tarjeta()).toHaveTextContent(/7 jornadas/);
  });
});
