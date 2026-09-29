import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CalendarioDeTurnos from './CalendarioDeTurnos';
import { hoyEnBogota, lunesDeLaSemana, sumarDias } from './semana';
import { vistaDelCalendario } from './vistaDelCalendario';

// DÍA, SEMANA Y MES, DESDE LA PANTALLA (22 de septiembre de 2026).
//
// Pedido del dueño: «que la parte de arriba quede así, que podamos ver día, Semana y Mes».
//
// Qué rango le toca a cada modo ya se decide en `vistaDelCalendario` (15 pruebas, 6 mutaciones), y
// qué inicial lleva cada columna en `inicialDeDia`. Aquí se comprueba que la pantalla los APLICA:
// que le pide al servidor el rango del modo, que las flechas se mueven en esa unidad, y —lo que
// más importa— que lo que dice la pantalla deja de hablar de «la semana» cuando no es una semana.
//
// EL DEFECTO QUE ESTAS PRUEBAS EXISTEN PARA IMPEDIR: el tope legal es de 42 horas SEMANALES. Al
// mostrar un mes, cualquier persona lo pasa, y la pantalla pintaría a la empresa entera en ámbar
// diciendo que se pasó del tope. Sería un número plausible y falso, que es la forma en que este
// producto se rompe según su propio CLAUDE.md.

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

// Cuántos días tiene el mes de hoy, calculado APARTE del módulo que se está probando: verificar
// `vistaDelCalendario` con `vistaDelCalendario` no comprobaría nada.
const [ANIO, MES] = HOY.split('-').map(Number);
const DIAS_DEL_MES = new Date(Date.UTC(ANIO, MES, 0)).getUTCDate();
const PRIMERO_DEL_MES = `${HOY.slice(0, 7)}-01`;
const ULTIMO_DEL_MES = `${HOY.slice(0, 7)}-${String(DIAS_DEL_MES).padStart(2, '0')}`;

// EL MES SE DIBUJA CON SEMANAS COMPLETAS (28 de septiembre de 2026): del lunes anterior al día 1 al
// domingo posterior al último. Pintar un día reescribe su semana entera, así que un mes cortado a
// mitad de semana dejaría que una escritura tocara días que no están en pantalla.
//
// Estas tres también se calculan APARTE, con `Date` y aritmética propia, por la misma razón que las
// de arriba: pedírselas a `vistaDelCalendario` sería comprobarlo consigo mismo.
const RELLENO_ANTES = (new Date(`${PRIMERO_DEL_MES}T12:00:00Z`).getUTCDay() + 6) % 7;
const RELLENO_DESPUES = 6 - ((new Date(`${ULTIMO_DEL_MES}T12:00:00Z`).getUTCDay() + 6) % 7);
const PRIMERA_COLUMNA = sumarDias(PRIMERO_DEL_MES, -RELLENO_ANTES);
const ULTIMA_COLUMNA = sumarDias(ULTIMO_DEL_MES, RELLENO_DESPUES);
const COLUMNAS_DEL_MES = DIAS_DEL_MES + RELLENO_ANTES + RELLENO_DESPUES;

const diaDe = (fecha: string) => ({
  fecha, estado: 'TRABAJA', horaEntrada: '08:00', horaSalida: '16:00',
  minutosEsperados: 420, esFestivo: false, origen: 'AUTO', turno: null,
  horarioNombre: 'Jornada demo', decision: null, esDescansoObligatorio: false,
  toleranciaMin: 10, toleranciaSalidaMin: 0, ajustaEntrada: false,
  almuerzoMin: 60, almuerzoInicio: '12:00', almuerzoFin: '13:00', descansos: [],
});

// El servidor de mentira RESPONDE A LO QUE LE PIDEN, como haría el de verdad: devuelve el rango
// que se le pasó y una fila con esos días. Un doble que ignorara los parámetros dejaría pasar
// justamente el defecto de pedir el rango equivocado (CLAUDE.md §9.2).
const montar = () => {
  get.mockImplementation((url: string, cfg?: { params?: { desde: string; hasta: string } }) => {
    if (url === '/turnos/calendario') {
      const { desde, hasta } = cfg!.params!;
      const dias: string[] = [];
      for (let d = desde; d <= hasta; d = sumarDias(d, 1)) dias.push(d);
      return Promise.resolve({
        data: {
          desde, hasta, horasSemanales: 42,
          filas: [{
            id: 'c1', nombre: 'Julián', apellido: 'Torres', cargo: 'Guarda',
            descanso: { tipo: 'PRESUMIDO', dia: null },
            // El total del rango. En un mes pasa de 42 h por definición, que es justo el caso que
            // no puede encender la alarma semanal.
            minutosEsperados: dias.length * 420,
            descansosConTurno: 0,
            sedes: [{ id: 's1', nombre: 'Norte' }],
            descansoHabitual: { porMes: {}, mes: HOY.slice(0, 7), trabajados: 0, clase: 'NINGUNO' },
            dias: dias.map(diaDe),
            propuesta: null,
          }],
        },
      });
    }
    if (url === '/plantillas-turno') return Promise.resolve({ data: [] });
    return Promise.reject(new Error('url inesperada: ' + url));
  });
  return render(<CalendarioDeTurnos />);
};

// Esperar a que la respuesta haya llegado y la rejilla esté pintada.
//
// `findAllByText` Y NO `findByText`: el nombre sale DOS veces, en la rejilla y en la tabla de
// resumen, así que la versión singular revienta con «Found multiple elements» antes de llegar a la
// aserción. Así fallaron las nueve el 22 de septiembre de 2026, y un rojo por un fallo de la propia
// prueba no dice nada de la pantalla (CLAUDE.md §9.1). Como puerta de «ya cargó» basta con que
// aparezca al menos uno; lo que se comprueba de verdad va en cada `it`.
const cargado = () => screen.findAllByText(/Julián/);

const elegirModo = async (nombre: string) => {
  const usuario = userEvent.setup();
  await usuario.click(await screen.findByRole('button', { name: nombre }));
  return usuario;
};

const rangoPedido = () => {
  const llamadas = get.mock.calls.filter(c => c[0] === '/turnos/calendario');
  return llamadas[llamadas.length - 1][1].params as { desde: string; hasta: string };
};

// CUÁNTAS COLUMNAS DE DÍA tiene la rejilla, contadas por el botón que marca ese día de todos.
//
// Antes contaba encabezados y restaba dos («Persona» y «Total»). Eso se rompe en cuanto el encabezado
// gana columnas —y va a ganarlas: el total por semana dentro del mes—, y se rompería POR LA RAZÓN
// EQUIVOCADA: parecería que el mes dejó de dibujar sus días cuando lo único que cambió es cuántos
// encabezados hay. Contar los botones de día es inmune a eso, porque hay exactamente uno por día.
const columnas = async () => {
  const tabla = (await screen.findAllByRole('table'))[0];
  const encabezado = within(tabla).getAllByRole('row')[0];
  return within(encabezado).getAllByRole('button', { name: /^Marcar el día/ }).length;
};

beforeEach(() => { get.mockReset(); put.mockReset(); del.mockReset(); });

describe('qué rango le pide al servidor cada modo', () => {
  it('arranca en SEMANA y pide los siete días', async () => {
    montar();
    await cargado();
    expect(rangoPedido()).toEqual({ desde: LUNES, hasta: sumarDias(LUNES, 6) });
  });

  it('en MES pide SEMANAS COMPLETAS, no del 1 al último', async () => {
    // Antes pedía del 1 al último y este caso lo afirmaba. Se reescribe a propósito: pintar un día
    // reescribe su semana entera, y con el mes cortado a mitad de semana esa reescritura tocaría
    // días fuera de la pantalla.
    montar();
    await cargado();
    await elegirModo('Mes');
    await cargado();
    expect(rangoPedido()).toEqual({ desde: PRIMERA_COLUMNA, hasta: ULTIMA_COLUMNA });
  });


  it('en DÍA pide un solo día', async () => {
    montar();
    await cargado();
    await elegirModo('Día');
    await cargado();
    expect(rangoPedido()).toEqual({ desde: HOY, hasta: HOY });
  });
});

describe('qué dibuja la rejilla', () => {
  it('en MES hay una columna por día, incluidas las de relleno', async () => {
    montar();
    await cargado();
    await elegirModo('Mes');
    await cargado();
    expect(await columnas()).toBe(COLUMNAS_DEL_MES);
  });


  it('en MES cada semana lleva su propio total', async () => {
    // EL GUARDIA DE LAS 42 HORAS ES SEMANAL. En la vista de mes el único total era el del mes entero,
    // y comparar treinta jornadas contra un tope semanal no significa nada: la alarma desaparecía
    // justo donde más jornadas se programan de una vez.
    //
    // SE CUENTAN LAS CELDAS DE LA FILA Y NO EL RÓTULO «Sem» del encabezado, y la diferencia importa:
    // con el encabezado puesto y la fila sin su celda, la tabla queda desalineada y una prueba que
    // buscara el rótulo pasaría igual sin haber comprobado nada. Pasó de verdad mientras se escribía.
    montar();
    await cargado();
    await elegirModo('Mes');
    await cargado();

    const tabla = (await screen.findAllByRole('table'))[0];
    const primeraFila = within(tabla).getAllByRole('row')[1];
    // Persona + un día por columna + un total por semana + el total del período.
    expect(within(primeraFila).getAllByRole('cell'))
      .toHaveLength(1 + COLUMNAS_DEL_MES + COLUMNAS_DEL_MES / 7 + 1);
  });

  it('y en SEMANA no se repite: el total de la fila YA es el de esa semana', async () => {
    // Con una sola semana, una celda semanal diría exactamente el mismo número que la de al lado.
    montar();
    await cargado();
    const tabla = (await screen.findAllByRole('table'))[0];
    const primeraFila = within(tabla).getAllByRole('row')[1];
    expect(within(primeraFila).getAllByRole('cell')).toHaveLength(1 + 7 + 1);
  });

  it('en MES la celda se compacta a un código corto, y el nombre se mueve al puntero', async () => {
    // MEDIDO EN EL NAVEGADOR ANTES DE ESCRIBIR ESTO: en la vista de mes la tabla medía 4001 px dentro
    // de un contenedor de 1006, o sea que se veía la CUARTA PARTE del mes y había que raspar a lo
    // ancho para llegar a la última semana. Con 42 columnas no cabe el nombre de un turno.
    //
    // PRIMERO SE PARTIÓ EN DOS RENGLONES y no alcanzó: la columna seguía midiendo lo que el nombre
    // más largo del catálogo. El 28 de septiembre pasó al código corto de la maqueta.
    //
    // NADA SE PIERDE, Y ESO ES LO QUE ESTA PRUEBA PROTEGE: el nombre sale al pasar el puntero, y
    // sigue entero en la vista de semana, en el panel del día y en la leyenda. Si alguien quita el
    // `title` para simplificar, una empresa de horario fijo se queda con un mes de letras mudas.
    montar();
    await cargado();
    await elegirModo('Mes');
    await cargado();

    const tabla = (await screen.findAllByRole('table'))[0];
    const primeraFila = within(tabla).getAllByRole('row')[1];
    expect(primeraFila.textContent ?? '', 'el nombre entero ya no cabe').not.toContain('Jornada demo');
    expect(primeraFila.textContent ?? '', 'ni el horario').not.toMatch(/\d{2}:\d{2}/);

    const conNombre = within(primeraFila).getAllByTitle(/Jornada demo/);
    expect(conNombre.length, 'el nombre sigue a un gesto de distancia').toBeGreaterThan(0);
  });

  it('y en SEMANA la celda SÍ dice el horario', async () => {
    // El contraste, que es lo que impide «compactar» también donde hay sitio de sobra: con siete
    // columnas el horario cabe y es lo que se está mirando al programar el día a día.
    //
    // EL PATRÓN CAMBIÓ CON EL FORMATO CORTO: la celda dice «8–17» y ya no «08:00–17:00», así que
    // buscar `\d{2}:\d{2}` dejaría de encontrarlo aunque el horario siguiera ahí. Se afirma el
    // horario del fixture, que es lo que la prueba quiere decir.
    montar();
    await cargado();
    const tabla = (await screen.findAllByRole('table'))[0];
    const primeraFila = within(tabla).getAllByRole('row')[1];
    expect(primeraFila.textContent ?? '').toContain('8–16'); // el horario del fixture: 08:00–16:00
  });

  it('en MES no hay dos columnas que se llamen igual', async () => {
    // EL MES SE DIBUJA CON SEMANAS COMPLETAS, así que las columnas de los extremos son de otro mes.
    // Con el rótulo diciendo solo el número, el día 1 de este mes y el 1 del siguiente se llaman
    // IGUAL: «Marcar el día 1 de todos». Quien navega con lector de pantalla oye dos columnas con el
    // mismo nombre y una de ellas escribe en un mes que no es el del título.
    //
    // POR QUÉ SE AFIRMA LA UNICIDAD Y NO «la primera columna dice agosto»: estas pruebas corren
    // contra el reloj de verdad, y el relleno puede ser CERO en los dos extremos (un mes que empieza
    // lunes y termina domingo; febrero de 2027 es uno). Una prueba que diera por hecho el relleno
    // pasaría o fallaría según el día en que se corra, y una con un `if` podría no afirmar nada
    // durante un mes entero sin que nadie se enterara (CLAUDE.md §12.2). La unicidad es cierta
    // siempre: hoy se pone roja porque hay relleno, y el día que no lo haya sigue diciendo la verdad.
    montar();
    await cargado();
    await elegirModo('Mes');
    await cargado();

    const tabla = (await screen.findAllByRole('table'))[0];
    const encabezado = within(tabla).getAllByRole('row')[0];
    const nombres = within(encabezado)
      .getAllByRole('button', { name: /^Marcar el día/ })
      .map(b => b.getAttribute('aria-label'));

    // La guarda de que esto de verdad está mirando un MES. Sin ella, si el cambio de modo fallara en
    // silencio la prueba pasaría con siete columnas, todas con nombre distinto, por la razón
    // equivocada (CLAUDE.md §9.1).
    expect(nombres).toHaveLength(COLUMNAS_DEL_MES);

    const repetidos = nombres.filter((n, i) => nombres.indexOf(n) !== i);
    expect(repetidos).toEqual([]);
  });

  it('la pantalla dice en qué período estás parado, no solo su rango', async () => {
    // El título dice «28 sep – 4 oct», y eso no responde la pregunta que uno se hace al llegar: ¿esto
    // es la semana en curso o me fui tres semanas adelante con las flechas? Programar turnos en la
    // semana equivocada no se ve raro: se ve igual que programarlos en la correcta.
    //
    // ESTA PRUEBA NO DEPENDE DEL RELOJ aunque no lo fije, y por eso se puede afirmar el texto exacto:
    // la etiqueta es RELATIVA a hoy, así que al montar sin tocar nada siempre es la semana en curso,
    // cualquier día que se corra la suite. La aritmética va aparte, en `etiquetaDelPeriodo.test.ts`.
    montar();
    await cargado();
    expect(screen.getByText('Semana en curso')).toBeInTheDocument();
  });

  it('y esa etiqueta cambia al moverse con las flechas', async () => {
    // Que el texto exista no sirve si se queda quieto: un rótulo que dice «semana en curso» estando
    // tres semanas adelante es peor que no tener rótulo, porque tranquiliza.
    //
    // La flecha se consulta por ROL y la etiqueta por TEXTO a propósito: el botón se llama «Semana
    // siguiente» por su `aria-label` y no tiene texto, así que las dos consultas no se pisan.
    montar();
    await cargado();
    const usuario = userEvent.setup();
    await usuario.click(screen.getByRole('button', { name: 'Semana siguiente' }));
    await cargado();

    expect(screen.getByText('Semana siguiente')).toBeInTheDocument();
    expect(screen.queryByText('Semana en curso')).not.toBeInTheDocument();
  });

  it('y las iniciales siguen siendo ciertas pasada la séptima columna', async () => {
    // El defecto concreto: `INICIALES_DE_DIA[i]` con `i` = número de columna devuelve `undefined`
    // de la octava en adelante, o sea medio encabezado en blanco.
    montar();
    await cargado();
    await elegirModo('Mes');
    await cargado();
    const tabla = (await screen.findAllByRole('table'))[0];
    const celdas = within(within(tabla).getAllByRole('row')[0]).getAllByRole('columnheader');
    // La columna 10 del mes: su inicial tiene que ser una letra de verdad.
    expect(celdas[10]).toHaveTextContent(/^[LMJVSD]/);
  });
});

describe('las flechas se mueven en la unidad del modo', () => {
  it('en MES avanzan un mes, no siete días', async () => {
    montar();
    await cargado();
    const usuario = await elegirModo('Mes');
    await cargado();
    await usuario.click(screen.getByRole('button', { name: /siguiente/i }));
    await cargado();
    // La flecha salta un mes entero, y el rango que se pide sigue siendo de semanas completas: el
    // lunes anterior al día 1 del mes siguiente, no el día 1.
    const primeroSiguiente = `${sumarDias(ULTIMO_DEL_MES, 1).slice(0, 7)}-01`;
    expect(rangoPedido().desde).toBe(lunesDeLaSemana(primeroSiguiente));
  });
});

describe('lo que dice la pantalla deja de hablar de la semana', () => {
  it('el tope de 42 horas SEMANALES no se le aplica a un mes', async () => {
    // EL DEFECTO QUE MÁS IMPORTA. Un mes son 30 jornadas: cualquiera pasa de 42 h. Dejar la alarma
    // encendida pintaría de ámbar a la empresa entera diciendo algo falso.
    montar();
    await cargado();
    await elegirModo('Mes');
    await cargado();
    expect(screen.queryByText(/pasa de 42 h/i)).toBeNull();
    expect(screen.queryByText(/pasan de 42 h/i)).toBeNull();
  });

  it('pero SÍ cuenta cuántas SEMANAS pasan del tope, también en el mes', async () => {
    // LA PREGUNTA CORRECTA ES OTRA. «Cuántas personas pasan de 42 en el mes» es falsa por
    // construcción: treinta jornadas siempre pasan. «Cuántas semanas-persona pasan de 42» sí es
    // cierta, y es la que el dueño necesita para saber dónde mirar. Antes no se podía calcular
    // porque no existía el total por semana; ahora sí.
    //
    // El fixture de esta prueba da 7 h por día a cada persona, o sea 49 h por semana completa: todas
    // las semanas enteras del mes pasan del tope.
    montar();
    await cargado();
    await elegirModo('Mes');
    await cargado();
    expect(await screen.findByText(/semanas? por encima de 42 h/i)).toBeInTheDocument();
  });

  it('el encabezado nombra el mes, no un rango de semana', async () => {
    // EL RÓTULO YA NO ES UN ENCABEZADO: desde que la cabecera se igualó a la maqueta es el BOTÓN que
    // va entre las dos flechas, y que además lleva a hoy. Lo que la prueba afirma no cambia —que al
    // pasar a mes el período se nombra como un mes—, cambia dónde se lee.
    montar();
    await cargado();
    await elegirModo('Mes');
    expect(await screen.findByRole('button', { name: vistaDelCalendario('MES', HOY).rotulo }))
      .toBeInTheDocument();
  });

  it('y las flechas tampoco dicen «semana» cuando se está viendo un mes', async () => {
    montar();
    await cargado();
    await elegirModo('Mes');
    await cargado();
    expect(screen.getByRole('button', { name: /mes anterior/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /semana anterior/i })).toBeNull();
  });
});
