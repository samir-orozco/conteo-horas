import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LlegadasTarde7d from './LlegadasTarde7d';
import type { Dash } from '../types';

// LAS LLEGADAS TARDE DE LOS ÚLTIMOS 7 DÍAS EN EL INICIO (15 de octubre de 2026). Una fila por día,
// hoy arriba y abierto; las demás se abren al tocarlas. Reemplaza a la lista «Llegadas tarde hoy»:
// lo que esa lista mostraba sin tocar nada sigue a la vista, en la fila de hoy.

type Dias = NonNullable<Dash['llegadasTarde7d']>['dias'];
const tarde = (id: string, minutosTarde: number, horaLlegada: string) => ({ id, horaEsperada: '08:00', horaLlegada, minutosTarde });
const dia = (d: number, over: Partial<Dias[number]> = {}): Dias[number] => ({
  clave: `2026-10-${String(d).padStart(2, '0')}`, fecha: `2026-10-${String(d).padStart(2, '0')}T05:00:00.000Z`, esHoy: false, festivo: false,
  debian: 0, llegaron: over.debian ?? 0, enTiempo: 0, conNovedad: 0, totalMinutos: 0, personas: [], ...over,
});
const DATOS: NonNullable<Dash['llegadasTarde7d']> = {
  dias: [
    dia(9, { debian: 5, totalMinutos: 40, personas: [tarde('luis', 40, '08:45')] }),
    dia(10), dia(11),
    dia(12, { festivo: true }),
    dia(13, { debian: 5, totalMinutos: 22, personas: [tarde('ana', 22, '08:27')] }),
    dia(14, { debian: 5 }),
    dia(15, { esHoy: true, debian: 5, totalMinutos: 25, personas: [tarde('caro', 25, '08:30')] }),
  ],
  personas: {
    luis: { nombre: 'Luis Mora', fotoMini: 'data:image/jpeg;base64,xx' },
    ana: { nombre: 'Ana Ruiz', fotoMini: null },
    caro: { nombre: 'Caro Díaz', fotoMini: null },
  },
};

describe('LlegadasTarde7d', () => {
  it('hoy arriba y abierto: quién llegó tarde se ve sin tocar nada', () => {
    render(<LlegadasTarde7d {...DATOS} />);
    const hoy = screen.getByRole('button', { name: /Hoy, jueves 15 de octubre: 1 llegó tarde/ });
    expect(hoy).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Caro Díaz')).toBeInTheDocument();
    expect(screen.getByText('Llegó a las 08:30 · 25 min tarde')).toBeInTheDocument();
  });

  it('otro día se abre al tocarlo, y se cierra con el mismo toque', () => {
    render(<LlegadasTarde7d {...DATOS} />);
    const martes = screen.getByRole('button', { name: /martes 13 de octubre/ });
    fireEvent.click(martes);
    expect(martes).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Llegó a las 08:27 · 22 min tarde')).toBeInTheDocument();
    fireEvent.click(martes);
    expect(screen.queryByText('Llegó a las 08:27 · 22 min tarde')).not.toBeInTheDocument();
  });

  it('solo los días con llegadas tarde se pueden abrir; los demás dicen qué pasó', () => {
    render(<LlegadasTarde7d {...DATOS} />);
    expect(screen.getAllByRole('button')).toHaveLength(3);
    expect(screen.getByText('todos a tiempo')).toBeInTheDocument();
    expect(screen.getByText('festivo')).toBeInTheDocument();
    expect(screen.getAllByText('sin turnos')).toHaveLength(2);
  });

  it('dice el total de los 7 días, y que es después de la tolerancia', () => {
    render(<LlegadasTarde7d {...DATOS} />);
    expect(screen.getByText('Total: 1h 27min · 3 llegadas tarde · después de la tolerancia')).toBeInTheDocument();
  });

  it('la foto chica es decorativa: el nombre ya va en la fila', () => {
    const { container } = render(<LlegadasTarde7d {...DATOS} />);
    const img = container.querySelector('img[src="data:image/jpeg;base64,xx"]');
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute('alt', '');
  });
});
