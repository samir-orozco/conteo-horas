import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RegresoOlvidado from './RegresoOlvidado';
import type { Pausa } from '../tipos';

// Un instante dado en hora de Bogotá (UTC-5 todo el año). Las pruebas corren en Los
// Ángeles a propósito: una hora pintada sin zona sale corrida.
const bog = (h: number, m = 0) => new Date(Date.UTC(2026, 8, 7, h + 5, m)).toISOString();

// Carla salió a las 10:00 y el servidor anotó esa salida en el descanso de 15:00 a 15:10
// (12 de septiembre de 2026). Si no marca el regreso, pasadas las 11:10 el kiosco le
// propone las 10:10: su salida más lo que dura ese descanso. «Es la hora en que
// terminaba tu descanso» sería falso, porque ese descanso termina a las 15:10.
describe('RegresoOlvidado · la hora que propone', () => {
  const montar = (pausa: Pausa, onConfirmar = vi.fn()) => render(
    <RegresoOlvidado pausa={pausa} salida={bog(10)} sugerido={bog(10, 10)} ahora={new Date(bog(11, 30))}
      onConfirmar={onConfirmar} onCancelar={vi.fn()} marcando={false} />,
  );

  it.each<[Pausa, string]>([['DESCANSO', 'descanso'], ['ALMUERZO', 'almuerzo']])(
    'con %s dice que es la hora a la que le tocaba volver, no la hora en que terminaba',
    (pausa, nombre) => {
      montar(pausa);
      expect(screen.getByRole('button', { name: /A las 10:10/ })).toBeInTheDocument();
      expect(screen.getByText('Es la hora a la que te tocaba volver')).toBeInTheDocument();
      expect(screen.queryByText(new RegExp(`terminaba tu ${nombre}`))).toBeNull();
    },
  );

  it('aceptar la hora propuesta la manda tal cual', () => {
    const onConfirmar = vi.fn();
    montar('DESCANSO', onConfirmar);
    fireEvent.click(screen.getByRole('button', { name: /A las 10:10/ }));
    expect(onConfirmar).toHaveBeenCalledWith(bog(10, 10));
  });
});
