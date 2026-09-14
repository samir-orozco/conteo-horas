import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, waitFor, act } from '@testing-library/react';
import ReporteExtras from './ReporteExtras';

// EL REPORTE DE EXTRAS Y RECARGOS, CON VARIAS SEDES.
//
// La regla vive en el servidor (backend/src/utils/sedesDeReporte.ts): el filtro de
// sede decide quién aparece y cada persona trae sus números completos. Quien
// trabajó en varias sedes es mixto, y el resumen trae una línea por sede, una de
// mixtos y «Todas las sedes», que suman el total de la empresa.
//
// Lo que se prueba aquí es que la pantalla lo DIGA: que un mixto no se lea como si
// todo fuera de la sede filtrada, y que el total de la empresa esté a la vista
// aunque se esté mirando una sola sede.

vi.mock('../lib/api', () => ({ default: { get: vi.fn() } }));
import api from '../lib/api';
const get = api.get as unknown as ReturnType<typeof vi.fn>;

type Sede = { id: string | null; nombre: string | null; porDefecto?: boolean };
const LAURELES = { id: 'sede-a', nombre: 'Laureles' };
const POBLADO = { id: 'sede-b', nombre: 'El Poblado' };
const PRINCIPAL = { id: 'sede-p', nombre: 'Sede principal' };
const SIN_SEDE: Sede = { id: null, nombre: null };

const montos = (total: number) => ({ totalRecargos: 0, totalExtra: total, totalAdicional: total });
// Recargos, extras y total DISTINTOS a propósito: con recargos en cero, extras y
// total valen lo mismo, y una columna del resumen cambiada por otra pasaba igual.
const conRecargos = (recargos: number, extra: number) => ({ totalRecargos: recargos, totalExtra: extra, totalAdicional: recargos + extra });
const fila = (nombre: string, sedes: Sede[], total: number) =>
  ({ colaboradorId: `c-${nombre}`, nombre, apellido: 'Prueba', sedes, ...montos(total) });
const linea = (sede: Sede, total: number) => ({ ...sede, ...montos(total) });

// Lo que devuelve el servidor para el ejemplo acordado con el dueño.
const RESPUESTA = {
  desde: '2026-08-24', hasta: '2026-08-29',
  colaboradores: [
    fila('Fija', [LAURELES], 75_000),
    fila('Luis', [POBLADO], 40_000),
    fila('RotaSemana', [POBLADO, LAURELES], 75_000),
  ],
  resumen: {
    porSede: [{ ...POBLADO, ...conRecargos(5_000, 40_000) }, { ...LAURELES, ...conRecargos(12_500, 75_000) }],
    mixtos: conRecargos(2_000, 75_000),
    todas: conRecargos(19_500, 190_000),
  },
};

function montarCon(sedes: { id: string; nombre: string }[], respuesta: unknown = RESPUESTA) {
  get.mockImplementation((url: string) => {
    if (url === '/colaboradores') return Promise.resolve({ data: [] });
    if (url === '/sedes') return Promise.resolve({ data: sedes });
    if (url === '/reportes/extras-resumen') return Promise.resolve({ data: respuesta });
    return Promise.reject(new Error('url inesperada: ' + url));
  });
  return render(<ReporteExtras />);
}

// El texto de cada celda de una fila, en orden. Intl separa el signo con un
// espacio duro: se normaliza para comparar con texto escrito a mano.
const celdas = (fila: HTMLElement) =>
  within(fila).getAllByRole('cell').map(c => (c.textContent ?? '').replace(/\s+/g, ' ').trim());

describe('ReporteExtras con varias sedes', () => {
  it('quien trabajó en varias sedes sale como mixto, con sus sedes', async () => {
    montarCon([LAURELES, POBLADO]);
    await screen.findByRole('region', { name: 'Resumen por sede' });
    const rota = screen.getByRole('row', { name: /RotaSemana/ });
    expect(rota).toHaveTextContent('Mixto');
    expect(rota).toHaveTextContent('El Poblado · Laureles');
  });

  it('quien trabajó en una sola sede sale con esa sede, sin la marca de mixto', async () => {
    montarCon([LAURELES, POBLADO]);
    await screen.findByRole('region', { name: 'Resumen por sede' });
    const fija = screen.getByRole('row', { name: /Fija/ });
    expect(fija).toHaveTextContent('Laureles');
    expect(fija).not.toHaveTextContent('Mixto');
  });

  it('el resumen trae una línea por sede, una de mixtos y el total de todas las sedes, cada monto en su columna', async () => {
    montarCon([LAURELES, POBLADO]);
    const resumen = await screen.findByRole('region', { name: 'Resumen por sede' });
    const lineaDe = (nombre: RegExp) => celdas(within(resumen).getByRole('row', { name: nombre }));
    // Sede · Recargos · Extras · Total a pagar
    expect(lineaDe(/El Poblado/)).toEqual(['El Poblado', '$ 5.000', '$ 40.000', '$ 45.000']);
    expect(lineaDe(/Laureles/)).toEqual(['Laureles', '$ 12.500', '$ 75.000', '$ 87.500']);
    expect(lineaDe(/Mixtos/)).toEqual(['Mixtos', '$ 2.000', '$ 75.000', '$ 77.000']);
    expect(lineaDe(/Todas las sedes/)).toEqual(['Todas las sedes', '$ 19.500', '$ 190.000', '$ 209.500']);
  });

  it('a un presencial que marcó sin ubicación se le ve el nombre de su sede, sin «por defecto», también dentro de un mixto', async () => {
    // Decisión del dueño del 12 de septiembre de 2026: la sede que ninguna marca
    // probó se le atribuye al leer, y el servidor la manda con `porDefecto`. Un
    // presencial ya no se ve «Sin sede». Desde el 13 de septiembre, sin «por defecto».
    montarCon([LAURELES, POBLADO, PRINCIPAL], {
      ...RESPUESTA,
      colaboradores: [
        ...RESPUESTA.colaboradores,
        fila('SinUbicacion', [{ ...PRINCIPAL, porDefecto: true }], 30_000),
        fila('Mezcla', [{ ...POBLADO, porDefecto: true }, { ...LAURELES, porDefecto: false }], 10_000),
      ],
    });
    await screen.findByRole('region', { name: 'Resumen por sede' });
    const sinUbicacion = screen.getByRole('row', { name: /SinUbicacion/ });
    expect(sinUbicacion).toHaveTextContent('Sede principal');
    expect(sinUbicacion).not.toHaveTextContent('por defecto');
    expect(sinUbicacion).not.toHaveTextContent('Sin sede');
    const mezcla = screen.getByRole('row', { name: /Mezcla/ });
    expect(mezcla).toHaveTextContent('Mixto');
    expect(mezcla).toHaveTextContent('El Poblado · Laureles');
  });

  // «Sin sede» sigue siendo legítimo para un híbrido o un remoto.
  it('lo que no tiene sede, como una remota, se lee «Sin sede», en la fila y en el resumen', async () => {
    montarCon([LAURELES, POBLADO], {
      ...RESPUESTA,
      colaboradores: [...RESPUESTA.colaboradores, fila('Remota', [SIN_SEDE], 50_000)],
      resumen: { ...RESPUESTA.resumen, porSede: [...RESPUESTA.resumen.porSede, linea(SIN_SEDE, 50_000)], todas: conRecargos(19_500, 240_000) },
    });
    const resumen = await screen.findByRole('region', { name: 'Resumen por sede' });
    expect(screen.getByRole('row', { name: /Remota/ })).toHaveTextContent('Sin sede');
    expect(celdas(within(resumen).getByRole('row', { name: /Sin sede/ }))).toEqual(['Sin sede', '$ 0', '$ 50.000', '$ 50.000']);
  });

  it('con una sola sede no se muestran ni la columna de sede ni el resumen', async () => {
    montarCon([LAURELES]);
    await screen.findByRole('row', { name: /Fija/ });
    // Esperar a que las sedes lleguen: sin esto la prueba pasaría antes de tiempo,
    // con la lista todavía vacía, aunque la pantalla mostrara el resumen después.
    await waitFor(() => expect(get).toHaveBeenCalledWith('/sedes'));
    await act(async () => {});
    expect(screen.queryByRole('columnheader', { name: 'Sede' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Resumen por sede' })).not.toBeInTheDocument();
  });
});
