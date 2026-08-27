import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CabeceraFicha from './CabeceraFicha';

const persona = {
  nombre: 'Julián', apellido: 'Restrepo', cargo: 'Vigilante', cedula: '1020304050',
  salarioMensual: 1750905, creadoEn: '2026-07-06T05:00:00.000Z', activo: true,
};

const montar = (over = {}, acciones = {}) => render(
  <CabeceraFicha
    persona={{ ...persona, ...over }}
    onVolver={vi.fn()}
    onEditar={vi.fn()}
    {...acciones}
  />,
);

describe('la cabecera de la ficha', () => {
  it('muestra quién es y lo que lo identifica de un vistazo', () => {
    montar();
    expect(screen.getByRole('heading', { name: /Julián Restrepo/ })).toBeInTheDocument();
    expect(screen.getByText('Vigilante')).toBeInTheDocument();
    expect(screen.getByText(/1020304050/)).toBeInTheDocument();
    expect(screen.getByText(/1\.750\.905/)).toBeInTheDocument();
  });

  it('sin cargo lo dice, en vez de dejar un hueco', () => {
    montar({ cargo: null });
    expect(screen.getByText('Sin cargo')).toBeInTheDocument();
  });

  it('sin foto usa las iniciales', () => {
    montar();
    expect(screen.getByText('JR')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /Foto de/i })).not.toBeInTheDocument();
  });

  it('con foto la muestra y describe de quién es, no "avatar"', () => {
    montar({ foto: 'data:image/jpeg;base64,xxx' });
    const img = screen.getByRole('img', { name: /Foto de/i });
    expect(img).toHaveAttribute('src', 'data:image/jpeg;base64,xxx');
    expect(img).toHaveAccessibleName(/Julián Restrepo/);
  });

  it('quien está retirado se ve retirado, y no solo por el color', () => {
    // El punto de estado es verde o gris. Quien no distingue esos dos colores
    // necesita la palabra.
    montar({ activo: false });
    expect(screen.getByText('RETIRADO')).toBeInTheDocument();
  });

  it('el estado también se anuncia a un lector de pantalla', () => {
    montar({ activo: false });
    expect(screen.getByLabelText(/Retirado/i)).toBeInTheDocument();
  });

  it('volver y editar hacen lo suyo', async () => {
    const onVolver = vi.fn(), onEditar = vi.fn();
    montar({}, { onVolver, onEditar });
    await userEvent.click(screen.getByRole('button', { name: /Volver/i }));
    expect(onVolver).toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: /Editar/i }));
    expect(onEditar).toHaveBeenCalled();
  });

  it('sin fecha de ingreso no inventa un "desde"', () => {
    montar({ creadoEn: null });
    expect(screen.queryByText(/Desde/i)).not.toBeInTheDocument();
  });
});
