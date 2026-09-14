import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TarjetaDePaso from './TarjetaDePaso';
import { pasosDeEnrolamiento } from './pasosEnrolar';

// La tarjeta que acompaña cada paso del registro facial, debajo de la cámara (14 de septiembre de 2026).

describe('TarjetaDePaso', () => {
  it('muestra el dibujo del paso, en qué paso va y qué hacer', () => {
    const pasos = pasosDeEnrolamiento(true);
    render(<TarjetaDePaso paso={pasos[1]} numero={2} total={pasos.length} />);
    expect(screen.getByRole('img').getAttribute('src')).toContain(`/${pasos[1].tarjeta}.svg`);
    expect(screen.getByText('Paso 2 de 4')).toBeInTheDocument();
    expect(screen.getByText(pasos[1].texto)).toBeInTheDocument();
  });

  it('cada paso usa su propio dibujo: con gafas no muestra el de sin gafas, ni un giro el del otro lado', () => {
    for (const paso of pasosDeEnrolamiento(true)) {
      const { unmount } = render(<TarjetaDePaso paso={paso} numero={1} total={4} />);
      expect(screen.getByRole('img').getAttribute('src')).toContain(`/${paso.tarjeta}.svg`);
      unmount();
    }
  });
});
