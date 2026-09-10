import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';

vi.mock('../lib/api', () => ({ default: { get: vi.fn() } }));
import api from '../lib/api';
import MiniaturaMarcacion from './MiniaturaMarcacion';
import { olvidarFotos } from '../lib/fotosRevision';
import { simularVisibles } from '../pruebas/intersection';

const get = api.get as unknown as ReturnType<typeof vi.fn>;
const FOTOS = { fotoEntrada: 'data:image/jpeg;base64,ENTRADA', fotoSalida: 'data:image/jpeg;base64,SALIDA' };

beforeEach(() => {
  olvidarFotos();
  get.mockReset();
  get.mockResolvedValue({ data: FOTOS });
});

describe('la miniatura del riel', () => {
  it('NO pide la foto mientras no esté cerca de la vista', async () => {
    // Es lo que evita 600 peticiones al abrir una semana de revisión.
    render(<MiniaturaMarcacion registroId="r1" momento="entrada" activa={false} />);
    await Promise.resolve();
    expect(get).not.toHaveBeenCalled();
  });

  it('la pide al aparecer, y pinta la foto del MOMENTO que le toca', async () => {
    const { container } = render(<MiniaturaMarcacion registroId="r1" momento="salida" activa={false} />);
    act(() => simularVisibles());
    await waitFor(() => expect(container.querySelector('img')).toHaveAttribute('src', FOTOS.fotoSalida));
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('la entrada y la salida del mismo registro comparten UNA petición', async () => {
    const { container } = render(<>
      <MiniaturaMarcacion registroId="r1" momento="entrada" activa={false} />
      <MiniaturaMarcacion registroId="r1" momento="salida" activa={false} />
    </>);
    act(() => simularVisibles());
    await waitFor(() => expect(container.querySelectorAll('img')).toHaveLength(2));
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('es decorativa: no compite con la foto grande como imagen con nombre', async () => {
    // El nombre ya está escrito al lado. Si la miniatura tuviera texto
    // alternativo, un lector de pantalla lo diría dos veces por fila.
    const { container } = render(<MiniaturaMarcacion registroId="r1" momento="entrada" activa={false} />);
    act(() => simularVisibles());
    await waitFor(() => expect(container.querySelector('img')).not.toBeNull());
    expect(screen.queryByRole('img')).toBeNull();
    expect(container.querySelector('img')).toHaveAttribute('alt', '');
  });

  it('sin foto no pinta imagen, y no se queda cargando para siempre', async () => {
    get.mockResolvedValue({ data: { fotoEntrada: null, fotoSalida: null } });
    const { container } = render(<MiniaturaMarcacion registroId="r1" momento="entrada" activa={false} />);
    act(() => simularVisibles());
    await waitFor(() => expect(container.querySelector('.animate-pulse')).toBeNull());
    expect(container.querySelector('img')).toBeNull();
  });

  it('si la petición falla tampoco se queda cargando para siempre', async () => {
    // Es el mismo defecto que ya tuvo el visor grande: un "Cargando foto…"
    // eterno cuando la red falla.
    get.mockRejectedValue(new Error('sin red'));
    const { container } = render(<MiniaturaMarcacion registroId="r1" momento="entrada" activa={false} />);
    act(() => simularVisibles());
    await waitFor(() => expect(container.querySelector('.animate-pulse')).toBeNull());
    expect(container.querySelector('img')).toBeNull();
  });
});
