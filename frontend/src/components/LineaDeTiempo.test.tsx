import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LogIn, LogOut } from 'lucide-react';
import LineaDeTiempo, { type Hito } from './LineaDeTiempo';

const hito = (over: Partial<Hito> = {}): Hito => ({
  id: 'h' + Math.random(), icono: LogIn, tono: 'verde', titulo: 'Ingresó', ...over,
});

describe('la línea de tiempo', () => {
  it('pinta cada hito con su título y su detalle', () => {
    render(<LineaDeTiempo hitos={[
      hito({ titulo: 'Se retiró', detalle: 'Renuncia · 24 de agosto de 2026', icono: LogOut, tono: 'rojo' }),
      hito({ titulo: 'Ingresó', detalle: '1 de marzo de 2021' }),
    ]} />);
    expect(screen.getByText('Se retiró')).toBeInTheDocument();
    expect(screen.getByText('Renuncia · 24 de agosto de 2026')).toBeInTheDocument();
    expect(screen.getByText('Ingresó')).toBeInTheDocument();
  });

  it('es una lista de verdad, no una pila de divs', () => {
    // Quien navega con lector de pantalla necesita saber cuántos hitos hay y
    // moverse entre ellos.
    render(<LineaDeTiempo hitos={[hito(), hito()]} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('la nota va aparte del detalle, con su propia sangría', () => {
    render(<LineaDeTiempo hitos={[hito({ nota: 'Renunció para irse a estudiar.' })]} />);
    expect(screen.getByText('Renunció para irse a estudiar.')).toBeInTheDocument();
  });

  it('el adjunto se abre y dice de qué tipo es', async () => {
    const onAbrir = vi.fn();
    render(<LineaDeTiempo hitos={[hito({
      adjunto: { nombre: 'carta.pdf', tipo: 'application/pdf', onAbrir },
    })]} />);
    expect(screen.getByText('PDF')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /carta\.pdf/i }));
    expect(onAbrir).toHaveBeenCalled();
  });

  it('una imagen se anuncia como imagen, no como PDF', () => {
    render(<LineaDeTiempo hitos={[hito({
      adjunto: { nombre: 'foto.jpg', tipo: 'image/jpeg', onAbrir: vi.fn() },
    })]} />);
    expect(screen.getByText('Imagen')).toBeInTheDocument();
  });

  it('un adjunto sin nombre igual se puede abrir', () => {
    render(<LineaDeTiempo hitos={[hito({
      adjunto: { nombre: null, tipo: 'application/pdf', onAbrir: vi.fn() },
    })]} />);
    expect(screen.getByRole('button', { name: /Adjunto/i })).toBeInTheDocument();
  });

  it('el rótulo de tiempo y el autor van al pie', () => {
    render(<LineaDeTiempo hitos={[hito({ rotulo: 'HACE 3 DÍAS', autor: 'Ana Gómez' })]} />);
    expect(screen.getByText('HACE 3 DÍAS')).toBeInTheDocument();
    expect(screen.getByText(/Ana Gómez/)).toBeInTheDocument();
  });

  it('sin rótulo no queda un separador colgando delante del autor', () => {
    render(<LineaDeTiempo hitos={[hito({ rotulo: null, autor: 'Ana Gómez' })]} />);
    expect(screen.getByText(/Ana Gómez/).textContent?.trim()).toBe('Ana Gómez');
  });

  it('sin rótulo ni autor no pinta el pie vacío', () => {
    const { container } = render(<LineaDeTiempo hitos={[hito()]} />);
    expect(container.querySelectorAll('p')).toHaveLength(1); // solo el título
  });

  it('la insignia se pinta junto al título', () => {
    render(<LineaDeTiempo hitos={[hito({ insignia: { texto: 'PENDIENTE', tono: 'ambar' } })]} />);
    expect(screen.getByText('PENDIENTE')).toBeInTheDocument();
  });

  it('un hito que se puede abrir es un botón, y dice a dónde lleva', async () => {
    const onAbrir = vi.fn();
    render(<LineaDeTiempo hitos={[hito({ titulo: 'Vacaciones', onAbrir })]} />);
    await userEvent.click(screen.getByRole('button', { name: /Vacaciones/i }));
    expect(onAbrir).toHaveBeenCalled();
  });

  it('un hito sin acción no es un botón: no promete algo que no hace', () => {
    render(<LineaDeTiempo hitos={[hito({ titulo: 'Ingresó' })]} />);
    expect(screen.queryByRole('button', { name: /Ingresó/i })).not.toBeInTheDocument();
  });

  it('con muchos hitos muestra los primeros y ofrece ver el resto', async () => {
    render(<LineaDeTiempo hitos={Array.from({ length: 8 }, (_, i) => hito({ id: 'h' + i, titulo: 'Hito ' + i }))} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
    await userEvent.click(screen.getByRole('button', { name: /Ver 4 más/i }));
    expect(screen.getAllByRole('listitem')).toHaveLength(8);
    expect(screen.queryByRole('button', { name: /Ver .* más/i })).not.toBeInTheDocument();
  });

  it('cuántos se ven de entrada se puede cambiar', () => {
    render(<LineaDeTiempo hitos={Array.from({ length: 8 }, (_, i) => hito({ id: 'h' + i }))} visibles={2} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByRole('button', { name: /Ver 6 más/i })).toBeInTheDocument();
  });

  it('si caben todos no ofrece ver más', () => {
    render(<LineaDeTiempo hitos={[hito(), hito()]} />);
    expect(screen.queryByRole('button', { name: /Ver .* más/i })).not.toBeInTheDocument();
  });

  it('sin hitos no pinta nada: el estado vacío lo decide quien la usa', () => {
    const { container } = render(<LineaDeTiempo hitos={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('quien la usa le pone nombre a lo que oculta', () => {
    // "Ver 4 más" no dice más de qué. En la historia son movimientos, en las
    // novedades son novedades.
    render(<LineaDeTiempo hitos={Array.from({ length: 6 }, (_, i) => hito({ id: 'h' + i }))}
      sustantivo={{ singular: 'movimiento', plural: 'movimientos' }} />);
    expect(screen.getByRole('button', { name: /Ver 2 movimientos más/i })).toBeInTheDocument();
  });

  it('y el singular es singular', () => {
    render(<LineaDeTiempo hitos={Array.from({ length: 5 }, (_, i) => hito({ id: 'h' + i }))}
      sustantivo={{ singular: 'novedad', plural: 'novedades' }} />);
    expect(screen.getByRole('button', { name: /Ver 1 novedad más/i })).toBeInTheDocument();
  });
});
