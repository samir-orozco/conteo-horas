import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CalendarioDeTurnos from './CalendarioDeTurnos';
import { hoyEnBogota, lunesDeLaSemana, diasDeLaSemana } from './semana';

// LA SEMANA ROTATIVA SE PROPONE, NO SE ASUME (22 de septiembre de 2026).
//
// Decidido con el dueño: un día en blanco NO se toma como descanso. El olvido de planificarlo y la
// decisión de dejarlo libre producen el mismo dato, así que asumir dejaría de pagar un recargo por
// deducción propia. Pero pedir un clic en cada semana de cada persona es fricción real, así que el
// sistema PROPONE y alguien confirma.
//
// Los cuatro estados los decide el backend (`propuestaDeDescanso`, pura y mutada). Aquí se prueba
// que la pantalla los MUESTRA distintos, y sobre todo que `SIN_DESCANSO` y `AMBIGUA` no digan lo
// mismo: las dos caen al domingo, pero una es una omisión y la otra un error ya cometido, y a quien
// planificó dos descansos decirle «no hay descanso» lo manda a buscar lo que no falta.

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
const JUEVES = DIAS[3];
const DOMINGO = DIAS[6];

// `montar` recibe `unknown[]` a propósito, así que NADIE tipa este fixture: cuando la respuesta
// gana un campo hay que agregarlo aquí a mano o las pruebas siguen verdes ejercitando un día que no
// existe (CLAUDE.md §9.2).
const diaDe = (fecha: string) => ({
  fecha, estado: 'TRABAJA', horaEntrada: '06:00', horaSalida: '14:00',
  minutosEsperados: 480, esFestivo: false, origen: 'AUTO', turno: null, horarioNombre: 'Rotativo 7x1',
  decision: null,
  // Las reglas del día, que el panel de la celda muestra.
  toleranciaMin: 10, toleranciaSalidaMin: 0, ajustaEntrada: false,
  almuerzoMin: 0, almuerzoInicio: null, almuerzoFin: null, descansos: [],
});

const FILA = {
  id: 'c1', nombre: 'Julián', apellido: 'Torres', cargo: 'Guarda',
  descanso: { tipo: 'ROTATIVO', dia: null },
  minutosEsperados: 2880, descansosConTurno: 0,
  descansoHabitual: { porMes: {}, mes: HOY.slice(0, 7), trabajados: 0, clase: 'NINGUNO' },
  dias: DIAS.map(diaDe),
  propuesta: null as unknown,
};

// El catálogo lleva un turno de descanso: es el que se pinta al confirmar.
const CATALOGO = [
  { id: 'p1', nombre: 'Mañana', color: 'esmeralda', esDescanso: false, horaEntrada: '06:00', horaSalida: '14:00' },
  { id: 'pLibre', nombre: 'Libre', color: 'grafito', esDescanso: true, horaEntrada: null, horaSalida: null },
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

describe('cuando se puede proponer', () => {
  it('ofrece el día que sobró, nombrándolo', async () => {
    montar(PROPUESTA);
    expect(await screen.findByRole('button', { name: /jueves/i })).toBeInTheDocument();
  });

  it('confirmar pinta el turno de DESCANSO del catálogo en ese día', async () => {
    // Lo que de verdad importa: que elija la plantilla con `esDescanso`, no la primera de la lista.
    // Pintar «Mañana» ahí convertiría la confirmación del descanso en un turno de trabajo.
    const usuario = userEvent.setup();
    put.mockResolvedValue({ data: { ok: true } });
    montar(PROPUESTA);
    await usuario.click(await screen.findByRole('button', { name: /jueves/i }));

    expect(put).toHaveBeenCalledWith('/turnos/dia', {
      colaboradorId: 'c1', fecha: JUEVES, plantillaId: 'pLibre',
    });
  });

  it('si el catálogo no tiene ningún turno de descanso, no ofrece un botón muerto', async () => {
    // Confirmar necesita algo que pintar. Sin turno de descanso en el catálogo, el clic fallaría
    // en el backend con un error que quien mira no podría explicar.
    montar(PROPUESTA, [CATALOGO[0]]);
    await esperarLaRejilla();
    expect(screen.queryByRole('button', { name: /jueves/i })).not.toBeInTheDocument();
    expect(screen.getByText(/turno de descanso/i)).toBeInTheDocument();
  });
});

describe('cuando no se puede proponer', () => {
  it('sin descanso deducible avisa que se está tomando el domingo', async () => {
    montar({ estado: 'SIN_DESCANSO' });
    expect(await screen.findByText(/se está tomando el domingo/i)).toBeInTheDocument();
  });

  it('y no ofrece confirmar nada', async () => {
    montar({ estado: 'SIN_DESCANSO' });
    await screen.findByText(/se está tomando el domingo/i);
    expect(screen.queryByRole('button', { name: /confirmar|jueves/i })).not.toBeInTheDocument();
  });

  it('dos descansos pintados dicen algo DISTINTO de «sin descanso»', async () => {
    // Las dos caen al domingo, pero por razones opuestas. Si el aviso fuera el mismo, quien
    // planificó dos se pondría a buscar el que no falta.
    // OJO con el patrón: el primero fue `/dos/i` y pasaba SIN implementar nada, porque encajaba con
    // el encabezado «DESCANSOS TRABAJA-DOS (MES)» de la tabla de resumen. Una prueba que pasa antes
    // de existir lo que prueba no prueba nada (CLAUDE.md §9.1).
    montar({ estado: 'AMBIGUA' });
    expect(await screen.findByText(/dos descansos/i)).toBeInTheDocument();
    expect(screen.queryByText(/se está tomando el domingo/i)).not.toBeInTheDocument();
  });
});

describe('cuando no hay nada que decir', () => {
  it('una semana ya resuelta no propone ni avisa', async () => {
    montar({ estado: 'RESUELTA', dia: 'MIERCOLES', fecha: DIAS[2] });
    await esperarLaRejilla();
    expect(screen.queryByRole('button', { name: /miércoles/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/se está tomando el domingo/i)).not.toBeInTheDocument();
  });

  it('a quien no es rotativo no se le propone nada', async () => {
    montar({ estado: 'NO_APLICA' });
    await esperarLaRejilla();
    expect(screen.queryByRole('button', { name: /jueves/i })).not.toBeInTheDocument();
  });

  it('y si el rango no era una semana, la propuesta viaja en null y no se pinta nada', async () => {
    // `null` significa «no se calculó para este rango», que es distinto de «no aplica».
    montar(null);
    await esperarLaRejilla();
    expect(screen.queryByText(/se está tomando el domingo/i)).not.toBeInTheDocument();
  });
});
