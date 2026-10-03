import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import ConfirmarNuevaEntrada from './ConfirmarNuevaEntrada';
import { MS_CONFIRMAR_REFORZADA } from '../confirmacion';

// «YA REGISTRASTE TU JORNADA DE HOY» (2 de octubre de 2026).
//
// El 1 de octubre, a las 08:56, Lina pasó por este aviso —«entrada 08:49 y salida
// 08:52»— y oprimió «Sí, registrar otra entrada». El aviso no decía a nombre de
// quién, y la entrada de las 08:49 no era de ella. Ahora lleva el nombre, se
// sostiene el tiempo reforzado y ofrece «No soy».

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const turno = { entrada: '2026-10-01T13:49:21Z', salida: '2026-10-01T13:52:39Z' };
const montar = () => {
  const p = { onConfirmar: vi.fn(), onCancelar: vi.fn(), onNoSoy: vi.fn() };
  render(<ConfirmarNuevaEntrada turno={turno} nombre="Lina" {...p} />);
  return p;
};

describe('ConfirmarNuevaEntrada', () => {
  it('dice a nombre de quién está la jornada', () => {
    montar();
    expect(screen.getByText('Lina, ya registraste tu jornada de hoy')).toBeInTheDocument();
  });

  it('registrar otra entrada pide el sostenido reforzado, y un toque no basta', () => {
    const { onConfirmar } = montar();
    const boton = screen.getByRole('button', { name: /soy lina · registrar otra entrada/i });
    fireEvent.click(boton);
    fireEvent.pointerDown(boton, { pointerId: 1, button: 0 });
    act(() => { vi.advanceTimersByTime(MS_CONFIRMAR_REFORZADA - 100); });
    expect(onConfirmar).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(100); });
    expect(onConfirmar).toHaveBeenCalledTimes(1);
  });

  it('ofrece «No soy Lina»', () => {
    const { onNoSoy, onConfirmar } = montar();
    fireEvent.click(screen.getByRole('button', { name: /no soy lina/i }));
    expect(onNoSoy).toHaveBeenCalled();
    expect(onConfirmar).not.toHaveBeenCalled();
  });
});
