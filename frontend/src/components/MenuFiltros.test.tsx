import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MenuFiltros, { type GrupoFiltro } from './MenuFiltros';

const GRUPOS: GrupoFiltro[] = [
  { clave: 'llegada', titulo: 'Llegada', opciones: [
    { valor: 'TARDE', texto: 'Tarde' }, { valor: 'A_TIEMPO', texto: 'A tiempo' }] },
  { clave: 'salida', titulo: 'Salida', opciones: [
    { valor: 'ESTIMADA', texto: 'No marcó salida' }, { valor: 'SIN_SALIDA', texto: 'Sin salida' }] },
];

const montar = (seleccion: Record<string, string[]> = {}, onCambiar = vi.fn()) => {
  const r = render(<MenuFiltros grupos={GRUPOS} seleccion={seleccion} onCambiar={onCambiar} />);
  return { ...r, onCambiar };
};

const abrir = async () => userEvent.click(screen.getByRole('button', { name: /Filtros/i }));

describe('el menú de filtros', () => {
  it('empieza cerrado: no le roba la pantalla a la tabla', () => {
    montar();
    expect(screen.queryByText('Llegada')).not.toBeInTheDocument();
  });

  it('al abrirlo muestra cada grupo con sus opciones', async () => {
    montar();
    await abrir();
    expect(screen.getByText('Llegada')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Tarde$/ })).toBeInTheDocument();
    expect(screen.getByText('Salida')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /No marcó salida/ })).toBeInTheDocument();
  });

  it('marcar una opción la agrega a su grupo, sin tocar los demás', async () => {
    const { onCambiar } = montar({ salida: ['ESTIMADA'] });
    await abrir();
    await userEvent.click(screen.getByRole('button', { name: /^Tarde$/ }));
    expect(onCambiar).toHaveBeenCalledWith({ salida: ['ESTIMADA'], llegada: ['TARDE'] });
  });

  it('volver a marcarla la quita', async () => {
    const { onCambiar } = montar({ llegada: ['TARDE'] });
    await abrir();
    await userEvent.click(screen.getByRole('button', { name: /^Tarde$/ }));
    expect(onCambiar).toHaveBeenCalledWith({ llegada: [] });
  });

  it('lo marcado se anuncia, no solo se colorea', async () => {
    // El color solo no le sirve a quien no lo distingue.
    montar({ llegada: ['TARDE'] });
    await abrir();
    expect(screen.getByRole('button', { name: /^Tarde$/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /^A tiempo$/ })).toHaveAttribute('aria-pressed', 'false');
  });

  it('con filtros puestos lo dice en el botón, sin tener que abrirlo', async () => {
    // Una tabla filtrada que parece completa hace sacar conclusiones sobre
    // datos que no están.
    montar({ llegada: ['TARDE'], salida: ['ESTIMADA', 'SIN_SALIDA'] });
    expect(screen.getByRole('button', { name: /Filtros/i })).toHaveTextContent('3');
  });

  it('sin filtros no pinta un cero', async () => {
    montar();
    expect(screen.getByRole('button', { name: /Filtros/i })).not.toHaveTextContent('0');
  });

  it('limpiar los quita todos de un golpe', async () => {
    const { onCambiar } = montar({ llegada: ['TARDE'], salida: ['ESTIMADA'] });
    await abrir();
    await userEvent.click(screen.getByRole('button', { name: /Limpiar/i }));
    expect(onCambiar).toHaveBeenCalledWith({});
  });

  it('sin nada marcado no ofrece limpiar', async () => {
    montar();
    await abrir();
    expect(screen.queryByRole('button', { name: /Limpiar/i })).not.toBeInTheDocument();
  });

  it('se cierra al tocar afuera', async () => {
    montar();
    await abrir();
    expect(screen.getByText('Llegada')).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText(/Cerrar los filtros/i));
    expect(screen.queryByText('Llegada')).not.toBeInTheDocument();
  });

  it('un grupo sin opciones no se pinta: un título suelto no dice nada', async () => {
    // Una empresa sin sedes no tiene por qué ver un grupo "Sede" vacío.
    render(<MenuFiltros grupos={[GRUPOS[0], { clave: 'sede', titulo: 'Sede', opciones: [] }]}
      seleccion={{}} onCambiar={vi.fn()} />);
    await abrir();
    expect(screen.queryByText('Sede')).not.toBeInTheDocument();
    expect(screen.getByText('Llegada')).toBeInTheDocument();
  });
});
