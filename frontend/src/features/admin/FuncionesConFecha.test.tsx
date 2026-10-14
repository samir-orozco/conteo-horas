import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../lib/api', () => ({ default: { post: vi.fn(), put: vi.fn(), delete: vi.fn() } }));
import api from '../../lib/api';
import FuncionesConFecha from './FuncionesConFecha';
import type { Concesion } from './concesionesDeEmpresa';

// LA TABLA DE FUNCIONES CON FECHA EN LA FICHA DE LA EMPRESA (14 de octubre de 2026, PENDIENTES nº 39, fase 2).
// Una fila por función: qué tiene hoy, y dar, extender o quitar una por un tiempo. Las reglas de fechas las
// valida el servidor; aquí se prueba que la pantalla manda lo que la persona escogió y dice lo que pasó.

const post = api.post as unknown as ReturnType<typeof vi.fn>;
const put = api.put as unknown as ReturnType<typeof vi.fn>;
const borrar = api.delete as unknown as ReturnType<typeof vi.fn>;

const bog = (a: number, mes: number, d: number, h = 0) => new Date(Date.UTC(a, mes - 1, d, h + 5)).toISOString();
const AHORA = new Date(bog(2026, 10, 14, 10));
const FUNCIONES = [
  { key: 'gps', label: 'Geocerca por GPS' },
  { key: 'turnos', label: 'Turnos rotativos' },
  { key: 'clima', label: 'Clima laboral' },
  { key: 'multiSede', label: 'Varias sedes' },
  { key: 'siigo', label: 'Integración Siigo', proximamente: true },
];
const CLIMA: Concesion = {
  id: 'c1', funcion: 'clima', desde: bog(2026, 10, 1), hasta: bog(2026, 12, 15), origen: 'SUPER_ADMIN',
  otorgadaPorNombre: 'Samir', revocadaEn: null, creadoEn: bog(2026, 10, 1),
};
const VIEJA: Concesion = { ...CLIMA, id: 'c0', funcion: 'turnos', hasta: bog(2026, 9, 1), creadoEn: bog(2026, 8, 1), origen: 'PRUEBA' };

const montar = (onCambio = vi.fn()) => {
  render(<FuncionesConFecha empresaId="emp1" funciones={FUNCIONES} delPlan={{ gps: true }} extras={{ turnos: true }}
    concesiones={[CLIMA, VIEJA]} onCambio={onCambio} ahora={AHORA} />);
  return onCambio;
};
const fila = (label: string) => screen.getByRole('row', { name: new RegExp(label) });

beforeEach(() => {
  post.mockReset(); put.mockReset(); borrar.mockReset();
  post.mockResolvedValue({ data: {} }); put.mockResolvedValue({ data: {} }); borrar.mockResolvedValue({ data: {} });
});

describe('FuncionesConFecha', () => {
  it('cada fila dice lo que la empresa tiene hoy', () => {
    montar();
    expect(fila('Geocerca por GPS')).toHaveTextContent('Incluida en su plan');
    expect(fila('Turnos rotativos')).toHaveTextContent('Extra a la medida');
    expect(fila('Clima laboral')).toHaveTextContent('Hasta el 14 de diciembre de 2026');
    expect(fila('Clima laboral')).toHaveTextContent('la dio Samir');
    expect(fila('Varias sedes')).toHaveTextContent('No la tiene');
  });

  it('lo que todavía no existe (Siigo) no se ofrece', () => {
    montar();
    expect(screen.queryByRole('row', { name: /Integración Siigo/ })).toBeNull();
  });

  it('dar una función: propone 30 días y manda la fecha escogida', async () => {
    const onCambio = montar();
    const f = fila('Varias sedes');
    const dia = within(f).getByLabelText('Último día de Varias sedes');
    expect(dia).toHaveValue('2026-11-13');
    await userEvent.clear(dia);
    await userEvent.type(dia, '2026-12-31');
    await userEvent.click(within(f).getByRole('button', { name: 'Dar hasta ese día' }));
    expect(post).toHaveBeenCalledWith('/admin/empresas/emp1/concesiones', { funcion: 'multiSede', hasta: '2026-12-31' });
    expect(onCambio).toHaveBeenCalled();
  });

  it('cambiar la fecha de la que tiene: arranca en su último día y manda el nuevo', async () => {
    const onCambio = montar();
    const f = fila('Clima laboral');
    const dia = within(f).getByLabelText('Último día de Clima laboral');
    expect(dia).toHaveValue('2026-12-14');
    await userEvent.clear(dia);
    await userEvent.type(dia, '2027-01-31');
    await userEvent.click(within(f).getByRole('button', { name: 'Cambiar fecha' }));
    expect(put).toHaveBeenCalledWith('/admin/empresas/emp1/concesiones/c1', { hasta: '2027-01-31' });
    expect(onCambio).toHaveBeenCalled();
  });

  it('quitarla', async () => {
    const onCambio = montar();
    await userEvent.click(within(fila('Clima laboral')).getByRole('button', { name: 'Quitar' }));
    expect(borrar).toHaveBeenCalledWith('/admin/empresas/emp1/concesiones/c1');
    expect(onCambio).toHaveBeenCalled();
  });

  it('si el servidor no acepta, dice por qué y no avisa de un cambio', async () => {
    post.mockRejectedValueOnce({ response: { data: { error: 'La fecha de fin ya pasó.' } } });
    const onCambio = montar();
    await userEvent.click(within(fila('Varias sedes')).getByRole('button', { name: 'Dar hasta ese día' }));
    expect(await screen.findByText('La fecha de fin ya pasó.')).toBeInTheDocument();
    expect(onCambio).not.toHaveBeenCalled();
  });

  it('el historial muestra también las vencidas y quién o qué las dio', () => {
    montar();
    const historial = screen.getByRole('list', { name: 'Historial de funciones con fecha' });
    expect(historial).toHaveTextContent('Vencida');
    expect(historial).toHaveTextContent('Prueba gratis');
    expect(historial).toHaveTextContent('Vigente');
  });
});
