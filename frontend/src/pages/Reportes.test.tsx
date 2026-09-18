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
// El «Total a pagar» de esta pantalla suma el salario MENSUAL completo a cualquier rango: pidiendo
// del 1 al 15 muestra un salario entero de más. Es un defecto conocido desde el 2 de septiembre y
// el dueño decidió posponerlo hasta que exista el módulo de período de pago.
//
// Por eso el auxilio va en su propia línea DEBAJO del total y marcado como que se paga aparte:
// meterlo dentro sería apilar una cifra correcta sobre una equivocada, y ponerlo encima invitaría a
// sumarlo mentalmente a un total que no lo incluye.
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
    // 1.750.000 de salario + 200.000 de adicional. Si el auxilio se colara, serían 2.008.122.
    expect(fila('TOTAL A PAGAR')?.[5]).toBe(1_950_000);
  });

  it('no se suma al total a pagar: 1.750.000 más 200.000, sin los 58.122 del auxilio', async () => {
    await calcularPara(conAdicional(reporteDe(JULIAN, 5, 11)), JULIAN);
    const textos = screen.getAllByText(/\$/).map(e => (e.textContent ?? '').replace(/\s+/g, ' '));
    expect(textos).toContain('$ 1.950.000');
    // Lo que saldría si el auxilio se hubiera colado dentro del total.
    expect(textos).not.toContain('$ 2.008.122');
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
