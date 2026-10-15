import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Dash } from '../features/dashboard/types';

// EL INICIO CON SUS PENDIENTES Y SUS PRIMEROS PASOS (14 de octubre de 2026). Las piezas tienen sus propias
// pruebas; aquí solo se comprueba que el Inicio las monta con lo que manda el servidor, y que un servidor
// anterior, sin los campos nuevos, no lo rompe.

const { datos } = vi.hoisted(() => ({ datos: { actual: null as Dash | null } }));
vi.mock('../features/dashboard/useDashboard', () => ({ useDashboard: () => ({ data: datos.actual, reload: vi.fn() }) }));
import DashboardEmpresa from './DashboardEmpresa';

const BASE: Dash = {
  fecha: '2026-10-14T15:00:00.000Z',
  hoyEsFestivo: false,
  totales: { colaboradoresActivos: 4, enPlanta: 0, horasSemana: 0, horasExtraMes: 0 },
  enPlanta: [], enDescanso: [], salidasRecientes: [], llegadasTardeHoy: [], sinMarcarHoy: [],
  turnosOlvidados: [{ id: 'r1', colaborador: 'Rosa Marcano', entrada: '2026-10-13T12:00:00.000Z' }],
  novedadesHoy: [], proximosFestivos: [], cumpleanos: [],
};

const montar = (d: Dash) => {
  datos.actual = d;
  return render(<MemoryRouter><DashboardEmpresa /></MemoryRouter>);
};

beforeEach(() => { datos.actual = null; });

describe('DashboardEmpresa', () => {
  it('muestra los pendientes y, en una empresa que arranca, sus primeros pasos', () => {
    montar({
      ...BASE,
      pendientes: { novedades: [{ id: 'p1', colaboradorId: 'c1', colaborador: 'Ana Ruiz', tipo: 'MEDICO', fechaInicio: '2026-10-17T05:00:00.000Z', fechaFin: '2026-10-17T05:00:00.000Z' }], contratos: [] },
      primerosPasos: [{ clave: 'SEDE', hecho: true }, { clave: 'HORARIO', hecho: false }],
    });
    expect(screen.getByRole('button', { name: /1 turno sin cerrar/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /1 novedad por aprobar/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Primeros pasos' })).toBeInTheDocument();
  });

  it('sin primeros pasos (null) no muestra la tarjeta', () => {
    montar({ ...BASE, pendientes: { novedades: [], contratos: [] }, primerosPasos: null });
    expect(screen.queryByRole('heading', { name: 'Primeros pasos' })).not.toBeInTheDocument();
  });

  // Los turnos sin cerrar ya no van en el recuadro naranja aparte: son uno de los pendientes.
  it('los turnos sin cerrar van en la franja y no en un recuadro aparte', () => {
    montar({ ...BASE, pendientes: { novedades: [], contratos: [] }, primerosPasos: null });
    expect(screen.queryByText(/Turnos sin cerrar \(1\)/)).not.toBeInTheDocument();
  });

  it('con un servidor anterior, sin los campos nuevos, el Inicio sigue en pie', () => {
    montar(BASE);
    expect(screen.getByRole('button', { name: /1 turno sin cerrar/ })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Primeros pasos' })).not.toBeInTheDocument();
    expect(screen.getByText('En planta ahora', { selector: 'p' })).toBeInTheDocument();
  });
});
