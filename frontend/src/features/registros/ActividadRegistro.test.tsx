import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ActividadRegistro from './ActividadRegistro';

const get = vi.fn();
vi.mock('../../lib/api', () => ({ default: { get: (...a: unknown[]) => get(...a) } }));

const cambio = (over: Record<string, unknown> = {}) => ({
  id: 'c1', campo: 'entrada', antes: '08:15', despues: '08:00',
  usuarioNombre: 'Ana Gómez', creadoEn: '2026-08-24T14:30:00.000Z', ...over,
});

const montar = () => render(<ActividadRegistro registroId="r1" />);

describe('la actividad de una marcación', () => {
  it('una marcación sin ediciones no muestra una sección que diga que no pasó nada', async () => {
    get.mockResolvedValueOnce({ data: [] });
    const { container } = montar();
    await vi.waitFor(() => expect(get).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('dice qué cambió, de qué a qué: eso es lo que sirve el día que alguien reclama', async () => {
    get.mockResolvedValueOnce({ data: [cambio()] });
    montar();
    expect(await screen.findByText(/la entrada/)).toBeInTheDocument();
    expect(screen.getByText('08:15')).toBeInTheDocument();
    expect(screen.getByText('08:00')).toBeInTheDocument();
  });

  it('nombra el campo en español, no con la llave de la base', async () => {
    get.mockResolvedValueOnce({ data: [cambio({ campo: 'salidaAlmuerzo' })] });
    montar();
    expect(await screen.findByText(/la marca de salida al almuerzo/)).toBeInTheDocument();
    expect(screen.queryByText(/salidaAlmuerzo/)).not.toBeInTheDocument();
  });

  it('un campo que no conoce lo muestra igual, en vez de esconder el cambio', async () => {
    get.mockResolvedValueOnce({ data: [cambio({ campo: 'campoNuevo' })] });
    montar();
    expect(await screen.findByText(/campoNuevo/)).toBeInTheDocument();
  });

  it('la hora es la de Bogotá, no la del navegador de quien mira', async () => {
    // 14:30 UTC son las 9:30 a. m. en Bogotá. Sin anclar la zona, quien abra
    // esto desde otro país vería una hora que nunca ocurrió.
    get.mockResolvedValueOnce({ data: [cambio()] });
    montar();
    expect(await screen.findByText(/9:30/)).toBeInTheDocument();
  });

  it('si el autor ya no existe lo dice, en vez de dejar el cambio sin dueño', async () => {
    get.mockResolvedValueOnce({ data: [cambio({ usuarioNombre: null })] });
    montar();
    expect(await screen.findByText(/Usuario eliminado/)).toBeInTheDocument();
  });

  it('si el servidor falla no rompe el formulario que la contiene', async () => {
    get.mockRejectedValueOnce(new Error('sin red'));
    const { container } = montar();
    await vi.waitFor(() => expect(get).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});
