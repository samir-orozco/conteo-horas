import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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
