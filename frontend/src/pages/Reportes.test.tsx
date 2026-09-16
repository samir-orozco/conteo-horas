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
import api from '../lib/api';
const get = api.get as unknown as ReturnType<typeof vi.fn>;

const JULIAN = { id: 'c-julian', nombre: 'Julián', apellido: 'Torres' };
const SOFIA = { id: 'c-sofia', nombre: 'Sofía', apellido: 'Ramos' };

// Los dos contadores SIEMPRE distintos: si valieran lo mismo, la prueba pasaría con una columna
// puesta en el lugar de la otra.
const reporteDe = (quien: typeof JULIAN, diasCont: number | undefined, registrosCont: number) => ({
  colaborador: quien, desde: '2026-09-01', hasta: '2026-09-15',
  liquidacion: [], salarioBase: 1_750_000,
  totalRecargos: 0, totalExtra: 0, totalAdicional: 0, totalPagar: 0,
  registrosCont, diasCont, detalleRegistros: [],
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
