import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ListaDeDescansos from './ListaDeDescansos';

// Los descansos no remunerados de UNA franja del horario (12 de septiembre de 2026):
// hasta tres, cada uno con su «desde» y su «hasta», debajo del almuerzo. Ninguno se paga.

type Ventana = { inicio: string; fin: string };

// Con estado propio: la lista es controlada, y lo que importa es lo que ve el
// administrador después de tocar, además de lo que se le entrega a la franja.
function ConEstado({ inicial, onCambiar }: { inicial: Ventana[]; onCambiar?: (d: Ventana[]) => void }) {
  const [descansos, setDescansos] = useState(inicial);
  return <ListaDeDescansos descansos={descansos} max={3} onCambiar={d => { setDescansos(d); onCambiar?.(d); }} />;
}

const TRES: Ventana[] = [{ inicio: '09:00', fin: '09:15' }, { inicio: '10:00', fin: '10:10' }, { inicio: '15:00', fin: '15:10' }];

describe('ListaDeDescansos', () => {
  it('sin descansos muestra solo Agregar descanso y que no se pagan', () => {
    render(<ConEstado inicial={[]} />);
    expect(screen.getByRole('button', { name: 'Agregar descanso' })).toBeEnabled();
    expect(screen.queryByLabelText(/Descanso 1/)).toBeNull();
    expect(screen.getByText(/Los descansos no se pagan/)).toBeInTheDocument();
  });

  it('agregar agrega una fila con Desde y Hasta, vacías', () => {
    const onCambiar = vi.fn();
    render(<ConEstado inicial={[]} onCambiar={onCambiar} />);
    fireEvent.click(screen.getByRole('button', { name: 'Agregar descanso' }));
    expect(screen.getByLabelText('Descanso 1 desde')).toHaveValue('');
    expect(screen.getByLabelText('Descanso 1 hasta')).toHaveValue('');
    expect(onCambiar).toHaveBeenLastCalledWith([{ inicio: '', fin: '' }]);
  });

  it('con las dos horas dice cuánto dura ese descanso', () => {
    render(<ConEstado inicial={[{ inicio: '', fin: '' }]} />);
    fireEvent.change(screen.getByLabelText('Descanso 1 desde'), { target: { value: '09:00' } });
    fireEvent.change(screen.getByLabelText('Descanso 1 hasta'), { target: { value: '09:15' } });
    expect(screen.getByText('15 min')).toBeInTheDocument();
  });

  it('con tres, el botón se deshabilita y dice el máximo', () => {
    render(<ConEstado inicial={TRES} />);
    expect(screen.getByRole('button', { name: 'Máximo 3 descansos por franja' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Agregar descanso' })).toBeNull();
  });

  it('quitar el segundo deja el primero y el tercero en su orden', () => {
    const onCambiar = vi.fn();
    render(<ConEstado inicial={TRES} onCambiar={onCambiar} />);
    fireEvent.click(screen.getByRole('button', { name: 'Quitar el descanso 2' }));
    expect(onCambiar).toHaveBeenLastCalledWith([{ inicio: '09:00', fin: '09:15' }, { inicio: '15:00', fin: '15:10' }]);
    expect(screen.getByLabelText('Descanso 2 desde')).toHaveValue('15:00');
    expect(screen.queryByLabelText('Descanso 3 desde')).toBeNull();
  });

  it('una fila con una sola hora avisa que así no se puede guardar', () => {
    render(<ConEstado inicial={[{ inicio: '09:00', fin: '' }]} />);
    expect(screen.getByText('Faltan las dos horas: con una sola no se puede guardar.')).toBeInTheDocument();
  });
});
