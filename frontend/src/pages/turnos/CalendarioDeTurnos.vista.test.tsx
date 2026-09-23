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

const diaDe = (fecha: string) => ({
  fecha, estado: 'TRABAJA', horaEntrada: '08:00', horaSalida: '16:00',
  minutosEsperados: 420, esFestivo: false, origen: 'AUTO', turno: null,
  horarioNombre: 'Jornada demo', decision: null,
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

const columnas = async () => {
  const tabla = (await screen.findAllByRole('table'))[0];
  const encabezado = within(tabla).getAllByRole('row')[0];
  // Menos «Persona» al principio y «Total» al final.
  return within(encabezado).getAllByRole('columnheader').length - 2;
};

beforeEach(() => { get.mockReset(); put.mockReset(); del.mockReset(); });

describe('qué rango le pide al servidor cada modo', () => {
  it('arranca en SEMANA y pide los siete días', async () => {
    montar();
    await cargado();
    expect(rangoPedido()).toEqual({ desde: LUNES, hasta: sumarDias(LUNES, 6) });
  });

  it('en MES pide el mes entero, del 1 al último', async () => {
    montar();
    await cargado();
    await elegirModo('Mes');
    await cargado();
    expect(rangoPedido()).toEqual({ desde: PRIMERO_DEL_MES, hasta: ULTIMO_DEL_MES });
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
  it('en MES hay una columna por día del mes', async () => {
    montar();
    await cargado();
    await elegirModo('Mes');
    await cargado();
    expect(await columnas()).toBe(DIAS_DEL_MES);
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
    const siguiente = sumarDias(ULTIMO_DEL_MES, 1);
    expect(rangoPedido().desde).toBe(`${siguiente.slice(0, 7)}-01`);
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

  it('el encabezado nombra el mes, no un rango de semana', async () => {
    montar();
    await cargado();
    await elegirModo('Mes');
    expect(await screen.findByRole('heading', { name: vistaDelCalendario('MES', HOY).rotulo }))
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
