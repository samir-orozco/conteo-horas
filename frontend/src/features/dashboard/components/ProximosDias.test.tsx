import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import ProximosDias from './ProximosDias';
import type { EventoDeAgenda } from '../types';

// LA TARJETA «PRÓXIMOS DÍAS» DEL INICIO (15 de octubre de 2026): una lista por fecha de lo que viene en 30 días.
// Muestra los primeros y se despliega entera; lo que pide hacer algo lleva a donde se hace.

const dia = (d: number) => `2026-10-${String(d).padStart(2, '0')}T05:00:00.000Z`;
const festivo = (d: number, enDias: number, nombre = `Festivo ${d}`): EventoDeAgenda => ({ tipo: 'FESTIVO', dia: dia(d), enDias, nombre, propio: false });

function Destino() {
  const l = useLocation();
  return <p>Llegó a {l.pathname}{l.search}</p>;
}
const montar = (eventos: EventoDeAgenda[]) => render(
  <MemoryRouter initialEntries={['/app']}>
    <Routes>
      <Route path="/app" element={<ProximosDias eventos={eventos} />} />
      <Route path="*" element={<Destino />} />
    </Routes>
  </MemoryRouter>,
);
const filas = () => within(screen.getByRole('list', { name: 'Próximos días' })).getAllByRole('listitem');

describe('ProximosDias', () => {
  it('cada evento con su día, qué es y cuándo', () => {
    montar([
      { tipo: 'CUMPLEANOS', dia: dia(15), enDias: 0, colaboradorId: 'c1', nombre: 'Ana Ruiz' },
      festivo(16, 1, 'Día de la Raza'),
    ]);
    expect(screen.getByRole('heading', { name: 'Próximos días' })).toBeInTheDocument();
    const [ana, raza] = filas();
    expect(ana).toHaveTextContent('15oct');
    expect(within(ana).getByText('Ana Ruiz')).toBeInTheDocument();
    expect(within(ana).getByText('Cumpleaños · hoy')).toBeInTheDocument();
    expect(within(raza).getByText('Festivo · mañana')).toBeInTheDocument();
  });

  it('muestra los primeros seis y el resto al desplegar', () => {
    montar(Array.from({ length: 9 }, (_, i) => festivo(15 + i, i)));
    expect(filas()).toHaveLength(6);
    fireEvent.click(screen.getByRole('button', { name: 'Ver los 9' }));
    expect(filas()).toHaveLength(9);
    fireEvent.click(screen.getByRole('button', { name: 'Ver menos' }));
    expect(filas()).toHaveLength(6);
  });

  it('con seis o menos no hay nada que desplegar', () => {
    montar(Array.from({ length: 6 }, (_, i) => festivo(15 + i, i)));
    expect(screen.queryByRole('button', { name: /Ver los/ })).not.toBeInTheDocument();
  });

  it('lo que pide hacer algo lleva a donde se hace', () => {
    montar([{ tipo: 'CONTRATO_SE_PRORROGA', dia: dia(30), enDias: 15, colaboradorId: 'c7', nombre: 'Luis Mora' }]);
    fireEvent.click(screen.getByRole('button', { name: /Luis Mora/ }));
    expect(screen.getByText('Llegó a /app/colaboradores/c7?tab=contratos')).toBeInTheDocument();
  });

  it('un festivo o un cumpleaños no es un botón', () => {
    montar([festivo(16, 1), { tipo: 'CUMPLEANOS', dia: dia(17), enDias: 2, colaboradorId: 'c1', nombre: 'Ana Ruiz' }]);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  // Dos eventos iguales no pueden compartir la llave de React (revisión adversarial): con la misma llave, React avisa y
  // puede dejar de pintar uno.
  it('dos eventos del mismo tipo, día y nombre salen los dos, sin llaves repetidas', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    montar([festivo(16, 1, 'Igual'), festivo(16, 1, 'Igual')]);
    const avisos = error.mock.calls.map(c => c.map(String).join(' ')).join('\n');
    error.mockRestore();
    expect(filas()).toHaveLength(2);
    expect(avisos).not.toMatch(/same key/);
  });

  it('sin eventos lo dice', () => {
    montar([]);
    expect(screen.getByText('Nada en los próximos 30 días.')).toBeInTheDocument();
  });
});
