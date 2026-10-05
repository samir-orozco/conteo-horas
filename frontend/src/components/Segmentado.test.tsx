import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import Segmentado from './Segmentado';

// EL SELECTOR DE OPCIONES CON LA PÍLDORA QUE SE DESLIZA (4 de octubre de 2026). Nació en el calendario de
// turnos (Día · Semana · Mes) y lo usa también el seguimiento del clima laboral: una sola pieza, para
// que las dos se muevan igual (CLAUDE.md §9.3).

const OPCIONES = [
  { valor: 'A', etiqueta: 'Sin revisar' },
  { valor: 'B', etiqueta: 'En seguimiento' },
  { valor: 'C', etiqueta: 'Cerrado' },
] as const;

const montar = (valor: 'A' | 'B' | 'C', onCambio = vi.fn(), deshabilitado = false) => {
  render(<Segmentado etiqueta="Estado del caso" opciones={OPCIONES} valor={valor} onCambio={onCambio} deshabilitado={deshabilitado} />);
  return onCambio;
};

describe('Segmentado', () => {
  it('es un grupo con su nombre, y dice cuál está encendida', () => {
    montar('B');
    const grupo = screen.getByRole('group', { name: 'Estado del caso' });
    expect(within(grupo).getAllByRole('button').map(b => b.getAttribute('aria-pressed'))).toEqual(['false', 'true', 'false']);
  });

  it('tocar otra opción la pide', () => {
    const onCambio = montar('A');
    fireEvent.click(screen.getByRole('button', { name: 'Cerrado' }));
    expect(onCambio).toHaveBeenCalledWith('C');
  });

  it('tocar la que ya está encendida también avisa: quien lo usa decide qué hacer', () => {
    // En turnos, tocar la vista encendida limpia las celdas marcadas, y al volverse pieza compartida no
    // podía dejar de hacerlo. El seguimiento, en cambio, la ignora.
    const onCambio = montar('A');
    fireEvent.click(screen.getByRole('button', { name: 'Sin revisar' }));
    expect(onCambio).toHaveBeenCalledWith('A');
  });

  it('la píldora mide una opción y se para debajo de la encendida', () => {
    const { container } = render(<Segmentado etiqueta="x" opciones={OPCIONES} valor="C" onCambio={vi.fn()} />);
    const pildora = container.querySelector('[aria-hidden="true"]') as HTMLElement;
    // Un tercio del carril. jsdom reescribe la fórmula («0.333… * (100% - 6px)»), así que se exige el
    // tercio y no la forma en que va escrito.
    expect(pildora.style.width).toMatch(/0\.3333|\/ 3\)/);
    expect(pildora.style.transform).toBe('translateX(200%)');
  });

  it('deshabilitado no deja cambiar', () => {
    const onCambio = montar('A', vi.fn(), true);
    fireEvent.click(screen.getByRole('button', { name: 'Cerrado' }));
    expect(onCambio).not.toHaveBeenCalled();
  });
});
