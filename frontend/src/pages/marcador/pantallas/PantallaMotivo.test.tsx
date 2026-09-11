import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PantallaMotivo from './PantallaMotivo';
import type { CasoMotivo } from '../motivoDeMarca';

// La misma pantalla pide el motivo al irse temprano y al llegar tarde. Lo que ve
// la persona tiene que corresponder a lo que está marcando: un "Registrar mi
// salida" frente a alguien que acaba de llegar le hace dudar de qué va a pasar.
const montar = (caso: CasoMotivo) => {
  const onConfirmar = vi.fn();
  const onVolver = vi.fn();
  render(
    <PantallaMotivo
      caso={caso}
      novedadTipo="MEDICO" setNovedadTipo={vi.fn()}
      novedadDesc="" setNovedadDesc={vi.fn()}
      onConfirmar={onConfirmar} onVolver={onVolver}
      enviando={false}
    />,
  );
  return { onConfirmar, onVolver };
};

describe('PantallaMotivo', () => {
  it('al llegar tarde habla de la entrada, no de la salida', () => {
    montar('LLEGADA_TARDE');
    expect(screen.getByRole('heading', { name: 'Llegada tarde' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Registrar mi entrada' })).toBeInTheDocument();
    expect(screen.queryByText(/salida/i)).not.toBeInTheDocument();
  });

  it('al irse temprano conserva sus textos de siempre', () => {
    montar('SALIDA_TEMPRANA');
    expect(screen.getByRole('heading', { name: 'Salida antes del horario' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Registrar mi salida' })).toBeInTheDocument();
  });

  it('confirmar y volver atrás llaman cada uno a lo suyo', () => {
    const { onConfirmar, onVolver } = montar('LLEGADA_TARDE');
    fireEvent.click(screen.getByRole('button', { name: 'Registrar mi entrada' }));
    expect(onConfirmar).toHaveBeenCalledTimes(1);
    expect(onVolver).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Volver atrás' }));
    expect(onVolver).toHaveBeenCalledTimes(1);
  });
});
