import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import BuzonBorroso from './BuzonBorroso';

// EL BUZÓN SIN EL PLAN (14 de octubre de 2026, PENDIENTES nº 39, fase 4). Decisión del dueño: se ve CUÁNTAS notas hay,
// con las notas borrosas. El texto no llega al navegador (GET /clima/buzon/conteo solo trae números): lo que se ve
// borroso son tarjetas de relleno, y eso es lo que se prueba aquí.

const conteo = { semanas: [{ semana: '2026-10-12T05:00:00.000Z', notas: 3 }, { semana: '2026-10-05T05:00:00.000Z', notas: 1 }] };

describe('BuzonBorroso', () => {
  it('cada semana dice cuántas notas tiene y dibuja una tarjeta oculta por cada una', () => {
    render(<BuzonBorroso conteo={conteo} />);
    const semanas = screen.getAllByRole('region');
    expect(semanas).toHaveLength(2);
    expect(within(semanas[0]).getByText('3 notas')).toBeInTheDocument();
    expect(within(semanas[0]).getAllByRole('img', { name: 'Nota confidencial oculta' })).toHaveLength(3);
    expect(within(semanas[1]).getByText('1 nota')).toBeInTheDocument();
    expect(within(semanas[1]).getAllByRole('img', { name: 'Nota confidencial oculta' })).toHaveLength(1);
  });

  it('dice que con el plan Empresarial se leen', () => {
    render(<BuzonBorroso conteo={conteo} />);
    expect(screen.getByText(/Con el plan Empresarial lees lo que escribieron/)).toBeInTheDocument();
  });

  it('sin notas lo dice, sin tarjetas', () => {
    render(<BuzonBorroso conteo={{ semanas: [] }} />);
    expect(screen.getByText('No hay observaciones confidenciales en las últimas 12 semanas.')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Nota confidencial oculta' })).toBeNull();
  });
});
