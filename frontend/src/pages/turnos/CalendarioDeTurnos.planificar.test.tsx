import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CalendarioDeTurnos from './CalendarioDeTurnos';
import { hoyEnBogota, lunesDeLaSemana, diasDeLaSemana, sumarDias } from './semana';

// PINTAR UN TURNO DESDE EL CALENDARIO (21 de septiembre de 2026).
//
// El planificador ya existía por API: lo que falta es la mano. La interacción es clic en la celda,
// elegir un turno del catálogo, y listo. Un clic y no dos: elegir ES la acción.
//
// Se descartó la «brocha» (elegir un turno arriba y luego ir pintando celdas) porque obliga a
// recordar qué llevas seleccionado, y un despiste pinta el día de la persona equivocada. Lo que se
// pinta cambia lo que un día EXIGE, y de ahí salen la tardanza y las horas extra.
//
// POR QUÉ NO HAY RELOJ FALSO AQUÍ, que fue el primer intento y hubo que deshacerlo: `vi.useFakeTimers`
// congela el reloj del que dependen los `findBy*` para sondear, y las nueve pruebas se colgaban
// cinco segundos cada una. Nueve tiempos agotados parecen un rojo y no lo son: no dicen nada del
// componente.
//
// La salida fue partir el problema. QUÉ día se puede pintar es una decisión pura (`sePuedePintar`)
// y se prueba exhaustivamente en `semana.test.ts`, sin reloj. Aquí solo se comprueba que el
// componente la APLICA, y para eso se usa el DOMINGO de la semana en curso, que es hoy o futuro
// cualquier día que se corra la suite.

const { get, put, del } = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), del: vi.fn() }));
vi.mock('../../lib/api', () => ({
  default: {
    get: (...a: unknown[]) => get(...a),
    put: (...a: unknown[]) => put(...a),
    delete: (...a: unknown[]) => del(...a),
    post: vi.fn(),
  },
}));

// La semana que el componente va a pedir: la de hoy. Las fechas se derivan con los MISMOS helpers
// que usa la pantalla, así que la prueba no puede desalinearse del componente al pasar el tiempo.
const HOY = hoyEnBogota();
const LUNES = lunesDeLaSemana(HOY);
const DIAS = diasDeLaSemana(LUNES);
const DOMINGO = DIAS[6];
const numeroDe = (fecha: string) => Number(fecha.slice(8, 10));

// OJO CON ESTE FIXTURE: `montar` recibe `unknown[]` a propósito (así se puede probar que un payload
// viejo al que le falta un campo no tumba la pantalla), y el precio es que NADIE lo tipa. Cuando la
// respuesta gana un campo, hay que agregarlo aquí a mano o las pruebas siguen verdes ejercitando un
// día que no existe (CLAUDE.md §9.2). Ya pasó: `horarioNombre` y `decision` se agregaron a la
// respuesta y este fixture se quedó sin ellos hasta el 22 de septiembre de 2026.
const diaDe = (fecha: string, extra: Record<string, unknown> = {}) => ({
  fecha, estado: 'TRABAJA', horaEntrada: '10:00', horaSalida: '16:00',
  minutosEsperados: 300, esFestivo: false, origen: 'AUTO', turno: null,
  horarioNombre: null, decision: null,
  // Las reglas del día, que el panel de la celda muestra.
  toleranciaMin: 10, toleranciaSalidaMin: 0, ajustaEntrada: false,
  almuerzoMin: 60, almuerzoInicio: '12:00', almuerzoFin: '13:00', descansos: [],
  ...extra,
});

const FILA = {
  id: 'c1', nombre: 'Julián', apellido: 'Torres', cargo: 'Guarda',
  descanso: { tipo: 'PRESUMIDO', dia: null },
  minutosEsperados: 2100, descansosConTurno: 0,
  descansoHabitual: { porMes: {}, mes: HOY.slice(0, 7), trabajados: 0, clase: 'NINGUNO' },
  dias: DIAS.map(f => diaDe(f)),
};

const CATALOGO = [
  { id: 'p1', nombre: 'Mañana', color: 'esmeralda', esDescanso: false, horaEntrada: '06:00', horaSalida: '14:00' },
  { id: 'p2', nombre: 'Noche', color: 'cobalto', esDescanso: false, horaEntrada: '22:00', horaSalida: '06:00' },
  { id: 'p3', nombre: 'Libre', color: 'grafito', esDescanso: true, horaEntrada: null, horaSalida: null },
];

const montar = (filas: unknown[] = [FILA]) => {
  get.mockImplementation((url: string) => {
    if (url === '/turnos/calendario') {
      return Promise.resolve({ data: { desde: LUNES, hasta: DOMINGO, horasSemanales: 42, filas } });
    }
    if (url === '/plantillas-turno') return Promise.resolve({ data: CATALOGO });
    return Promise.reject(new Error('url inesperada: ' + url));
  });
  return render(<CalendarioDeTurnos />);
};

const celdaDelDomingo = () =>
  screen.findByRole('button', { name: new RegExp(`Julián Torres.*día ${numeroDe(DOMINGO)}`) });

beforeEach(() => { put.mockReset(); del.mockReset(); });

describe('qué se puede tocar', () => {
  it('un día que todavía no pasó se ofrece como botón', async () => {
    montar();
    expect(await celdaDelDomingo()).toBeInTheDocument();
  });

  it('un día YA PASADO no se ofrece: el backend lo rechazaría igual', async () => {
    // Se fabrica un día de ayer dentro de la respuesta. Aunque la pantalla pida la semana de hoy,
    // lo que se pinta son los días que vienen en los datos, así que la regla tiene que aplicarse
    // fila a fila y no por el rango pedido.
    const ayer = sumarDias(HOY, -1);
    montar([{ ...FILA, dias: [diaDe(ayer), ...FILA.dias] }]);
    await celdaDelDomingo();
    expect(screen.queryByRole('button', { name: new RegExp(`Julián Torres.*día ${numeroDe(ayer)}$`) }))
      .not.toBeInTheDocument();
  });
});

describe('pintar', () => {
  it('al tocar una celda se ofrece el catálogo', async () => {
    const usuario = userEvent.setup();
    montar();
    await usuario.click(await celdaDelDomingo());

    const dialogo = await screen.findByRole('dialog');
    expect(within(dialogo).getByRole('button', { name: /Mañana/ })).toBeInTheDocument();
    expect(within(dialogo).getByRole('button', { name: /Noche/ })).toBeInTheDocument();
    expect(within(dialogo).getByRole('button', { name: /Libre/ })).toBeInTheDocument();
  });

  it('elegir un turno lo pinta, sin pedir confirmación', async () => {
    const usuario = userEvent.setup();
    put.mockResolvedValue({ data: { ok: true } });
    montar();
    await usuario.click(await celdaDelDomingo());
    await usuario.click(within(await screen.findByRole('dialog')).getByRole('button', { name: /Noche/ }));

    expect(put).toHaveBeenCalledWith('/turnos/dia', {
      colaboradorId: 'c1', fecha: DOMINGO, plantillaId: 'p2',
    });
  });

  it('si el backend se niega, el motivo se muestra y el modal no se va', async () => {
    // El caso real: la persona ya empezó su jornada de hoy. El administrador tiene que leer por qué.
    const usuario = userEvent.setup();
    put.mockRejectedValue({ response: { data: { error: 'Esa persona ya empezó su jornada de hoy.' } } });
    montar();
    await usuario.click(await celdaDelDomingo());
    await usuario.click(within(await screen.findByRole('dialog')).getByRole('button', { name: /Mañana/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/ya empezó su jornada/i);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

describe('quitar lo pintado', () => {
  const conPintura = () => ({
    ...FILA,
    dias: FILA.dias.map(d => (d.fecha === DOMINGO
      ? { ...d, origen: 'MANUAL', turno: { nombre: 'Noche', color: 'cobalto' } }
      : d)),
  });

  it('un día pintado ofrece quitarlo', async () => {
    const usuario = userEvent.setup();
    montar([conPintura()]);
    await usuario.click(await celdaDelDomingo());
    expect(within(await screen.findByRole('dialog')).getByRole('button', { name: /quitar/i })).toBeInTheDocument();
  });

  it('un día SIN pintar no ofrece quitar nada', async () => {
    // Ofrecerlo sugeriría que hay algo que deshacer, y el backend respondería «ese día no tiene
    // ningún turno pintado».
    const usuario = userEvent.setup();
    montar();
    await usuario.click(await celdaDelDomingo());
    const dialogo = await screen.findByRole('dialog');
    expect(within(dialogo).queryByRole('button', { name: /quitar/i })).not.toBeInTheDocument();
  });

  it('quitar llama al borrado con la persona y la fecha', async () => {
    const usuario = userEvent.setup();
    del.mockResolvedValue({ data: { ok: true } });
    montar([conPintura()]);
    await usuario.click(await celdaDelDomingo());
    await usuario.click(within(await screen.findByRole('dialog')).getByRole('button', { name: /quitar/i }));

    expect(del).toHaveBeenCalledWith('/turnos/dia', {
      params: { colaboradorId: 'c1', fecha: DOMINGO },
    });
  });
});

describe('un día sin turno asignado no puede aparentar que lo tiene', () => {
  // La celda deducía «Mañana», «Tarde» o «Noche» de las horas del día. Como descripción era cierta,
  // pero se LEÍA como un turno asignado: el dueño vio un sábado y un domingo en verde diciendo
  // «Mañana» y preguntó quién se los había puesto. Nadie. Salían del horario.
  //
  // Un día que nadie pintó tiene horas (el horario las exige) pero NO tiene turno. La celda tiene
  // que decir esas dos cosas a la vez, y en gris, que es como se lee «esto está pendiente».

  const celdaDe = async (numero: number) =>
    screen.findByRole('button', { name: new RegExp(`Julián Torres.*día ${numero}`) });

  it('dice que está sin asignar y NO se inventa un nombre de turno', async () => {
    montar();
    const celda = await celdaDe(numeroDe(DOMINGO));
    expect(celda).toHaveTextContent(/sin asignar/i);
    expect(celda).not.toHaveTextContent(/Mañana|Tarde|Noche/);
  });

  it('pero conserva las horas: el horario sigue exigiéndolas', async () => {
    // Sin asignar no es lo mismo que sin obligación. Si se borraran las horas, la celda diría que
    // ese día no hay nada que cumplir, y sí lo hay.
    montar();
    expect(await celdaDe(numeroDe(DOMINGO))).toHaveTextContent('10:00–16:00');
  });

  it('un día PINTADO sí muestra el nombre que le puso una persona', async () => {
    // El contraste es el punto: lo que tiene nombre es lo que alguien eligió.
    const conPintura = {
      ...FILA,
      dias: FILA.dias.map(d => (d.fecha === DOMINGO
        ? { ...d, origen: 'MANUAL', turno: { nombre: 'Portería A', color: 'rubi' } }
        : d)),
    };
    montar([conPintura]);
    const celda = await celdaDe(numeroDe(DOMINGO));
    expect(celda).toHaveTextContent('Portería A');
    expect(celda).not.toHaveTextContent(/sin asignar/i);
  });
});

describe('un día que el horario programa SÍ está asignado', () => {
  // EL ARREGLO ANTERIOR TAPÓ LA MENTIRA CON OTRA (21 de septiembre de 2026).
  //
  // Se quitó el nombre deducido de las horas, y la celda pasó a decir «Sin asignar» para todo lo
  // que no estuviera pintado con el catálogo. Pero un día que el horario programa está asignado:
  // tiene horas, tiene tolerancia y exige presencia. El dueño abrió la semana y vio a su equipo
  // entero «sin asignar» teniendo todos su horario puesto.
  //
  // «Sin asignar» queda solo para el día que de verdad no tiene ni turno ni horario.

  const celdaDe = async (numero: number) =>
    screen.findByRole('button', { name: new RegExp(`Julián Torres.*día ${numero}`) });

  it('muestra el nombre del horario, no «sin asignar»', async () => {
    montar([{ ...FILA, dias: FILA.dias.map(d => ({ ...d, horarioNombre: 'Jornada demo' })) }]);
    const celda = await celdaDe(numeroDe(DOMINGO));
    expect(celda).toHaveTextContent('Jornada demo');
    expect(celda).not.toHaveTextContent(/sin asignar/i);
  });

  it('y conserva las horas, que es lo que ese horario exige', async () => {
    montar([{ ...FILA, dias: FILA.dias.map(d => ({ ...d, horarioNombre: 'Jornada demo' })) }]);
    expect(await celdaDe(numeroDe(DOMINGO))).toHaveTextContent('10:00–16:00');
  });

  it('un turno pintado le gana al nombre del horario', async () => {
    // La precedencia, vista desde la pantalla: lo que alguien ELIGIÓ manda sobre lo que la regla
    // impone. Si se invirtiera, pintar un turno no se vería.
    montar([{
      ...FILA,
      dias: FILA.dias.map(d => (d.fecha === DOMINGO
        ? { ...d, origen: 'MANUAL', horarioNombre: 'Jornada demo', turno: { nombre: 'Portería A', color: 'rubi' } }
        : { ...d, horarioNombre: 'Jornada demo' })),
    }]);
    const celda = await celdaDe(numeroDe(DOMINGO));
    expect(celda).toHaveTextContent('Portería A');
    expect(celda).not.toHaveTextContent('Jornada demo');
  });

  it('sin turno y sin horario sigue diciendo «sin asignar»', async () => {
    // El caso que queda: un día congelado como programado cuya persona ya no tiene horario.
    montar([{ ...FILA, dias: FILA.dias.map(d => ({ ...d, horarioNombre: null })) }]);
    expect(await celdaDe(numeroDe(DOMINGO))).toHaveTextContent(/sin asignar/i);
  });
});
