import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TabsFicha from './TabsFicha';

describe('la barra de tabs', () => {
  it('muestra los cinco', () => {
    render(<TabsFicha activo="resumen" onCambiar={() => {}} contadores={{}} />);
    for (const t of ['Resumen', 'Asistencia', 'Contratos', 'Novedades', 'Historia']) {
      expect(screen.getByRole('tab', { name: new RegExp(t, 'i') })).toBeInTheDocument();
    }
  });

  it('marca cuál está activo, para lectores de pantalla también', () => {
    render(<TabsFicha activo="contratos" onCambiar={() => {}} contadores={{}} />);
    expect(screen.getByRole('tab', { name: /contratos/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /resumen/i })).toHaveAttribute('aria-selected', 'false');
  });

  it('avisa cuál se eligió', async () => {
    const onCambiar = vi.fn();
    render(<TabsFicha activo="resumen" onCambiar={onCambiar} contadores={{}} />);
    await userEvent.click(screen.getByRole('tab', { name: /novedades/i }));
    expect(onCambiar).toHaveBeenCalledWith('novedades');
  });
});

describe('los contadores', () => {
  it('se pintan cuando hay algo que contar', () => {
    render(<TabsFicha activo="resumen" onCambiar={() => {}} contadores={{ novedades: 3, contratos: 1 }} />);
    expect(screen.getByRole('tab', { name: /novedades/i }).textContent).toContain('3');
    expect(screen.getByRole('tab', { name: /contratos/i }).textContent).toContain('1');
  });

  it('en cero no se pinta nada: un cero al lado del nombre parece un error', () => {
    render(<TabsFicha activo="resumen" onCambiar={() => {}} contadores={{ novedades: 0 }} />);
    expect(screen.getByRole('tab', { name: /novedades/i }).textContent).not.toContain('0');
  });

  it('sin dato tampoco, porque todavía no se sabe', () => {
    render(<TabsFicha activo="resumen" onCambiar={() => {}} contadores={{}} />);
    const tab = screen.getByRole('tab', { name: /novedades/i });
    expect(tab.textContent?.trim()).toBe('Novedades');
  });
});
