import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { MemoryRouter, useNavigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useTabFicha } from './useTabFicha';

const montar = (inicial = '/app/colaboradores/c1') => {
  const wrapper = ({ children }: { children: ReactNode }) =>
    <MemoryRouter initialEntries={[inicial]}>{children}</MemoryRouter>;
  return renderHook(() => ({
    tabs: useTabFicha(),
    navegar: useNavigate(),
    donde: useLocation(),
  }), { wrapper });
};

describe('el tab de la ficha, atado a la dirección', () => {
  it('abre en el tab que dice la dirección', () => {
    const { result } = montar('/app/colaboradores/c1?tab=contratos');
    expect(result.current.tabs[0]).toBe('contratos');
  });

  it('sin tab en la dirección, abre en resumen', () => {
    expect(montar().result.current.tabs[0]).toBe('resumen');
  });

  it('un tab inventado cae al resumen en vez de dejar la ficha en blanco', () => {
    const { result } = montar('/app/colaboradores/c1?tab=inventado');
    expect(result.current.tabs[0]).toBe('resumen');
  });

  it('cambiar de tab lo escribe en la dirección, para poder pasar el enlace', () => {
    const { result } = montar();
    act(() => result.current.tabs[1]('historia'));
    expect(result.current.donde.search).toBe('?tab=historia');
    expect(result.current.tabs[0]).toBe('historia');
  });

  it('volver al resumen limpia la dirección: el tab por defecto no la ensucia', () => {
    const { result } = montar('/app/colaboradores/c1?tab=historia');
    act(() => result.current.tabs[1]('resumen'));
    expect(result.current.donde.search).toBe('');
  });

  it('no pisa otros parámetros que ya vinieran en la dirección', () => {
    const { result } = montar('/app/colaboradores/c1?desde=notificacion');
    act(() => result.current.tabs[1]('contratos'));
    expect(result.current.donde.search).toContain('desde=notificacion');
    expect(result.current.donde.search).toContain('tab=contratos');
  });

  it('si la dirección cambia desde afuera, el tab la sigue', () => {
    // Este es el caso de la campana: estando ya en la ficha de alguien, un
    // aviso de contrato navega a ?tab=contratos. Si el tab solo se leyera al
    // montar, el clic no haría nada visible.
    const { result } = montar('/app/colaboradores/c1');
    expect(result.current.tabs[0]).toBe('resumen');

    act(() => result.current.navegar('/app/colaboradores/c1?tab=contratos'));
    expect(result.current.tabs[0]).toBe('contratos');
  });

  it('y también al saltar a OTRA persona, que no vuelve a montar la ficha', () => {
    const { result } = montar('/app/colaboradores/c1?tab=historia');
    act(() => result.current.navegar('/app/colaboradores/c2?tab=contratos'));
    expect(result.current.tabs[0]).toBe('contratos');
  });
});
