import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import AsistenciaSemana from './AsistenciaSemana';
import type { Dash } from '../types';

// LA ASISTENCIA DE LA SEMANA EN EL INICIO (15 de octubre de 2026): una columna por día, de lunes a
// domingo, con su número escrito y la barra en proporción. Cada columna se lee entera en voz alta.

type Dia = NonNullable<Dash['asistenciaSemana']>['dias'][number];
const dia = (d: number, over: Partial<Dia> = {}): Dia => ({
  clave: `2026-10-${d}`, fecha: `2026-10-${d}T05:00:00.000Z`, esHoy: false, futuro: false, festivo: false,
  debian: 0, llegaron: 0, llegaronSinTurno: 0, conNovedad: 0, enTiempo: 0, conTurno: 0, ...over,
});
const SEMANA = [
  dia(12, { festivo: true }),
  dia(13, { debian: 4, llegaron: 3, conTurno: 4 }),
  dia(14, { debian: 4, llegaron: 4, conTurno: 4, conNovedad: 1 }),
  dia(15, { esHoy: true, debian: 5, llegaron: 3, enTiempo: 2, conTurno: 7 }),
  dia(16, { futuro: true, conTurno: 6 }),
  dia(17, { futuro: true }),
  dia(18, { futuro: true }),
];

describe('AsistenciaSemana', () => {
  it('una columna por día, y cada una se lee entera', () => {
    render(<AsistenciaSemana dias={SEMANA} />);
    const lista = screen.getByRole('list', { name: /Asistencia de lunes a domingo/ });
    expect(within(lista).getAllByRole('listitem')).toHaveLength(7);
    expect(screen.getByRole('listitem', { name: 'martes 13 de octubre: llegaron 3 de 4' })).toBeInTheDocument();
    expect(screen.getByRole('listitem', { name: 'lunes 12 de octubre: festivo' })).toBeInTheDocument();
  });

  it('el número va escrito, no solo en el largo de la barra', () => {
    render(<AsistenciaSemana dias={SEMANA} />);
    expect(screen.getByText('3 de 4')).toBeInTheDocument();
    expect(screen.getByText('6 con turno')).toBeInTheDocument();
  });

  it('hoy dice «Hoy» y, debajo, cuántos entran más tarde', () => {
    render(<AsistenciaSemana dias={SEMANA} />);
    expect(screen.getByText('Hoy')).toBeInTheDocument();
    expect(screen.getByText('Hoy: 2 entran más tarde')).toBeInTheDocument();
  });
});
