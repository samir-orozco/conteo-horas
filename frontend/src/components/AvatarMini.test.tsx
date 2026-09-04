import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AvatarMini from './AvatarMini';

describe('el círculo de la persona en las listas', () => {
  it('con foto la muestra y dice de quién es', () => {
    render(<AvatarMini nombre="Julián" apellido="Torres" foto="data:image/jpeg;base64,xx" />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'data:image/jpeg;base64,xx');
    expect(img).toHaveAccessibleName(/Julián Torres/);
  });

  it('sin foto usa las iniciales', () => {
    render(<AvatarMini nombre="Julián" apellido="Torres" />);
    expect(screen.getByText('JT')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('las iniciales no le hablan al lector de pantalla: el nombre ya está al lado', () => {
    // Leer "J T Julián Torres" es ruido.
    render(<AvatarMini nombre="Julián" apellido="Torres" />);
    expect(screen.getByText('JT')).toHaveAttribute('aria-hidden', 'true');
  });

  it('un nombre de una sola palabra no revienta', () => {
    render(<AvatarMini nombre="Madonna" apellido="" />);
    expect(screen.getByText('M')).toBeInTheDocument();
  });

  it('sin nombre tampoco', () => {
    const { container } = render(<AvatarMini nombre="" apellido="" />);
    expect(container.firstChild).toBeTruthy();
  });

  it('quien está retirado se ve apagado, y no solo por el color', () => {
    render(<AvatarMini nombre="Carlos" apellido="Ramírez" activo={false} />);
    expect(screen.getByTitle(/Retirado/i)).toBeInTheDocument();
  });
});
