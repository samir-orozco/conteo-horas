import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { useCierrePorInactividad } from './useCierrePorInactividad';

// LA SESIÓN DE UNA PERSONA NO PUEDE QUEDAR ABIERTA PARA LA SIGUIENTE (2 de octubre de 2026).
//
// Cancelar un diálogo, volver de la pantalla del motivo o un error al marcar
// dejaban la sesión de alguien abierta sin límite en una tableta compartida, y la
// foto del respaldo con cédula viva para quien llegara después.

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('useCierrePorInactividad', () => {
  it('sin tocar la pantalla, cierra al cumplirse el tiempo', () => {
    const alVencer = vi.fn();
    renderHook(() => useCierrePorInactividad(true, 30_000, alVencer));
    act(() => { vi.advanceTimersByTime(29_999); });
    expect(alVencer).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1); });
    expect(alVencer).toHaveBeenCalledTimes(1);
  });

  it('cada toque o tecla vuelve a empezar la cuenta', () => {
    const alVencer = vi.fn();
    renderHook(() => useCierrePorInactividad(true, 30_000, alVencer));
    act(() => { vi.advanceTimersByTime(20_000); });
    fireEvent.pointerDown(window);
    act(() => { vi.advanceTimersByTime(20_000); });
    fireEvent.keyDown(window, { key: '1' });
    act(() => { vi.advanceTimersByTime(20_000); });
    expect(alVencer).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(10_000); });
    expect(alVencer).toHaveBeenCalledTimes(1);
  });

  it('apagado no cuenta (mientras marca, o sin nadie en pantalla)', () => {
    const alVencer = vi.fn();
    renderHook(() => useCierrePorInactividad(false, 30_000, alVencer));
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(alVencer).not.toHaveBeenCalled();
  });

  it('al apagarse a mitad de la cuenta no dispara después', () => {
    const alVencer = vi.fn();
    const { rerender } = renderHook(({ activo }) => useCierrePorInactividad(activo, 30_000, alVencer), { initialProps: { activo: true } });
    act(() => { vi.advanceTimersByTime(20_000); });
    rerender({ activo: false });
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(alVencer).not.toHaveBeenCalled();
  });

  it('al volver a encenderse empieza la cuenta de cero', () => {
    const alVencer = vi.fn();
    const { rerender } = renderHook(({ activo }) => useCierrePorInactividad(activo, 30_000, alVencer), { initialProps: { activo: true } });
    act(() => { vi.advanceTimersByTime(20_000); });
    rerender({ activo: false });
    rerender({ activo: true });
    act(() => { vi.advanceTimersByTime(20_000); });
    expect(alVencer).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(10_000); });
    expect(alVencer).toHaveBeenCalledTimes(1);
  });
});
