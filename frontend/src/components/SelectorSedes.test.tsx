import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SelectorSedes from './SelectorSedes';

// Un presencial siempre tiene sede: si nadie le elige una, cuenta en la Sede
// principal sin que se le asigne («mostrar la principal», decisión del dueño del 12
// de septiembre de 2026). El selector lo dice, pero sin elegirla por nadie: lo que
// se guarda es solo lo que se tocó (revisión del 11 de septiembre de 2026).

const SEDES = [
  { id: 'norte', nombre: 'Norte' },
  { id: 'principal', nombre: 'Sede principal', principal: true },
];

describe('SelectorSedes', () => {
  it('a un presencial sin sedes le muestra la principal por defecto, sin elegirla por él, y dice que cuenta ahí', () => {
    const onChange = vi.fn();
    render(<SelectorSedes sedes={SEDES} valor={[]} onChange={onChange} modalidad="PRESENCIAL" />);
    const principal = screen.getByRole('button', { name: /Sede principal/ });
    expect(principal).toHaveTextContent(/por defecto/i);
    expect(principal).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('Sin elegir, cuenta en la Sede principal y se le aplica la ubicación general de la empresa.')).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('con una sede elegida, la principal deja de aparecer por defecto', () => {
    render(<SelectorSedes sedes={SEDES} valor={['norte']} onChange={vi.fn()} modalidad="PRESENCIAL" />);
    expect(screen.getByRole('button', { name: /Norte/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Sede principal/ })).not.toHaveTextContent(/por defecto/i);
  });

  it('a un híbrido sin sedes no le supone ninguna', () => {
    render(<SelectorSedes sedes={SEDES} valor={[]} onChange={vi.fn()} modalidad="HIBRIDO" />);
    expect(screen.queryByText(/por defecto/i)).not.toBeInTheDocument();
  });

  it('a un presencial se le puede quitar la última que eligió: vuelve a contar en la principal', async () => {
    const onChange = vi.fn();
    render(<SelectorSedes sedes={SEDES} valor={['norte']} onChange={onChange} modalidad="PRESENCIAL" />);
    await userEvent.click(screen.getByRole('button', { name: /Norte/ }));
    expect(onChange).toHaveBeenCalledWith([]);
  });
});
