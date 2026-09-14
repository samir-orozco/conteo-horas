import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';

vi.mock('../../lib/api', () => ({ default: { get: vi.fn(), put: vi.fn(), delete: vi.fn() } }));
import api from '../../lib/api';
import ModalJornada, { type Jornada, type ResumenDePausa } from './ModalJornada';

const get = api.get as unknown as ReturnType<typeof vi.fn>;
const bog = (h: number, m = 0) => new Date(Date.UTC(2026, 8, 10, h + 5, m)).toISOString();
const POBLADO = { id: 's1', nombre: 'El Poblado', activa: true };
const LAURELES = { id: 's2', nombre: 'Laureles', activa: true };
const PRINCIPAL = { id: 's0', nombre: 'Sede principal', activa: true };

// La PRIMERA marcación de una jornada con almuerzo, que es la que abre la fila de
// la tabla: su salida es la del almuerzo, no la del día.
function jornada(p: { salidaAlDescansoEn: typeof POBLADO | null; sedes?: Jornada['sedes']; sedeDeEntrada?: typeof POBLADO | null }): Jornada {
  return {
    registro: {
      id: 'a', colaboradorId: 'c1', fecha: bog(0), entrada: bog(8), salida: bog(12),
      tipo: 'NORMAL', observacion: null, salidaEstimada: false, salidaAlmuerzo: true, entradaEstimada: false,
      creadoEn: bog(8), editadoPor: null, editadoEn: null,
      sede: p.sedeDeEntrada === undefined ? POBLADO : p.sedeDeEntrada, sedeSalida: p.salidaAlDescansoEn,
      tieneFotoEntrada: false, tieneFotoSalida: false,
    },
    colaborador: { nombre: 'Julián', apellido: 'Restrepo', cargo: null },
    fecha: bog(0),
    dia: null,
    tramos: [],
    almuerzo: {
      estado: 'SIN_VENTANA', ventana: null, salida: null, regreso: null, minutos: null, minutosVentana: null,
      minutosDescontados: 0, regresoEstimado: false, seExcedio: false, minutosDeMas: 0,
    },
    minutosDelDia: 0, minutosTarde: null, motivoSinTardanza: 'NO_PROGRAMADO', festivo: null, novedad: null,
    ...(p.sedes !== undefined ? { sedes: p.sedes } : {}),
  };
}

function montar(j: Jornada) {
  get.mockImplementation((url: string) => Promise.resolve(
    url.endsWith('/jornada') ? { data: j } : { data: { fecha: bog(0), fotos: [] } },
  ));
  render(<ModalJornada registroId="a" onCerrar={vi.fn()} onEditar={vi.fn()} onEliminar={vi.fn()} onVerMarcacion={vi.fn()} />);
}

// Las pausas del día van juntas en un recuadro, una fila por pausa (13 de septiembre de 2026).
const pausas = () => screen.getByRole('region', { name: 'Pausas de este día' });

// Con llaves a propósito: lo que DEVUELVE un beforeEach, Vitest lo toma como
// limpieza y lo llama al terminar la prueba. `mockReset` devuelve el propio mock,
// así que sin llaves se llamaba `get()` sin URL después de cada prueba.
beforeEach(() => { get.mockReset(); });

describe('las sedes en el detalle de la jornada', () => {
  it('dice dónde cerró la JORNADA, no dónde salió a almorzar', async () => {
    // Un supervisor con el permiso: entró en El Poblado, salió a almorzar en
    // Laureles y cerró otra vez en El Poblado. La tabla dice «El Poblado».
    montar(jornada({ salidaAlDescansoEn: LAURELES, sedes: { abrio: POBLADO, cerro: POBLADO } }));
    expect(await screen.findByText('El Poblado')).toBeInTheDocument();
    expect(screen.queryByText(/Cerró en/)).toBeNull();
    expect(screen.queryByText(/Laureles/)).toBeNull();
  });

  it('si la jornada abrió en una sede y cerró en otra lo dice, aunque almorzara en la de apertura', async () => {
    montar(jornada({ salidaAlDescansoEn: POBLADO, sedes: { abrio: POBLADO, cerro: LAURELES } }));
    expect(await screen.findByText('Abrió en El Poblado')).toBeInTheDocument();
    expect(screen.getByText('Cerró en Laureles')).toBeInTheDocument();
  });

  it('con un servidor anterior, que no manda las sedes de la jornada, solo dice dónde abrió', async () => {
    montar(jornada({ salidaAlDescansoEn: null }));
    expect(await screen.findByText('El Poblado')).toBeInTheDocument();
    expect(screen.queryByText(/Cerró en/)).toBeNull();
  });

  // Decisión del dueño del 12 de septiembre de 2026, «mostrarla al leer»: «Abrió en»
  // y «Cerró en» siguen siendo solo de sedes que probó la ubicación. Si no hay
  // ninguna, se dice la sede que se le atribuye. Desde el 13 de septiembre, solo con su
  // nombre: el dueño pidió quitar «por defecto».
  it('sin ninguna sede probada, dice el nombre de la sede atribuida, sin «por defecto»', async () => {
    montar(jornada({ sedeDeEntrada: null, salidaAlDescansoEn: null, sedes: { abrio: null, cerro: null, abrioAtribuida: PRINCIPAL } }));
    expect(await screen.findByText('Sede principal')).toBeInTheDocument();
    expect(screen.queryByText(/por defecto/)).toBeNull();
    expect(screen.queryByText(/Abrió en|Cerró en/)).toBeNull();
  });

  it('si la sede atribuida está desactivada, también lo dice', async () => {
    montar(jornada({ sedeDeEntrada: null, salidaAlDescansoEn: null, sedes: { abrio: null, cerro: null, abrioAtribuida: { ...LAURELES, activa: false } } }));
    expect(await screen.findByText('Laureles (desactivada)')).toBeInTheDocument();
  });

  it('con una sede probada no se mezcla la atribuida: «Cerró en» es solo lo probado', async () => {
    montar(jornada({ sedeDeEntrada: null, salidaAlDescansoEn: null, sedes: { abrio: null, cerro: LAURELES, abrioAtribuida: POBLADO } }));
    expect(await screen.findByText('Cerró en Laureles')).toBeInTheDocument();
    expect(screen.queryByText(/El Poblado/)).toBeNull();
  });
});

// Unión con el descanso no remunerado (12 de septiembre de 2026): el tipo de la
// jornada chocó entre `sedes.abrioAtribuida` y el resumen del descanso. Las dos cosas
// tienen que llegar a la pantalla a la vez. Desde los varios descansos por día, el
// resumen llega en `descansos`, una lista.
const resumen = (p: Partial<ResumenDePausa>): ResumenDePausa => ({
  estado: 'NO_MARCADO', ventana: { inicio: '09:00', fin: '09:15' }, salida: null, regreso: null,
  minutos: null, minutosVentana: 15, minutosDescontados: 0, regresoEstimado: false, seExcedio: false, minutosDeMas: 0,
  ...p,
});

describe('la sede atribuida junto al descanso no remunerado', () => {
  it('una jornada sin sede probada y con descanso muestra el nombre de la sede atribuida y la fila del descanso', async () => {
    const descanso = resumen({ estado: 'MARCADO', salida: bog(9), regreso: bog(9, 15), minutos: 15 });
    montar({ ...jornada({ sedeDeEntrada: null, salidaAlDescansoEn: null, sedes: { abrio: null, cerro: null, abrioAtribuida: PRINCIPAL } }), descansos: [descanso] });
    expect(await screen.findByText('Sede principal')).toBeInTheDocument();
    expect(within(pausas()).getByRole('group', { name: 'Descanso' })).toBeInTheDocument();
  });
});

// VARIOS DESCANSOS POR DÍA (decisión del dueño del 12 de septiembre de 2026). Carla salió
// a las 10:00 y el kiosco la anotó en el de 15:00 a 15:10; su salida de las 15:00 quedó
// en el de 09:00 a 09:15, que se le descontó entero.
describe('los descansos no remunerados en el detalle', () => {
  const CARLA: ResumenDePausa[] = [
    resumen({ estado: 'MARCADO', salida: bog(15), regreso: bog(15, 10), minutos: 10, minutosDescontados: 15 }),
    resumen({
      estado: 'MARCADO', ventana: { inicio: '15:00', fin: '15:10' }, minutosVentana: 10,
      salida: bog(10), regreso: bog(10, 15), minutos: 15, seExcedio: true, minutosDeMas: 5,
    }),
  ];

  it('con dos descansos pinta una fila por cada uno con su horario', async () => {
    montar({ ...jornada({ salidaAlDescansoEn: null }), descansos: CARLA });
    const recuadro = await screen.findByRole('region', { name: 'Pausas de este día' });
    expect(within(recuadro).getByRole('group', { name: 'Descanso 1' })).toHaveTextContent('su horario 09:00 a 09:15');
    expect(within(recuadro).getByRole('group', { name: 'Descanso 2' })).toHaveTextContent('su horario 15:00 a 15:10');
    // En la tarjeta de arriba, un solo dato para los dos: cuántos marcó y cuánto costaron.
    const tarjeta = screen.getByText('Descansos', { selector: 'p' }).parentElement!;
    expect(within(tarjeta).getByText('2 de 2 marcados')).toBeInTheDocument();
    expect(within(tarjeta).getByText('se descontó 15 min')).toBeInTheDocument();
  });

  it('cada descanso avisa por su cuenta: el que no volvió se dice aunque el otro esté marcado', async () => {
    const noVolvio = resumen({ estado: 'ABIERTO', ventana: { inicio: '15:00', fin: '15:10' }, minutosVentana: 10, salida: bog(15) });
    montar({ ...jornada({ salidaAlDescansoEn: null }), descansos: [CARLA[0], noVolvio] });
    expect(await screen.findByText(/nunca volvió a marcar/)).toBeInTheDocument();
  });

  it('un servidor sin `descansos` no tumba el detalle', async () => {
    montar(jornada({ salidaAlDescansoEn: null }));
    expect(await screen.findByText('Contado ese día')).toBeInTheDocument();
    expect(screen.queryByText(/^Descanso/)).toBeNull();
  });

  // Carla salió a las 15:00 y esa salida quedó en el de 09:00 a 09:15. Se tomó 10 minutos de
  // una ventana de 15, y el bloque decía «dentro de su hora», en verde, con «se descontó 15
  // min» debajo: como si lo hubiera tomado bien y aun así se le cobrara (12 de septiembre de
  // 2026). La fila dice que fue fuera de su hora y lo que se descontó.
  it('Carla: la fila de un descanso que salió fuera de su ventana dice que fue fuera de su hora, con lo que se descontó', async () => {
    montar({ ...jornada({ salidaAlDescansoEn: null }), descansos: CARLA });
    const manana = within(await screen.findByRole('region', { name: 'Pausas de este día' })).getByRole('group', { name: 'Descanso 1' });
    expect(within(manana).getByText('Fuera de su hora')).toBeInTheDocument();
    expect(within(manana).getByText('se descontó 15 min')).toBeInTheDocument();
    const tarde = within(pausas()).getByRole('group', { name: 'Descanso 2' });
    expect(within(tarde).getByText('Fuera de su hora')).toBeInTheDocument();
    expect(within(tarde).getByText('no se le descontó nada')).toBeInTheDocument();
    expect(within(tarde).getByText('se tomó 5 min de más')).toBeInTheDocument();
    expect(screen.queryByText('Dentro de su hora')).toBeNull();
  });

  it('el que salió dentro de su ventana sigue diciendo «Dentro de su hora»', async () => {
    const aTiempo = resumen({ estado: 'MARCADO', salida: bog(9, 2), regreso: bog(9, 14), minutos: 12 });
    montar({ ...jornada({ salidaAlDescansoEn: null }), descansos: [aTiempo] });
    const fila = within(await screen.findByRole('region', { name: 'Pausas de este día' })).getByRole('group', { name: 'Descanso' });
    expect(within(fila).getByText('Dentro de su hora')).toBeInTheDocument();
    expect(within(fila).queryByText('Fuera de su hora')).toBeNull();
  });
});

const DIA: NonNullable<Jornada['dia']> = {
  programado: true, horaEntrada: '07:00', horaSalida: '16:00', toleranciaMin: 10, toleranciaSalidaMin: 0, ajustaEntrada: false,
  almuerzoMin: 0, almuerzoInicio: '12:00', almuerzoFin: '13:00', minutosEsperados: 455, congelado: true,
};

// LO QUE EL HORARIO PEDÍA ESE DÍA, con sus descansos (12 de septiembre de 2026). El servidor
// ya manda la lista del día en `dia.descansos`; sin mostrarla, la sección decía la entrada y
// la salida de un día que exigía menos minutos, sin decir por qué. Desde el 13 de septiembre
// cada dato va con su rótulo, y el almuerzo también.
describe('lo que el horario pedía ese día', () => {
  const seccion = () => screen.findByRole('region', { name: 'Lo que el horario pedía ese día' });

  it('dice los descansos del día, cada uno con su horario y en su orden', async () => {
    montar({ ...jornada({ salidaAlDescansoEn: null }), dia: { ...DIA, descansos: [{ inicio: '09:00', fin: '09:15' }, { inicio: '15:00', fin: '15:10' }] } });
    const s = await seccion();
    expect(within(s).getByText('Descansos no remunerados')).toBeInTheDocument();
    expect(within(s).getByText('09:00 a 09:15 · 15:00 a 15:10')).toBeInTheDocument();
  });

  it('con uno solo lo dice en singular', async () => {
    montar({ ...jornada({ salidaAlDescansoEn: null }), dia: { ...DIA, descansos: [{ inicio: '10:00', fin: '10:15' }] } });
    const s = await seccion();
    expect(within(s).getByText('Descanso no remunerado')).toBeInTheDocument();
    expect(within(s).getByText('10:00 a 10:15')).toBeInTheDocument();
  });

  it('sin descansos ese día no dice nada de descansos', async () => {
    montar({ ...jornada({ salidaAlDescansoEn: null }), dia: { ...DIA, descansos: [] } });
    const s = await seccion();
    expect(within(s).getByText('07:00 a 16:00')).toBeInTheDocument();
    expect(within(s).queryByText(/[Dd]escanso/)).toBeNull();
  });

  it('un servidor que no manda `dia.descansos` no tumba la sección', async () => {
    montar({ ...jornada({ salidaAlDescansoEn: null }), dia: DIA });
    const s = await seccion();
    expect(within(s).getByText('07:00 a 16:00')).toBeInTheDocument();
    expect(within(s).queryByText(/[Dd]escanso/)).toBeNull();
  });

  it('dice también la hora del almuerzo, que antes no aparecía', async () => {
    montar({ ...jornada({ salidaAlDescansoEn: null }), dia: DIA });
    const s = await seccion();
    expect(within(s).getByText('Almuerzo')).toBeInTheDocument();
    expect(within(s).getByText('12:00 a 13:00')).toBeInTheDocument();
  });
});

// EL DISEÑO NUEVO DEL DETALLE (13 de septiembre de 2026, aprobado por el dueño sobre una maqueta):
// los tiempos en tarjetas, las pausas en un recuadro y las marcaciones con cada hora rotulada.
type Tramo = Jornada['tramos'][number];
const tramo = (id: string, entrada: string | null, salida: string | null, p: Partial<Tramo> = {}): Tramo => ({
  id, entrada, salida, salidaAlmuerzo: false, salidaDescanso: false, entradaEstimada: false, salidaEstimada: false,
  momentoEntrada: 'ENTRADA', momentoSalida: salida ? 'SALIDA' : null, tieneFotoEntrada: false, tieneFotoSalida: false, ...p,
});
// Julián Torres el sábado 12: almorzó, salió a su descanso, volvió y no marcó la salida.
const JULIAN = [
  tramo('a', bog(7), bog(17, 20), { salidaAlmuerzo: true, momentoSalida: 'SALIDA_ALMUERZO' }),
  tramo('b', bog(17, 27), bog(17, 32), { salidaDescanso: true, momentoEntrada: 'REGRESO_ALMUERZO', momentoSalida: 'SALIDA_DESCANSO' }),
  tramo('c', bog(17, 42), null, { momentoEntrada: 'REGRESO_DESCANSO' }),
];

describe('el detalle de la jornada, con el diseño nuevo', () => {
  // Decía «Salió 17:32», que era la salida al descanso: tomaba la última marcación CON salida.
  it('si la última marcación sigue abierta, la salida del día dice «sin salida» y no la hora de una pausa', async () => {
    montar({ ...jornada({ salidaAlDescansoEn: null }), tramos: JULIAN });
    const salio = (await screen.findByText('Salió', { selector: 'p' })).parentElement!;
    expect(within(salio).getByText('sin salida')).toBeInTheDocument();
    expect(within(salio).queryByText('17:32')).toBeNull();
    expect(screen.getByText('Sin salida')).toBeInTheDocument();
  });

  it('con la jornada cerrada, la salida del día es la de la última marcación', async () => {
    const cerrada = [JULIAN[0], JULIAN[1], tramo('c', bog(17, 42), bog(18), { momentoEntrada: 'REGRESO_DESCANSO' })];
    montar({ ...jornada({ salidaAlDescansoEn: null }), tramos: cerrada });
    const salio = (await screen.findByText('Salió', { selector: 'p' })).parentElement!;
    expect(within(salio).getByText('18:00')).toBeInTheDocument();
    expect(screen.queryByText('Sin salida')).toBeNull();
  });

  it('arriba no repite etiquetas ni dice lo que solo le pasó a la primera marcación', async () => {
    montar({ ...jornada({ salidaAlDescansoEn: null }), tramos: JULIAN });
    expect(await screen.findAllByText('Sin salida')).toHaveLength(1);
    expect(screen.queryByText('Salió a almorzar')).toBeNull();
  });

  it('cada marcación dice qué fue cada una de sus horas', async () => {
    montar({ ...jornada({ salidaAlDescansoEn: null }), tramos: JULIAN });
    const lista = await screen.findByRole('region', { name: 'Las 3 marcaciones de ese día' });
    const [, segunda, tercera] = within(lista).getAllByRole('button');
    expect(within(segunda).getByText('Regreso del almuerzo')).toBeInTheDocument();
    expect(within(segunda).getByText('17:27')).toBeInTheDocument();
    expect(within(segunda).getByText('Salida al descanso')).toBeInTheDocument();
    expect(within(segunda).getByText('17:32')).toBeInTheDocument();
    expect(within(segunda).getByText('5 min')).toBeInTheDocument();
    expect(within(tercera).getByText('Regreso del descanso')).toBeInTheDocument();
    expect(within(tercera).getByText('sin salida')).toBeInTheDocument();
  });

  it('lo contado se compara con lo que pedía el horario, sin decir cuánto falta', async () => {
    montar({ ...jornada({ salidaAlDescansoEn: null }), minutosDelDia: 623, dia: { ...DIA, minutosEsperados: 640 } });
    const barra = await screen.findByRole('progressbar', { name: 'Contado frente a lo que pedía el horario' });
    expect(barra).toHaveAttribute('aria-valuenow', '97');
    expect(screen.getByText('el horario pedía 10h 40min')).toBeInTheDocument();
    expect(screen.queryByText(/falta/)).toBeNull();
  });

  it('el subtítulo va en letra normal: el día con mayúscula inicial y lo demás como se escribe', async () => {
    montar(jornada({ salidaAlDescansoEn: null }));
    expect(await screen.findByText('Julián Restrepo · Jueves 10 de septiembre de 2026')).toBeInTheDocument();
  });
});
