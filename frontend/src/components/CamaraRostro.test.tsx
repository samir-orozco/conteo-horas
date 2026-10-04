import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

// EL INGRESO FACIAL DEL KIOSCO, CON EL CICLO DE LA CÁMARA DE VERDAD (2 de octubre de 2026).
//
// Lo único simulado es lo que el navegador de las pruebas no tiene: la cámara y el detector de
// caras. El ciclo que analiza cuadro por cuadro, el reto de giro, el «quédate quieto» y lo que se
// pinta corren tal cual. La cara la mueve la prueba con `cara.yaw`, como se movería una persona.
//
// Tres cosas nuevas, pedidas por el dueño a partir de dos apps de verificación que vio ese día:
//   1. «Verificando…» hasta que responda el servidor. Antes salía «¡Rostro verificado!» con un
//      chulo verde ANTES de preguntarle, y si el servidor la rechazaba la pantalla se contradecía.
//   2. Una regla que se llena con el giro: la flecha decía hacia dónde, no cuánto.
//   3. Un 3, 2, 1 grande en vez de una barra de pocos píxeles al borde de la imagen.

const { cara, tarea } = vi.hoisted(() => {
  const cara = { yaw: 0, hay: true, fallos: 0 };
  // UNA TAREA COMO LAS DE face-api.js (4 de octubre de 2026). Su `then` recibe SOLO el camino del
  // éxito, igual que `ComposableTask` en la librería: si la tarea falla, un `await tarea` no se
  // entera, se queda esperando para siempre y el error sale suelto como promesa rechazada. Así se
  // trababa la cámara del kiosco en producción. `run()` sí es una promesa de verdad. Con promesas
  // normales, como antes, ninguna prueba podía ver el defecto.
  const tarea = <T,>(producir: () => T) => ({
    run: async (): Promise<T> => {
      if (cara.fallos > 0) {
        cara.fallos--;
        // El mensaje de producción: una caja con NaN, que JSON.stringify escribe como null.
        throw new Error('Box.constructor - expected box to be IBoundingBox | IRect, instead have {"x":null,"y":null,"width":null,"height":null}');
      }
      return producir();
    },
    then(this: { run: () => Promise<T> }, alCumplir: (valor: T) => unknown) {
      return (async () => alCumplir(await this.run()))();
    },
  });
  return { cara, tarea };
});

// Un cuadro con la cara centrada y del tamaño justo en un video de 640x480. El giro sale de dónde
// cae la nariz sobre la línea de los ojos: con los ojos en x=0 y x=100, la nariz en (yaw+0,5)·100.
const deteccion = () => ({
  detection: { box: { x: 200, y: 100, width: 240, height: 280 } },
  landmarks: {
    getNose: () => [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: (cara.yaw + 0.5) * 100, y: 50 }],
    getLeftEye: () => [{ x: 0, y: 0 }],
    getRightEye: () => [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 100, y: 0 }],
  },
});

vi.mock('face-api.js', () => ({
  TinyFaceDetectorOptions: class {},
  detectSingleFace: () => ({
    withFaceLandmarks: () => Object.assign(tarea(() => (cara.hay ? deteccion() : undefined)), {
      withFaceDescriptor: () => tarea(() => (cara.hay ? { ...deteccion(), descriptor: new Float32Array(128).fill(0.1) } : undefined)),
    }),
  }),
}));
vi.mock('../lib/faceapi', () => ({
  cargarModelosLigeros: () => Promise.resolve(),
  cargarModeloRostro: () => Promise.resolve(),
  modelosEnCache: () => Promise.resolve(true),
}));

import CamaraRostro from './CamaraRostro';

const FOTO = 'data:image/jpeg;base64,cuadro';

beforeEach(() => {
  cara.yaw = 0;
  cara.hay = true;
  cara.fallos = 0;
  vi.useFakeTimers();
  // El lado del reto se sortea: con 0,2 sale «derecha».
  vi.spyOn(Math, 'random').mockReturnValue(0.2);
  Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', { configurable: true, get: () => 640 });
  Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', { configurable: true, get: () => 480 });
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockImplementation((() => ({ drawImage: () => {} })) as unknown as HTMLCanvasElement['getContext']);
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(FOTO);
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: () => Promise.resolve({ getTracks: () => [{ stop: () => {} }], getVideoTracks: () => [{}] }) },
  });
});
afterEach(() => vi.useRealTimers());

const avanzar = async (ms: number) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); };

const montar = (props: Partial<React.ComponentProps<typeof CamaraRostro>> = {}) => {
  const onCapturado = vi.fn();
  const utils = render(<CamaraRostro modo="login" onCapturado={onCapturado} {...props} />);
  return { onCapturado, ...utils };
};

// La regla del giro tiene rol de medidor: lo que se afirma es cuánto marca, no un color.
const medidor = () => screen.getByRole('meter', { name: /giro/i });

describe('el reto de giro con su regla', () => {
  it('la regla arranca vacía y se llena a medida que la cabeza gira', async () => {
    montar({ exigeReto: true });
    await avanzar(1500);
    expect(medidor()).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByText('Gire la cabeza hacia la flecha')).toBeInTheDocument();

    cara.yaw = 0.065; // la mitad del giro que pide el reto
    await avanzar(400);
    expect(medidor()).toHaveAttribute('aria-valuenow', '50');
  });

  // Una instrucción a la vez. Visto en una corrida con el detector de verdad: mientras se
  // giraba, debajo del aviso del reto seguía «Ubica tu rostro dentro del óvalo», un mensaje
  // viejo que nadie había quitado.
  it('mientras gira, no queda debajo un mensaje viejo que diga otra cosa', async () => {
    montar({ exigeReto: true });
    await avanzar(1500);
    expect(screen.getByText('Gire la cabeza hacia la flecha')).toBeInTheDocument();
    expect(screen.queryByText('Ubica tu rostro dentro del óvalo')).not.toBeInTheDocument();
  });

  it('si gira de más, se lo dice', async () => {
    montar({ exigeReto: true });
    await avanzar(1500);
    cara.yaw = 0.5;
    await avanzar(400);
    expect(screen.getByText('Un poco menos')).toBeInTheDocument();
  });

  it('si gira hacia el otro lado, se lo dice', async () => {
    montar({ exigeReto: true });
    await avanzar(1500);
    cara.yaw = -0.2;
    await avanzar(400);
    expect(screen.getByText('Hacia el otro lado')).toBeInTheDocument();
  });

  it('con el giro cumplido pide volver al frente, y la regla ya no está', async () => {
    montar({ exigeReto: true });
    await avanzar(1500);
    cara.yaw = 0.2;
    await avanzar(800);
    expect(screen.getByText('Ahora vuelva a mirar al frente')).toBeInTheDocument();
    expect(screen.queryByRole('meter', { name: /giro/i })).not.toBeInTheDocument();
  });
});

describe('la cuenta regresiva del «quédate quieto»', () => {
  it('cuenta 3, 2, 1 mientras toma la foto', async () => {
    // La cuenta se mide desde que aparece la cara, no desde que se monta la cámara: así no
    // depende de cuánto tarde en calibrarse.
    cara.hay = false;
    montar();
    await avanzar(1500);
    cara.hay = true;
    await avanzar(150);
    expect(screen.getByText('3')).toBeInTheDocument();
    await avanzar(500);
    expect(screen.getByText('2')).toBeInTheDocument();
    await avanzar(500);
    expect(screen.getByText('1')).toBeInTheDocument();
  });
});

describe('verificando, hasta que el servidor responda', () => {
  const hastaLaFoto = async () => { await avanzar(1500); await avanzar(1700); };

  it('al tomar la foto la entrega de una vez y dice «Verificando…», no «¡Rostro verificado!»', async () => {
    const { onCapturado } = montar();
    await hastaLaFoto();
    expect(onCapturado).toHaveBeenCalledTimes(1);
    expect(onCapturado).toHaveBeenCalledWith([expect.any(Array)], FOTO);
    expect(screen.getByRole('status')).toHaveTextContent('Verificando…');
    expect(screen.queryByText(/rostro verificado/i)).not.toBeInTheDocument();
  });

  it('mientras verifica, el fondo es la foto que se tomó', async () => {
    montar();
    await hastaLaFoto();
    expect(screen.getByAltText('La foto que se está verificando')).toHaveAttribute('src', FOTO);
  });

  it('si el servidor la rechaza, deja de decir «Verificando…» y muestra el motivo', async () => {
    const { onCapturado, rerender } = montar();
    await hastaLaFoto();
    rerender(<CamaraRostro modo="login" onCapturado={onCapturado} errorExterno="Rostro no reconocido." />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByText('Rostro no reconocido.')).toBeInTheDocument();
  });

  it('con el reto, también: girar, volver al frente, contar y verificar', async () => {
    const { onCapturado } = montar({ exigeReto: true });
    await avanzar(1500);
    cara.yaw = 0.2;
    await avanzar(800);
    cara.yaw = 0;
    await avanzar(800);
    await avanzar(1700);
    expect(onCapturado).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status')).toHaveTextContent('Verificando…');
  });
});

// EL DETECTOR QUE FALLA UN CUADRO (4 de octubre de 2026). En producción, cuando el video quedaba un
// instante sin tamaño, face-api.js fallaba con «Box.constructor - expected box…». Por cómo la
// librería implementa sus tareas, el error no llegaba al `catch` de la cámara: el ciclo se quedaba
// esperando para siempre, la imagen se congelaba y encima salía la pantalla negra de error. Pasó 7
// veces entre el 1 y el 3 de octubre, la primera en Grupo MSM a las 7:00 de la mañana.
describe('si el detector falla en algunos cuadros', () => {
  it('la cámara sigue con el siguiente y termina tomando la foto', async () => {
    cara.fallos = 3;
    const { onCapturado } = montar();
    await avanzar(1500);
    await avanzar(2700);
    expect(cara.fallos).toBe(0);
    expect(onCapturado).toHaveBeenCalledTimes(1);
  });
});

