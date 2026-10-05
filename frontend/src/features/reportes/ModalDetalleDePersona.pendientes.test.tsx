import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../lib/api', () => ({ default: { get: vi.fn(), put: vi.fn(), post: vi.fn(), delete: vi.fn() } }));
import api from '../../lib/api';
import ModalDetalleDePersona from './ModalDetalleDePersona';

// APROBAR UNA NOVEDAD DESDE EL REPORTE (5 de octubre de 2026, petición 23 del dueño).
//
// Hasta ahora una novedad pendiente no se veía en ninguna parte del reporte: el
// modal solo usaba las aprobadas para pintar cada día. O sea que al revisar la
// nómina del período no había forma de enterarse de que faltaba decidir algo, y
// menos de decidirlo sin salir.
//
// APROBAR MUEVE DINERO: esos días dejan de exigirse y el total del período
// cambia. Por eso va con confirmación y por eso, al aprobar, el reporte de atrás
// tiene que volver a calcularse: si no, la pantalla se queda diciendo el total
// viejo, que es peor que no haber dejado aprobar.

const get = api.get as unknown as ReturnType<typeof vi.fn>;
const put = api.put as unknown as ReturnType<typeof vi.fn>;

const bog = (a: number, mes: number, d: number, h = 0) => new Date(Date.UTC(a, mes - 1, d, h + 5)).toISOString();

const PERSONA = {
  colaboradorId: 'c1', nombre: 'Ana María', apellido: 'Gómez', cargo: 'Vigilante',
  registrosCont: 10, minutosOrdinarios: 4800, totalAdicional: 120000,
  novedades: [],
};
const PERIODO = { desde: '2026-09-01', hasta: '2026-09-15' };

const permiso = (id: string, tipo: string, ini: string, fin: string, aprobado: boolean, descripcion: string | null = null) =>
  ({ id, tipo, fechaInicio: ini, fechaFin: fin, aprobado, remunerado: true, descripcion });

const PENDIENTE = permiso('p1', 'MEDICO', bog(2026, 9, 3), bog(2026, 9, 3), false, 'Control de la EPS');
const APROBADA = permiso('p2', 'VACACIONES', bog(2026, 9, 7), bog(2026, 9, 10), true);

const montar = (permisos: unknown[], onAprobada = vi.fn()) => {
  get.mockReset();
  put.mockReset();
  get.mockImplementation((url: string) => Promise.resolve({
    data: url === '/permisos' ? permisos : [],
  }));
  put.mockResolvedValue({ data: {} });
  render(<ModalDetalleDePersona persona={PERSONA as never} periodo={PERIODO} onCerrar={vi.fn()} onAprobada={onAprobada} />);
  return { u: userEvent.setup(), onAprobada };
};

const bloque = () => screen.findByRole('group', { name: /pendientes de aprobar/i });

beforeEach(() => { get.mockReset(); put.mockReset(); });

describe('ModalDetalleDePersona · novedades pendientes de aprobar', () => {
  it('lista la pendiente del período con su tipo y su descripción', async () => {
    montar([PENDIENTE, APROBADA]);
    const b = await bloque();
    expect(within(b).getByText(/cita médica/i)).toBeInTheDocument();
    expect(within(b).getByText(/control de la eps/i)).toBeInTheDocument();
    // La aprobada ya se decidió: no tiene por qué estar en la lista de decidir.
    expect(within(b).queryByText(/vacaciones/i)).toBeNull();
  });

  it('sin pendientes no se pinta el bloque', async () => {
    montar([APROBADA]);
    // Se espera a que el modal esté montado antes de afirmar una ausencia.
    expect(await screen.findByRole('heading', { name: /ana maría gómez/i })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: /pendientes de aprobar/i })).toBeNull();
  });

  it('aprobar pide confirmación y dice que el total del período cambia', async () => {
    const { u } = montar([PENDIENTE]);
    await u.click(within(await bloque()).getByRole('button', { name: /aprobar/i }));
    const dialogo = await screen.findByRole('dialog', { name: /aprobar esta novedad/i });
    expect(within(dialogo).getByText(/el total del período cambia/i)).toBeInTheDocument();
    expect(put).not.toHaveBeenCalled();
  });

  it('cancelar la confirmación no aprueba nada', async () => {
    const { u, onAprobada } = montar([PENDIENTE]);
    await u.click(within(await bloque()).getByRole('button', { name: /aprobar/i }));
    const dialogo = await screen.findByRole('dialog', { name: /aprobar esta novedad/i });
    await u.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));
    expect(put).not.toHaveBeenCalled();
    expect(onAprobada).not.toHaveBeenCalled();
  });

  it('al confirmar la aprueba, lo avisa al reporte y la saca de la lista', async () => {
    const { u, onAprobada } = montar([PENDIENTE]);
    await u.click(within(await bloque()).getByRole('button', { name: /aprobar/i }));
    const dialogo = await screen.findByRole('dialog', { name: /aprobar esta novedad/i });
    await u.click(within(dialogo).getByRole('button', { name: 'Sí, aprobar' }));
    expect(put).toHaveBeenCalledWith('/permisos/p1', { aprobado: true });
    // El reporte de atrás tiene que recalcularse: sus totales acaban de cambiar.
    expect(onAprobada).toHaveBeenCalled();
    expect(screen.queryByRole('group', { name: /pendientes de aprobar/i })).toBeNull();
  });
});
