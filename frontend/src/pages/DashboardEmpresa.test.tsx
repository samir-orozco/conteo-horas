import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Dash } from '../features/dashboard/types';

// EL INICIO CON SUS PENDIENTES Y SUS PRIMEROS PASOS (14 de octubre de 2026). Las piezas tienen sus propias
// pruebas; aquí solo se comprueba que el Inicio las monta con lo que manda el servidor, y que un servidor
// anterior, sin los campos nuevos, no lo rompe.

const { datos } = vi.hoisted(() => ({ datos: { actual: null as Dash | null } }));
vi.mock('../features/dashboard/useDashboard', () => ({ useDashboard: () => ({ data: datos.actual, reload: vi.fn() }) }));
// La tarjeta de extras y recargos pide su quincena aparte: aquí se queda cargando, sin salir a la red.
vi.mock('../lib/api', () => ({ default: { get: vi.fn(() => new Promise(() => {})) } }));
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

  // La semana (15 de octubre de 2026): con los datos del servidor, las dos tarjetas nuevas, y la lista
  // «Llegadas tarde hoy» se va porque la fila de hoy de la tarjeta de 7 días la reemplaza.
  it('con la semana, la asistencia y las llegadas tarde de 7 días reemplazan a la lista de hoy', () => {
    const dd = (d: number) => String(d).padStart(2, '0');
    const dia = (d: number, esHoy = false) => ({ clave: `2026-10-${dd(d)}`, fecha: `2026-10-${dd(d)}T05:00:00.000Z`, esHoy, festivo: false, debian: 1, totalMinutos: 0, personas: [] });
    montar({
      ...BASE, pendientes: { novedades: [], contratos: [] }, primerosPasos: null,
      asistenciaSemana: { dias: [12, 13, 14, 15, 16, 17, 18].map(d => ({ ...dia(d, d === 15), futuro: d > 15, llegaron: 1, llegaronSinTurno: 0, conNovedad: 0, enTiempo: 0, conTurno: 1 })) },
      llegadasTarde7d: { dias: [9, 10, 11, 12, 13, 14, 15].map(d => dia(d, d === 15)), personas: {} },
    });
    expect(screen.getByRole('list', { name: /Asistencia de lunes a domingo/ })).toBeInTheDocument();
    expect(screen.getByText('últimos 7 días')).toBeInTheDocument();
    expect(screen.queryByText('Llegadas tarde hoy', { selector: 'p' })).not.toBeInTheDocument();
  });

  // El clima (15 de octubre de 2026): el servidor solo lo manda al administrador; al supervisor le llega null.
  it('con el clima, su tarjeta; con null (el supervisor), nada', () => {
    const vistazo = { total: 0, personas: 0, promedio: null, variacion: null, jornadas: 0, atencion: 0 };
    const prueba = { disponible: true, vigente: null, terminada: null, dias: 30 };
    const { unmount } = montar({ ...BASE, clima: { estado: 'SIN_PLAN', desde: '2026-10-08', hasta: '2026-10-14', vistazo, prueba } });
    expect(screen.getByRole('region', { name: 'Clima laboral' })).toBeInTheDocument();
    unmount();
    montar({ ...BASE, clima: null });
    expect(screen.queryByRole('region', { name: 'Clima laboral' })).not.toBeInTheDocument();
  });

  // «Próximos días» (15 de octubre de 2026) reemplaza a las tarjetas de festivos y cumpleaños.
  it('con la agenda, «Próximos días» en lugar de los festivos y los cumpleaños', () => {
    montar({ ...BASE, agenda: [{ tipo: 'FESTIVO', dia: '2026-11-02T05:00:00.000Z', enDias: 19, nombre: 'Todos los Santos', propio: false }] });
    expect(screen.getByRole('heading', { name: 'Próximos días' })).toBeInTheDocument();
    expect(screen.queryByText('Próximos festivos')).not.toBeInTheDocument();
    expect(screen.queryByText('Cumpleaños del mes')).not.toBeInTheDocument();
  });

  // Las extras y los recargos de la quincena (15 de octubre de 2026) reemplazan a «Horas extra del mes».
  it('las extras y los recargos de la quincena en lugar de las horas extra del mes', () => {
    montar(BASE);
    expect(screen.getByText('Extras y recargos')).toBeInTheDocument();
    expect(screen.queryByText('Horas extra del mes')).not.toBeInTheDocument();
  });

  it('con un servidor anterior, sin los campos nuevos, el Inicio sigue en pie', () => {
    montar(BASE);
    expect(screen.getByRole('button', { name: /1 turno sin cerrar/ })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Primeros pasos' })).not.toBeInTheDocument();
    expect(screen.getByText('En planta ahora', { selector: 'p' })).toBeInTheDocument();
    // Sin la semana, queda la lista de hoy.
    expect(screen.getByText('Llegadas tarde hoy', { selector: 'p' })).toBeInTheDocument();
    // Sin la agenda, quedan los festivos y los cumpleaños.
    expect(screen.getByText('Próximos festivos')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Próximos días' })).not.toBeInTheDocument();
  });
});
