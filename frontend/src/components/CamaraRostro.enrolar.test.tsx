import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CamaraRostro from './CamaraRostro';

// Lo que se ve del registro facial guiado mientras la cámara arranca (14 de septiembre de 2026). Aquí
// los modelos nunca terminan de cargar, así que la pantalla se queda preparándose: basta para ver qué
// tarjeta y qué pasos se pintan, sin cámara ni reconocimiento. Y que el ingreso del kiosco no cambió.
vi.mock('face-api.js', () => ({ detectSingleFace: vi.fn(), TinyFaceDetectorOptions: vi.fn() }));
vi.mock('../lib/faceapi', () => ({
  cargarModelosLigeros: () => new Promise(() => {}),
  cargarModeloRostro: () => new Promise(() => {}),
  modelosEnCache: () => Promise.resolve(true),
}));

describe('CamaraRostro al registrar un rostro', () => {
  it('con gafas: la tarjeta del primer paso es de frente con gafas, y los pasos no dicen derecha ni izquierda', () => {
    render(<CamaraRostro modo="enrolar" pasoGafas onCapturado={vi.fn()} />);
    expect(screen.getByText('Paso 1 de 4')).toBeInTheDocument();
    expect(screen.getByRole('img').getAttribute('src')).toContain('/frente-con-gafas.svg');
    for (const rotulo of ['Frente', 'Giro ←', 'Giro →', 'Sin gafas']) expect(screen.getByText(rotulo)).toBeInTheDocument();
    expect(screen.queryByText(/derech|izquierd/i)).not.toBeInTheDocument();
  });

  it('sin gafas: tres pasos, y el primero de frente sin gafas', () => {
    render(<CamaraRostro modo="enrolar" onCapturado={vi.fn()} />);
    expect(screen.getByText('Paso 1 de 3')).toBeInTheDocument();
    expect(screen.getByRole('img').getAttribute('src')).toContain('/frente-sin-gafas.svg');
  });
});

describe('CamaraRostro en el ingreso del kiosco', () => {
  it('no muestra tarjetas ni pasos', () => {
    render(<CamaraRostro modo="login" onCapturado={vi.fn()} />);
    expect(screen.queryByText(/Paso 1 de/)).not.toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByText('Frente')).not.toBeInTheDocument();
  });
});
