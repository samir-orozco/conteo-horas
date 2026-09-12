import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, waitFor, act } from '@testing-library/react';
import ReporteLlegadasTarde from './ReporteLlegadasTarde';

// EL REPORTE DE LLEGADAS TARDE, CON VARIAS SEDES.
//
// Misma regla que el de extras (ver ReporteExtras.test.tsx y
// backend/src/utils/sedesDeReporte.ts). Aquí importa además por el defecto que
// la originó: quien entraba a tiempo en una sede y regresaba del almuerzo en otra
// aparecía tarde en la segunda. Ahora sale como mixto, con su tardanza real.

vi.mock('../lib/api', () => ({ default: { get: vi.fn() } }));
import api from '../lib/api';
const get = api.get as unknown as ReturnType<typeof vi.fn>;

type Sede = { id: string | null; nombre: string | null; porDefecto?: boolean };
const LAURELES = { id: 'sede-a', nombre: 'Laureles' };
const POBLADO = { id: 'sede-b', nombre: 'El Poblado' };

const tarde = (diasTarde: number, totalMinutos: number, montoTardanzas: number) => ({ diasTarde, totalMinutos, montoTardanzas });
const fila = (nombre: string, sedes: Sede[], minutos: number, monto: number) =>
  ({ colaboradorId: `c-${nombre}`, nombre, apellido: 'Prueba', sinHorario: false, sedes, ...tarde(minutos > 0 ? 1 : 0, minutos, monto) });

// Días, minutos y valor distintos entre sí en cada línea: con números que se
// repiten, una columna cambiada por otra pasaría igual.
const RESPUESTA = {
  desde: '2026-08-24', hasta: '2026-08-29',
  colaboradores: [
    fila('Fija', [LAURELES], 22, 3_666.67),
    fila('Luis', [POBLADO], 40, 6_666.67),
    fila('RotaDia', [POBLADO, LAURELES], 0, 0),
  ],
  resumen: {
    porSede: [{ ...POBLADO, ...tarde(2, 40, 6_666.67) }, { ...LAURELES, ...tarde(1, 22, 3_666.67) }],
    mixtos: tarde(0, 0, 0),
    todas: tarde(3, 62, 10_333.34),
  },
};

function montarCon(sedes: { id: string; nombre: string }[], respuesta: unknown = RESPUESTA) {
  get.mockImplementation((url: string) => {
    if (url === '/colaboradores') return Promise.resolve({ data: [] });
    if (url === '/sedes') return Promise.resolve({ data: sedes });
    if (url === '/reportes/tardanzas-resumen') return Promise.resolve({ data: respuesta });
    return Promise.reject(new Error('url inesperada: ' + url));
  });
  return render(<ReporteLlegadasTarde />);
}

// El texto de cada celda de una fila, en orden, con los espacios duros de Intl
// normalizados.
const celdas = (fila: HTMLElement) =>
  within(fila).getAllByRole('cell').map(c => (c.textContent ?? '').replace(/\s+/g, ' ').trim());

describe('ReporteLlegadasTarde con varias sedes', () => {
  it('quien trabajó en varias sedes sale como mixto, con sus sedes', async () => {
    montarCon([LAURELES, POBLADO]);
    await screen.findByRole('region', { name: 'Resumen por sede' });
    const rota = screen.getByRole('row', { name: /RotaDia/ });
    expect(rota).toHaveTextContent('Mixto');
    expect(rota).toHaveTextContent('El Poblado · Laureles');
  });

  it('el resumen trae días, tiempo y valor de cada sede, de los mixtos y de todas las sedes, cada uno en su columna', async () => {
    montarCon([LAURELES, POBLADO]);
    const resumen = await screen.findByRole('region', { name: 'Resumen por sede' });
    const lineaDe = (nombre: RegExp) => celdas(within(resumen).getByRole('row', { name: nombre }));
    // Sede · Días tarde · Tiempo total · Valor
    expect(lineaDe(/El Poblado/)).toEqual(['El Poblado', '2', '40 min', '$ 6.667']);
    expect(lineaDe(/Laureles/)).toEqual(['Laureles', '1', '22 min', '$ 3.667']);
    expect(lineaDe(/Mixtos/)).toEqual(['Mixtos', '0', '0 min', '$ 0']);
    expect(lineaDe(/Todas las sedes/)).toEqual(['Todas las sedes', '3', '1h 2min', '$ 10.333']);
  });

  it('a un presencial que marcó sin ubicación se le ve su sede con «por defecto», no «Sin sede»', async () => {
    // Misma regla que en extras (12 de septiembre de 2026): el servidor la manda con
    // `porDefecto`, y la fila tiene que decirlo.
    montarCon([LAURELES, POBLADO], {
      ...RESPUESTA,
      colaboradores: [...RESPUESTA.colaboradores, fila('SinUbicacion', [{ ...LAURELES, porDefecto: true }], 15, 2_500)],
    });
    await screen.findByRole('region', { name: 'Resumen por sede' });
    const sinUbicacion = screen.getByRole('row', { name: /SinUbicacion/ });
    expect(sinUbicacion).toHaveTextContent('Laureles (por defecto)');
    expect(sinUbicacion).not.toHaveTextContent('Sin sede');
  });

  it('con una sola sede no se muestran ni la columna de sede ni el resumen', async () => {
    montarCon([LAURELES]);
    await screen.findByRole('row', { name: /Fija/ });
    await waitFor(() => expect(get).toHaveBeenCalledWith('/sedes'));
    await act(async () => {});
    expect(screen.queryByRole('columnheader', { name: 'Sede' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Resumen por sede' })).not.toBeInTheDocument();
  });
});
