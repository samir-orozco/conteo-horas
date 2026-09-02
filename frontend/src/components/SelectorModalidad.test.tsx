import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SelectorModalidad from './SelectorModalidad';

describe('SelectorModalidad', () => {
  it('ofrece las tres modalidades', () => {
    render(<SelectorModalidad valor="PRESENCIAL" onChange={() => {}} />);
    expect(screen.getByRole('radio', { name: 'Presencial' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Híbrido' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Remoto' })).toBeInTheDocument();
  });

  it('la elegida se ANUNCIA, no solo se pinta de otro color', () => {
    // Si la selección viviera solo en el color, quien usa lector de pantalla no
    // sabría qué está marcado.
    render(<SelectorModalidad valor="REMOTO" onChange={() => {}} />);
    expect(screen.getByRole('radio', { name: 'Remoto' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Presencial' })).not.toBeChecked();
  });

  it('dice qué le va a pasar a la ubicación con la que está elegida', () => {
    render(<SelectorModalidad valor="PRESENCIAL" onChange={() => {}} />);
    expect(screen.getByText(/se rechaza/i)).toBeInTheDocument();
  });

  it('la ayuda cambia con la modalidad, porque la consecuencia es otra', () => {
    const { rerender } = render(<SelectorModalidad valor="PRESENCIAL" onChange={() => {}} />);
    expect(screen.getByText(/se rechaza/i)).toBeInTheDocument();
    rerender(<SelectorModalidad valor="REMOTO" onChange={() => {}} />);
    expect(screen.queryByText(/se rechaza/i)).not.toBeInTheDocument();
    expect(screen.getByText(/no se le pide ni se le mira la ubicación/i)).toBeInTheDocument();
  });

  it('elegir otra avisa a quien manda', async () => {
    const onChange = vi.fn();
    render(<SelectorModalidad valor="PRESENCIAL" onChange={onChange} />);
    await userEvent.click(screen.getByRole('radio', { name: 'Híbrido' }));
    expect(onChange).toHaveBeenCalledWith('HIBRIDO');
  });
});
