import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import type { ReactElement } from 'react';
import CapturadorErrores from './CapturadorErrores';

// Hasta hoy, un error en la pantalla de alguien solo se veía en su celular y había que pedirle una
// foto del texto: así se diagnosticó el crash del kiosco en Android. Ahora además viaja al
// registro del sistema, que es lo que permite enterarse sin que nadie avise.

const { post } = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('../lib/api', () => ({ default: { post: (...a: unknown[]) => post(...a) } }));

function Explota(): ReactElement {
  throw new Error('No se pudo abrir la cámara');
}

let errorDeConsola: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  post.mockReset();
  post.mockResolvedValue({ data: null });
  // React escribe el error en consola aunque el límite lo atrape; ensucia la salida de la suite.
  errorDeConsola = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => errorDeConsola.mockRestore());

describe('CapturadorErrores', () => {
  it('sigue enseñando el error en pantalla: quien lo sufre tiene que poder leerlo', () => {
    render(<CapturadorErrores><Explota /></CapturadorErrores>);
    expect(screen.getByText(/No se pudo abrir la cámara/)).toBeInTheDocument();
  });

  it('lo manda al registro del sistema, con la pantalla donde pasó', () => {
    render(<CapturadorErrores><Explota /></CapturadorErrores>);
    expect(post).toHaveBeenCalledWith('/eventos/navegador', expect.objectContaining({
      mensaje: expect.stringContaining('No se pudo abrir la cámara'),
      pantalla: expect.any(String),
    }));
  });

  it('si el envío falla, la aplicación no se entera: un registro que no se pudo guardar no puede tumbar nada', () => {
    post.mockRejectedValue(new Error('sin red'));
    expect(() => render(<CapturadorErrores><Explota /></CapturadorErrores>)).not.toThrow();
    expect(screen.getByText(/No se pudo abrir la cámara/)).toBeInTheDocument();
  });

  it('un mismo error no se reporta dos veces', () => {
    const { rerender } = render(<CapturadorErrores><Explota /></CapturadorErrores>);
    rerender(<CapturadorErrores><Explota /></CapturadorErrores>);
    expect(post).toHaveBeenCalledTimes(1);
  });
});

// Lo ajeno se reporta pero no tapa la página (ver errorAjeno.ts). La pantalla negra se queda para lo
// nuestro, que es donde sirve: quien lo sufre puede leerlo y avisar.
describe('CapturadorErrores · errores ajenos', () => {
  const lanzar = (mensaje: string, archivo: string) =>
    window.dispatchEvent(new ErrorEvent('error', { message: mensaje, filename: archivo, lineno: 1, colno: 1 }));
  const rechazar = (razon: unknown) => {
    const evento = new Event('unhandledrejection');
    Object.defineProperty(evento, 'reason', { value: razon });
    window.dispatchEvent(evento);
  };

  it('el del navegador interno de Android se reporta pero no tapa la página', () => {
    render(<CapturadorErrores><p>La página</p></CapturadorErrores>);
    act(() => lanzar('Uncaught Error: Error invoking postMessage: Java object is gone', ''));
    expect(screen.queryByText(/se capturó un error/i)).not.toBeInTheDocument();
    expect(screen.getByText('La página')).toBeInTheDocument();
    expect(post).toHaveBeenCalledWith('/eventos/navegador', expect.objectContaining({ mensaje: expect.stringContaining('Java object is gone') }));
  });

  it('uno de nuestro código sigue tapando la página', () => {
    render(<CapturadorErrores><p>La página</p></CapturadorErrores>);
    act(() => lanzar('TypeError: x is not a function', `${window.location.origin}/assets/index-abc.js`));
    expect(screen.getByText(/se capturó un error/i)).toBeInTheDocument();
  });

  it('una promesa rechazada en nuestro código sigue tapando la página', () => {
    render(<CapturadorErrores><p>La página</p></CapturadorErrores>);
    const error = new Error('algo');
    error.stack = `Error: algo\n    at f (${window.location.origin}/assets/index-abc.js:12:34)`;
    act(() => rechazar(error));
    expect(screen.getByText(/se capturó un error/i)).toBeInTheDocument();
  });
});

