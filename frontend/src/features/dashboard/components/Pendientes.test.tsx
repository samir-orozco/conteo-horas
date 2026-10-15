import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useParams, useLocation } from 'react-router-dom';
import Pendientes from './Pendientes';
import type { Dash, TurnoOlvidado } from '../types';

// LA FRANJA «PENDIENTES POR RESOLVER» DEL INICIO (14 de octubre de 2026). Cada aviso se abre en su lista,
// y cada fila lleva a donde se resuelve: la ficha de la persona en su pestaña, o el modal de cerrar turno.

const TURNO: TurnoOlvidado = { id: 'r1', colaborador: 'Rosa Marcano', entrada: '2026-10-13T12:00:00.000Z' };
const PENDIENTES: NonNullable<Dash['pendientes']> = {
  novedades: [
    { id: 'p1', colaboradorId: 'c1', colaborador: 'Ana Ruiz', tipo: 'MEDICO', fechaInicio: '2026-10-17T05:00:00.000Z', fechaFin: '2026-10-17T05:00:00.000Z' },
    { id: 'p2', colaboradorId: 'c2', colaborador: 'Luis Mora', tipo: 'VACACIONES', fechaInicio: '2026-10-20T05:00:00.000Z', fechaFin: '2026-10-24T05:00:00.000Z' },
  ],
  contratos: [
    { colaboradorId: 'c3', colaborador: 'Caro Díaz', estado: 'POR_VENCER', vence: '2026-12-10T05:00:00.000Z', limitePreaviso: '2026-11-10T05:00:00.000Z' },
  ],
};

// La ficha, de mentira: dice a quién y en qué pestaña llegó.
function FichaFalsa() {
  const { id } = useParams();
  return <p>Ficha de {id} en {new URLSearchParams(useLocation().search).get('tab')}</p>;
}

function montar(props: Partial<Parameters<typeof Pendientes>[0]> = {}) {
  const onCerrarTurno = vi.fn();
  const utils = render(
    <MemoryRouter initialEntries={['/app']}>
      <Routes>
        <Route path="/app" element={<Pendientes turnos={[TURNO]} pendientes={PENDIENTES} onCerrarTurno={onCerrarTurno} {...props} />} />
        <Route path="/app/colaboradores/:id" element={<FichaFalsa />} />
      </Routes>
    </MemoryRouter>,
  );
  return { ...utils, onCerrarTurno };
}
const chip = (nombre: RegExp) => screen.getByRole('button', { name: nombre });

describe('Pendientes', () => {
  it('muestra un aviso por cada clase de pendiente', () => {
    montar();
    expect(chip(/1 turno sin cerrar/)).toBeInTheDocument();
    expect(chip(/2 novedades por aprobar/)).toBeInTheDocument();
    expect(chip(/1 contrato por revisar/)).toBeInTheDocument();
  });

  it('la lista de un aviso no se ve hasta que se abre, y se cierra con el mismo aviso', () => {
    montar();
    expect(screen.queryByRole('button', { name: /Ana Ruiz/ })).not.toBeInTheDocument();
    fireEvent.click(chip(/2 novedades por aprobar/));
    expect(chip(/2 novedades por aprobar/)).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: /Ana Ruiz.*Cita médica.*17 de oct/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Luis Mora.*Vacaciones.*20 de oct al 24 de oct/ })).toBeInTheDocument();
    fireEvent.click(chip(/2 novedades por aprobar/));
    expect(screen.queryByRole('button', { name: /Ana Ruiz/ })).not.toBeInTheDocument();
  });

  it('una novedad lleva a la ficha de la persona, en la pestaña de novedades', () => {
    montar();
    fireEvent.click(chip(/2 novedades por aprobar/));
    fireEvent.click(screen.getByRole('button', { name: /Luis Mora/ }));
    expect(screen.getByText('Ficha de c2 en novedades')).toBeInTheDocument();
  });

  it('un contrato lleva a la ficha de la persona, en la pestaña de contratos, y dice qué hay que decidir', () => {
    montar();
    fireEvent.click(chip(/1 contrato por revisar/));
    fireEvent.click(screen.getByRole('button', { name: /Caro Díaz.*Preaviso hasta el 10 de nov/ }));
    expect(screen.getByText('Ficha de c3 en contratos')).toBeInTheDocument();
  });

  it('un turno sin cerrar abre el modal de cerrarlo, como antes', () => {
    const { onCerrarTurno } = montar();
    fireEvent.click(chip(/1 turno sin cerrar/));
    fireEvent.click(screen.getByRole('button', { name: /Rosa Marcano/ }));
    expect(onCerrarTurno).toHaveBeenCalledWith(TURNO);
  });

  it('abrir un aviso cierra el que estaba abierto', () => {
    montar();
    fireEvent.click(chip(/2 novedades por aprobar/));
    fireEvent.click(chip(/1 contrato por revisar/));
    expect(screen.queryByRole('button', { name: /Ana Ruiz/ })).not.toBeInTheDocument();
    expect(chip(/2 novedades por aprobar/)).toHaveAttribute('aria-expanded', 'false');
  });

  it('sin nada pendiente lo dice, para que no se confunda con una franja que no cargó', () => {
    montar({ turnos: [], pendientes: { novedades: [], contratos: [] } });
    expect(screen.getByText('Nada pendiente por resolver')).toBeInTheDocument();
  });

  it('con un servidor anterior y sin turnos sin cerrar no pinta nada', () => {
    const { container } = montar({ turnos: [], pendientes: undefined });
    expect(container).toBeEmptyDOMElement();
  });
});
