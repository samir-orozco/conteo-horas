import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// LA SESIÓN GUARDA LO QUE LA CONFIRMACIÓN NECESITA (2 de octubre de 2026): la foto
// de la ficha y si la cara se pareció poco a su registro, tal como los manda el
// login. Y al irse la persona, los dos se borran: en una tableta compartida, lo que
// quede vivo se lo aplica el siguiente.

const api = vi.hoisted(() => ({ loginRostro: vi.fn(), loginCedula: vi.fn(), getEstado: vi.fn() }));
vi.mock('./api', () => api);
import { useSesionKiosco } from './useSesionKiosco';

const colaborador = { id: 'c1', nombre: 'Ana', apellido: 'Giraldo', cargo: null, modalidad: 'PRESENCIAL' };

beforeEach(() => {
  api.loginRostro.mockReset();
  api.loginCedula.mockReset();
  api.getEstado.mockReset();
  api.getEstado.mockResolvedValue({ dentroAhora: false });
});

describe('useSesionKiosco', () => {
  it('con rostro: guarda la foto de la ficha y el parecido dudoso del login', async () => {
    api.loginRostro.mockResolvedValue({ token: 't', colaborador, fotoReferencia: 'data:image/jpeg;base64,ficha', parecidoDudoso: true });
    const { result } = renderHook(() => useSesionKiosco('kiosco'));
    await act(async () => { await result.current.ingresarRostro([0.1]); });
    expect(result.current.fotoReferencia).toBe('data:image/jpeg;base64,ficha');
    expect(result.current.parecidoDudoso).toBe(true);
  });

  it('con cédula: lo mismo, con lo que mande el servidor', async () => {
    api.loginCedula.mockResolvedValue({ token: 't', colaborador, fotoReferencia: null, parecidoDudoso: false });
    const { result } = renderHook(() => useSesionKiosco('kiosco'));
    await act(async () => { await result.current.ingresar('123'); });
    expect(result.current.fotoReferencia).toBeNull();
    expect(result.current.parecidoDudoso).toBe(false);
  });

  it('un servidor anterior que no manda los campos: sin foto y sin aviso', async () => {
    api.loginRostro.mockResolvedValue({ token: 't', colaborador });
    const { result } = renderHook(() => useSesionKiosco('kiosco'));
    await act(async () => { await result.current.ingresarRostro([0.1]); });
    expect(result.current.fotoReferencia).toBeNull();
    expect(result.current.parecidoDudoso).toBe(false);
  });

  it('al irse la persona, se borran los dos', async () => {
    api.loginRostro.mockResolvedValue({ token: 't', colaborador, fotoReferencia: 'data:image/jpeg;base64,ficha', parecidoDudoso: true });
    const { result } = renderHook(() => useSesionKiosco('kiosco'));
    await act(async () => { await result.current.ingresarRostro([0.1]); });
    act(() => { result.current.limpiarSesion(); });
    expect(result.current.fotoReferencia).toBeNull();
    expect(result.current.parecidoDudoso).toBe(false);
  });
});
