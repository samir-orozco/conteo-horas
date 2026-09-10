import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MenuAcciones from './MenuAcciones';

// La fila que lo contiene abre el detalle al tocarla, igual que en Registros.
function montar() {
  const editar = vi.fn();
  const eliminar = vi.fn();
  const fila = vi.fn();
  render(
    <div onClick={fila}>
      <MenuAcciones acciones={[
        { clave: 'editar', texto: 'Editar', onElegir: editar },
        { clave: 'eliminar', texto: 'Eliminar', peligro: true, onElegir: eliminar },
      ]} />
    </div>,
  );
  return { editar, eliminar, fila, boton: screen.getByRole('button', { name: 'Más acciones' }) };
}

describe('el menú de los tres puntos', () => {
  it('cerrado no enseña ninguna acción', () => {
    const { boton } = montar();
    expect(screen.queryByRole('menu')).toBeNull();
    expect(boton).toHaveAttribute('aria-expanded', 'false');
  });

  it('al abrir enseña Editar y Eliminar como opciones', async () => {
    const { boton } = montar();
    await userEvent.setup().click(boton);
    expect(screen.getByRole('menu')).toBeTruthy();
    expect(screen.getAllByRole('menuitem').map(b => b.textContent)).toEqual(['Editar', 'Eliminar']);
    expect(boton).toHaveAttribute('aria-expanded', 'true');
  });

  it('elegir una ejecuta SOLO esa y cierra el menú', async () => {
    const { boton, editar, eliminar } = montar();
    const u = userEvent.setup();
    await u.click(boton);
    await u.click(screen.getByRole('menuitem', { name: 'Editar' }));
    expect(editar).toHaveBeenCalledTimes(1);
    expect(eliminar).not.toHaveBeenCalled();
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('ni abrirlo ni elegir dispara el clic de la fila', async () => {
    // En Registros tocar la fila abre el detalle. El menú se pinta en un portal,
    // pero React burbujea sus eventos por el árbol: sin detenerlos, elegir
    // "Editar" abriría además el detalle por debajo.
    const { boton, fila } = montar();
    const u = userEvent.setup();
    await u.click(boton);
    await u.click(screen.getByRole('menuitem', { name: 'Eliminar' }));
    expect(fila).not.toHaveBeenCalled();
  });

  it('Escape lo cierra y devuelve el foco al botón', async () => {
    const { boton } = montar();
    const u = userEvent.setup();
    await u.click(boton);
    await u.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(boton);
  });

  it('tocar fuera lo cierra sin ejecutar nada', async () => {
    const { boton, editar, eliminar } = montar();
    await userEvent.setup().click(boton);
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('menu')).toBeNull();
    expect(editar).not.toHaveBeenCalled();
    expect(eliminar).not.toHaveBeenCalled();
  });

  it('al abrir, el foco va a la primera opción para poder seguir con el teclado', async () => {
    const { boton } = montar();
    await userEvent.setup().click(boton);
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Editar' }));
  });
});
