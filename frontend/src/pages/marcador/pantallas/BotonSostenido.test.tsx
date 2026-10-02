import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import BotonSostenido from './BotonSostenido';

// EL BOTÓN QUE HAY QUE SOSTENER (2 de octubre de 2026).
//
// El 1 de octubre dos personas oprimieron el botón grande de otra sin mirar el
// nombre. Un toque ya no marca: hay que sostenerlo, y el botón dice a nombre de
// quién. Lo que se prueba aquí es que NINGÚN atajo lo dispare antes de tiempo.

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const montar = (props: Partial<React.ComponentProps<typeof BotonSostenido>> = {}) => {
  const onConfirmar = vi.fn();
  render(<BotonSostenido ms={1500} onConfirmar={onConfirmar} {...props}>Soy Ana · Registrar salida</BotonSostenido>);
  return { onConfirmar, boton: screen.getByRole('button', { name: /soy ana · registrar salida/i }) };
};

describe('BotonSostenido', () => {
  it('sostenido el tiempo completo, confirma una sola vez', () => {
    const { onConfirmar, boton } = montar();
    fireEvent.pointerDown(boton, { pointerId: 1, button: 0 });
    act(() => { vi.advanceTimersByTime(1500); });
    fireEvent.pointerUp(boton, { pointerId: 1 });
    expect(onConfirmar).toHaveBeenCalledTimes(1);
  });

  it('soltado antes de tiempo, no confirma', () => {
    const { onConfirmar, boton } = montar();
    fireEvent.pointerDown(boton, { pointerId: 1, button: 0 });
    act(() => { vi.advanceTimersByTime(1400); });
    fireEvent.pointerUp(boton, { pointerId: 1 });
    act(() => { vi.advanceTimersByTime(1000); });
    expect(onConfirmar).not.toHaveBeenCalled();
  });

  it('un toque, que es lo que hacía la gente sin mirar, no marca', () => {
    const { onConfirmar, boton } = montar();
    fireEvent.pointerDown(boton, { pointerId: 1, button: 0 });
    fireEvent.pointerUp(boton, { pointerId: 1 });
    fireEvent.click(boton);
    act(() => { vi.advanceTimersByTime(5000); });
    expect(onConfirmar).not.toHaveBeenCalled();
  });

  it('si el navegador cancela el toque (un desplazamiento), no confirma', () => {
    const { onConfirmar, boton } = montar();
    fireEvent.pointerDown(boton, { pointerId: 1, button: 0 });
    fireEvent.pointerCancel(boton, { pointerId: 1 });
    act(() => { vi.advanceTimersByTime(2000); });
    expect(onConfirmar).not.toHaveBeenCalled();
  });

  it('la reforzada exige su tiempo completo', () => {
    const { onConfirmar, boton } = montar({ ms: 3000 });
    fireEvent.pointerDown(boton, { pointerId: 1, button: 0 });
    act(() => { vi.advanceTimersByTime(2900); });
    expect(onConfirmar).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(100); });
    expect(onConfirmar).toHaveBeenCalledTimes(1);
  });

  it('deshabilitado no hace nada', () => {
    const { onConfirmar, boton } = montar({ disabled: true });
    fireEvent.pointerDown(boton, { pointerId: 1, button: 0 });
    act(() => { vi.advanceTimersByTime(2000); });
    expect(onConfirmar).not.toHaveBeenCalled();
  });

  it('con el teclado también hay que sostener: Enter mantenido confirma, soltado antes no', () => {
    const { onConfirmar, boton } = montar();
    fireEvent.keyDown(boton, { key: 'Enter' });
    act(() => { vi.advanceTimersByTime(500); });
    fireEvent.keyUp(boton, { key: 'Enter' });
    act(() => { vi.advanceTimersByTime(2000); });
    expect(onConfirmar).not.toHaveBeenCalled();
    fireEvent.keyDown(boton, { key: 'Enter' });
    act(() => { vi.advanceTimersByTime(1500); });
    expect(onConfirmar).toHaveBeenCalledTimes(1);
  });

  it('le dice a la persona que lo sostenga', () => {
    montar();
    expect(screen.getByText(/mantén presionado/i)).toBeInTheDocument();
  });
});

describe('BotonSostenido · cuando la pantalla cambia a mitad del gesto', () => {
  it('si se deshabilita mientras se sostiene, ese gesto ya no marca', () => {
    const onConfirmar = vi.fn();
    const { rerender } = render(<BotonSostenido ms={1500} onConfirmar={onConfirmar}>Soy Ana</BotonSostenido>);
    fireEvent.pointerDown(screen.getByRole('button', { name: /soy ana/i }), { pointerId: 1, button: 0 });
    rerender(<BotonSostenido ms={1500} onConfirmar={onConfirmar} disabled>Soy Ana</BotonSostenido>);
    act(() => { vi.advanceTimersByTime(2000); });
    expect(onConfirmar).not.toHaveBeenCalled();
  });

  it('si desaparece mientras se sostiene, no marca después', () => {
    const onConfirmar = vi.fn();
    const { unmount } = render(<BotonSostenido ms={1500} onConfirmar={onConfirmar}>Soy Ana</BotonSostenido>);
    fireEvent.pointerDown(screen.getByRole('button', { name: /soy ana/i }), { pointerId: 1, button: 0 });
    unmount();
    act(() => { vi.advanceTimersByTime(2000); });
    expect(onConfirmar).not.toHaveBeenCalled();
  });
});
