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
  // ninguna, se dice la sede que se le atribuye, con la etiqueta.
  it('sin ninguna sede probada, dice la sede por defecto con esa etiqueta', async () => {
    montar(jornada({ sedeDeEntrada: null, salidaAlDescansoEn: null, sedes: { abrio: null, cerro: null, abrioAtribuida: PRINCIPAL } }));
    expect(await screen.findByText('Sede principal (por defecto)')).toBeInTheDocument();
    expect(screen.queryByText(/Abrió en|Cerró en/)).toBeNull();
  });

  it('si la sede por defecto está desactivada, también lo dice', async () => {
    montar(jornada({ sedeDeEntrada: null, salidaAlDescansoEn: null, sedes: { abrio: null, cerro: null, abrioAtribuida: { ...LAURELES, activa: false } } }));
    expect(await screen.findByText('Laureles (por defecto) (desactivada)')).toBeInTheDocument();
  });

  it('con una sede probada no se mezcla la por defecto: «Cerró en» es solo lo probado', async () => {
    montar(jornada({ sedeDeEntrada: null, salidaAlDescansoEn: null, sedes: { abrio: null, cerro: LAURELES, abrioAtribuida: POBLADO } }));
    expect(await screen.findByText('Cerró en Laureles')).toBeInTheDocument();
    expect(screen.queryByText(/por defecto/)).toBeNull();
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

describe('la sede por defecto junto al descanso no remunerado', () => {
  it('una jornada sin sede probada y con descanso muestra la sede por defecto y el bloque del descanso', async () => {
    const descanso = resumen({ estado: 'MARCADO', salida: bog(9), regreso: bog(9, 15), minutos: 15 });
    montar({ ...jornada({ sedeDeEntrada: null, salidaAlDescansoEn: null, sedes: { abrio: null, cerro: null, abrioAtribuida: PRINCIPAL } }), descansos: [descanso] });
    expect(await screen.findByText('Sede principal (por defecto)')).toBeInTheDocument();
    expect(screen.getByText('Descanso no remunerado de este día')).toBeInTheDocument();
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

  it('con dos descansos pinta un bloque por cada uno con su horario en el título', async () => {
    montar({ ...jornada({ salidaAlDescansoEn: null }), descansos: CARLA });
    expect(await screen.findByText('Descanso de 09:00 a 09:15')).toBeInTheDocument();
    expect(screen.getByText('Descanso de 15:00 a 15:10')).toBeInTheDocument();
    expect(screen.queryByText('Descanso no remunerado de este día')).toBeNull();
    // En la tira de arriba, un solo dato para los dos: cuántos marcó y cuánto costaron.
    const tira = screen.getByText('Descansos', { selector: 'p' }).parentElement!;
    expect(within(tira).getByText('2 de 2 marcados')).toBeInTheDocument();
    expect(within(tira).getByText('se descontó 15 min')).toBeInTheDocument();
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
  // 2026). El bloque dice que fue fuera de su hora y lo que se descontó.
  it('Carla: el bloque de un descanso que salió fuera de su ventana dice que fue fuera de su hora, con lo que se descontó', async () => {
    montar({ ...jornada({ salidaAlDescansoEn: null }), descansos: CARLA });
    const manana = (await screen.findByText('Descanso de 09:00 a 09:15')).parentElement!;
    expect(within(manana).getByText('fuera de su hora')).toBeInTheDocument();
    expect(within(manana).getByText('se descontó 15 min')).toBeInTheDocument();
    const tarde = screen.getByText('Descanso de 15:00 a 15:10').parentElement!;
    expect(within(tarde).getByText('fuera de su hora')).toBeInTheDocument();
    expect(within(tarde).getByText('no se le descontó nada')).toBeInTheDocument();
    expect(within(tarde).getByText('se tomó 5 min de más')).toBeInTheDocument();
    expect(screen.queryByText('dentro de su hora')).toBeNull();
  });

  it('el que salió dentro de su ventana sigue diciendo «dentro de su hora»', async () => {
    const aTiempo = resumen({ estado: 'MARCADO', salida: bog(9, 2), regreso: bog(9, 14), minutos: 12 });
    montar({ ...jornada({ salidaAlDescansoEn: null }), descansos: [aTiempo] });
    const bloque = (await screen.findByText('Descanso no remunerado de este día')).parentElement!;
    expect(within(bloque).getByText('dentro de su hora')).toBeInTheDocument();
    expect(within(bloque).queryByText('fuera de su hora')).toBeNull();
  });
});

// LO QUE EL HORARIO PEDÍA ESE DÍA, con sus descansos (12 de septiembre de 2026). El servidor
// ya manda la lista del día en `dia.descansos`; sin mostrarla, la sección decía la entrada y
// la salida de un día que exigía menos minutos, sin decir por qué.
describe('lo que el horario pedía ese día', () => {
  const DIA: NonNullable<Jornada['dia']> = {
    programado: true, horaEntrada: '07:00', horaSalida: '16:00', toleranciaMin: 10, toleranciaSalidaMin: 0, ajustaEntrada: false,
    almuerzoMin: 0, almuerzoInicio: '12:00', almuerzoFin: '13:00', minutosEsperados: 455, congelado: true,
  };
  const seccion = async () => (await screen.findByText('Lo que el horario pedía ese día')).parentElement!;

  it('dice los descansos del día, cada uno con su horario y en su orden', async () => {
    montar({ ...jornada({ salidaAlDescansoEn: null }), dia: { ...DIA, descansos: [{ inicio: '09:00', fin: '09:15' }, { inicio: '15:00', fin: '15:10' }] } });
    expect(within(await seccion()).getByText('Descansos no remunerados: 09:00 a 09:15 · 15:00 a 15:10')).toBeInTheDocument();
  });

  it('con uno solo lo dice en singular', async () => {
    montar({ ...jornada({ salidaAlDescansoEn: null }), dia: { ...DIA, descansos: [{ inicio: '10:00', fin: '10:15' }] } });
    expect(within(await seccion()).getByText('Descanso no remunerado: 10:00 a 10:15')).toBeInTheDocument();
  });

  it('sin descansos ese día no dice nada de descansos', async () => {
    montar({ ...jornada({ salidaAlDescansoEn: null }), dia: { ...DIA, descansos: [] } });
    const s = await seccion();
    expect(within(s).getByText(/Entrada 07:00/)).toBeInTheDocument();
    expect(within(s).queryByText(/[Dd]escanso/)).toBeNull();
  });

  it('un servidor que no manda `dia.descansos` no tumba la sección', async () => {
    montar({ ...jornada({ salidaAlDescansoEn: null }), dia: DIA });
    const s = await seccion();
    expect(within(s).getByText(/Entrada 07:00/)).toBeInTheDocument();
    expect(within(s).queryByText(/[Dd]escanso/)).toBeNull();
  });
});
