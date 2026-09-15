import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { progresoAlBajar, useProgresoAlBajar } from './useProgresoAlBajar';

// El encabezado de la landing pasa de amarillo a blanco a la par del scroll, no con una animación que
// se dispara al cruzar un punto (decisión del dueño del 15 de septiembre de 2026). El avance viaja en
// la variable CSS --progreso, de 0 (arriba del todo) a 1 (blanco del todo).

const ponerScroll = (y: number) => {
  Object.defineProperty(window, 'scrollY', { value: y, configurable: true, writable: true });
};
const bajarA = (y: number) => act(() => {
  ponerScroll(y);
  window.dispatchEvent(new Event('scroll'));
});

function Encabezado({ distancia }: { distancia?: number }) {
  const ref = useProgresoAlBajar<HTMLElement>(distancia);
  return <header ref={ref}>HoraPro</header>;
}
const progresoEn = (el: HTMLElement) => el.style.getPropertyValue('--progreso');

afterEach(() => ponerScroll(0));

describe('progresoAlBajar', () => {
  it('va de 0 arriba del todo a 1 al recorrer la distancia, sin pasarse ni quedar por debajo de 0', () => {
    expect(progresoAlBajar(0, 200)).toBe(0);
    expect(progresoAlBajar(50, 200)).toBe(0.25);
    expect(progresoAlBajar(200, 200)).toBe(1);
    expect(progresoAlBajar(900, 200)).toBe(1);
    // El rebote del trackpad arriba del todo da posiciones negativas.
    expect(progresoAlBajar(-30, 200)).toBe(0);
  });
});

describe('useProgresoAlBajar', () => {
  it('arriba del todo el encabezado arranca en 0', () => {
    render(<Encabezado distancia={200} />);
    expect(progresoEn(screen.getByRole('banner'))).toBe('0');
  });

  it('avanza a la par del scroll, y al volver arriba regresa a 0', () => {
    render(<Encabezado distancia={200} />);
    const encabezado = screen.getByRole('banner');
    bajarA(50);
    expect(progresoEn(encabezado)).toBe('0.25');
    bajarA(150);
    expect(progresoEn(encabezado)).toBe('0.75');
    bajarA(600);
    expect(progresoEn(encabezado)).toBe('1');
    bajarA(0);
    expect(progresoEn(encabezado)).toBe('0');
  });

  it('si la página abre ya bajada, arranca en el punto que le toca', () => {
    ponerScroll(100);
    render(<Encabezado distancia={200} />);
    expect(progresoEn(screen.getByRole('banner'))).toBe('0.5');
  });

  it('al salir de la landing deja de seguir el scroll', () => {
    const { unmount } = render(<Encabezado distancia={200} />);
    const encabezado = screen.getByRole('banner');
    unmount();
    bajarA(200);
    expect(progresoEn(encabezado)).toBe('0');
  });
});
