import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CarruselResenas from './CarruselResenas';
import { pedirResenasPublicas, type TarjetaPublica } from '../resenas/api';

// El carrusel de reseñas de la landing (docs/RESENAS.md, sección 5: R35 a R44).
//
// Lo que se cuida: que en el computador la fila se deslice sola, despacio y sin fin, sin saltos al
// dar la vuelta; que se detenga con el mouse, el dedo, el teclado y «reducir movimiento»; que las
// flechas corran una tarjeta, y que sin reseñas o con el servidor caído no quede un título huérfano.
//
// El servidor se simula en la función que lo pide; la tarjeta es la de verdad.
vi.mock('../resenas/api', async importOriginal => ({
  ...(await importOriginal<typeof import('../resenas/api')>()),
  pedirResenasPublicas: vi.fn(),
}));
const pedir = vi.mocked(pedirResenasPublicas);

const TITULO = 'Negocios que ya dejaron el Excel';

const resenas = (n: number): TarjetaPublica[] => Array.from({ length: n }, (_, i) => ({
  id: `r${i + 1}`, estrellas: 5, texto: `Opinión ${i + 1}`, nombre: `Persona ${i + 1}`, detalle: `Empresa ${i + 1}`,
}));

// El ancho de la pantalla y «reducir movimiento» los responde el navegador por matchMedia, que jsdom
// no trae. Una consulta distinta de las dos que usa el carrusel responde que no.
function pantalla({ computador, reducir = false }: { computador: boolean; reducir?: boolean }) {
  vi.spyOn(window, 'matchMedia').mockImplementation(consulta => ({
    matches: consulta === '(min-width: 768px)' ? computador
      : consulta === '(prefers-reduced-motion: reduce)' ? reducir : false,
    media: consulta, onchange: null,
    addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as unknown as MediaQueryList);
}

// jsdom no desplaza nada: se registra a dónde se pidió llevar la fila.
let desplazar: ReturnType<typeof vi.fn>;
beforeEach(() => {
  pedir.mockReset();
  desplazar = vi.fn();
  Object.defineProperty(HTMLElement.prototype, 'scrollTo', { configurable: true, writable: true, value: desplazar });
});
afterEach(() => {
  vi.useRealTimers();
  delete (HTMLElement.prototype as { scrollTo?: unknown }).scrollTo;
});

async function montar(lista: TarjetaPublica[]) {
  pedir.mockResolvedValue(lista);
  const vista = render(<CarruselResenas titulo={TITULO} subtitulo="Lo que dicen quienes liquidan sus horas con HoraPro." />);
  // Deja llegar la respuesta del servidor simulado.
  await act(async () => {});
  return vista;
}

const carrusel = () => screen.getByRole('region', { name: TITULO });
// Las que se anuncian: en el computador, las copias que completan la vuelta están ocultas para el
// lector de pantalla.
const visibles = () => within(carrusel()).getAllByRole('group').map(g => g.getAttribute('aria-label'));
const todas = () => within(carrusel()).getAllByRole('group', { hidden: true });

// jsdom no calcula posiciones: cada tarjeta queda a `paso` píxeles de la anterior, detrás de un
// relleno de 20 como el de la fila.
function medir(paso: number) {
  todas().forEach((g, i) => Object.defineProperty(g, 'offsetLeft', { configurable: true, get: () => 20 + i * paso }));
}

describe('el carrusel de reseñas · lo que llega del servidor', () => {
  beforeEach(() => pantalla({ computador: true }));

  // R44: quien llega a «Precios» desde el blog no puede quedar en medio de las reseñas cuando terminan
  // de cargar. La altura reservada se mira en el navegador; aquí, que hay algo y que no se anuncia.
  it('mientras carga no anuncia la sección, pero deja algo en su lugar', () => {
    pedir.mockReturnValue(new Promise(() => {}));
    const { container } = render(<CarruselResenas titulo={TITULO} subtitulo="x" />);
    expect(screen.queryByRole('heading', { name: TITULO })).not.toBeInTheDocument();
    expect(container).not.toBeEmptyDOMElement();
  });

  // R39: con cero, la sección no aparece; un título sobre nada parecería una página rota.
  it('sin reseñas publicadas, la sección no aparece', async () => {
    const { container } = await montar([]);
    expect(screen.queryByRole('heading', { name: TITULO })).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it('si el servidor falla, la sección no aparece', async () => {
    pedir.mockRejectedValue(new Error('Request failed with status code 500'));
    const { container } = render(<CarruselResenas titulo={TITULO} subtitulo="x" />);
    await act(async () => {});
    expect(container).toBeEmptyDOMElement();
  });

  // La verificación antirobots del hosting responde con una página HTML y no con JSON: entonces
  // `resenas` no llega. No puede romper la landing entera.
  it('si la respuesta no trae una lista, la sección no aparece', async () => {
    const { container } = await montar(undefined as unknown as TarjetaPublica[]);
    expect(container).toBeEmptyDOMElement();
  });

  // R44, del lado de la llegada. Quien entra a /#precios desde el blog queda en Precios con el hueco de
  // la carga encima. Si al final no hay reseñas, el hueco se recoge entero, Precios sube 700 px, y un
  // navegador que no ancla el desplazamiento (Safari) deja la vista donde estaba: pasando los planes.
  // Si la vista seguía en el ancla, se la devuelve ahí. jsdom no mide nada: todo está en 0, que es
  // justo «la vista está en el ancla».
  describe('quien llegó con un ancla de la dirección', () => {
    let llevarA: ReturnType<typeof vi.fn>;
    // `scrollY` es propio de la ventana de jsdom: se guarda tal cual para devolverlo, porque borrarlo
    // lo deja en `undefined` y la prueba siguiente mediría con eso.
    const scrollYOriginal = Object.getOwnPropertyDescriptor(window, 'scrollY');
    beforeEach(() => {
      llevarA = vi.fn();
      Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, writable: true, value: llevarA });
      window.location.hash = '#precios';
    });
    afterEach(() => {
      delete (HTMLElement.prototype as { scrollIntoView?: unknown }).scrollIntoView;
      history.replaceState(null, '', window.location.pathname);
      if (scrollYOriginal) Object.defineProperty(window, 'scrollY', scrollYOriginal);
      else delete (window as { scrollY?: unknown }).scrollY;
    });

    const conPrecios = async (lista: TarjetaPublica[]) => {
      pedir.mockResolvedValue(lista);
      render(<><CarruselResenas titulo={TITULO} subtitulo="x" /><section id="precios">Planes</section></>);
      await act(async () => {});
      return document.getElementById('precios');
    };

    it('sin reseñas, la vista vuelve al ancla cuando el hueco se recoge', async () => {
      const precios = await conPrecios([]);
      expect(llevarA).toHaveBeenCalledTimes(1);
      expect(llevarA.mock.contexts[0]).toBe(precios);
    });

    it('con reseñas, también: la sección cargada no mide lo mismo que el hueco', async () => {
      const precios = await conPrecios(resenas(4));
      expect(llevarA).toHaveBeenCalledTimes(1);
      expect(llevarA.mock.contexts[0]).toBe(precios);
    });

    it('si la persona ya se movió de ahí, no se la arrastra de vuelta', async () => {
      Object.defineProperty(window, 'scrollY', { configurable: true, value: 900 });
      await conPrecios([]);
      expect(llevarA).not.toHaveBeenCalled();
    });

    it('sin ancla en la dirección no se toca nada', async () => {
      history.replaceState(null, '', window.location.pathname);
      await conPrecios([]);
      expect(llevarA).not.toHaveBeenCalled();
    });
  });

  it('con reseñas, muestra el título, el subtítulo y las tarjetas en el orden en que llegan', async () => {
    await montar(resenas(15));
    expect(screen.getByRole('heading', { level: 2, name: TITULO })).toBeInTheDocument();
    expect(screen.getByText('Lo que dicen quienes liquidan sus horas con HoraPro.')).toBeInTheDocument();
    const [primera] = within(carrusel()).getAllByRole('group');
    expect(within(primera).getByText('Persona 1')).toBeInTheDocument();
    expect(carrusel()).toHaveAttribute('aria-roledescription', 'carrusel');
  });
});

describe('el carrusel de reseñas · en el computador', () => {
  // La fila la mueve un bucle de cuadros de animación. jsdom no los dibuja: se guardan y se corren a
  // mano, de a 20 ms, con un reloj propio.
  let cuadros: Map<number, FrameRequestCallback>;
  let pedidos: ReturnType<typeof vi.fn>;
  let reloj = 0;
  // jsdom tampoco desplaza: lo que el carrusel escribe en scrollLeft se guarda aquí.
  let posiciones: WeakMap<Element, number>;

  beforeEach(() => {
    pantalla({ computador: true });
    cuadros = new Map();
    let siguiente = 1;
    pedidos = vi.fn((cb: FrameRequestCallback) => { const id = siguiente++; cuadros.set(id, cb); return id; });
    vi.stubGlobal('requestAnimationFrame', pedidos);
    vi.stubGlobal('cancelAnimationFrame', (id: number) => { cuadros.delete(id); });
    posiciones = new WeakMap();
    Object.defineProperty(HTMLElement.prototype, 'scrollLeft', {
      configurable: true,
      get(this: Element) { return posiciones.get(this) ?? 0; },
      set(this: Element, v: number) { posiciones.set(this, v); },
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete (HTMLElement.prototype as { scrollLeft?: unknown }).scrollLeft;
  });

  const correr = (ms: number) => {
    for (let t = 0; t < ms; t += 20) {
      const lote = [...cuadros.values()];
      cuadros.clear();
      reloj += 20;
      act(() => lote.forEach(cb => cb(reloj)));
    }
  };
  const fila = () => todas()[0].parentElement!;
  const posicion = () => posiciones.get(fila());
  // 15 reseñas a 377 px una de otra: cada copia mide 15 × 377.
  const PASO = 377;
  const COPIA = 15 * PASO;
  // Monta, le da medidas a las tarjetas y corre un cuadro, que es cuando la fila se ubica.
  async function montarYMedir(n = 15) {
    await montar(resenas(n));
    medir(PASO);
    correr(20);
  }

  // Las tres copias son lo que deja dar la vuelta sin salto. Para un lector de pantalla son la misma
  // lista tres veces: se anuncia una sola.
  it('se pueden leer las quince, y las copias que completan la vuelta no se anuncian', async () => {
    await montar(resenas(15));
    expect(visibles()).toEqual(Array.from({ length: 15 }, (_, i) => `${i + 1} de 15`));
    expect(todas()).toHaveLength(45);
    const copia = todas()[0];
    expect(copia).toHaveAttribute('inert');
    expect(copia).toHaveAttribute('aria-hidden', 'true');
  });

  it('no hay botón de pausa ni puntos: solo las dos flechas', async () => {
    await montar(resenas(15));
    expect(within(carrusel()).getAllByRole('button').map(b => b.getAttribute('aria-label')))
      .toEqual(['Reseñas anteriores', 'Reseñas siguientes']);
  });

  // R36: arranca en la copia del medio y se desliza hacia la derecha, muy despacio. Que las tarjetas
  // viajen a la derecha es que la fila se desplace hacia atrás.
  it('arranca en la copia del medio y se desliza sola hacia la derecha, 18 px por segundo', async () => {
    await montarYMedir();
    expect(posicion()).toBe(COPIA);
    correr(1000);
    expect(posicion()).toBeCloseTo(COPIA - 18, 6);
  });

  // Con tarjetas de 377 px, salirse de la copia del medio tarda más de dos minutos: la prueba usa
  // tarjetas de 20 (copias de 300) para que en un minuto dé la vuelta varias veces.
  it('la vuelta no se acaba: da varias vueltas en un minuto, siempre en la copia del medio y sin saltos', async () => {
    await montar(resenas(15));
    medir(20);
    correr(20);
    const copia = 15 * 20;
    let anterior = posicion()!;
    let vueltas = 0;
    for (let s = 0; s < 60; s++) {
      correr(1000);
      const ahora = posicion()!;
      expect(ahora).toBeGreaterThanOrEqual(copia / 2);
      expect(ahora).toBeLessThan(copia * 1.5);
      if (ahora > anterior) vueltas++;
      // O avanzó 18, o dio la vuelta y quedó una copia entera más allá: nunca un salto de otro tamaño.
      const avance = ((anterior - ahora) % copia + copia) % copia;
      expect(avance).toBeCloseTo(18, 6);
      anterior = ahora;
    }
    expect(vueltas).toBeGreaterThanOrEqual(3);
  });

  // Antes de que el navegador dibuje, las tarjetas no tienen posición: sin medidas no hay a dónde ir.
  it('sin medidas todavía, no escribe una posición inventada', async () => {
    await montar(resenas(15));
    correr(1000);
    expect(posicion()).toBeUndefined();
  });

  it('con el mouse encima se detiene, y al salir sigue', async () => {
    const persona = userEvent.setup();
    await montarYMedir();
    await persona.hover(todas()[16]);
    const quieta = posicion();
    correr(3000);
    expect(posicion()).toBe(quieta);
    await persona.unhover(todas()[16]);
    // El primer cuadro al reanudar solo toma la hora: el tiempo quieta no cuenta.
    correr(20);
    correr(1000);
    expect(posicion()).toBeCloseTo(quieta! - 18, 6);
  });

  it('con el foco del teclado adentro se detiene, y al salir sigue', async () => {
    await montarYMedir();
    const siguiente = screen.getByRole('button', { name: 'Reseñas siguientes' });
    act(() => siguiente.focus());
    const quieta = posicion();
    correr(3000);
    expect(posicion()).toBe(quieta);
    act(() => siguiente.blur());
    // El primer cuadro al reanudar solo toma la hora: el tiempo quieta no cuenta.
    correr(20);
    correr(1000);
    expect(posicion()).toBeCloseTo(quieta! - 18, 6);
  });

  // En una tableta acostada (ancho de computador) no hay «salir de encima»: el toque la detiene un
  // momento para poder leer, y después sigue sola.
  it('al tocarla con el dedo se detiene unos segundos, y después sigue', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    await montarYMedir();
    fireEvent.pointerDown(todas()[16], { pointerType: 'touch' });
    const quieta = posicion();
    correr(3000);
    expect(posicion()).toBe(quieta);
    act(() => { vi.advanceTimersByTime(5000); });
    // El primer cuadro al reanudar solo toma la hora: el tiempo quieta no cuenta.
    correr(20);
    correr(1000);
    expect(posicion()).toBeCloseTo(quieta! - 18, 6);
  });

  // R38: con «reducir movimiento» no se mueve sola, pero las flechas siguen sirviendo.
  it('con «reducir movimiento» se queda quieta', async () => {
    pantalla({ computador: true, reducir: true });
    await montarYMedir();
    expect(posicion()).toBe(COPIA);
    correr(5000);
    expect(posicion()).toBe(COPIA);
  });

  it('la flecha siguiente corre una tarjeta hacia adelante, con un movimiento suave', async () => {
    const persona = userEvent.setup();
    await montarYMedir();
    // Con el mouse encima no deriva: así se mide solo lo que hizo la flecha.
    await persona.hover(todas()[16]);
    const antes = posicion()!;
    fireEvent.click(screen.getByRole('button', { name: 'Reseñas siguientes' }));
    correr(300);
    expect(posicion()).toBeGreaterThan(antes);
    expect(posicion()).toBeLessThan(antes + PASO);
    correr(400);
    expect(posicion()).toBeCloseTo(antes + PASO, 6);
  });

  it('la flecha anterior corre una tarjeta hacia atrás', async () => {
    const persona = userEvent.setup();
    await montarYMedir();
    await persona.hover(todas()[16]);
    const antes = posicion()!;
    fireEvent.click(screen.getByRole('button', { name: 'Reseñas anteriores' }));
    correr(700);
    expect(posicion()).toBeCloseTo(antes - PASO, 6);
  });

  // Un segundo clic en medio del movimiento sigue desde donde iba la fila, no desde donde iba a llegar
  // ni desde donde arrancó: dos clics son dos tarjetas.
  it('dos clics seguidos corren dos tarjetas', async () => {
    const persona = userEvent.setup();
    await montarYMedir();
    await persona.hover(todas()[16]);
    const antes = posicion()!;
    const siguiente = screen.getByRole('button', { name: 'Reseñas siguientes' });
    fireEvent.click(siguiente);
    correr(200);
    fireEvent.click(siguiente);
    correr(700);
    expect(posicion()).toBeCloseTo(antes + 2 * PASO, 6);
  });

  it('con «reducir movimiento» las flechas corren la tarjeta de una vez', async () => {
    pantalla({ computador: true, reducir: true });
    await montarYMedir();
    fireEvent.click(screen.getByRole('button', { name: 'Reseñas siguientes' }));
    expect(posicion()).toBe(COPIA + PASO);
  });

  // Veinte clics hacia atrás la llevarían cinco copias afuera: tiene que seguir en la del medio.
  it('muchos clics seguidos no la sacan de la copia del medio', async () => {
    pantalla({ computador: true, reducir: true });
    await montarYMedir();
    const anterior = screen.getByRole('button', { name: 'Reseñas anteriores' });
    for (let i = 0; i < 20; i++) fireEvent.click(anterior);
    expect(posicion()).toBeGreaterThanOrEqual(COPIA / 2);
    expect(posicion()).toBeLessThan(COPIA * 1.5);
    // 20 tarjetas atrás son 5 adelante dentro de la vuelta de 15.
    expect(((COPIA - posicion()!) % COPIA + COPIA) % COPIA).toBeCloseTo((20 * PASO) % COPIA, 6);
  });

  // Al achicar la ventana las tarjetas se achican: la fila se vuelve a medir y se queda en la misma
  // tarjeta, en proporción, en vez de quedar a medio camino de otra.
  it('si cambia el ancho de la ventana, se queda en la misma tarjeta', async () => {
    const persona = userEvent.setup();
    await montarYMedir();
    await persona.hover(todas()[16]);
    fireEvent.click(screen.getByRole('button', { name: 'Reseñas siguientes' }));
    correr(700);
    expect(posicion()).toBeCloseTo(COPIA + PASO, 6);
    medir(300);
    fireEvent(window, new Event('resize'));
    expect(posicion()).toBeCloseTo(15 * 300 + 300, 6);
  });

  // R39: con tres o menos caben todas, así que no hay nada que mover ni que copiar.
  it.each([1, 2, 3])('con %i no se mueve: sin flechas, sin copias y sin animación', async n => {
    await montar(resenas(n));
    medir(PASO);
    correr(5000);
    expect(todas()).toHaveLength(n);
    expect(within(carrusel()).queryAllByRole('button')).toHaveLength(0);
    expect(pedidos).not.toHaveBeenCalled();
  });

  it('con cuatro ya se mueve, con flechas', async () => {
    await montarYMedir(4);
    expect(screen.getByRole('button', { name: 'Reseñas siguientes' })).toBeInTheDocument();
    const inicio = posicion()!;
    correr(1000);
    expect(posicion()).not.toBe(inicio);
  });
});

describe('el carrusel de reseñas · en el celular', () => {
  beforeEach(() => pantalla({ computador: false }));

  // R37: una a la vez y se desliza con el dedo, así que todas se pueden recorrer.
  it('se pueden recorrer todas y abajo dice en cuál va', async () => {
    await montar(resenas(15));
    expect(visibles()).toHaveLength(15);
    expect(screen.getByText('1 / 15')).toBeInTheDocument();
    // Sin flechas: se mueve con el dedo y no se mueve solo.
    expect(within(carrusel()).queryAllByRole('button')).toHaveLength(0);
  });

  it('al deslizar, el contador sigue a la tarjeta que se ve', async () => {
    await montar(resenas(15));
    medir(300);
    const fila = todas()[0].parentElement!;
    // Pasada más de la mitad del camino, ya cuenta la siguiente.
    Object.defineProperty(fila, 'scrollLeft', { configurable: true, value: 160 });
    fireEvent.scroll(fila);
    expect(screen.getByText('2 / 15')).toBeInTheDocument();
    Object.defineProperty(fila, 'scrollLeft', { configurable: true, value: 14 * 300 });
    fireEvent.scroll(fila);
    expect(screen.getByText('15 / 15')).toBeInTheDocument();
  });

  // Con la sección sin dibujar (oculta, o antes de que el navegador la mida) las tarjetas no tienen
  // posición: dividir por un paso de cero escribiría «NaN / 15».
  it('si las tarjetas todavía no tienen medidas, el contador no se rompe', async () => {
    await montar(resenas(15));
    const fila = todas()[0].parentElement!;
    Object.defineProperty(fila, 'scrollLeft', { configurable: true, value: 160 });
    fireEvent.scroll(fila);
    expect(screen.getByText('1 / 15')).toBeInTheDocument();
  });

  it('no avanza solo', async () => {
    const pedidos = vi.fn(() => 1);
    vi.stubGlobal('requestAnimationFrame', pedidos);
    vi.useFakeTimers();
    await montar(resenas(15));
    act(() => { vi.advanceTimersByTime(30000); });
    expect(screen.getByText('1 / 15')).toBeInTheDocument();
    expect(desplazar).not.toHaveBeenCalled();
    expect(pedidos).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('con una sola no hay contador', async () => {
    await montar(resenas(1));
    expect(visibles()).toEqual(['1 de 1']);
    expect(screen.queryByText('1 / 1')).not.toBeInTheDocument();
  });
});
