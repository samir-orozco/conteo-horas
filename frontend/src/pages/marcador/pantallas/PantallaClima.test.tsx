import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import PantallaClima, { SEGUNDOS_SIN_TOCAR } from './PantallaClima';

// LA VENTANA DE LAS CARITAS (4 de octubre de 2026). docs/CLIMA_LABORAL.md §3.2. Se consulta por lo que
// ve una persona (el nombre de cada carita, el rótulo de cada botón), no por clases.

let guardar: ReturnType<typeof vi.fn<(c: { carita: number; motivos: string[] }) => Promise<unknown>>>;
let enviarObservacion: ReturnType<typeof vi.fn<(o: { texto: string; confidencial: boolean }) => Promise<unknown>>>;
let onTerminar: ReturnType<typeof vi.fn<() => void>>;

const abrir = () => render(
  <PantallaClima
    nombre="Andrea" hora="5:42 p. m." motivos={['Mucho trabajo', 'Compañeros']}
    guardar={guardar} enviarObservacion={enviarObservacion} onTerminar={onTerminar}
  />,
);
// Deja correr las promesas pendientes (la cola de guardado).
const vaciar = () => act(async () => {});

beforeEach(() => {
  guardar = vi.fn(() => Promise.resolve());
  enviarObservacion = vi.fn(() => Promise.resolve());
  onTerminar = vi.fn();
});
afterEach(() => vi.useRealTimers());

describe('al abrir', () => {
  it('dice que la salida quedó y pregunta por su nombre', () => {
    abrir();
    expect(screen.getByText('Salida registrada · 5:42 p. m.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '¿Cómo te fue hoy, Andrea?' })).toBeInTheDocument();
  });

  it('muestra las cinco caritas por su nombre, ninguna escogida', () => {
    abrir();
    const caritas = screen.getAllByRole('radio');
    expect(caritas.map(c => c.getAttribute('aria-label'))).toEqual(['Muy mal', 'Mal', 'Normal', 'Bien', 'Muy bien']);
    expect(caritas.every(c => c.getAttribute('aria-checked') === 'false')).toBe(true);
  });

  it('sin carita no hay motivos ni observación', () => {
    abrir();
    expect(screen.queryByRole('button', { name: 'Compañeros' })).toBeNull();
    expect(screen.queryByRole('button', { name: '+ Agregar observación' })).toBeNull();
  });
});

describe('la carita', () => {
  it('se guarda en el momento en que se toca, y dice su nombre', async () => {
    abrir();
    fireEvent.click(screen.getByRole('radio', { name: 'Mal' }));
    await vaciar();
    expect(guardar).toHaveBeenCalledWith({ carita: 2, motivos: [] });
    expect(screen.getByRole('radio', { name: 'Mal' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('Mal', { selector: 'p' })).toBeInTheDocument();
  });

  it('con Muy mal, Mal o Normal salen los motivos de la empresa y «Otro»', () => {
    abrir();
    fireEvent.click(screen.getByRole('radio', { name: 'Normal' }));
    expect(screen.getByText('¿Qué pasó? Puedes marcar varios')).toBeInTheDocument();
    for (const m of ['Mucho trabajo', 'Compañeros', 'Otro']) expect(screen.getByRole('button', { name: m })).toBeInTheDocument();
  });

  it('con Bien o Muy bien no hay motivos, pero sí se puede agregar una observación', () => {
    abrir();
    fireEvent.click(screen.getByRole('radio', { name: 'Muy bien' }));
    expect(screen.queryByRole('button', { name: 'Compañeros' })).toBeNull();
    expect(screen.getByRole('button', { name: '+ Agregar observación' })).toBeInTheDocument();
  });

  it('cada motivo que se marca también se guarda en el momento', async () => {
    abrir();
    fireEvent.click(screen.getByRole('radio', { name: 'Muy mal' }));
    fireEvent.click(screen.getByRole('button', { name: 'Compañeros' }));
    fireEvent.click(screen.getByRole('button', { name: 'Mucho trabajo' }));
    await vaciar();
    expect(guardar).toHaveBeenLastCalledWith({ carita: 1, motivos: ['Compañeros', 'Mucho trabajo'] });
    expect(screen.getByRole('button', { name: 'Compañeros' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('los guardados van en orden, uno tras otro: el último toque es el que queda', async () => {
    let soltarPrimero!: () => void;
    guardar = vi.fn<(c: { carita: number; motivos: string[] }) => Promise<unknown>>()
      .mockImplementationOnce(() => new Promise<void>(r => { soltarPrimero = r; }))
      .mockImplementation(() => Promise.resolve());
    abrir();
    fireEvent.click(screen.getByRole('radio', { name: 'Mal' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Bien' }));
    await vaciar();
    // El segundo no sale mientras el primero no haya vuelto.
    expect(guardar).toHaveBeenCalledTimes(1);
    soltarPrimero();
    await vaciar();
    expect(guardar).toHaveBeenCalledTimes(2);
    expect(guardar).toHaveBeenLastCalledWith({ carita: 4, motivos: [] });
  });

  it('si no se pudo guardar, lo dice', async () => {
    guardar = vi.fn(() => Promise.reject(new Error('red')));
    abrir();
    fireEvent.click(screen.getByRole('radio', { name: 'Bien' }));
    await vaciar();
    expect(screen.getByText('No pudimos guardar tu respuesta.')).toBeInTheDocument();
  });
});

describe('la observación', () => {
  it('«Otro» la abre sola, con el interruptor de confidencial apagado', () => {
    abrir();
    fireEvent.click(screen.getByRole('radio', { name: 'Mal' }));
    fireEvent.click(screen.getByRole('button', { name: 'Otro' }));
    expect(screen.getByLabelText('Observación')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Enviar como confidencial' })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByText('Tu empresa no verá tu nombre.')).toBeInTheDocument();
  });

  it('el interruptor solo aparece con la observación abierta', () => {
    abrir();
    fireEvent.click(screen.getByRole('radio', { name: 'Bien' }));
    expect(screen.queryByRole('switch')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '+ Agregar observación' }));
    expect(screen.getByRole('switch', { name: 'Enviar como confidencial' })).toBeInTheDocument();
  });

  it('confidencial: al enviar va con el interruptor prendido, y después se cierra', async () => {
    abrir();
    fireEvent.click(screen.getByRole('radio', { name: 'Mal' }));
    fireEvent.click(screen.getByRole('button', { name: 'Otro' }));
    fireEvent.change(screen.getByLabelText('Observación'), { target: { value: '  El microondas  ' } });
    fireEvent.click(screen.getByRole('switch', { name: 'Enviar como confidencial' }));
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    await vaciar();
    expect(enviarObservacion).toHaveBeenCalledWith({ texto: 'El microondas', confidencial: true });
    expect(onTerminar).toHaveBeenCalled();
  });

  it('la observación sale DESPUÉS de que la carita quedó guardada', async () => {
    let soltar!: () => void;
    guardar = vi.fn(() => new Promise<void>(r => { soltar = r; }));
    abrir();
    fireEvent.click(screen.getByRole('radio', { name: 'Bien' }));
    fireEvent.click(screen.getByRole('button', { name: '+ Agregar observación' }));
    fireEvent.change(screen.getByLabelText('Observación'), { target: { value: 'Buen día' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    await vaciar();
    // La directa va pegada a la calificación del día: sin ella el servidor no tiene dónde ponerla.
    expect(enviarObservacion).not.toHaveBeenCalled();
    soltar();
    await vaciar();
    expect(enviarObservacion).toHaveBeenCalledWith({ texto: 'Buen día', confidencial: false });
  });

  it('si no se pudo enviar, lo dice y no se cierra', async () => {
    enviarObservacion = vi.fn(() => Promise.reject(new Error('503')));
    abrir();
    fireEvent.click(screen.getByRole('radio', { name: 'Mal' }));
    fireEvent.click(screen.getByRole('button', { name: 'Otro' }));
    fireEvent.change(screen.getByLabelText('Observación'), { target: { value: 'Hola' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    await vaciar();
    expect(screen.getByText('No pudimos enviar tu observación. Inténtalo otra vez.')).toBeInTheDocument();
    expect(onTerminar).not.toHaveBeenCalled();
  });
});

// ────────── Lo que encontró la revisión adversarial del 4 de octubre de 2026 ──────────
describe('cuando la red falla', () => {
  const errorDelServidor = (status: number, codigo: string, error: string) => ({ response: { status, data: { codigo, error } } });
  const abrirConObservacion = async (confidencial: boolean) => {
    abrir();
    fireEvent.click(screen.getByRole('radio', { name: 'Mal' }));
    fireEvent.click(screen.getByRole('button', { name: 'Otro' }));
    fireEvent.change(screen.getByLabelText('Observación'), { target: { value: 'Hola' } });
    if (confidencial) fireEvent.click(screen.getByRole('switch', { name: 'Enviar como confidencial' }));
    await vaciar();
  };

  it('si la ventana ya se cerró, un guardado que vuelve tarde no cierra NADA: la sesión ya es de otra persona', async () => {
    let soltar!: () => void;
    guardar = vi.fn(() => new Promise<void>(r => { soltar = r; }));
    const { unmount } = abrir();
    fireEvent.click(screen.getByRole('radio', { name: 'Bien' }));
    fireEvent.click(screen.getByRole('button', { name: 'Listo' }));
    await vaciar();
    // El cierre por inactividad del kiosco se la llevó mientras la red estaba pegada.
    unmount();
    soltar();
    await vaciar();
    expect(onTerminar).not.toHaveBeenCalled();
  });

  it('si guardar la carita falló, «Listo» la vuelve a mandar antes de cerrar', async () => {
    guardar = vi.fn<(c: { carita: number; motivos: string[] }) => Promise<unknown>>()
      .mockRejectedValueOnce(new Error('sin red'))
      .mockResolvedValue(undefined);
    abrir();
    fireEvent.click(screen.getByRole('radio', { name: 'Bien' }));
    await vaciar();
    expect(screen.getByText('No pudimos guardar tu respuesta.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Listo' }));
    await vaciar();
    expect(guardar).toHaveBeenCalledTimes(2);
    expect(guardar).toHaveBeenLastCalledWith({ carita: 4, motivos: [] });
    expect(onTerminar).toHaveBeenCalled();
  });

  it('si el reintento también falla, no se cierra con la carita perdida, y deja cerrar sin guardar', async () => {
    guardar = vi.fn(() => Promise.reject(new Error('sin red')));
    abrir();
    fireEvent.click(screen.getByRole('radio', { name: 'Bien' }));
    fireEvent.click(screen.getByRole('button', { name: 'Listo' }));
    await vaciar();
    expect(onTerminar).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sin guardar' }));
    expect(onTerminar).toHaveBeenCalled();
  });

  it('una confidencial que el servidor YA tenía (la respuesta se perdió) se da por enviada', async () => {
    enviarObservacion = vi.fn(() => Promise.reject(errorDelServidor(409, 'YA_ENVIADA', 'Ya enviaste tu observación.')));
    await abrirConObservacion(true);
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    await vaciar();
    expect(onTerminar).toHaveBeenCalled();
  });

  it('un error que no se arregla reintentando dice lo que dijo el servidor, y deja cerrar sin enviar', async () => {
    enviarObservacion = vi.fn(() => Promise.reject(errorDelServidor(503, 'SIN_CLAVE', 'No pudimos enviar tu observación. Inténtalo más tarde.')));
    await abrirConObservacion(true);
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    await vaciar();
    expect(screen.getByText('No pudimos enviar tu observación. Inténtalo más tarde.')).toBeInTheDocument();
    expect(onTerminar).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sin enviar' }));
    expect(onTerminar).toHaveBeenCalled();
  });
});

describe('cerrar', () => {
  it('sin texto el botón dice «Listo» y no manda observación', async () => {
    abrir();
    fireEvent.click(screen.getByRole('radio', { name: 'Muy bien' }));
    fireEvent.click(screen.getByRole('button', { name: 'Listo' }));
    await vaciar();
    expect(enviarObservacion).not.toHaveBeenCalled();
    expect(onTerminar).toHaveBeenCalled();
  });

  it('«Omitir» cierra sin guardar nada', () => {
    abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Omitir' }));
    expect(guardar).not.toHaveBeenCalled();
    expect(onTerminar).toHaveBeenCalled();
  });

  it(`sin tocar nada se cierra sola a los ${SEGUNDOS_SIN_TOCAR} segundos, contando en pantalla`, () => {
    vi.useFakeTimers();
    abrir();
    expect(screen.getByText(`se cierra en ${SEGUNDOS_SIN_TOCAR} s`)).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(3000); });
    expect(screen.getByText(`se cierra en ${SEGUNDOS_SIN_TOCAR - 3} s`)).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime((SEGUNDOS_SIN_TOCAR - 3) * 1000); });
    expect(onTerminar).toHaveBeenCalled();
  });

  it('en cuanto se toca algo, deja de contar', () => {
    vi.useFakeTimers();
    abrir();
    fireEvent.pointerDown(screen.getByRole('radio', { name: 'Bien' }));
    act(() => { vi.advanceTimersByTime(SEGUNDOS_SIN_TOCAR * 2000); });
    expect(onTerminar).not.toHaveBeenCalled();
    expect(screen.queryByText(/se cierra en/)).toBeNull();
  });
});
