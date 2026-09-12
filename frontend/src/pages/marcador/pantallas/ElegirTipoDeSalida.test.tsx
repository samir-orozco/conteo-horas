import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ElegirTipoDeSalida from './ElegirTipoDeSalida';

// A CUÁL descanso sale la persona lo decide el servidor por la hora (12 de septiembre
// de 2026): el que está en curso; si no hay, el próximo; si ya pasaron todos, el último
// pendiente. Carla, a las 10:00 y sin haber tomado ninguno, sale al de 15:00 a 15:10.
// Decirle «tu descanso va de 15:00 a 15:10» a esa hora es falso: lo cierto es que así
// queda anotado.
describe('ElegirTipoDeSalida · el descanso', () => {
  const montar = () => {
    const onDescanso = vi.fn();
    render(
      <ElegirTipoDeSalida almuerzo={null} descanso={{ inicio: '15:00', fin: '15:10' }}
        onAlmuerzo={vi.fn()} onDescanso={onDescanso} onFinJornada={vi.fn()} onCancelar={vi.fn()} />,
    );
    return { onDescanso };
  };

  it('dice como qué descanso se anota, con su hora', () => {
    montar();
    expect(screen.getByText(/Se anota como tu descanso de/))
      .toHaveTextContent('Se anota como tu descanso de 15:00 a 15:10. Vuelves y marcas tu regreso.');
    expect(screen.queryByText(/Tu descanso va de/)).toBeNull();
  });

  it('sigue siendo un solo botón de descanso, y sale al descanso', () => {
    const { onDescanso } = montar();
    fireEvent.click(screen.getByRole('button', { name: /salgo a mi descanso/i }));
    expect(onDescanso).toHaveBeenCalledTimes(1);
  });
});
