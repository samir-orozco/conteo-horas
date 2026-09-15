import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useScrollSuave } from './useScrollSuave';

// El scroll suave de la landing (15 de septiembre de 2026). Lenis va simulado: aquí se prueba cuándo
// se enciende, que se apague al salir y que un enlace a una sección llegue deslizando sin el salto
// del navegador.

type Instancia = { opciones: unknown; scrollTo: ReturnType<typeof vi.fn>; destroy: ReturnType<typeof vi.fn> };
const h = vi.hoisted(() => ({ instancias: [] as Instancia[] }));

vi.mock('lenis', () => ({
  default: class {
    opciones: unknown;
    scrollTo = vi.fn();
    destroy = vi.fn();
    constructor(opciones: unknown) {
      this.opciones = opciones;
      h.instancias.push(this);
    }
  },
}));

// Un clic de verdad: burbujea y se puede cancelar. Devuelve si alguien frenó la navegación antes de
// llegar a window, y la frena ahí para que jsdom no intente navegar.
const clic = (el: Element) => {
  let frenado = false;
  const alFinal = (e: Event) => { frenado = e.defaultPrevented; e.preventDefault(); };
  window.addEventListener('click', alFinal, { once: true });
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
  return frenado;
};

const montarPagina = () => {
  const aPrecios = document.createElement('a');
  aPrecios.href = '#precios';
  aPrecios.textContent = 'Precios';
  const aBlog = document.createElement('a');
  aBlog.href = '/blog/';
  aBlog.textContent = 'Blog';
  const precios = document.createElement('section');
  precios.id = 'precios';
  document.body.append(aPrecios, aBlog, precios);
  return { aPrecios, aBlog, precios };
};

beforeEach(() => {
  h.instancias.length = 0;
  history.replaceState(null, '', '/');
});

afterEach(() => {
  document.body.querySelectorAll('a, section').forEach(el => el.remove());
});

describe('useScrollSuave', () => {
  it('enciende el scroll suave al abrir la landing y lo apaga al salir', () => {
    const { unmount } = renderHook(() => useScrollSuave());
    expect(h.instancias).toHaveLength(1);
    expect(h.instancias[0].opciones).toMatchObject({ autoRaf: true });
    unmount();
    expect(h.instancias[0].destroy).toHaveBeenCalledTimes(1);
  });

  it('no lo enciende para quien pidió reducir el movimiento en su equipo', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(consulta =>
      ({ matches: consulta.includes('prefers-reduced-motion: reduce'), media: consulta }) as MediaQueryList);
    renderHook(() => useScrollSuave());
    expect(h.instancias).toHaveLength(0);
  });

  it('un enlace a una sección llega deslizando, sin el salto del navegador, y deja la sección en la dirección', () => {
    const { aPrecios, precios } = montarPagina();
    renderHook(() => useScrollSuave());
    expect(clic(aPrecios)).toBe(true);
    expect(h.instancias[0].scrollTo).toHaveBeenCalledWith(precios);
    expect(location.hash).toBe('#precios');
  });

  it('un enlace a otra página se deja pasar', () => {
    const { aBlog } = montarPagina();
    renderHook(() => useScrollSuave());
    expect(clic(aBlog)).toBe(false);
    expect(h.instancias[0].scrollTo).not.toHaveBeenCalled();
  });

  it('al salir de la landing los enlaces a secciones vuelven a ser del navegador', () => {
    const { aPrecios } = montarPagina();
    const { unmount } = renderHook(() => useScrollSuave());
    unmount();
    expect(clic(aPrecios)).toBe(false);
  });
});
