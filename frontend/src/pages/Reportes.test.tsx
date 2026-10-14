import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Reportes from './Reportes';

// LA CABECERA DEL REPORTE POR PERSONA DICE CUÁNTOS DÍAS TRABAJÓ (15 de septiembre de 2026).
//
// Decía «{registrosCont} días con marcación», y ese contador NO son días: es
// `registros.filter(r => r.salida).length` en el motor, o sea las marcaciones CERRADAS. Medido
// contra la base del dueño: 11 «días» para quien trabajó 5, porque el almuerzo le parte la jornada
// en dos, y 0 «días» para quien trabajó 2 sin marcar nunca la salida. El dinero nunca estuvo mal,
// pero quien abría ese reporte para revisar una quincena leía un número que no era el prometido.
//
// Decisión del dueño: mostrar los dos, cada uno con su nombre. Esta pantalla no tenía ninguna
// prueba, así que ese texto no lo vigilaba nadie.

vi.mock('../lib/api', () => ({ default: { get: vi.fn() } }));
// El exportador se simula para poder mirar las filas que se le pasan: el Excel de esta pantalla no
// lo cubría ninguna prueba, y borrarle la fila del auxilio no rompía nada (visto con una mutación).
vi.mock('../lib/exportar', () => ({ descargarExcelHojas: vi.fn() }));
import api from '../lib/api';
import { descargarExcelHojas } from '../lib/exportar';
const get = api.get as unknown as ReturnType<typeof vi.fn>;
const exportar = descargarExcelHojas as unknown as ReturnType<typeof vi.fn>;

const JULIAN = { id: 'c-julian', nombre: 'Julián', apellido: 'Torres' };
const SOFIA = { id: 'c-sofia', nombre: 'Sofía', apellido: 'Ramos' };

// Los dos contadores SIEMPRE distintos: si valieran lo mismo, la prueba pasaría con una columna
// puesta en el lugar de la otra.
const reporteDe = (quien: typeof JULIAN, diasCont: number | undefined, registrosCont: number) => ({
  colaborador: quien, desde: '2026-09-01', hasta: '2026-09-15',
  liquidacion: [], salarioBase: 1_750_000,
  totalRecargos: 0, totalExtra: 0, totalAdicional: 0, totalPagar: 0,
  registrosCont, diasCont, detalleRegistros: [],
  // Ya prorrateado por el servidor: 7 días de 30 sobre los 249.095 de 2026.
  auxilioTransporte: 58_122.17,
});

function montar(reporte: ReturnType<typeof reporteDe>) {
  get.mockImplementation((url: string) => {
    if (url === '/colaboradores') return Promise.resolve({ data: [JULIAN, SOFIA] });
    if (url === '/reportes/liquidacion') return Promise.resolve({ data: reporte });
    if (url === '/reportes/tardanzas') return Promise.resolve({ data: { sinHorario: true, detalle: [], totalMinutos: 0 } });
    if (url === '/permisos') return Promise.resolve({ data: [] });
    if (url === '/registros') return Promise.resolve({ data: [] });
    return Promise.reject(new Error('url inesperada: ' + url));
  });
  // Dentro de un router: la pantalla lleva a la suscripción cuando el plan no permite exportar, y
  // `useNavigate` revienta fuera de uno.
  return render(<MemoryRouter><Reportes /></MemoryRouter>);
}

// El selector no es un <select> nativo: es un botón que despliega un buscador. Se usa como lo usa
// una persona, por el texto del botón y por el nombre de quien elige.
const calcularPara = async (reporte: ReturnType<typeof reporteDe>, quien: typeof JULIAN) => {
  const usuario = userEvent.setup();
  montar(reporte);
  await usuario.click(await screen.findByRole('button', { name: /Seleccionar colaborador/ }));
  await usuario.click(await screen.findByRole('button', { name: `${quien.nombre} ${quien.apellido}` }));
  await usuario.click(screen.getByRole('button', { name: 'Calcular' }));
  return await screen.findByRole('heading', { name: `${quien.nombre} ${quien.apellido}` });
};

// El texto de la cabecera, con los espacios normalizados: Intl y el JSX meten espacios duros.
const cabecera = (titulo: HTMLElement) =>
  (titulo.parentElement?.textContent ?? '').replace(/\s+/g, ' ').trim();

// EL AUXILIO SE MUESTRA, PERO FUERA DEL TOTAL (17 de septiembre de 2026).
//
// El auxilio va en su propia línea DEBAJO del total y marcado como que se paga aparte: no es salario,
// y ponerlo encima invitaría a sumarlo mentalmente a un total que no lo incluye. El total usa el
// salario del período de pago desde el 13 de octubre de 2026 (ver el último bloque de este archivo).
describe('el auxilio de transporte en el reporte por persona', () => {
  // Con `totalAdicional` en cero, el total a pagar valdría lo mismo que el salario y la prueba no
  // podría distinguir un total que suma el auxilio de uno que no. Se le da un valor propio.
  const conAdicional = (r: ReturnType<typeof reporteDe>) => ({ ...r, totalAdicional: 200_000, totalExtra: 200_000 });

  it('se muestra como línea propia, con su valor del período', async () => {
    await calcularPara(conAdicional(reporteDe(JULIAN, 5, 11)), JULIAN);
    expect(screen.getByText(/auxilio de transporte del período/i)).toBeInTheDocument();
    // El monto del auxilio, con el espacio duro que mete Intl normalizado.
    const montos = screen.getAllByText(/58\.122/).map(e => (e.textContent ?? '').replace(/\s+/g, ' '));
    expect(montos.length).toBeGreaterThan(0);
  });

  it('el Excel lleva su fila, y el TOTAL A PAGAR de la hoja tampoco lo incluye', async () => {
    const usuario = userEvent.setup();
    await calcularPara(conAdicional(reporteDe(JULIAN, 5, 11)), JULIAN);
    await usuario.click(screen.getByRole('button', { name: /Descargar Excel/i }));

    const hojas = exportar.mock.calls[0][1] as { nombre: string; filas: (string | number)[][] }[];
    const liquidacion = hojas.find(h => h.nombre === 'Liquidación')!;
    const fila = (etiqueta: string) => liquidacion.filas.find(f => String(f[1]).includes(etiqueta));

    expect(fila('Auxilio de transporte del período')?.[5]).toBe(58_122);
    // Medio salario (es la primera quincena de septiembre) + 200.000 de adicional. Si el auxilio se colara,
    // serían 1.133.122.
    expect(fila('TOTAL A PAGAR')?.[5]).toBe(1_075_000);
  });

  it('no se suma al total a pagar: 875.000 más 200.000, sin los 58.122 del auxilio', async () => {
    await calcularPara(conAdicional(reporteDe(JULIAN, 5, 11)), JULIAN);
    const textos = screen.getAllByText(/\$/).map(e => (e.textContent ?? '').replace(/\s+/g, ' '));
    expect(textos).toContain('$ 1.075.000');
    // Lo que saldría si el auxilio se hubiera colado dentro del total.
    expect(textos).not.toContain('$ 1.133.122');
  });
});

describe('la cabecera del reporte por persona', () => {
  it('dice los días trabajados, no las marcaciones cerradas', async () => {
    // Julián: 5 días de trabajo repartidos en 11 marcaciones cerradas, porque sale a almorzar.
    const texto = cabecera(await calcularPara(reporteDe(JULIAN, 5, 11), JULIAN));
    expect(texto).toContain('5 días con marcación');
    expect(texto).toContain('11 marcaciones cerradas');
    // Lo que decía antes: el contador del motor presentado como días.
    expect(texto).not.toContain('11 días con marcación');
  });

  it('quien trabajó sin marcar la salida no aparece como si no hubiera trabajado', async () => {
    // Sofía: 2 días trabajados y ninguna jornada cerrada. Antes salía «0 días con marcación».
    const texto = cabecera(await calcularPara(reporteDe(SOFIA, 2, 0), SOFIA));
    expect(texto).toContain('2 días con marcación');
    expect(texto).toContain('0 marcaciones cerradas');
    expect(texto).not.toContain('0 días con marcación');
  });

  it('un solo día y una sola marcación van en singular', async () => {
    const texto = cabecera(await calcularPara(reporteDe(JULIAN, 1, 1), JULIAN));
    expect(texto).toContain('1 día con marcación');
    expect(texto).toContain('1 marcación cerrada');
  });

  it('con un servidor anterior, que no manda los días, no se inventa el número', async () => {
    // `diasCont` es opcional a propósito. Sin él se calla, en vez de volver a llamar «días» a las
    // marcaciones cerradas, que es justo el error que se está corrigiendo.
    const texto = cabecera(await calcularPara(reporteDe(JULIAN, undefined, 11), JULIAN));
    expect(texto).toContain('11 marcaciones cerradas');
    expect(texto).not.toContain('con marcación');
  });
});

// EL TOTAL TRABAJADO Y EL EFECTO DE CRUZAR LAS EXTRAS (1 de octubre de 2026).
//
// El reporte de septiembre de Ana Sofía decía «Trabajó 169h11»: eran solo las ordinarias. Con las
// 7h35 de extras trabajó 176h46, y «Queda debiendo 13h19» se leía como si hubiera estado ausente
// todo ese tiempo. La política de cruzar las extras con el faltante NO está decidida (afecta
// nómina real y falta el abogado), así que la pantalla solo muestra cuánto cambiaría el pago, sin
// tocar lo que hoy se descuenta ni el total a pagar.
describe('el total trabajado y el cruce de las extras en el reporte por persona', () => {
  const ANA = { id: 'c-ana', nombre: 'Ana Sofía', apellido: 'Giraldo' };
  // Los números del reporte real, a mano: 182h30 esperadas, 169h11 ordinarias + 7h35 extra.
  const saldoDeAna = {
    sinHorario: false, minutosEsperados: 10950, minutosPermisoRemunerado: 0, minutosPermisoNoRemunerado: 465,
    minutosTrabajados: 10151, minutosSaldo: 799, valorHora: 10718.6, montoSaldo: 142_736,
    minutosExtra: 455, minutosTotalTrabajados: 10606,
    cruce: { minutosAbsorbidos: 455, minutosSaldo: 344, montoSaldo: 61_453.3, extraPagado: 0, diferenciaDePago: -29_074.3 },
  };
  const reporteDeAna = (saldo: Record<string, unknown>) => ({
    ...reporteDe(ANA, 25, 27), salarioBase: 2_250_905, totalExtra: 110_357, totalAdicional: 110_357, saldo,
  });
  const textos = () => screen.getAllByText(/./).map(e => (e.textContent ?? '').replace(/\s+/g, ' ').trim());
  const calcularAna = async (r: ReturnType<typeof reporteDeAna>) => {
    const usuario = userEvent.setup();
    get.mockImplementation((url: string) => {
      if (url === '/colaboradores') return Promise.resolve({ data: [ANA] });
      if (url === '/reportes/liquidacion') return Promise.resolve({ data: r });
      if (url === '/reportes/tardanzas') return Promise.resolve({ data: { sinHorario: true, detalle: [], totalMinutos: 0 } });
      if (url === '/permisos' || url === '/registros') return Promise.resolve({ data: [] });
      return Promise.reject(new Error('url inesperada: ' + url));
    });
    render(<MemoryRouter><Reportes /></MemoryRouter>);
    await usuario.click(await screen.findByRole('button', { name: /Seleccionar colaborador/ }));
    await usuario.click(await screen.findByRole('button', { name: 'Ana Sofía Giraldo' }));
    await usuario.click(screen.getByRole('button', { name: 'Calcular' }));
    await screen.findByRole('heading', { name: 'Ana Sofía Giraldo' });
    return usuario;
  };

  it('«Trabajó» muestra el total, con las extras, y dice de qué se compone', async () => {
    await calcularAna(reporteDeAna(saldoDeAna));
    expect(textos()).toContain('176h 46min');
    expect(textos()).toContain('169h 11min ordinarias + 7h 35min extra');
    // «Queda debiendo» sigue siendo lo que hoy se descuenta: no cambia.
    expect(textos()).toContain('13h 19min');
  });

  it('sin extras no se agrega la explicación', async () => {
    const sinExtras = { ...saldoDeAna, minutosExtra: 0, minutosTotalTrabajados: 10151, cruce: null };
    await calcularAna(reporteDeAna(sinExtras));
    expect(textos()).toContain('169h 11min');
    expect(textos().some(t => t.includes('ordinarias +'))).toBe(false);
  });

  it('muestra qué pasaría si se cruzaran, y aclara que no es lo que se liquida', async () => {
    await calcularAna(reporteDeAna(saldoDeAna));
    expect(screen.getByText(/si las extras se cruzaran con el faltante/i)).toBeInTheDocument();
    // Quedaría debiendo 344 min = 5h44, el total con cruce y la diferencia contra el de hoy.
    expect(textos().some(t => t.includes('5h 44min'))).toBe(true);
    // El total de hoy (1.093.073,5) más la diferencia del cruce (−29.074,3).
    expect(textos()).toContain('$ 1.063.999');
    expect(textos().some(t => /29\.074/.test(t))).toBe(true);
    expect(screen.getByText(/no es lo que se liquida/i)).toBeInTheDocument();
  });

  it('el total a pagar de hoy NO cambia por el cruce: 2.250.905 / 2 + 110.357 − 142.736', async () => {
    await calcularAna(reporteDeAna(saldoDeAna));
    expect(textos()).toContain('$ 1.093.074');
  });

  it('sin cruce posible no se muestra el panel', async () => {
    await calcularAna(reporteDeAna({ ...saldoDeAna, cruce: null }));
    expect(screen.queryByText(/si las extras se cruzaran con el faltante/i)).not.toBeInTheDocument();
  });

  it('el Excel lleva el total trabajado y el cruce como líneas informativas, fuera del total', async () => {
    const usuario = await calcularAna(reporteDeAna(saldoDeAna));
    await usuario.click(screen.getByRole('button', { name: /Descargar Excel/i }));
    const hojas = exportar.mock.calls.at(-1)![1] as { nombre: string; filas: (string | number)[][] }[];
    const filas = hojas.find(h => h.nombre === 'Liquidación')!.filas;
    const fila = (e: string) => filas.find(f => String(f[1]).includes(e));
    expect(fila('TOTAL A PAGAR')?.[5]).toBe(1_093_074);
    expect(fila('Informativo: total trabajado')?.[1]).toContain('176h 46min');
    expect(fila('Informativo: si las extras se cruzaran')?.[5]).toBe(1_063_999);
  });
});

// EL PERÍODO DE PAGO (13 de octubre de 2026, decisión del dueño). El «Total a pagar» sumaba el salario MENSUAL
// completo a cualquier rango. Ahora el salario es el del período (medio salario por quincena, el entero por
// mes) y, si las fechas no son un período de pago o el período no ha terminado, no hay total: cualquier número
// sería inventado. La regla, con sus casos, en lib/periodoDePago.test.ts.
describe('el período de pago en el reporte por persona', () => {
  const conAdicional = (r: ReturnType<typeof reporteDe>) => ({ ...r, totalAdicional: 200_000, totalExtra: 200_000 });
  const textos = () => screen.getAllByText(/./).map(e => (e.textContent ?? '').replace(/\s+/g, ' ').trim());

  it('la pantalla ofrece el período de pago', async () => {
    montar(reporteDe(JULIAN, 5, 11));
    expect(await screen.findByRole('combobox', { name: 'Período de pago' })).toBeInTheDocument();
  });

  it('en una quincena terminada, el salario es medio salario y lo dice', async () => {
    await calcularPara(conAdicional(reporteDe(JULIAN, 5, 11)), JULIAN);
    expect(textos()).toContain('Salario de la primera quincena de septiembre de 2026');
    expect(textos()).toContain('$ 875.000');
    expect(textos()).not.toContain('Salario base mensual');
  });

  it('con fechas que no son un período, no hay total y se pide elegir uno', async () => {
    await calcularPara(conAdicional({ ...reporteDe(JULIAN, 5, 11), hasta: '2026-09-13' }), JULIAN);
    expect(screen.queryByText('Total a pagar')).not.toBeInTheDocument();
    expect(screen.getByText(/elige un período de pago/)).toBeInTheDocument();
    // El salario que se muestra sigue siendo el mensual, dicho como mensual: no hay período que prorratear.
    expect(textos()).toContain('Salario base mensual');
  });

  it('con un período que no ha terminado, no hay total y se dice cuándo termina', async () => {
    await calcularPara(conAdicional({ ...reporteDe(JULIAN, 5, 11), desde: '2099-01-01', hasta: '2099-01-15' }), JULIAN);
    expect(screen.queryByText('Total a pagar')).not.toBeInTheDocument();
    expect(screen.getByText(/termina el 15 de enero/)).toBeInTheDocument();
  });

  // El salario del período se sabe aunque no haya terminado: con «Primera quincena» elegida, decir
  // «Salario base mensual» contradecía lo de arriba (pedido del dueño, 14 de octubre de 2026).
  it('con un período que no ha terminado, el salario ya es el del período', async () => {
    await calcularPara(conAdicional({ ...reporteDe(JULIAN, 5, 11), desde: '2099-01-01', hasta: '2099-01-15' }), JULIAN);
    expect(textos()).toContain('Salario de la primera quincena de enero de 2099');
    expect(textos()).toContain('$ 875.000');
    expect(textos()).not.toContain('Salario base mensual');
  });

  it('con el mes completo dice «Salario de septiembre», sin «la»', async () => {
    await calcularPara(conAdicional({ ...reporteDe(JULIAN, 5, 11), hasta: '2026-09-30' }), JULIAN);
    expect(textos()).toContain('Salario de septiembre de 2026');
    expect(textos()).toContain('$ 1.750.000');
  });

  // El recuadro amarillo hablaba «del mes» también con una quincena elegida.
  it('el recuadro de arriba habla del período, no del mes', async () => {
    await calcularPara(conAdicional(reporteDe(JULIAN, 5, 11)), JULIAN);
    const recuadro = screen.getByText(/ya cubre las horas ordinarias/).closest('span')!;
    expect(recuadro.textContent).toContain('ya cubre las horas ordinarias del período');
    expect(recuadro.textContent).not.toContain('del mes');
  });

  it('sin total tampoco hay «total con el cruce»', async () => {
    const saldo = {
      sinHorario: false, minutosEsperados: 600, minutosPermisoRemunerado: 0, minutosPermisoNoRemunerado: 0,
      minutosTrabajados: 480, minutosSaldo: 120, valorHora: 8_000, montoSaldo: 16_000, minutosExtra: 60, minutosTotalTrabajados: 540,
      cruce: { minutosAbsorbidos: 60, minutosSaldo: 60, montoSaldo: 8_000, extraPagado: 0, diferenciaDePago: -2_000 },
    };
    await calcularPara({ ...conAdicional(reporteDe(JULIAN, 5, 11)), hasta: '2026-09-13', saldo } as ReturnType<typeof reporteDe>, JULIAN);
    expect(screen.queryByText(/total a pagar con el cruce/i)).not.toBeInTheDocument();
  });

  it('el Excel sin total tampoco lleva el «total con el cruce»', async () => {
    const usuario = userEvent.setup();
    const saldo = {
      sinHorario: false, minutosEsperados: 600, minutosPermisoRemunerado: 0, minutosPermisoNoRemunerado: 0,
      minutosTrabajados: 480, minutosSaldo: 120, valorHora: 8_000, montoSaldo: 16_000, minutosExtra: 60, minutosTotalTrabajados: 540,
      cruce: { minutosAbsorbidos: 60, minutosSaldo: 60, montoSaldo: 8_000, extraPagado: 0, diferenciaDePago: -2_000 },
    };
    await calcularPara({ ...conAdicional(reporteDe(JULIAN, 5, 11)), hasta: '2026-09-13', saldo } as ReturnType<typeof reporteDe>, JULIAN);
    await usuario.click(screen.getByRole('button', { name: /Descargar Excel/i }));
    const filas = (exportar.mock.calls.at(-1)![1] as { nombre: string; filas: (string | number)[][] }[])
      .find(h => h.nombre === 'Liquidación')!.filas;
    expect(filas.some(f => String(f[1]).includes('total trabajado'))).toBe(true);
    expect(filas.some(f => String(f[1]).includes('si las extras se cruzaran'))).toBe(false);
  });

  it('el Excel sin período no lleva TOTAL A PAGAR, y dice por qué', async () => {
    const usuario = userEvent.setup();
    await calcularPara(conAdicional({ ...reporteDe(JULIAN, 5, 11), hasta: '2026-09-13' }), JULIAN);
    await usuario.click(screen.getByRole('button', { name: /Descargar Excel/i }));
    const filas = (exportar.mock.calls.at(-1)![1] as { nombre: string; filas: (string | number)[][] }[])
      .find(h => h.nombre === 'Liquidación')!.filas;
    expect(filas.some(f => String(f[1]).includes('TOTAL A PAGAR'))).toBe(false);
    expect(filas.some(f => String(f[1]).includes('elige un período de pago'))).toBe(true);
  });

  it('el Excel de una quincena dice el salario de la quincena', async () => {
    const usuario = userEvent.setup();
    await calcularPara(conAdicional(reporteDe(JULIAN, 5, 11)), JULIAN);
    await usuario.click(screen.getByRole('button', { name: /Descargar Excel/i }));
    const filas = (exportar.mock.calls.at(-1)![1] as { nombre: string; filas: (string | number)[][] }[])
      .find(h => h.nombre === 'Liquidación')!.filas;
    expect(filas.find(f => String(f[1]) === 'Salario de la primera quincena de septiembre de 2026')?.[5]).toBe(875_000);
  });
});
